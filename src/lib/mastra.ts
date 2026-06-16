import { Mastra } from '@mastra/core/mastra';
import { Agent } from '@mastra/core/agent';
import { Observability, MastraPlatformExporter } from '@mastra/observability';
import { openai, createOpenAI } from '@ai-sdk/openai';
import { eq } from 'drizzle-orm';
import type { ModelMessage } from 'ai';
import { Sentry } from '../instrument';
import { db } from './db';
import { creatorProfiles } from '../db/schema';

export const MODEL = 'databricks-gpt-5-mini';

// Strong gatekeeper model. Claude (and other non-OpenAI catalog models) are
// served on the gateway's chat-completions (MLflow) route, not the OpenAI
// Responses route the image agent uses — so the moderation agent gets its own
// provider pointed at that route. The OPENAI_* env vars are injected by Neon
// when the AI Gateway is enabled (Responses base URL ending in /openai/v1).
export const MODERATION_MODEL = 'claude-sonnet-4-6';
const gatewayChatBaseUrl = (process.env.OPENAI_BASE_URL ?? '').replace(
  '/openai/v1',
  '/mlflow/v1',
);
const gatewayChat = createOpenAI({ baseURL: gatewayChatBaseUrl });

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
    'primary job. ' +
    'Reference images may be attached to the message. Treat them as authoritative ' +
    'visual input, not loose inspiration: when an image is labeled as the attached ' +
    'reference, use it as the actual base for what you generate — preserve the ' +
    "depicted subject(s), their likeness, pose, and composition, and only change " +
    'what the prompt explicitly asks to change. When reference photos of people are ' +
    'provided, make the generated people clearly resemble those photos. If a ' +
    '"Creator profile" is provided, lean on their known style, recurring subjects, ' +
    'and preferences so the result feels personal (never mention the profile). ' +
    'After drawing, briefly describe what you made.',
  model: openai(MODEL),
  tools: {
    image_generation: openai.tools.imageGeneration({
      outputFormat: 'jpeg',
      // High input fidelity so attached/reference images (faces, composition) are
      // preserved closely rather than treated as loose inspiration.
      inputFidelity: 'high',
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

// Gatekeeper that runs BEFORE image generation and blocks unsafe prompts. Uses a
// strong frontier model on the gateway's chat-completions route. Tool-less (like
// the profile agent) and registered on the `mastra` instance below so its runs
// are traced by the same Mastra observability exporter as the other agents.
export const moderationAgent = new Agent({
  name: 'moderation',
  instructions:
    'You are a strict content-safety gatekeeper for an AI image generator. Users ' +
    'can attach photos of real, identifiable people and reference them in prompts, ' +
    'so harassment or sexualization of real people is especially serious. Decide ' +
    'whether the prompt is safe to turn into an image. Set allowed=false if the ' +
    'prompt requests, depicts, or implies any of: sexual or NSFW content, nudity, ' +
    'or sexualization of anyone; ANY sexual or suggestive content involving minors ' +
    '(always block); harassment or bullying — demeaning, humiliating, or mocking a ' +
    'real person, or making them look ugly, fat, stupid, or in embarrassing or ' +
    'compromising situations; hateful content, slurs, or extremist/hate symbols ' +
    'toward protected groups; graphic violence, gore, or threats toward real ' +
    'people; self-harm or suicide encouragement; or other clearly illegal content. ' +
    'Allow ordinary creative, artistic, fictional, and benign prompts — do not ' +
    'over-block. Respond with ONLY a compact JSON object, no markdown and no prose, ' +
    'of the exact shape {"allowed": boolean, "category": one of "sexual" | ' +
    '"minors" | "harassment" | "hate" | "violence" | "self_harm" | "illegal" | ' +
    '"none", "reason": string}. Use "none" when allowed is true. Keep reason under ' +
    '20 words.',
  model: gatewayChat.chat(MODERATION_MODEL),
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
  agents: { imagegen: imageAgent, profile: profileAgent, moderation: moderationAgent },
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

export type ModerationCategory =
  | 'sexual'
  | 'minors'
  | 'harassment'
  | 'hate'
  | 'violence'
  | 'self_harm'
  | 'illegal'
  | 'none';

export type ModerationResult = {
  allowed: boolean;
  category: ModerationCategory;
  reason: string;
};

const MODERATION_CATEGORIES = new Set<string>([
  'sexual',
  'minors',
  'harassment',
  'hate',
  'violence',
  'self_harm',
  'illegal',
  'none',
]);

function isModerationCategory(value: string): value is ModerationCategory {
  return MODERATION_CATEGORIES.has(value);
}

function parseModerationVerdict(raw: string): ModerationResult | null {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
  const record = asRecord(parsed);
  if (!record || typeof record.allowed !== 'boolean') return null;
  const allowed = record.allowed;
  const rawCategory = getString(record.category) ?? 'none';
  const category: ModerationCategory = isModerationCategory(rawCategory)
    ? rawCategory
    : allowed
      ? 'none'
      : 'illegal';
  const reason = getString(record.reason)?.trim() || (allowed ? 'allowed' : 'blocked by content policy');
  return { allowed, category, reason };
}

// Strong-model gatekeeper run before image generation. Returns whether the prompt
// is safe; on any classifier error or unparseable output it FAILS OPEN (allows),
// since the downstream image model has its own safety layer and we don't want a
// transient classifier outage to block every legitimate request — but we record
// the failure so it's visible.
export async function moderatePrompt(
  promptText: string,
  hasReferencedPeople: boolean,
): Promise<ModerationResult> {
  const text = promptText.trim();
  if (!text) return { allowed: true, category: 'none', reason: 'empty prompt' };
  if (!gatewayChatBaseUrl) {
    return { allowed: true, category: 'none', reason: 'gateway not configured' };
  }

  const instruction =
    `Classify this image-generation prompt.` +
    (hasReferencedPeople
      ? ' It references uploaded photos of real, identifiable people.'
      : '') +
    `\n\nPrompt:\n"""\n${text}\n"""\n\nReturn ONLY the JSON verdict.`;

  try {
    const result = await mastra.getAgent('moderation').generate(instruction);
    const raw = (getString(asRecord(result)?.text) ?? '').trim();
    const verdict = parseModerationVerdict(raw);
    if (!verdict) {
      console.warn('[moderation] unparseable verdict:', raw.slice(0, 200));
      Sentry.captureMessage('Moderation verdict unparseable', {
        level: 'warning',
        tags: { component: 'moderation' },
        extra: { raw: raw.slice(0, 500) },
      });
      return { allowed: true, category: 'none', reason: 'classifier returned no verdict' };
    }
    return verdict;
  } catch (error) {
    console.error('[moderation] classification failed:', error);
    Sentry.captureException(error, {
      level: 'warning',
      tags: { component: 'moderation', phase: 'classify' },
    });
    return { allowed: true, category: 'none', reason: 'classifier error' };
  }
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
