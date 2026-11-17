import {NextRequest, NextResponse} from 'next/server';

export function checkOrigin(req: NextRequest) {
  const origin = req.headers.get('origin');
  const allowed = new Set([req.nextUrl.origin]);
  if (process.env.APP_URL) {
    try { allowed.add(new URL(process.env.APP_URL).origin); } catch {}
  }
  // Same-origin JSON API clients may omit Origin; reject browser cross-site requests.
  if (req.headers.get('sec-fetch-site') === 'cross-site' || (origin && !allowed.has(origin))) {
    return NextResponse.json({error: 'Cross-site request rejected'}, {status: 403});
  }
  return null;
}
