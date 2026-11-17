import {NextRequest, NextResponse} from 'next/server';
import {currentUser} from '@/lib/auth';
import {db} from '@/lib/db';
import {checkOrigin} from '@/lib/origin';
export async function PUT(req: NextRequest, {params}: {params: Promise<{bookId: string}>}) {
  const rejected = checkOrigin(req); if (rejected) return rejected;
  const user = await currentUser();
  if (!user) return NextResponse.json({error: 'Sign in required'}, {status: 401});
  const {bookId} = await params;
  try {
    if (!await db.book.findFirst({where: {id: bookId, status: 'ACTIVE'}, select: {id: true}})) return NextResponse.json({error: 'Book unavailable'}, {status: 404});
    await db.favorite.upsert({where: {userId_bookId: {userId: user.id, bookId}}, create: {userId: user.id, bookId}, update: {}});
    return NextResponse.json({saved: true});
  } catch {return NextResponse.json({error: 'Could not save book'}, {status: 503});}
}
export async function DELETE(req: NextRequest, {params}: {params: Promise<{bookId: string}>}) {
  const rejected = checkOrigin(req); if (rejected) return rejected;
  const user = await currentUser();
  if (!user) return NextResponse.json({error: 'Sign in required'}, {status: 401});
  const {bookId} = await params;
  try {await db.favorite.deleteMany({where: {userId: user.id, bookId}});return NextResponse.json({saved: false});}
  catch {return NextResponse.json({error: 'Could not remove saved book'}, {status: 503});}
}
