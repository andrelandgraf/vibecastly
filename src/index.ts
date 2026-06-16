import { Sentry } from './instrument';
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
  type ModelMessage,
} from 'ai';
import { randomUUID } from 'node:crypto';
import { and, count, desc, eq, gt, inArray } from 'drizzle-orm';
import { db } from './lib/db';
import { authenticate, corsHeaders } from './lib/auth';
import { isMember } from './lib/org';
import { putObject, deleteObject, getObjectBase64, presignGet } from './lib/storage';
import { runImageAgent, moderatePrompt, type ModerationResult } from './lib/mastra';
import { people, images, generationEvents } from './db/schema';

const PEOPLE_BUCKET = 'people';
const GENERATED_BUCKET = 'generated';
const MAX_IMAGES_PER_ORG = 10;
const DAILY_GENERATION_LIMIT = 20;
const GENERATION_WINDOW_MS = 24 * 60 * 60 * 1000;

// Accounts that bypass the free-plan image cap and daily rate limit: any
// workspace they generate in is effectively unlimited. Compared case-insensitively.
const UNLIMITED_EMAILS = new Set(['andre.landgraf@gmail.com']);

function hasUnlimitedImages(email: string): boolean {
  return UNLIMITED_EMAILS.has(email.trim().toLowerCase());
}

type Ctx = { userId: string; userName: string; userEmail: string; orgId: string };
type ReferenceImagePart = { type: 'image'; image: Buffer; mediaType: string };
type ReferenceTextPart = { type: 'text'; text: string };
type ReferencePart = ReferenceImagePart | ReferenceTextPart;

function json(request: Request, status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(request), 'content-type': 'application/json' },
  });
}

// @sentry/node ships events on a background transport. A Neon Function returns
// its response and then scales to zero, which can suspend the isolate before
// that HTTP request to Sentry completes — silently dropping captured events.
// Flush (bounded) before returning any error response so captures actually land.
async function flushSentry(): Promise<void> {
  try {
    await Sentry.flush(2000);
  } catch {
    // Never let telemetry flushing delay or break the user response.
  }
}

// Pull the useful fields off an AI SDK APICallError (status + response body +
// URL) so a gateway/provider rejection records *why* it failed, not just the
// generic "Bad Request" status text. Property-narrowed (no casts).
function describeApiError(error: unknown): Record<string, unknown> {
  if (typeof error !== 'object' || error === null) return {};
  const details: Record<string, unknown> = {};
  if ('name' in error) details.name = error.name;
  if ('statusCode' in error) details.statusCode = error.statusCode;
  if ('url' in error) details.url = error.url;
  if ('responseBody' in error) details.responseBody = error.responseBody;
  return details;
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    const identity = await authenticate(request);
    if (!identity) {
      return json(request, 401, { error: 'Unauthorized' });
    }

    const orgId = request.headers.get('x-organization-id');
    if (!orgId) {
      return json(request, 400, { error: 'No active organization' });
    }
    if (!(await isMember(orgId, identity.id))) {
      return json(request, 403, { error: 'Not a member of this organization' });
    }

    const ctx: Ctx = {
      userId: identity.id,
      userName: identity.name,
      userEmail: identity.email,
      orgId,
    };
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/{2,}/g, '/').replace(/\/+$/, '') || '/';
    const method = request.method;

    try {
      if (path === '/' && method === 'POST') return await handleGenerate(request, ctx);
      if (path === '/people' && method === 'GET') return await listPeople(request, ctx);
      if (path === '/people' && method === 'POST') return await createPerson(request, ctx);
      if (path.startsWith('/people/') && method === 'DELETE')
        return await deletePerson(request, ctx, path.slice('/people/'.length));
      if (path === '/images' && method === 'GET') return await listImages(request, ctx);
      if (path.startsWith('/images/') && method === 'PATCH')
        return await patchImage(request, ctx, path.slice('/images/'.length));
      if (path.startsWith('/images/') && method === 'DELETE')
        return await deleteImage(request, ctx, path.slice('/images/'.length));
      return json(request, 404, { error: 'Not found' });
    } catch (error) {
      console.error(`[${method} ${path}] error:`, error);
      Sentry.captureException(error, {
        tags: { component: 'http', route: `${method} ${path}` },
        user: { id: ctx.userId },
        extra: { orgId: ctx.orgId },
      });
      await flushSentry();
      return json(request, 500, {
        error: error instanceof Error ? error.message : 'Internal error',
      });
    }
  },
};

