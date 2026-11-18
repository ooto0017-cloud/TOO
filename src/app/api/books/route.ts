import {NextRequest, NextResponse} from 'next/server';
import {Prisma} from '@prisma/client';
import {db} from '@/lib/db';
import {currentUser, hasRole} from '@/lib/auth';
import {createBookSchema, positiveInteger} from '@/lib/book-validation';
import {isBookSection} from '@/lib/book-sections';
import {checkOrigin} from '@/lib/origin';

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const management = p.get('manage') === '1';
  if (management) {
    const user = await currentUser();
    if (!user || !hasRole(user.role, ['LIBRARIAN'])) return NextResponse.json({error: 'Forbidden'}, {status: 403});
  }
  const q = p.get('q')?.trim();
  const page = positiveInteger(p.get('page'), 1);
  const take = positiveInteger(p.get('limit'), 12, 50);
  const status = p.get('status');
  const where: Prisma.BookWhereInput = {
    ...(!management ? {status: 'ACTIVE'} : ['ACTIVE', 'DRAFT', 'ARCHIVED'].includes(status || '') ? {status: status as 'ACTIVE' | 'DRAFT' | 'ARCHIVED'} : {}),
    ...(isBookSection(p.get('section')) ? {section: p.get('section') as import('@prisma/client').BookSection} : {}),
    ...(p.get('language') ? {language: p.get('language')!} : {}),
    ...(q ? {OR: [{title: {contains: q, mode: 'insensitive'}}, {isbn: {contains: q, mode: 'insensitive'}}, {authors: {some: {author: {fullName: {contains: q, mode: 'insensitive'}}}}}]} : {}),
  };
  try {
    const [items, total] = await Promise.all([
      db.book.findMany({where, skip: (page - 1) * take, take, orderBy: {createdAt: 'desc'}, include: {authors: {include: {author: true}}, categories: {include: {category: true}}}}),
      db.book.count({where}),
    ]);
    return NextResponse.json({items, total, page, limit: take, pages: Math.ceil(total / take)});
  } catch { return NextResponse.json({error: 'Database unavailable'}, {status: 503}); }
}

export async function POST(req: NextRequest) {
  const rejected = checkOrigin(req); if (rejected) return rejected;
  const user = await currentUser();
  if (!user || !hasRole(user.role, ['LIBRARIAN'])) return NextResponse.json({error: 'Forbidden'}, {status: 403});
  const p = createBookSchema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({error: 'Invalid book data', details: p.error.flatten()}, {status: 400});
  const {authorNames, ...data} = p.data;
  try {
    const book = await db.$transaction(async tx => {
      const created = await tx.book.create({data: {...data, isbn: data.isbn || null, authors: {create: (authorNames || []).map(fullName => ({author: {create: {fullName}}}))}}});
      await tx.auditLog.create({data: {actorId: user.id, action: 'BOOK_CREATE', entity: 'Book', entityId: created.id}});
      return created;
    });
    return NextResponse.json({book}, {status: 201});
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return NextResponse.json({error: 'Slug or ISBN already exists', code: 'DUPLICATE'}, {status: 409});
    return NextResponse.json({error: 'Could not create book'}, {status: 503});
  }
}
