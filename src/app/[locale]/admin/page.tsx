import Brand from '@/components/brand';
import {redirect} from 'next/navigation';
import Link from 'next/link';
import {getTranslations} from 'next-intl/server';
import {BookOpen, Users, Library, ArrowUpRight, Activity, ClipboardList, LayoutDashboard, FileText, AlertCircle} from 'lucide-react';
import {Prisma} from '@prisma/client';
import LocaleSwitcher from '@/components/locale-switcher';
import LogoutButton from '@/components/logout-button';
import BookManager from '@/components/admin/book-manager';
import {currentUser, hasRole} from '@/lib/auth';
import {db} from '@/lib/db';
import {positiveInteger} from '@/lib/book-validation';

export const dynamic = 'force-dynamic';

export default async function Admin({params, searchParams}: {params: Promise<{locale: string}>; searchParams: Promise<{tab?: string; q?: string; status?: string; page?: string}>}) {
  const {locale} = await params;
  const p = await searchParams;
  const t = await getTranslations({locale, namespace: 'admin'});
  const user = await currentUser();
  if (!user) redirect(`/${locale}/login`);
  if (!hasRole(user.role, ['LIBRARIAN'])) redirect(`/${locale}/account`);
  const admin = hasRole(user.role, ['ADMIN']);
  const tab = ['users', 'loans', 'activity'].includes(p.tab || '') ? p.tab! : 'books';
  const query = (p.q || '').trim().slice(0, 300);
  const status = ['ACTIVE', 'DRAFT', 'ARCHIVED'].includes(p.status || '') ? p.status! : '';
  const requestedPage = positiveInteger(p.page, 1);
  const where: Prisma.BookWhereInput = {...(status ? {status: status as 'ACTIVE' | 'DRAFT' | 'ARCHIVED'} : {}), ...(query ? {OR: [{title: {contains: query, mode: 'insensitive'}}, {isbn: {contains: query, mode: 'insensitive'}}, {authors: {some: {author: {fullName: {contains: query, mode: 'insensitive'}}}}}]} : {})};
  const data = await (async () => {
    try {
      const [totalBooks, activeBooks, draftBooks, usersCount, activeLoans, total] = await Promise.all([
        db.book.count(), db.book.count({where: {status: 'ACTIVE'}}), db.book.count({where: {status: 'DRAFT'}}), db.user.count(), db.loan.count({where: {status: {in: ['ACTIVE', 'OVERDUE']}}}), db.book.count({where}),
      ]);
      const pages = Math.max(1, Math.ceil(total / 12));
      const page = Math.min(requestedPage, pages);
      const [books, users, loans, activity] = await Promise.all([
        tab === 'books' ? db.book.findMany({where, take: 12, skip: (page - 1) * 12, orderBy: {createdAt: 'desc'}, include: {files: {select: {id: true, kind: true, sizeBytes: true}}, authors: {include: {author: true}}}}) : [],
        tab === 'users' && admin ? db.user.findMany({take: 50, orderBy: {createdAt: 'desc'}, select: {id: true, firstName: true, lastName: true, email: true, role: true, status: true, createdAt: true}}) : [],
        tab === 'loans' ? db.loan.findMany({take: 50, where: {status: {in: ['ACTIVE', 'OVERDUE']}}, orderBy: {dueAt: 'asc'}, include: {book: {select: {title: true}}, borrower: {select: {firstName: true, lastName: true}}}}) : [],
        tab === 'activity' && admin ? db.auditLog.findMany({take: 50, orderBy: {createdAt: 'desc'}, include: {actor: {select: {firstName: true, lastName: true}}}}) : [],
      ]);
      return {totalBooks, activeBooks, draftBooks, usersCount, activeLoans, total, pages, page, books, users, loans, activity};
    } catch {return null;}
  })();
  const tabs = [{key: 'books', icon: BookOpen}, ...(admin ? [{key: 'users', icon: Users}] : []), {key: 'loans', icon: ClipboardList}, ...(admin ? [{key: 'activity', icon: Activity}] : [])];
  const formatDate = (date: Date) => new Intl.DateTimeFormat(locale === 'uz' ? 'uz-UZ' : locale === 'ru' ? 'ru-RU' : 'en-GB', {dateStyle: 'medium', timeZone: 'Asia/Tashkent'}).format(date);
  const metrics = data ? [{label: 'totalBooks', value: data.totalBooks, icon: BookOpen, hint: `${t('draftBooks')}: ${data.draftBooks}`}, {label: 'activeBooks', value: data.activeBooks, icon: Library, hint: t('ACTIVE')}, {label: 'users', value: data.usersCount, icon: Users, hint: t(user.role)}, {label: 'activeLoans', value: data.activeLoans, icon: ClipboardList, hint: t('loans')}] : [];

  return <div className="min-h-screen bg-[#f5f7f8]">
    <a href="#admin-content" className="skip-link">{t('skip')}</a>
    <header className="border-b border-slate-200 bg-white"><div className="admin-container flex min-h-20 flex-wrap items-center justify-between gap-4 py-4"><Link href={`/${locale}`} className="flex items-center gap-3"><Brand/></Link><div className="flex flex-wrap items-center gap-3"><LocaleSwitcher/><Link className="admin-button secondary compact" href={`/${locale}/catalog`}>{t('catalog')}<ArrowUpRight size={15}/></Link><LogoutButton locale={locale}/></div></div></header>
    <div className="admin-container py-8 md:py-10"><div className="mb-8 flex flex-wrap items-start justify-between gap-4"><div><p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-teal"><LayoutDashboard size={14}/>{t('workspace')}</p><h1 className="text-3xl font-bold tracking-tight text-ink md:text-4xl">{t('title')}</h1><p className="mt-3 text-sm leading-6 text-slate-500">{t('subtitle')}</p></div><Link href={`/${locale}/account`} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-50 font-bold text-teal">{user.firstName.slice(0, 1)}</span><span className="text-sm font-semibold text-ink">{user.firstName} {user.lastName}<span className="mt-0.5 block text-xs font-normal text-slate-500">{t(user.role)}</span></span></Link></div>
    <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">{metrics.map(metric => <div key={metric.label} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm text-slate-500">{t(metric.label)}</p><metric.icon size={19} className="text-teal"/></div><p className="mt-4 text-3xl font-bold tracking-tight text-ink">{metric.value.toLocaleString()}</p><p className="mt-2 text-xs text-slate-500">{metric.hint}</p></div>)}</div>
    <nav aria-label={t('workspace')} className="mb-7 flex gap-2 overflow-x-auto border-b border-slate-200">{tabs.map(item => <Link key={item.key} href={`/${locale}/admin${item.key === 'books' ? '' : `?tab=${item.key}`}`} aria-current={tab === item.key ? 'page' : undefined} className={`admin-tab ${tab === item.key ? 'active' : ''}`}><item.icon size={17}/>{t(item.key)}</Link>)}</nav>
    <main id="admin-content" tabIndex={-1}>
    {!data ? <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-8"><AlertCircle className="text-amber-700"/><h2 className="mt-3 text-xl font-bold">{t('unavailable')}</h2><p className="mt-2 text-sm text-slate-600">{t('unavailableHint')}</p><Link href={`/${locale}/admin`} className="admin-button mt-5">{t('retry')}</Link></div> : <>
    {tab === 'books' && <BookManager books={data.books} total={data.total} page={data.page} pages={data.pages} query={query} status={status} locale={locale}/>}
    {tab === 'users' && (admin ? <><h2 className="text-xl font-bold">{t('users')}</h2><p className="mb-5 mt-2 text-sm text-slate-500">{t('peopleHint')} · {Math.min(50, data.usersCount)} / {data.usersCount}</p><div className="admin-table-wrap"><table className="admin-table"><thead><tr>{['name', 'email', 'role', 'status', 'joined'].map(k => <th key={k}>{t(k)}</th>)}</tr></thead><tbody>{data.users.map(person => <tr key={person.id}><td className="font-semibold">{person.firstName} {person.lastName}</td><td>{person.email}</td><td>{t(person.role)}</td><td><span className={`status-badge ${person.status === 'ACTIVE' ? 'status-active' : 'status-draft'}`}>{t(`user${person.status}`)}</span></td><td>{formatDate(person.createdAt)}</td></tr>)}</tbody></table>{!data.users.length && <p className="p-8 text-center text-slate-500">{t('noUsers')}</p>}</div></> : <p>{t('restricted')}</p>)}
    {tab === 'loans' && <><h2 className="text-xl font-bold">{t('loans')}</h2><p className="mb-5 mt-2 text-sm text-slate-500">{t('loanHint')} · {data.loans.length} / {data.activeLoans}</p><div className="admin-table-wrap"><table className="admin-table"><thead><tr>{['bookTitle', 'borrower', 'due', 'status'].map(k => <th key={k}>{t(k)}</th>)}</tr></thead><tbody>{data.loans.map(loan => <tr key={loan.id}><td className="font-semibold">{loan.book.title}</td><td>{loan.borrower.firstName} {loan.borrower.lastName}</td><td>{formatDate(loan.dueAt)}</td><td><span className={`status-badge ${loan.dueAt < new Date() ? 'status-draft' : 'status-active'}`}>{t(loan.status === 'OVERDUE' || loan.dueAt < new Date() ? 'loanOVERDUE' : 'loanACTIVE')}</span></td></tr>)}</tbody></table>{!data.loans.length && <p className="p-12 text-center text-slate-500">{t('noLoans')}</p>}</div></>}
    {tab === 'activity' && (admin ? <><h2 className="text-xl font-bold">{t('activity')}</h2><p className="mb-5 mt-2 text-sm text-slate-500">{t('activityHint')}</p><div className="admin-table-wrap"><table className="admin-table"><thead><tr>{['event', 'actor', 'date'].map(k => <th key={k}>{t(k)}</th>)}</tr></thead><tbody>{data.activity.map(event => <tr key={event.id}><td><span className="flex items-center gap-2 font-semibold"><FileText size={16} className="text-teal"/>{['BOOK_CREATE','BOOK_UPDATE','BOOK_ARCHIVE','BOOK_FILE_UPLOAD'].includes(event.action) ? t(event.action) : event.action}</span><span className="mt-1 block text-xs text-slate-400">{event.entity} · {event.entityId}</span></td><td>{event.actor ? `${event.actor.firstName} ${event.actor.lastName}` : t('system')}</td><td>{formatDate(event.createdAt)}</td></tr>)}</tbody></table>{!data.activity.length && <p className="p-12 text-center text-slate-500">{t('noActivity')}</p>}</div></> : <p>{t('restricted')}</p>)}
    </>}
    </main><footer className="mt-10 flex flex-wrap justify-between gap-3 border-t border-slate-200 pt-5 text-xs text-slate-400"><span>Sbumiptk Digital Library · {t('workspace')}</span><span>O‘zbekcha · Русский · English</span></footer></div>
  </div>;
}
