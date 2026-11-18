import SaveBookButton from '@/components/reader/save-book-button';
import {notFound} from 'next/navigation';
import Link from 'next/link';
import {getTranslations} from 'next-intl/server';
import {BookOpen, Download} from 'lucide-react';
import SiteShell from '@/components/site-shell';
import BookCover from '@/components/book-cover';
import {db} from '@/lib/db';
import {currentUser} from '@/lib/auth';

export default async function BookDetail({params}: {params: Promise<{locale: string; slug: string}>}) {
  const {locale, slug} = await params;
  const t = await getTranslations({locale, namespace: 'book'});
  const [book, user] = await Promise.all([
    db.book.findFirst({where: {slug, status: 'ACTIVE'}, include: {authors: {include: {author: true}}, categories: {include: {category: true}}, publisher: true, files: {select: {id: true, kind: true, sizeBytes: true}}}}),
    currentUser(),
  ]);
  if (!book) notFound();
  const saved = user ? Boolean(await db.favorite.findUnique({where:{userId_bookId:{userId:user.id,bookId:book.id}},select:{id:true}})) : false;
  const pdf = book.files.find(file => file.kind === 'PDF');
  return <SiteShell locale={locale}><article className="container max-w-4xl py-12 md:py-16">
    <p className="text-xs font-bold uppercase tracking-widest text-teal">{t('eyebrow')}</p>
    <h1 className="mt-3 break-words text-3xl font-bold text-ink md:text-4xl">{book.title}</h1>
    {book.subtitle && <p className="mt-2 text-xl text-slate-500">{book.subtitle}</p>}
    <div className="mt-8 grid items-start gap-8 md:grid-cols-[220px_1fr]">
      <BookCover bookId={book.id} title={book.title} files={book.files} className="mx-auto w-full max-w-[260px] min-h-[290px] md:max-w-none"/>
      <div><p className="whitespace-pre-line leading-7 text-slate-600">{book.description || t('noDescription')}</p>
        <div className="mt-5">{user&&<SaveBookButton bookId={book.id} saved={saved}/>}</div><dl className="mt-7 grid grid-cols-2 gap-4 text-sm">{book.section&&<div className="col-span-2"><dt className="text-slate-400">{t('section')}</dt><dd className="mt-1 font-semibold text-teal">{t(`sections.${book.section}`)}</dd></div>}
          <div><dt className="text-slate-400">{t('authors')}</dt><dd className="mt-1 font-semibold">{book.authors.map(x => x.author.fullName).join(', ') || '—'}</dd></div>
          <div><dt className="text-slate-400">{t('publisher')}</dt><dd className="mt-1 font-semibold">{book.publisher?.name || '—'}</dd></div>
          <div><dt className="text-slate-400">{t('year')}</dt><dd className="mt-1 font-semibold">{book.publicationYear || '—'}</dd></div>
          <div><dt className="text-slate-400">ISBN</dt><dd className="mt-1 font-semibold">{book.isbn || '—'}</dd></div>
          <div><dt className="text-slate-400">{t('language')}</dt><dd className="mt-1 font-semibold">{book.language.toUpperCase()}</dd></div>
          <div><dt className="text-slate-400">{t('pages')}</dt><dd className="mt-1 font-semibold">{book.pages || '—'}</dd></div>
        </dl>
        {pdf ? <div className="mt-8 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5"><p className="mb-4 text-sm text-slate-500">PDF · {(pdf.sizeBytes / 1048576).toFixed(1)} MB</p><div className="flex flex-wrap gap-3">{user ? <Link className="admin-button" href={`/${locale}/read/${book.slug}`}><BookOpen size={17}/>{t('openPdf')}</Link> : <Link href={`/${locale}/login`} className="admin-button"><BookOpen size={17}/>{t('signInToRead')}</Link>}{book.downloadsAllowed && user && <a className="admin-button secondary" href={`/api/books/${book.id}/file?kind=PDF&download=1`}><Download size={17}/>{t('downloadPdf')}</a>}</div></div> : <p className="mt-8 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{t('noPdf')}</p>}
      </div>
    </div>
  </article></SiteShell>;
}
