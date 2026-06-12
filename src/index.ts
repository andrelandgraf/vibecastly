import { openai } from '@ai-sdk/openai';
import {
  generateText,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
  type ModelMessage,
} from 'ai';
import { randomUUID } from 'node:crypto';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from './lib/db';
import { authenticate, corsHeaders } from './lib/auth';
import { putObject, deleteObject, getObjectBase64, presignGet } from './lib/storage';
import { people, images } from './db/schema';

const MODEL = 'databricks-gpt-5-mini';
const PEOPLE_BUCKET = 'people';
const GENERATED_BUCKET = 'generated';

type ReferenceImagePart = { type: 'image'; image: Buffer; mediaType: string };

function json(request: Request, status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(request), 'content-type': 'application/json' },
  });
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    const userId = await authenticate(request);
    if (!userId) {
      return json(request, 401, { error: 'Unauthorized' });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/{2,}/g, '/').replace(/\/+$/, '') || '/';
    const method = request.method;

    try {
      if (path === '/' && method === 'POST') return await handleGenerate(request, userId);
      if (path === '/people' && method === 'GET') return await listPeople(request, userId);
      if (path === '/people' && method === 'POST') return await createPerson(request, userId);
      if (path.startsWith('/people/') && method === 'DELETE')
        return await deletePerson(request, userId, path.slice('/people/'.length));
      if (path === '/images' && method === 'GET') return await listImages(request, userId);
      if (path.startsWith('/images/') && method === 'PATCH')
        return await patchImage(request, userId, path.slice('/images/'.length));
      if (path.startsWith('/images/') && method === 'DELETE')
        return await deleteImage(request, userId, path.slice('/images/'.length));
      return json(request, 404, { error: 'Not found' });
    } catch (error) {
      console.error(`[${method} ${path}] error:`, error);
      return json(request, 500, {
        error: error instanceof Error ? error.message : 'Internal error',
      });
    }
  },
};

async function handleGenerate(request: Request, userId: string): Promise<Response> {
  const { messages, personIds } = (await request.json()) as {
    messages: UIMessage[];
    personIds?: string[];
  };
  const prompt = lastUserText(messages);

  const referenceParts = await loadReferenceImages(userId, personIds ?? []);
  const modelMessages = withReferenceImages(convertToModelMessages(messages), referenceParts);

  let generated: { base64: string; mediaType: string } | null = null;
  let text = '';
  try {
    const gen = await generateText({
      model: openai(MODEL),
      system:
        'You are an illustration agent. When the user asks for a picture, use the ' +
        'image_generation tool to create it. If reference images of people are provided, ' +
        'use them as the starting point so the generated people resemble those references. ' +
        'Then briefly describe what you drew.',
      messages: modelMessages,
      tools: {
        image_generation: openai.tools.imageGeneration({
          outputFormat: 'jpeg',
          quality: 'low',
          outputCompression: 30,
          size: '1024x1024',
        }),
      },
    });
    generated = extractGeneratedImage(gen);
    text = gen.text.trim();
  } catch (error) {
    console.error('[generate] failed:', error);
    return json(request, 502, {
      error: 'generation_failed',
      message: error instanceof Error ? error.message : String(error),
    });
  }

  let viewUrl: string | null = null;
  if (generated) {
    const buffer = Buffer.from(generated.base64, 'base64');
    const key = `${userId}/${randomUUID()}.jpg`;
    await putObject(GENERATED_BUCKET, key, buffer, generated.mediaType);
    await db.insert(images).values({
      userId,
      prompt,
      bucketKey: key,
      contentType: generated.mediaType,
      bytes: buffer.byteLength,
    });
    viewUrl = await presignGet(GENERATED_BUCKET, key);
    console.log(`[persist] stored ${GENERATED_BUCKET}/${key} (${buffer.byteLength} bytes)`);
  }

  if (!text) {
    text = generated
      ? 'Here is your image — saved to your library.'
      : 'I was not able to generate an image this time. Please try again.';
  }

  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      const id = randomUUID();
      writer.write({ type: 'text-start', id });
      writer.write({ type: 'text-delta', id, delta: text });
      writer.write({ type: 'text-end', id });
      if (viewUrl) {
        writer.write({ type: 'file', url: viewUrl, mediaType: generated?.mediaType ?? 'image/jpeg' });
      }
    },
  });

  return createUIMessageStreamResponse({ stream, headers: corsHeaders(request) });
}

async function listPeople(request: Request, userId: string): Promise<Response> {
  const rows = await db
    .select()
    .from(people)
    .where(eq(people.userId, userId))
    .orderBy(desc(people.createdAt));
  const result = await Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      name: row.name,
      createdAt: row.createdAt,
      photoUrl: await presignGet(PEOPLE_BUCKET, row.bucketKey),
    })),
  );
  return json(request, 200, { people: result });
}

