// Deploys web/ as a Vercel preview through the REST API. The Vercel CLI looks up
// the team first, which a project-scoped token is not allowed to read; the
// deployments and files endpoints accept it.
//
// Usage: node scripts/vercel-deploy.mjs KEY=VALUE ...   (env for build and runtime)
// Env: VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID. Prints the deployment URL.
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

const API = 'https://api.vercel.com';
const SOURCE = 'web';
const SKIP = new Set(['node_modules', '.next', '.vercel', '.turbo']);
const TIMEOUT_MS = 10 * 60 * 1000;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

const token = requireEnv('VERCEL_TOKEN');
const teamId = requireEnv('VERCEL_ORG_ID');
const projectId = requireEnv('VERCEL_PROJECT_ID');

const env = Object.fromEntries(
  process.argv.slice(2).map((pair) => {
    const index = pair.indexOf('=');
    if (index < 1) throw new Error(`Expected KEY=VALUE, got "${pair}"`);
    return [pair.slice(0, index), pair.slice(index + 1)];
  }),
);

async function api(method, path, body, headers = {}) {
  const res = await fetch(`${API}${path}${path.includes('?') ? '&' : '?'}teamId=${teamId}`, {
    method,
    headers: { authorization: `Bearer ${token}`, ...headers },
    body,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : null;
}

async function listFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name) || entry.name.startsWith('.env')) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listFiles(path)));
    else if (entry.isFile()) out.push(path);
  }
  return out;
}

async function upload(paths) {
  const files = [];
  const queue = [...paths];
  async function worker() {
    for (let path = queue.shift(); path; path = queue.shift()) {
      const data = await readFile(path);
      const sha = createHash('sha1').update(data).digest('hex');
      await api('POST', '/v2/files', data, {
        'content-type': 'application/octet-stream',
        'x-vercel-digest': sha,
      });
      files.push({ file: relative('.', path), sha, size: data.byteLength });
    }
  }
  await Promise.all(Array.from({ length: 16 }, worker));
  return files;
}

const files = await upload(await listFiles(SOURCE));
console.error(`Uploaded ${files.length} files from ${SOURCE}/`);

const deployment = await api(
  'POST',
  '/v13/deployments?skipAutoDetectionConfirmation=1',
  JSON.stringify({
    name: 'vibecastly',
    project: projectId,
    files,
    env,
    build: { env },
  }),
  { 'content-type': 'application/json' },
);
console.error(`Created ${deployment.id}, building…`);

const started = Date.now();
for (;;) {
  const current = await api('GET', `/v13/deployments/${deployment.id}`);
  if (current.readyState === 'READY') {
    console.log(`https://${current.url}`);
    break;
  }
  if (current.readyState === 'ERROR' || current.readyState === 'CANCELED') {
    throw new Error(`Deployment ${deployment.id} ended ${current.readyState}: https://${current.inspectorUrl ?? current.url}`);
  }
  if (Date.now() - started > TIMEOUT_MS) throw new Error(`Deployment ${deployment.id} not ready after 10 minutes`);
  await new Promise((resolve) => setTimeout(resolve, 3000));
}
