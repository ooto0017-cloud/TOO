import {get} from '@vercel/blob';
import {NextRequest, NextResponse} from 'next/server';
import {currentUser, hasRole} from '@/lib/auth';
import {db} from '@/lib/db';
export const runtime = 'nodejs';
export const maxDuration = 120;
export async function GET(req: NextRequest, {params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  const kind = req.nextUrl.searchParams.get('kind') === 'COVER' ? 'COVER' : 'PDF';
  try {
    const book = await db.book.findUnique({where: {id}, select: {title: true, status: true, downloadsAllowed: true, files: {where: {kind}, take: 1, orderBy: {createdAt: 'desc'}}}});
    if (!book || !book.files[0]) return NextResponse.json({error: 'File not found'}, {status: 404});
    const user = await currentUser();
    const staff = user && hasRole(user.role, ['LIBRARIAN']);
    if (book.status !== 'ACTIVE' && !staff) return NextResponse.json({error: 'File not found'}, {status: 404});
    if (kind === 'PDF' && !user) return NextResponse.json({error: 'Sign in required'}, {status: 401});
    const download = req.nextUrl.searchParams.get('download') === '1';
    if (kind === 'PDF' && download && !book.downloadsAllowed && !staff) return NextResponse.json({error: 'Downloads not allowed'}, {status: 403});
    const file = book.files[0];
    const blob = await get(file.storageKey, {access: 'private'});
    if (!blob || blob.statusCode !== 200) return NextResponse.json({error: 'File not found'}, {status: 404});
    const filename = encodeURIComponent(book.title.replace(/[\r\n]/g, '').slice(0, 160) + (kind === 'PDF' ? '.pdf' : file.mimeType === 'image/png' ? '.png' : file.mimeType === 'image/webp' ? '.webp' : '.jpg'));
    return new Response(blob.stream, {headers: {'Content-Type': file.mimeType, 'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename*=UTF-8''${filename}`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "sandbox; default-src 'none'"}});
  } catch {return NextResponse.json({error: 'File temporarily unavailable'}, {status: 503});}
}
