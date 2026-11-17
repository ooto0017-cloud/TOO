import {notFound, redirect} from 'next/navigation';
import SiteShell from '@/components/site-shell';
import PdfReader from '@/components/reader/pdf-reader';
import {currentUser} from '@/lib/auth';
import {db} from '@/lib/db';
export default async function ReadBook({params, searchParams}: {params: Promise<{locale: string; slug: string}>; searchParams: Promise<{restart?: string}>}) {
  const {locale, slug} = await params;const {restart} = await searchParams;
  const user = await currentUser();if (!user) redirect(`/${locale}/login`);
  const book = await db.book.findFirst({where: {slug, status: 'ACTIVE'}, select: {id: true, title: true, slug: true, downloadsAllowed: true, files: {where: {kind: 'PDF'}, orderBy: {createdAt: 'desc'}, take: 1, select: {id: true}}, progress: {where: {userId: user.id}, take: 1}, favorites: {where: {userId: user.id}, take: 1, select: {id: true}}}});
  if (!book || !book.files[0]) notFound();
  const progress = book.progress[0];
  return <SiteShell locale={locale}><PdfReader key={book.id} bookId={book.id} slug={book.slug} fileId={book.files[0].id} title={book.title} locale={locale} initialPage={restart === '1' ? 1 : progress?.page || 1} initialCompleted={restart !== '1' && Boolean(progress?.completedAt)} saved={book.favorites.length > 0} downloadsAllowed={book.downloadsAllowed}/></SiteShell>;
}