async function handleGenerate(request: Request, ctx: Ctx): Promise<Response> {
  const { messages, personIds, referenceImage } = (await request.json()) as {
    messages: UIMessage[];
    personIds?: string[];
    referenceImage?: { base64?: unknown; contentType?: unknown } | null;
  };

  let attachedReference: ReferenceImagePart | null = null;
  if (referenceImage && typeof referenceImage === 'object') {
    const base64 = typeof referenceImage.base64 === 'string' ? referenceImage.base64 : '';
    const contentType =
      typeof referenceImage.contentType === 'string' && referenceImage.contentType.startsWith('image/')
        ? referenceImage.contentType
        : 'image/jpeg';
    if (base64.length > 0) {
      attachedReference = {
        type: 'image',
        image: Buffer.from(base64, 'base64'),
        mediaType: contentType,
      };
    }
  }

  // Allowlisted accounts get unlimited images: skip the gallery cap and the
  // daily rate limit below.
  const unlimited = hasUnlimitedImages(ctx.userEmail);

  // Free-plan cap: block generation when the workspace gallery is full.
  if (!unlimited) {
    const [{ value: imageCount }] = await db
      .select({ value: count() })
      .from(images)
      .where(eq(images.organizationId, ctx.orgId));
    if (imageCount >= MAX_IMAGES_PER_ORG) {
      return json(request, 409, {
        error: 'image_limit_reached',
        message: `This workspace is at the free-plan limit of ${MAX_IMAGES_PER_ORG} images. Delete some to make room.`,
      });
    }
  }

  // Per-user rate limit: at most DAILY_GENERATION_LIMIT generations per rolling
  // 24h, across all workspaces. Checked before the (paid) moderation call.
  const windowStart = new Date(Date.now() - GENERATION_WINDOW_MS);
  if (!unlimited) {
    const recentEvents = await db
      .select({ createdAt: generationEvents.createdAt })
      .from(generationEvents)
      .where(
        and(eq(generationEvents.userId, ctx.userId), gt(generationEvents.createdAt, windowStart)),
      )
      .orderBy(desc(generationEvents.createdAt))
      .limit(DAILY_GENERATION_LIMIT);
    if (recentEvents.length >= DAILY_GENERATION_LIMIT) {
      const oldest = recentEvents[recentEvents.length - 1].createdAt;
      const retryMs = Math.max(0, oldest.getTime() + GENERATION_WINDOW_MS - Date.now());
      return json(request, 429, {
        error: 'rate_limited',
        message: `You've reached your limit of ${DAILY_GENERATION_LIMIT} image generations per 24 hours. Try again in ${formatDuration(retryMs)}.`,
        retryAfterMs: retryMs,
      });
    }
  }

  const prompt = lastUserText(messages);

  // Gatekeeper: a strong moderation agent vets the prompt before we spend any
  // work generating. Blocks sexual, harassment/bullying, hateful, violent, and
  // other unsafe requests.
  const moderation = await moderatePrompt(
    prompt,
    (personIds?.length ?? 0) > 0 || attachedReference !== null,
  );
  if (!moderation.allowed) {
    console.warn(
      `[moderation] blocked org=${ctx.orgId} user=${ctx.userId} category=${moderation.category}: ${prompt.slice(0, 200)}`,
    );
    Sentry.captureMessage('Prompt blocked by moderation', {
      level: 'warning',
      tags: { component: 'moderation', category: moderation.category },
      user: { id: ctx.userId },
      extra: { orgId: ctx.orgId, reason: moderation.reason },
    });
    await flushSentry();
    return json(request, 422, {
      error: 'prompt_blocked',
      message: blockedMessage(moderation),
    });
  }

  // Reserve a rate-limit slot now that the prompt passed moderation. Refunded
  // below if generation fails, so only real generations count against the limit.
  const [rateEvent] = await db
    .insert(generationEvents)
    .values({ userId: ctx.userId, organizationId: ctx.orgId })
    .returning({ id: generationEvents.id });

  // Build labeled reference parts so the model knows each image's role. Without
  // captions the provider tool treats trailing images as loose context; a short
  // text label before each image makes the attachment the actual generation base.
  const referenceParts: ReferencePart[] = await loadReferenceImages(ctx.orgId, personIds ?? []);
  if (attachedReference) {
    referenceParts.push({
      type: 'text',
      text:
        'Attached reference image — use this image as the visual starting point ' +
        'for the picture you generate. Keep its main subject(s), their likeness, ' +
        'pose, and overall composition, and only change what the prompt asks for.',
    });
    referenceParts.push(attachedReference);
  }
  const modelMessages = withReferenceImages(convertToModelMessages(messages), referenceParts);

  let generated: { base64: string; mediaType: string } | null = null;
  let text = '';
  try {
    const result = await runImageAgent(modelMessages, ctx.userId, prompt);
    generated = result.image;
    text = result.text;
  } catch (error) {
    await db
      .delete(generationEvents)
      .where(eq(generationEvents.id, rateEvent.id))
      .catch(() => undefined);
    const apiDetails = describeApiError(error);
    console.error('[generate] failed:', error, apiDetails);
    Sentry.captureException(error, {
      level: 'error',
      tags: { component: 'agent', phase: 'generate' },
      user: { id: ctx.userId },
      extra: { orgId: ctx.orgId, prompt, ...apiDetails },
    });
    await flushSentry();
    return json(request, 502, {
      error: 'generation_failed',
      message: error instanceof Error ? error.message : String(error),
    });
  }

  let viewUrl: string | null = null;
  if (generated) {
    const buffer = Buffer.from(generated.base64, 'base64');
    const key = `${ctx.orgId}/${randomUUID()}.jpg`;
    await putObject(GENERATED_BUCKET, key, buffer, generated.mediaType);
    await db.insert(images).values({
      organizationId: ctx.orgId,
      createdBy: ctx.userId,
      createdByName: ctx.userName,
      prompt,
      bucketKey: key,
      contentType: generated.mediaType,
      bytes: buffer.byteLength,
    });
    viewUrl = await presignGet(GENERATED_BUCKET, key);
    console.log(`[persist] ${GENERATED_BUCKET}/${key} (${buffer.byteLength}b) org=${ctx.orgId}`);
  } else {
    // No image produced — refund the reserved rate-limit slot.
    await db
      .delete(generationEvents)
      .where(eq(generationEvents.id, rateEvent.id))
      .catch(() => undefined);
  }

  if (!text) {
    text = generated
      ? 'Here is your image — saved to your gallery.'
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

async function listPeople(request: Request, ctx: Ctx): Promise<Response> {
  const rows = await db
    .select()
    .from(people)
    .where(eq(people.organizationId, ctx.orgId))
    .orderBy(desc(people.createdAt));
  const result = await Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      name: row.name,
      createdByName: row.createdByName,
      createdAt: row.createdAt,
      photoUrl: await presignGet(PEOPLE_BUCKET, row.bucketKey),
    })),
  );
  return json(request, 200, { people: result });
}

