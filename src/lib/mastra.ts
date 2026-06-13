import { Mastra } from '@mastra/core/mastra';
import { Agent } from '@mastra/core/agent';
import { Observability, MastraPlatformExporter } from '@mastra/observability';
import { openai } from '@ai-sdk/openai';
import { eq } from 'drizzle-orm';
import type { ModelMessage } from 'ai';
import { db } from './db';
import { creatorProfiles } from '../db/schema';

export const MODEL = 'databricks-gpt-5-mini';

const PROFILE_TEMPLATE = `# Creator Profile
- **Preferred subjects**:
- **Visual style / aesthetic**:
- **Recurring people or characters**:
- **Tone & mood**:
- **Things to avoid**:
- **How they tend to phrase prompts**:
`;

// The image agent carries ONLY the OpenAI provider-executed image_generation
// tool. The Neon AI Gateway 502s when that provider tool is combined with any
// function tool, so per-user memory is kept out of the tool loop: the learned
// profile is injected here as a system message instead.
export const imageAgent = new Agent({
  name: 'imagegen',
  instructions:
    'You are an illustration agent for a creative team. When the user asks for a ' +
    'picture, ALWAYS use the image_generation tool to create it — that is your ' +
    'primary job. If reference images of people are provided, use them as the ' +
    'starting point so the generated people resemble those references. If a ' +
    '"Creator profile" is provided, lean on their known style, recurring subjects, ' +
    'and preferences so the result feels personal (never mention the profile). ' +
    'After drawing, briefly describe what you made.',
  model: openai(MODEL),
  tools: {
    image_generation: openai.tools.imageGeneration({
      outputFormat: 'jpeg',
      quality: 'low',
      outputCompression: 30,
      size: '1024x1024',
    }),
  },
});

// Tool-less text agent that rewrites the per-user profile. No tools (the gateway
// 502s this model with any function tool), so it returns the updated profile as
// plain text which we persist to Postgres ourselves.
export const profileAgent = new Agent({
  name: 'profile',
  instructions:
    'You maintain a concise profile of how a creator likes their AI-generated ' +
    'images. You are given their current profile and their latest prompt, and you ' +
    'return the updated profile as markdown using the same headings. Fold in only ' +
    'durable, repeatable preferences (subjects, visual style, tone, recurring people, ' +
    'things to avoid, phrasing habits); never invent details or record one-off request ' +
    'specifics. Output ONLY the markdown profile, nothing else.',
  model: openai(MODEL),
});

// Export agent runs (model + tool calls, latency, tokens) to the Mastra platform.
// Only attached when credentials are present (Observability rejects an empty
// exporter list); injected onto the deployed function via neon.ts `env`.
const platformEnabled = Boolean(
  process.env.MASTRA_PLATFORM_ACCESS_TOKEN && process.env.MASTRA_PROJECT_ID,
);

const observability = platformEnabled
  ? new Observability({
      configs: {
        default: {
          serviceName: 'vibecast-imagegen',
          exporters: [new MastraPlatformExporter()],
        },
      },
    })
  : undefined;

export const mastra = new Mastra({
  agents: { imagegen: imageAgent, profile: profileAgent },
  ...(observability ? { observability } : {}),
});

export type GeneratedImage = { base64: string; mediaType: string };
export type ImageAgentResult = { text: string; image: GeneratedImage | null };

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

// Mastra surfaces the OpenAI provider image_generation result under
// toolResults[].payload.result.result (it does not populate the AI SDK `files`
// array for provider-executed tools). Fall back to the AI SDK `files`/`toolResults`
// shapes so this keeps working if Mastra aligns them in a future version.
function extractImage(result: unknown): GeneratedImage | null {
  const root = asRecord(result);
  if (!root) return null;

  const toolResults = Array.isArray(root.toolResults) ? root.toolResults : [];
  for (const entry of toolResults) {
    const payload = asRecord(asRecord(entry)?.payload);
    if (!payload || payload.toolName !== 'image_generation') continue;
    const inner = asRecord(payload.result);
    const base64 = getString(inner?.result) ?? getString(payload.result);
    if (base64 && base64.length > 0) return { base64, mediaType: 'image/jpeg' };
  }

  const files = Array.isArray(root.files) ? root.files : [];
  for (const file of files) {
    const f = asRecord(file);
    const base64 = getString(f?.base64);
    const mediaType = getString(f?.mediaType) ?? 'image/jpeg';
    if (base64 && mediaType.startsWith('image/')) return { base64, mediaType };
  }

  return null;
}

async function readCreatorProfile(userId: string): Promise<string> {
  try {
    const [row] = await db
      .select({ profile: creatorProfiles.profile })
      .from(creatorProfiles)
      .where(eq(creatorProfiles.userId, userId))
      .limit(1);
    return row?.profile ?? '';
  } catch (error) {
    console.error('[memory] read profile failed:', error);
    return '';
  }
}

async function updateCreatorProfile(
  userId: string,
  promptText: string,
  currentProfile: string,
): Promise<void> {
  if (!promptText.trim()) return;
  try {
    const base = currentProfile.trim() || PROFILE_TEMPLATE;
    const result = await mastra.getAgent('profile').generate(
      `Current creator profile:\n${base}\n\nThe creator's new prompt:\n"${promptText}"\n\n` +
        'Return the full updated profile as markdown, same headings.',
    );
    const updated = (getString(asRecord(result)?.text) ?? '').trim();
    if (!updated) return;
    await db
      .insert(creatorProfiles)
      .values({ userId, profile: updated })
      .onConflictDoUpdate({
        target: creatorProfiles.userId,
        set: { profile: updated, updatedAt: new Date() },
      });
  } catch (error) {
    console.error('[memory] profile update failed:', error);
  }
}

export async function runImageAgent(
  messages: ModelMessage[],
  userId: string,
  promptText: string,
): Promise<ImageAgentResult> {
  const profile = (await readCreatorProfile(userId)).trim();
  const system = profile
    ? `Creator profile (use it to personalize the image; never mention it):\n${profile}`
    : undefined;

  const agent = mastra.getAgent('imagegen');
  // Stream the underlying model call (doStream) rather than buffering it
  // (doGenerate). Image generation can take ~60s, and a single buffered request
  // trips the Neon AI Gateway's upstream timeout (504 Gateway Time-out). A
  // streaming request keeps the connection active with incremental events so the
  // gateway doesn't time out; we still drain to the final result server-side via
  // getFullOutput() before responding. Runs concurrently with the profile update.
  const [result] = await Promise.all([
    agent
      .stream(messages, system ? { system } : {})
      .then((output) => output.getFullOutput()),
    updateCreatorProfile(userId, promptText, profile),
  ]);

  const text = (getString(asRecord(result)?.text) ?? '').trim();
  return { text, image: extractImage(result) };
}
