'use client';

import {useEffect, useRef, useState, useTransition} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {useTranslations} from 'next-intl';
import BookCover from '@/components/book-cover';
import MediaFields, {type Attachment, type SelectedMedia} from './media-fields';
import {slugify} from '@/lib/slug';
import {mediaRules, validMediaHeader, type MediaKind} from '@/lib/media-validation';
import {uploadMedia} from '@/lib/upload-media';
import {BookOpen, Plus, Search, Pencil, X, ArrowUpRight, LoaderCircle} from 'lucide-react';

export type ManagedBook = {
  id: string; title: string; slug: string; description: string; isbn: string | null;
  language: string; publicationYear: number | null; pages: number | null;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED'; featured: boolean; downloadsAllowed: boolean;
  authors: {author: {fullName: string}}[]; files: Attachment[];
};

type Editor = {title: string; slug: string; description: string; isbn: string; language: string; publicationYear: string; pages: string; status: string; featured: boolean; downloadsAllowed: boolean; authorNames: string};
const blank: Editor = {title: '', slug: '', description: '', isbn: '', language: 'uz', publicationYear: '', pages: '', status: 'DRAFT', featured: false, downloadsAllowed: false, authorNames: ''};
const inputClass = 'admin-input';

export default function BookManager({books, total, page, pages, query, status, locale}: {books: ManagedBook[]; total: number; page: number; pages: number; query: string; status: string; locale: string}) {
  const t = useTranslations('admin');
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [editing, setEditing] = useState<ManagedBook | null>(null);
  const [form, setForm] = useState<Editor>(blank);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState<SelectedMedia>({PDF: null, COVER: null});
  const uploaded = useRef<Partial<Record<MediaKind, string>>>({});
  const [progress, setProgress] = useState('');
  const [editorSession, setEditorSession] = useState(0);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!dirty) return;
    const prevent = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, [dirty]);

  function open(book: ManagedBook | null) {
    setEditorSession(previous => previous + 1);setEditing(book); setError(''); setDirty(false); setSelected({PDF: null, COVER: null}); uploaded.current = {}; setProgress('');
    setForm(book ? {title: book.title, slug: book.slug, description: book.description, isbn: book.isbn || '', language: book.language, publicationYear: book.publicationYear?.toString() || '', pages: book.pages?.toString() || '', status: book.status, featured: book.featured, downloadsAllowed: book.downloadsAllowed, authorNames: book.authors.map(a => a.author.fullName).join(', ')} : blank);
    dialog.current?.showModal();
  }
  function close() {
    if (saving || (dirty && !window.confirm(t('confirmDiscard')))) return;
    dialog.current?.close(); setDirty(false);
  }
  function change<K extends keyof Editor>(key: K, value: Editor[K]) {setForm(previous => ({...previous, [key]: value})); setDirty(true);}
  async function chooseFile(kind: MediaKind, file: File | null) {
    if (file) {
      const rule = mediaRules[kind];
      const prefix = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
      if (file.size < 1 || file.size > rule.maxBytes || !(rule.types as readonly string[]).includes(file.type) || !validMediaHeader(kind, file.type, prefix)) {
        setError(t(kind === 'PDF' ? 'invalidPdf' : 'invalidCover')); throw new Error('Invalid media');
      }
    }
    delete uploaded.current[kind]; setSelected(previous => ({...previous, [kind]: file}));setDirty(true);setError('');
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(''); setProgress('');
    let metadataSaved = false;
    try {
      const staging = Boolean((selected.PDF || selected.COVER) && form.status === 'ACTIVE' && editing?.status !== 'ACTIVE');
      const response = await fetch(editing ? `/api/books/${editing.id}` : '/api/books', {
        method: editing ? 'PATCH' : 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({...form, slug: form.slug || slugify(form.title) || `book-${crypto.randomUUID().slice(0, 8)}`, status: staging ? 'DRAFT' : form.status, isbn: form.isbn || null, publicationYear: form.publicationYear ? Number(form.publicationYear) : null, pages: form.pages ? Number(form.pages) : null, authorNames: [...new Set(form.authorNames.split(',').map(s => s.trim()).filter(Boolean))]}),
      });
      const data = await response.json();
      if (!response.ok) {setError(t(data.code === 'DUPLICATE' ? 'duplicate' : 'failed')); return;}
      metadataSaved = true;
      const savedBook: ManagedBook = {...data.book, authors: form.authorNames.split(',').map(fullName => ({author: {fullName: fullName.trim()}})), files: editing?.files || []};
      setEditing(savedBook);setForm(previous => ({...previous, slug: data.book.slug}));
      for (const kind of ['PDF', 'COVER'] as const) {
        const file = selected[kind]; if (!file) continue;
        setProgress(`${t(kind === 'PDF' ? 'uploadingPdf' : 'uploadingCover')} 0%`);
        const pathname = await uploadMedia(savedBook.id, kind, file, percentage => setProgress(`${t(kind === 'PDF' ? 'uploadingPdf' : 'uploadingCover')} ${Math.round(percentage)}%`), uploaded.current[kind]);
        uploaded.current[kind] = pathname;setProgress(t('checkingFile'));
        const attached = await fetch(`/api/books/${savedBook.id}/attachments`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({kind, pathname})});
        if (!attached.ok) throw new Error('Attachment failed');
        const result = await attached.json();
        savedBook.files = [...savedBook.files.filter(existing => existing.kind !== kind), result.file];
        setEditing({...savedBook});setSelected(previous => ({...previous, [kind]: null}));delete uploaded.current[kind];
      }
      if (staging) {
        const published = await fetch(`/api/books/${savedBook.id}`, {method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({status: 'ACTIVE'})});
        if (!published.ok) throw new Error('Publishing failed');
      }
      setDirty(false); dialog.current?.close(); setNotice(t('saved'));
      startTransition(() => router.refresh());
    } catch {setError(t(metadataSaved ? 'uploadFailed' : 'failed'));if (metadataSaved) startTransition(() => router.refresh());} finally {setSaving(false);setProgress('');}
  }
  function pageUrl(n: number) {const params = new URLSearchParams({q: query, status, page: String(n)});return `/${locale}/admin?${params}`;}

  return <>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl font-bold text-ink">{t('books')} <span className="ml-2 rounded-lg bg-emerald-50 px-2 py-1 text-sm text-teal">{total}</span></h2><p className="mt-1 text-sm text-slate-500">{t('formHint')}</p></div><button className="admin-button" onClick={() => open(null)}><Plus size={18}/>{t('add')}</button></div>
    <form action={`/${locale}/admin`} className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 sm:flex-row"><label className="relative flex-1"><span className="sr-only">{t('search')}</span><Search size={18} className="absolute left-3 top-3 text-slate-400"/><input name="q" defaultValue={query} placeholder={t('search')} className="admin-input pl-10"/></label><select name="status" aria-label={t('status')} defaultValue={status} className="admin-input sm:w-44"><option value="">{t('all')}</option>{(['ACTIVE','DRAFT','ARCHIVED'] as const).map(s => <option key={s} value={s}>{t(s)}</option>)}</select><button className="admin-button secondary">{t('searchButton')}</button></form>
    {notice && <div role="status" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}<button aria-label={t('close')} onClick={() => setNotice('')}><X size={18}/></button></div>}
    <div aria-busy={pending} className={`overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ${pending ? 'opacity-60' : ''}`}>
      {books.length ? <div className="overflow-x-auto"><table className="admin-table"><thead><tr><th>{t('bookTitle')}</th><th>{t('status')}</th><th>{t('language')}</th><th>{t('year')}</th><th aria-label={t('actions')}></th></tr></thead><tbody>{books.map(book => <tr key={book.id}><td><div className="flex items-center gap-3"><BookCover bookId={book.id} title={book.title} files={book.files} className="!h-12 !min-h-0 !w-10 shrink-0 !rounded-lg !p-1 [&_span]:hidden"/><div className="min-w-0"><span className="block max-w-sm break-words font-semibold text-ink">{book.title}</span><span className="mt-1 block max-w-sm text-xs text-slate-500">{book.authors.map(a => a.author.fullName).join(', ') || t('noAuthor')}</span></div></div></td><td><span className={`status-badge status-${book.status.toLowerCase()}`}>{t(book.status)}</span></td><td><span className="text-xs font-semibold uppercase text-slate-500">{book.language}</span></td><td className="text-slate-500">{book.publicationYear || '—'}</td><td><div className="flex justify-end gap-2">{book.status === 'ACTIVE' && <Link href={`/${locale}/catalog/${book.slug}`} aria-label={`${t('preview')}: ${book.title}`} className="admin-icon"><ArrowUpRight size={17}/></Link>}<button className="admin-icon" aria-label={`${t('edit')}: ${book.title}`} onClick={() => open(book)}><Pencil size={16}/></button></div></td></tr>)}</tbody></table></div> : <div className="px-5 py-16 text-center"><BookOpen className="mx-auto text-emerald-300" size={42}/><h3 className="mt-4 font-bold text-ink">{t('empty')}</h3><p className="mt-2 text-sm text-slate-500">{t('emptyHint')}</p>{(query || status) && <Link href={`/${locale}/admin`} className="mt-4 inline-block text-sm font-semibold text-teal underline">{t('reset')}</Link>}</div>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 text-sm text-slate-500"><span>{t('results')}: {total} · {t('page')} {page} / {pages}</span><div className="flex gap-2">{page > 1 && <Link className="admin-button secondary compact" href={pageUrl(page - 1)}>{t('previous')}</Link>}{page < pages && <Link className="admin-button secondary compact" href={pageUrl(page + 1)}>{t('next')}</Link>}</div></div>
    </div>
    <dialog ref={dialog} className="admin-dialog" aria-labelledby="book-editor-title" onCancel={event => {event.preventDefault();close();}} onClick={event => {if (event.target === dialog.current) close();}}>
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6"><div><h2 id="book-editor-title" className="text-xl font-bold text-ink">{t(editing ? 'editBook' : 'newBook')}</h2><p className="mt-2 text-sm text-slate-500">{t('formHint')}</p></div><button type="button" className="admin-icon shrink-0" aria-label={t('close')} onClick={close} disabled={saving}><X size={20}/></button></div>
      <form onSubmit={save}><fieldset disabled={saving} className="grid gap-5 p-6 sm:grid-cols-2">
        <label className="admin-label sm:col-span-2">{t('bookTitle')} *<input autoFocus required maxLength={300} value={form.title} onChange={e => {const title = e.target.value;setForm(previous => ({...previous, title, ...(!editing && (!previous.slug || previous.slug === slugify(previous.title)) ? {slug: slugify(title)} : {})}));setDirty(true);}} className={inputClass}/></label>
        <label className="admin-label sm:col-span-2">{t('authors')}<input maxLength={2000} value={form.authorNames} onChange={e => change('authorNames', e.target.value)} className={inputClass}/><span className="admin-help">{t('authorHint')}</span></label>
        <label className="admin-label">{t('slug')}<input pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={320} placeholder={slugify(form.title) || 'book'} value={form.slug} onChange={e => change('slug', e.target.value)} className={inputClass}/><span className="admin-help">{t('slugHint')}</span></label>
        <label className="admin-label">ISBN<input maxLength={20} value={form.isbn} onChange={e => change('isbn', e.target.value)} className={inputClass}/></label>
        <MediaFields key={editorSession} bookId={editing?.id} files={editing?.files || []} selected={selected} choose={chooseFile}/><label className="admin-label sm:col-span-2">{t('description')}<textarea rows={4} maxLength={20000} value={form.description} onChange={e => change('description', e.target.value)} className={inputClass}/></label>
        <label className="admin-label">{t('language')}<select aria-label={t('language')} value={form.language} onChange={e => change('language', e.target.value)} className={inputClass}><option value="uz">O‘zbekcha</option><option value="ru">Русский</option><option value="en">English</option></select></label>
        <label className="admin-label">{t('status')}<select aria-label={t('status')} value={form.status} onChange={e => change('status', e.target.value)} className={inputClass}>{(['DRAFT', 'ACTIVE', 'ARCHIVED'] as const).map(s => <option key={s} value={s}>{t(s)}</option>)}</select></label>
        <label className="admin-label">{t('year')}<input type="number" min={1400} max={new Date().getFullYear() + 1} value={form.publicationYear} onChange={e => change('publicationYear', e.target.value)} className={inputClass}/></label>
        <label className="admin-label">{t('pages')}<input type="number" min={1} max={2147483647} value={form.pages} onChange={e => change('pages', e.target.value)} className={inputClass}/></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.featured} onChange={e => change('featured', e.target.checked)} className="h-4 w-4 accent-emerald-700"/>{t('featured')}</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.downloadsAllowed} onChange={e => change('downloadsAllowed', e.target.checked)} className="h-4 w-4 accent-emerald-700"/>{t('downloads')}</label>
      </fieldset>{progress && <p role="status" aria-live="polite" className="mx-6 mb-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-teal">{progress}</p>}{error && <p role="alert" className="mx-6 mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4"><button type="button" onClick={close} disabled={saving} className="admin-button secondary">{t('cancel')}</button><button disabled={saving} className="admin-button">{saving && <LoaderCircle size={16} className="animate-spin"/>}{t(saving ? 'saving' : 'save')}</button></div></form>
    </dialog>
  </>;
}
