import Link from 'next/link';
import {redirect} from 'next/navigation';
import {getTranslations} from 'next-intl/server';
import {Prisma} from '@prisma/client';
import {BookOpen, Bookmark, CheckCircle2, ArrowRight, Library, Clock3, AlertCircle} from 'lucide-react';
import SiteShell from '@/components/site-shell';
import BookCover from '@/components/book-cover';
import SaveBookButton from '@/components/reader/save-book-button';
import LogoutButton from '@/components/logout-button';
import {currentUser, hasRole} from '@/lib/auth';
import {db} from '@/lib/db';
import {positiveInteger} from '@/lib/book-validation';
import {readingPercent} from '@/lib/reading';

type ShelfBook = Prisma.BookGetPayload<{include: {files: {select: {id: true; kind: true}}; authors: {include: {author: true}}; progress: true; favorites: true}}>;
async function ShelfCard({book, locale}: {book: ShelfBook; locale: string}) {
  const t = await getTranslations({locale, namespace: 'reader'});
  const progress = book.progress[0];const hasPdf = book.files.some(file => file.kind === 'PDF');
  const percent = progress ? readingPercent(progress.page, progress.totalPages, Boolean(progress.completedAt)) : 0;
  const href = hasPdf ? `/${locale}/read/${book.slug}${progress?.completedAt ? '?restart=1' : ''}` : `/${locale}/catalog/${book.slug}`;
  return <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"><div className="flex gap-4"><Link href={`/${locale}/catalog/${book.slug}`} className="w-20 shrink-0 sm:w-24"><BookCover bookId={book.id} title={book.title} files={book.files} className="!min-h-0 !p-2 [&_span]:text-xs"/></Link><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><h3 className="line-clamp-3 text-sm font-bold leading-6 text-ink">{book.title}</h3><SaveBookButton bookId={book.id} saved={book.favorites.length > 0} compact/></div><p className="mt-1 line-clamp-1 text-xs text-slate-500">{book.authors.map(item => item.author.fullName).join(', ') || '—'}</p><p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-teal">{book.language} {book.publicationYear ? `· ${book.publicationYear}` : ''}</p>{progress && <div className="mt-3"><div className="mb-1.5 flex flex-wrap justify-between gap-1 text-[11px] text-slate-500"><span>{progress.completedAt ? t('finished') : t('pageOf', {page: progress.page, total: progress.totalPages || book.pages || '—'})}</span><span>{percent}%</span></div><div role="progressbar" aria-label={t('progress')} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} className="h-1.5 overflow-hidden rounded-full bg-emerald-50"><span className="block h-full rounded-full bg-teal" style={{width: `${percent}%`}}/></div></div>}</div></div><Link href={href} className="admin-button secondary mt-4 w-full">{hasPdf ? progress?.completedAt ? t('readAgain') : progress ? t('continue') : t('startReading') : t('viewBook')}<ArrowRight size={15}/></Link></article>;
}

