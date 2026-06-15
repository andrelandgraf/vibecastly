'use client';

const AGENT_URL = (process.env.NEXT_PUBLIC_AGENT_URL ?? '').replace(/\/+$/, '');

export const IMAGE_LIMIT_PER_ORG = 10;
export const ORG_LIMIT = 10;

export type ImageRecord = {
  id: string;
  prompt: string;
  contentType: string;
  bytes: number;
  createdByName: string;
  createdAt: string;
  url: string;
};

export type PersonRecord = {
  id: string;
  name: string;
  createdByName: string;
  createdAt: string;
  photoUrl: string;
};

export function agentConfigured(): boolean {
  return AGENT_URL.length > 0;
}

let activeOrgId: string | null = null;

export function setActiveOrg(id: string | null): void {
  activeOrgId = id;
}

export function getActiveOrg(): string | null {
  return activeOrgId;
}

let cached: { token: string; expiresAt: number } | null = null;

export async function getToken(force = false): Promise<string> {
  const now = Date.now();
  if (!force && cached && cached.expiresAt > now) {
    return cached.token;
  }
  const res = await fetch('/api/auth/token', { credentials: 'include' });
  if (!res.ok) {
    throw new Error('Not authenticated');
  }
  const data = (await res.json()) as { token?: string };
  if (!data.token) {
    throw new Error('No token returned');
  }
  // Neon Auth JWTs are short-lived; cache conservatively for 5 minutes.
  cached = { token: data.token, expiresAt: now + 5 * 60 * 1000 };
  return data.token;
}

export type AgentErrorKind = 'blocked' | 'rate_limited' | 'failed';

// Carries a user-facing message plus a kind so the UI can present content-policy
// blocks and rate limits differently from generic failures.
export class AgentError extends Error {
  readonly code: string;
  readonly kind: AgentErrorKind;
  constructor(message: string, code: string, kind: AgentErrorKind) {
    super(message);
    this.name = 'AgentError';
    this.code = code;
    this.kind = kind;
  }
}

async function request(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
  if (!AGENT_URL) throw new AgentError('The image service is not configured.', 'not_configured', 'failed');
  if (!activeOrgId) throw new AgentError('Select a workspace first.', 'no_org', 'failed');
  const token = await getToken();
  let res: Response;
  try {
    res = await fetch(`${AGENT_URL}${path}`, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        authorization: `Bearer ${token}`,
        'x-organization-id': activeOrgId,
      },
    });
  } catch {
    throw new AgentError(
      "Couldn't reach the image service. Check your connection and try again.",
      'network',
      'failed',
    );
  }
  if (res.status === 401 && retry) {
    cached = null;
    return request(path, init, false);
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as
      | { error?: string; message?: string }
      | null;
    const message = body?.message ?? body?.error ?? `Something went wrong (${res.status}).`;
    const code = body?.error ?? `http_${res.status}`;
    const kind: AgentErrorKind =
      res.status === 422 ? 'blocked' : res.status === 429 ? 'rate_limited' : 'failed';
    throw new AgentError(message, code, kind);
  }
  return res;
}

export type ReferenceImageInput = { base64: string; contentType: string };

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

export async function generate(
  prompt: string,
  personIds: string[],
  referenceImage?: ReferenceImageInput | File | null,
): Promise<void> {
  let referencePayload: ReferenceImageInput | null = null;
  if (referenceImage) {
    if (referenceImage instanceof File) {
      const base64 = await fileToBase64(referenceImage);
      referencePayload = { base64, contentType: referenceImage.type || 'image/jpeg' };
    } else {
      referencePayload = referenceImage;
    }
  }
  const res = await request('/', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      messages: [{ id: crypto.randomUUID(), role: 'user', parts: [{ type: 'text', text: prompt }] }],
      personIds,
      ...(referencePayload ? { referenceImage: referencePayload } : {}),
    }),
  });
  // The function persists the image before it starts streaming, so awaiting the
  // body to completion guarantees the image is saved.
  await res.text();
}

export async function listImages(): Promise<ImageRecord[]> {
  const res = await request('/images');
  return ((await res.json()) as { images: ImageRecord[] }).images;
}

export async function patchImage(id: string, prompt: string): Promise<void> {
  await request(`/images/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
}

export async function deleteImage(id: string): Promise<void> {
  await request(`/images/${id}`, { method: 'DELETE' });
}

export async function listPeople(): Promise<PersonRecord[]> {
  const res = await request('/people');
  return ((await res.json()) as { people: PersonRecord[] }).people;
}

export async function createPerson(
  name: string,
  imageBase64: string,
  contentType: string,
): Promise<PersonRecord> {
  const res = await request('/people', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, imageBase64, contentType }),
  });
  return (await res.json()) as PersonRecord;
}

export async function deletePerson(id: string): Promise<void> {
  await request(`/people/${id}`, { method: 'DELETE' });
}