async function createPerson(request: Request, ctx: Ctx): Promise<Response> {
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
  const key = `${ctx.orgId}/${randomUUID()}`;
  await putObject(PEOPLE_BUCKET, key, buffer, contentType);
  const [row] = await db
    .insert(people)
    .values({
      organizationId: ctx.orgId,
      createdBy: ctx.userId,
      createdByName: ctx.userName,
      name: body.name.trim(),
      bucketKey: key,
      contentType,
    })
    .returning();
  return json(request, 201, {
    id: row.id,
    name: row.name,
    createdByName: row.createdByName,
    createdAt: row.createdAt,
    photoUrl: await presignGet(PEOPLE_BUCKET, row.bucketKey),
  });
}

async function deletePerson(request: Request, ctx: Ctx, id: string): Promise<Response> {
  const [row] = await db
    .select()
    .from(people)
    .where(and(eq(people.id, id), eq(people.organizationId, ctx.orgId)))
    .limit(1);
  if (!row) return json(request, 404, { error: 'Not found' });
  await deleteObject(PEOPLE_BUCKET, row.bucketKey).catch((e) => {
    console.error('[people] delete object failed:', e);
    Sentry.captureException(e, {
      level: 'warning',
      tags: { component: 'storage', phase: 'delete', bucket: PEOPLE_BUCKET },
      extra: { orgId: ctx.orgId, bucketKey: row.bucketKey },
    });
  });
  await db.delete(people).where(and(eq(people.id, id), eq(people.organizationId, ctx.orgId)));
  return json(request, 200, { deleted: id });
}

