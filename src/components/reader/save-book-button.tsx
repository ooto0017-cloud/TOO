'use client';
import {useState, useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {Bookmark, BookmarkCheck, LoaderCircle} from 'lucide-react';
export default function SaveBookButton({bookId, saved, compact = false}: {bookId: string; saved: boolean; compact?: boolean}) {
  const t = useTranslations('reader');const router = useRouter();
  const [busy, setBusy] = useState(false);const [error, setError] = useState(false);const [pending, startTransition] = useTransition();
  async function toggle() {
    setBusy(true);setError(false);
    try {
      const result = await fetch(`/api/me/saved/${bookId}`, {method: saved ? 'DELETE' : 'PUT'});
      if (!result.ok) throw new Error();
      startTransition(() => router.refresh());
    } catch {setError(true);} finally {setBusy(false);}
  }
  const Icon = saved ? BookmarkCheck : Bookmark;
  return <span className="inline-flex flex-col items-start gap-1"><button type="button" aria-pressed={saved} aria-label={t(saved ? 'removeSaved' : 'saveBook')} title={t(saved ? 'removeSaved' : 'saveBook')} disabled={busy || pending} onClick={toggle} className={compact ? 'admin-icon' : 'admin-button secondary'}>{busy || pending ? <LoaderCircle size={17} className="animate-spin"/> : <Icon size={17}/ >}{!compact && t(saved ? 'saved' : 'saveBook')}</button>{error && <span role="alert" className="max-w-48 text-xs text-red-700">{t('actionFailed')}</span>}</span>;
}
