import {NextRequest, NextResponse} from 'next/server';

export function checkOrigin(req: NextRequest) {
  const origin = req.headers.get('origin');
  const allowed = new Set([req.nextUrl.origin]);
  // Next's production listener may use an internal hostname in nextUrl.
  // Host preserves the browser-facing authority behind the hosting proxy.
  const host = req.headers.get('host');
  const protocol = req.headers.get('x-forwarded-proto')?.split(',')[0].trim() || req.nextUrl.protocol.replace(':', '');
  if (host && (protocol === 'https' || protocol === 'http')) allowed.add(`${protocol}://${host}`);
  if (process.env.APP_URL) {
    try { allowed.add(new URL(process.env.APP_URL).origin); } catch {}
  }
  // Same-origin JSON API clients may omit Origin; reject browser cross-site requests.
  if (req.headers.get('sec-fetch-site') === 'cross-site' || (origin && !allowed.has(origin))) {
    return NextResponse.json({error: 'Cross-site request rejected'}, {status: 403});
  }
  return null;
}
