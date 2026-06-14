// Same-origin proxy so the gallery "Download" can trigger a real browser
// download. The image lives on cross-origin object storage that doesn't send
// CORS headers, so a client-side fetch is blocked; proxying it server-side
// (no CORS) and re-streaming with an attachment header makes it downloadable.
// The target host is allowlisted to Neon storage to avoid an open proxy / SSRF.

const ALLOWED_HOST_SUFFIX = '.aws.neon.build';

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  const name = searchParams.get('name') || 'vibecastly-image.jpg';

  if (!url) return new Response('Missing url', { status: 400 });

  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return new Response('Invalid url', { status: 400 });
  }
  if (target.protocol !== 'https:' || !target.hostname.endsWith(ALLOWED_HOST_SUFFIX)) {
    return new Response('Forbidden host', { status: 403 });
  }

  const upstream = await fetch(target.toString());
  if (!upstream.ok || !upstream.body) {
    return new Response('Upstream error', { status: 502 });
  }

  const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '_');
  return new Response(upstream.body, {
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'application/octet-stream',
      'content-disposition': `attachment; filename="${safeName}"`,
      'cache-control': 'private, max-age=0',
    },
  });
}
