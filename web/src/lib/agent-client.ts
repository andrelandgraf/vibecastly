'use client';

const AGENT_URL = (process.env.NEXT_PUBLIC_AGENT_URL ?? '').replace(/\/+$/, '');

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

async function request(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
  if (!AGENT_URL) throw new Error('NEXT_PUBLIC_AGENT_URL is not configured');
  if (!activeOrgId) throw new Error('No active organization');
  const token = await getToken();
  const res = await fetch(`${AGENT_URL}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      authorization: `Bearer ${token}`,
      'x-organization-id': activeOrgId,
    },
  });
  if (res.status === 401 && retry) {
    cached = null;
    return request(path, init, false);
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  return res;
}

export async function generate(prompt: string, personIds: string[]): Promise<void> {
  const res = await request('/', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      messages: [{ id: crypto.randomUUID(), role: 'user', parts: [{ type: 'text', text: prompt }] }],
      personIds,
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
