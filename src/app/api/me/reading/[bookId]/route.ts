import {NextRequest, NextResponse} from 'next/server';
import {currentUser} from '@/lib/auth';
import {db} from '@/lib/db';
import {checkOrigin} from '@/lib/origin';
import {readingSchema} from '@/lib/reading';
export async function PUT(req: NextRequest, {params}: {params: Promise<{bookId: string}>}) {
  const rejected = checkOrigin(req); if (rejected) return rejected;
  const user = await currentUser();
  if (!user) return NextResponse.json({error: 'Sign in required'}, {status: 401});
  const {bookId} = await params;
  const parsed = readingSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({error: 'Invalid reading progress'}, {status: 400});
  try {
    const book = await db.book.findFirst({where: {id: bookId, status: 'ACTIVE', files: {some: {kind: 'PDF'}}}, select: {id: true}});
    if (!book) return NextResponse.json({error: 'Book unavailable'}, {status: 404});
    const {page, totalPages, completed} = parsed.data;
    const data = {page: completed ? totalPages : page, totalPages, completedAt: completed ? new Date() : null};
    const progress = await db.readingProgress.upsert({where: {userId_bookId: {userId: user.id, bookId}}, create: {userId: user.id, bookId, ...data}, update: data, select: {page: true, totalPages: true, completedAt: true, updatedAt: true}});
    return NextResponse.json({progress});
  } catch {return NextResponse.json({error: 'Could not save progress'}, {status: 503});}
}
