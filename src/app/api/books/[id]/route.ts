import {NextRequest, NextResponse} from 'next/server';
import {Prisma} from '@prisma/client';
import {db} from '@/lib/db';
import {currentUser, hasRole} from '@/lib/auth';
import {updateBookSchema} from '@/lib/book-validation';
import {checkOrigin} from '@/lib/origin';

export async function PATCH(req: NextRequest, {params}: {params: Promise<{id: string}>}) {
  const rejected = checkOrigin(req); if (rejected) return rejected;
  const user = await currentUser();
  if (!user || !hasRole(user.role, ['LIBRARIAN'])) return NextResponse.json({error: 'Forbidden'}, {status: 403});
  const {id} = await params;
  const p = updateBookSchema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({error: 'Invalid book data'}, {status: 400});
  const {authorNames, ...data} = p.data;
  try {
    const book = await db.$transaction(async tx => {
      const updated = await tx.book.update({where: {id}, data: {...data, ...(data.isbn !== undefined ? {isbn: data.isbn || null} : {}), ...(authorNames ? {authors: {deleteMany: {}, create: authorNames.map(fullName => ({author: {create: {fullName}}}))}} : {})}});
      await tx.auditLog.create({data: {actorId: user.id, action: 'BOOK_UPDATE', entity: 'Book', entityId: id}});
      return updated;
    });
    return NextResponse.json({book});
  } catch (error) {
    const code = error instanceof Prisma.PrismaClientKnownRequestError ? error.code : '';
    return NextResponse.json({error: code === 'P2002' ? 'Slug or ISBN already exists' : 'Update failed', code: code === 'P2002' ? 'DUPLICATE' : undefined}, {status: code === 'P2002' ? 409 : code === 'P2025' ? 404 : 503});
  }
}

export async function DELETE(req: NextRequest, {params}: {params: Promise<{id: string}>}) {
  const rejected = checkOrigin(req); if (rejected) return rejected;
  const user = await currentUser();
  if (!user || !hasRole(user.role, ['ADMIN'])) return NextResponse.json({error: 'Forbidden'}, {status: 403});
  const {id} = await params;
  try {
    await db.$transaction(async tx => {
      await tx.book.update({where: {id}, data: {status: 'ARCHIVED'}});
      await tx.auditLog.create({data: {actorId: user.id, action: 'BOOK_ARCHIVE', entity: 'Book', entityId: id}});
    });
    return NextResponse.json({ok: true});
  } catch { return NextResponse.json({error: 'Archive failed'}, {status: 404}); }
}