async function listImages(request: Request, ctx: Ctx): Promise<Response> {
  const rows = await db
    .select()
    .from(images)
    .where(eq(images.organizationId, ctx.orgId))
    .orderBy(desc(images.createdAt));
  const result = await Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      prompt: row.prompt,
      contentType: row.contentType,
      bytes: row.bytes,
      createdByName: row.createdByName,
      createdAt: row.createdAt,
      url: await presignGet(GENERATED_BUCKET, row.bucketKey),
    })),
  );
  return json(request, 200, { images: result });
}

async function patchImage(request: Request, ctx: Ctx, id: string): Promise<Response> {
  const body = (await request.json()) as { prompt?: unknown };
  if (typeof body.prompt !== 'string' || body.prompt.trim().length === 0) {
    return json(request, 400, { error: 'prompt must be a non-empty string' });
  }
  const [row] = await db
    .update(images)
    .set({ prompt: body.prompt.trim() })
    .where(and(eq(images.id, id), eq(images.organizationId, ctx.orgId)))
    .returning({ id: images.id, prompt: images.prompt });
  if (!row) return json(request, 404, { error: 'Not found' });
  return json(request, 200, { image: row });
}

async function deleteImage(request: Request, ctx: Ctx, id: string): Promise<Response> {
  const [row] = await db
    .select()
    .from(images)
    .where(and(eq(images.id, id), eq(images.organizationId, ctx.orgId)))
    .limit(1);
  if (!row) return json(request, 404, { error: 'Not found' });
  await deleteObject(GENERATED_BUCKET, row.bucketKey).catch((e) => {
    console.error('[images] delete object failed:', e);
    Sentry.captureException(e, {
      level: 'warning',
      tags: { component: 'storage', phase: 'delete', bucket: GENERATED_BUCKET },
      extra: { orgId: ctx.orgId, bucketKey: row.bucketKey },
    });
  });
  await db.delete(images).where(and(eq(images.id, id), eq(images.organizationId, ctx.orgId)));
  return json(request, 200, { deleted: id });
}

async function loadReferenceImages(
  orgId: string,
  personIds: string[],
): Promise<ReferencePart[]> {
  if (personIds.length === 0) return [];
  const rows = await db
    .select()
    .from(people)
    .where(and(eq(people.organizationId, orgId), inArray(people.id, personIds)));
  const parts: ReferencePart[] = [];
  for (const row of rows) {
    try {
      const base64 = await getObjectBase64(PEOPLE_BUCKET, row.bucketKey);
      // Caption the photo with the person's name so the model can tie it to the
      // matching @-mention in the prompt and match that person's likeness.
      parts.push({
        type: 'text',
        text: `Reference photo of @${row.name} — make this person clearly resemble this photo.`,
      });
      parts.push({
        type: 'image',
        image: Buffer.from(base64, 'base64'),
        mediaType: row.contentType,
      });
    } catch (error) {
      console.error(`[reference] failed to load person ${row.id}:`, error);
      Sentry.captureException(error, {
        level: 'warning',
        tags: { component: 'agent', phase: 'reference' },
        extra: { orgId, personId: row.id, bucketKey: row.bucketKey },
      });
    }
  }
  return parts;
}

function withReferenceImages(
  messages: ModelMessage[],
  parts: ReferencePart[],
): ModelMessage[] {
  if (parts.length === 0) return messages;
  const result = [...messages];
  for (let i = result.length - 1; i >= 0; i--) {
    const message = result[i];
    if (message.role !== 'user') continue;
    const base =
      typeof message.content === 'string'
        ? [{ type: 'text' as const, text: message.content }]
        : message.content;
    result[i] = { role: 'user', content: [...base, ...parts] };
    return result;
  }
  result.push({ role: 'user', content: parts });
  return result;
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.max(1, Math.ceil(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  return `${minutes}m`;
}

function blockedMessage(moderation: ModerationResult): string {
  const labels: Record<ModerationResult['category'], string> = {
    sexual: 'sexual or NSFW content',
    minors: 'content sexualizing minors',
    harassment: 'harassment or bullying',
    hate: 'hateful or offensive content',
    violence: 'graphic violence',
    self_harm: 'self-harm content',
    illegal: 'prohibited content',
    none: 'our content policy',
  };
  const label = labels[moderation.category] ?? 'our content policy';
  return `This prompt was blocked for ${label}. Please edit your prompt and try again.`;
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