async function createPerson(request: Request, userId: string): Promise<Response> {
  const body = (await request.json()) as {
    name?: unknown;
    imageBase64?: unknown;
    contentType?: unknown;
  };
  if (typeof body.name !== 'string' || body.name.trim().length === 0) {
    return json(request, 400, { error: 'name is required' });
  }
  if (typeof body.imageBase64 !== 'string' || body.imageBase64.length === 0) {
    return json(request, 400, { error: 'imageBase64 is required' });
  }
  const contentType = typeof body.contentType === 'string' ? body.contentType : 'image/jpeg';
  const buffer = Buffer.from(body.imageBase64, 'base64');
  const key = `${userId}/${randomUUID()}`;
  await putObject(PEOPLE_BUCKET, key, buffer, contentType);
  const [row] = await db
    .insert(people)
    .values({ userId, name: body.name.trim(), bucketKey: key, contentType })
    .returning();
  return json(request, 201, {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt,
    photoUrl: await presignGet(PEOPLE_BUCKET, row.bucketKey),
  });
}

async function deletePerson(request: Request, userId: string, id: string): Promise<Response> {
  const [row] = await db
    .select()
    .from(people)
    .where(and(eq(people.id, id), eq(people.userId, userId)))
    .limit(1);
  if (!row) return json(request, 404, { error: 'Not found' });
  await deleteObject(PEOPLE_BUCKET, row.bucketKey).catch((e) =>
    console.error('[people] delete object failed:', e),
  );
  await db.delete(people).where(and(eq(people.id, id), eq(people.userId, userId)));
  return json(request, 200, { deleted: id });
}

async function listImages(request: Request, userId: string): Promise<Response> {
  const rows = await db
    .select()
    .from(images)
    .where(eq(images.userId, userId))
    .orderBy(desc(images.createdAt));
  const result = await Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      prompt: row.prompt,
      contentType: row.contentType,
      bytes: row.bytes,
      createdAt: row.createdAt,
      url: await presignGet(GENERATED_BUCKET, row.bucketKey),
    })),
  );
  return json(request, 200, { images: result });
}

async function patchImage(request: Request, userId: string, id: string): Promise<Response> {
  const body = (await request.json()) as { prompt?: unknown };
  if (typeof body.prompt !== 'string' || body.prompt.trim().length === 0) {
    return json(request, 400, { error: 'prompt must be a non-empty string' });
  }
  const [row] = await db
    .update(images)
    .set({ prompt: body.prompt.trim() })
    .where(and(eq(images.id, id), eq(images.userId, userId)))
    .returning({ id: images.id, prompt: images.prompt });
  if (!row) return json(request, 404, { error: 'Not found' });
  return json(request, 200, { image: row });
}

async function deleteImage(request: Request, userId: string, id: string): Promise<Response> {
  const [row] = await db
    .select()
    .from(images)
    .where(and(eq(images.id, id), eq(images.userId, userId)))
    .limit(1);
  if (!row) return json(request, 404, { error: 'Not found' });
  await deleteObject(GENERATED_BUCKET, row.bucketKey).catch((e) =>
    console.error('[images] delete object failed:', e),
  );
  await db.delete(images).where(and(eq(images.id, id), eq(images.userId, userId)));
  return json(request, 200, { deleted: id });
}

async function loadReferenceImages(
  userId: string,
  personIds: string[],
): Promise<ReferenceImagePart[]> {
  if (personIds.length === 0) return [];
  const rows = await db
    .select()
    .from(people)
    .where(and(eq(people.userId, userId), inArray(people.id, personIds)));
  const parts: ReferenceImagePart[] = [];
  for (const row of rows) {
    try {
      const base64 = await getObjectBase64(PEOPLE_BUCKET, row.bucketKey);
      parts.push({
        type: 'image',
        image: Buffer.from(base64, 'base64'),
        mediaType: row.contentType,
      });
    } catch (error) {
      console.error(`[reference] failed to load person ${row.id}:`, error);
    }
  }
  return parts;
}

function withReferenceImages(
  messages: ModelMessage[],
  imageParts: ReferenceImagePart[],
): ModelMessage[] {
  if (imageParts.length === 0) return messages;
  const result = [...messages];
  for (let i = result.length - 1; i >= 0; i--) {
    const message = result[i];
    if (message.role !== 'user') continue;
    const base =
      typeof message.content === 'string'
        ? [{ type: 'text' as const, text: message.content }]
        : message.content;
    result[i] = { role: 'user', content: [...base, ...imageParts] };
    return result;
  }
  result.push({ role: 'user', content: imageParts });
  return result;
}

function extractGeneratedImage(gen: {
  files: Array<{ base64: string; mediaType: string }>;
  toolResults: Array<{ toolName: string; output?: unknown }>;
}): { base64: string; mediaType: string } | null {
  for (const file of gen.files) {
    if (file.mediaType.startsWith('image/')) {
      return { base64: file.base64, mediaType: file.mediaType };
    }
  }
  for (const toolResult of gen.toolResults) {
    if (toolResult.toolName !== 'image_generation') continue;
    const base64 = imageResultBase64(toolResult.output);
    if (base64) return { base64, mediaType: 'image/jpeg' };
  }
  return null;
}

function imageResultBase64(output: unknown): string | null {
  if (typeof output === 'string') return output;
  if (typeof output === 'object' && output !== null && 'result' in output) {
    const { result } = output;
    if (typeof result === 'string') return result;
  }
  return null;
}

function lastUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role !== 'user') continue;
    const text = message.parts
      .filter((part) => part.type === 'text')
      .map((part) => ('text' in part ? part.text : ''))
      .join(' ')
      .trim();
    if (text) return text;
  }
  return 'generated image';
}