export default async function Account({params, searchParams}: {params: Promise<{locale: string}>; searchParams: Promise<{tab?: string; page?: string}>}) {
  const {locale} = await params;const search = await searchParams;
  const user = await currentUser();if (!user) redirect(`/${locale}/login`);
  const [t, account, admin] = await Promise.all([getTranslations({locale, namespace: 'reader'}), getTranslations({locale, namespace: 'account'}), getTranslations({locale, namespace: 'admin'})]);
  const tab = search.tab === 'saved' || search.tab === 'completed' ? search.tab : 'reading';
  const bookWhere = {status: 'ACTIVE' as const};
  const include = {files: {select: {id: true, kind: true}}, authors: {include: {author: true}}, progress: {where: {userId: user.id}}, favorites: {where: {userId: user.id}}} satisfies Prisma.BookInclude;
  const data = await (async () => {
    try {
      const [readingCount, savedCount, completedCount] = await Promise.all([
        db.readingProgress.count({where: {userId: user.id, completedAt: null, book: bookWhere}}),
        db.favorite.count({where: {userId: user.id, book: bookWhere}}),
        db.readingProgress.count({where: {userId: user.id, completedAt: {not: null}, book: bookWhere}}),
      ]);
      const total = tab === 'saved' ? savedCount : tab === 'completed' ? completedCount : readingCount;
      const pages = Math.max(1, Math.ceil(total / 12));const page = Math.min(positiveInteger(search.page, 1), pages);
      const [rows, recent, discoveries] = await Promise.all([
        tab === 'saved' ? db.favorite.findMany({where: {userId: user.id, book: bookWhere}, orderBy: {createdAt: 'desc'}, skip: (page - 1) * 12, take: 12, include: {book: {include}}}) : db.readingProgress.findMany({where: {userId: user.id, completedAt: tab === 'completed' ? {not: null} : null, book: bookWhere}, orderBy: {updatedAt: 'desc'}, skip: (page - 1) * 12, take: 12, include: {book: {include}}}),
        db.readingProgress.findFirst({where: {userId: user.id, completedAt: null, book: {...bookWhere, files: {some: {kind: 'PDF'}}}}, orderBy: {updatedAt: 'desc'}, include: {book: {include}}}),
        db.book.findMany({where: {...bookWhere, files: {some: {kind: 'PDF'}}, progress: {none: {userId: user.id}}, favorites: {none: {userId: user.id}}}, orderBy: {createdAt: 'desc'}, take: 4, include}),
      ]);
      return {readingCount, savedCount, completedCount, total, pages, page, books: rows.map(row => row.book), recent, discoveries};
    } catch {return null;}
  })();
  const tabs = [{key: 'reading', icon: BookOpen, count: data?.readingCount || 0}, {key: 'saved', icon: Bookmark, count: data?.savedCount || 0}, {key: 'completed', icon: CheckCircle2, count: data?.completedCount || 0}];
  return <SiteShell locale={locale}><section className="container py-9 md:py-12">
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-xs font-bold uppercase tracking-[.16em] text-teal">{account('eyebrow')}</p><h1 className="text-3xl font-bold tracking-tight text-ink md:text-4xl">{account('welcome', {name: user.firstName})}</h1><p className="mt-3 text-sm text-slate-500">{t('dashboardIntro')}</p></div><Link href={`/${locale}/catalog`} className="admin-button secondary"><Library size={17}/>{t('browse')}</Link></div>
    {!data ? <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-6"><AlertCircle className="text-amber-700"/><p className="mt-3 font-semibold">{t('loadFailed')}</p><Link href={`/${locale}/account`} className="admin-button mt-4">{t('retry')}</Link></div> : <>
    <div className="mb-7 grid grid-cols-3 gap-3 sm:gap-4">{tabs.map(item => <Link key={item.key} href={`/${locale}/account?tab=${item.key}`} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5"><item.icon size={20} className="mb-3 text-teal"/><span className="block text-2xl font-bold text-ink sm:text-3xl">{item.count}</span><span className="mt-2 block text-xs leading-5 text-slate-500 sm:text-sm">{t(item.key)}</span></Link>)}</div>
    {data.recent ? <div className="mb-8 grid items-center gap-5 rounded-3xl bg-[#104d3b] p-6 text-white shadow-lg shadow-emerald-950/10 sm:grid-cols-[96px_1fr_auto] sm:p-7"><BookCover bookId={data.recent.book.id} title={data.recent.book.title} files={data.recent.book.files} className="!min-h-0 max-w-24 !p-2 [&_span]:text-xs"/><div><p className="mb-2 flex items-center gap-2 text-xs font-semibold text-emerald-200"><Clock3 size={14}/>{t('pickUp')}</p><h2 className="line-clamp-2 text-xl font-bold">{data.recent.book.title}</h2><p className="mt-3 text-sm text-emerald-100/70">{t('pageOf', {page: data.recent.page, total: data.recent.totalPages || data.recent.book.pages || '—'})} · {readingPercent(data.recent.page, data.recent.totalPages, false)}%</p></div><Link className="admin-button !bg-white !text-emerald-900" href={`/${locale}/read/${data.recent.book.slug}`}>{t('continue')}<ArrowRight size={16}/></Link></div> : <div className="mb-8 flex flex-wrap items-center justify-between gap-5 rounded-3xl border border-emerald-100 bg-emerald-50/60 p-6"><div><h2 className="font-bold text-ink">{t('startJourney')}</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">{t('startJourneyHint')}</p></div><Link href={`/${locale}/catalog`} className="admin-button">{t('chooseBook')}<ArrowRight size={16}/></Link></div>}
    <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_250px]"><div className="min-w-0"><nav aria-label={t('myLibrary')} className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200">{tabs.map(item => <Link key={item.key} href={`/${locale}/account?tab=${item.key}`} aria-current={tab === item.key ? 'page' : undefined} className={`admin-tab !px-3 ${tab === item.key ? 'active' : ''}`}><item.icon size={16}/>{t(item.key)} <span className="ml-1 text-xs opacity-60">{item.count}</span></Link>)}</nav>
    {data.books.length ? <div className="grid gap-4 md:grid-cols-2">{data.books.map(book => <ShelfCard key={book.id} book={book} locale={locale}/>)}</div> : <div className="rounded-2xl border border-dashed border-emerald-200 bg-white px-5 py-12 text-center"><BookOpen size={34} className="mx-auto text-emerald-300"/><h2 className="mt-4 text-lg font-bold text-ink">{t(`empty_${tab}`)}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{t(`emptyHint_${tab}`)}</p><Link href={`/${locale}/catalog`} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-teal">{t('chooseBook')}<ArrowRight size={15}/></Link></div>}
    {data.pages > 1 && <div className="mt-5 flex items-center justify-between gap-3 text-sm text-slate-500"><span>{data.page} / {data.pages}</span><div className="flex gap-2">{data.page > 1 && <Link className="admin-button secondary compact" href={`/${locale}/account?tab=${tab}&page=${data.page - 1}`}>{t('previous')}</Link>}{data.page < data.pages && <Link className="admin-button secondary compact" href={`/${locale}/account?tab=${tab}&page=${data.page + 1}`}>{t('next')}</Link>}</div></div>}
    </div><aside className="space-y-4"><div className="rounded-2xl border border-slate-200/80 bg-white p-5"><span className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-emerald-50 font-bold text-teal">{user.firstName.slice(0,1)}</span><h2 className="font-bold text-ink">{user.firstName} {user.lastName}</h2><p className="mt-2 break-all text-xs text-slate-500">{user.email}</p><p className="mt-3 text-xs text-teal">{account(`roles.${user.role}`)} · {account(`statuses.${user.status}`)}</p><div className="mt-5 flex flex-wrap gap-2">{hasRole(user.role, ['LIBRARIAN']) && <Link href={`/${locale}/admin`} className="admin-button compact">{admin('manage')}</Link>}<LogoutButton locale={locale}/></div></div><div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5"><h2 className="mb-3 text-sm font-bold text-ink">{t('howItWorks')}</h2><ol className="list-inside list-decimal space-y-3 text-xs leading-6 text-slate-600"><li>{t('stepChoose')}</li><li>{t('stepRead')}</li><li>{t('stepResume')}</li></ol></div></aside></div>
    {data.discoveries.length > 0 && <section className="mt-10"><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold text-ink">{t('discover')}</h2><p className="mt-2 text-sm text-slate-500">{t('discoverHint')}</p></div><Link href={`/${locale}/catalog`} className="text-sm font-semibold text-teal">{t('browse')} →</Link></div><div className="grid gap-4 md:grid-cols-2">{data.discoveries.map(book => <ShelfCard key={book.id} book={book} locale={locale}/>)}</div></section>}
    </>}
  </section></SiteShell>;
}
