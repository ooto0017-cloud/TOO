import {del} from '@vercel/blob';
import {NextRequest, NextResponse, after} from 'next/server';
import {z} from 'zod';
import {currentUser, hasRole} from '@/lib/auth';
import {db} from '@/lib/db';
import {checkOrigin} from '@/lib/origin';
import {validMediaPath} from '@/lib/media-validation';
import {verifyUploadedMedia, MediaError} from '@/lib/media-storage';

export const runtime = 'nodejs';
export const maxDuration = 120;
const schema = z.object({kind: z.enum(['PDF', 'COVER']), pathname: z.string().max(500)});
export async function POST(req: NextRequest, {params}: {params: Promise<{id: string}>}) {
  const rejected = checkOrigin(req); if (rejected) return rejected;
  const user = await currentUser();
  if (!user || !hasRole(user.role, ['LIBRARIAN'])) return NextResponse.json({error: 'Forbidden'}, {status: 403});
  const {id} = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !validMediaPath(id, parsed.data.kind, parsed.data.pathname)) return NextResponse.json({error: 'Invalid attachment'}, {status: 400});
  const {kind, pathname} = parsed.data;
  try {
    if (!await db.book.findUnique({where: {id}, select: {id: true}})) return NextResponse.json({error: 'Book not found'}, {status: 404});
    const verified = await verifyUploadedMedia(pathname, kind);
    const result = await db.$transaction(async tx => {
      // Serialize replacement per book so simultaneous uploads leave one current attachment.
      await tx.book.update({where: {id}, data: {updatedAt: new Date()}});
      const old = await tx.bookFile.findMany({where: {bookId: id, kind}, select: {storageKey: true}});
      await tx.bookFile.deleteMany({where: {bookId: id, kind}});
      const file = await tx.bookFile.create({data: {bookId: id, kind, storageKey: pathname, ...verified}, select: {id: true, kind: true, sizeBytes: true}});
      await tx.auditLog.create({data: {actorId: user.id, action: 'BOOK_FILE_UPLOAD', entity: 'Book', entityId: id, metadata: {kind, sizeBytes: verified.sizeBytes}}});
      return {file, old};
    });
    after(async () => {for (const old of result.old) if (old.storageKey !== pathname) {try {await del(old.storageKey);} catch {console.error('Old library attachment cleanup failed');}}});
    return NextResponse.json({file: result.file}, {status: 201});
  } catch (error) {return NextResponse.json({error: error instanceof MediaError ? error.message : 'Could not attach file. Retry saving the book.'}, {status: error instanceof MediaError ? error.status : 503});}
}
