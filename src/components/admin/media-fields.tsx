'use client';
import {useEffect, useState} from 'react';
import {useTranslations} from 'next-intl';
import {FileText, ImagePlus} from 'lucide-react';
import {type MediaKind} from '@/lib/media-validation';
export type Attachment = {id: string; kind: string; sizeBytes: number};
export type SelectedMedia = Record<MediaKind, File | null>;
export default function MediaFields({bookId, files, selected, choose}: {bookId?: string; files: Attachment[]; selected: SelectedMedia; choose: (kind: MediaKind, file: File | null) => Promise<void>}) {
  const t = useTranslations('admin');
  const [preview, setPreview] = useState('');
  useEffect(() => {
    if (!selected.COVER) {setPreview(''); return;}
    const url = URL.createObjectURL(selected.COVER); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [selected.COVER]);
  const cover = files.find(file => file.kind === 'COVER');
  const pdf = files.find(file => file.kind === 'PDF');
  return <div className="grid gap-5 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 sm:col-span-2 sm:grid-cols-2">
    <div><label className="admin-label"><span className="flex items-center gap-2"><FileText size={17}/>{t('pdfFile')}</span><input aria-label={t('pdfFile')} type="file" accept="application/pdf,.pdf" className="admin-input text-xs file:mr-2 file:rounded-md file:border-0 file:bg-emerald-50 file:px-2 file:py-1.5 file:font-semibold file:text-teal" onChange={event => {const input = event.currentTarget;void choose('PDF', input.files?.[0] || null).catch(() => {input.value = '';});}}/><span className="admin-help">{t('pdfHint')}</span></label>{selected.PDF && <p className="mt-2 break-all text-xs text-teal">{selected.PDF.name} · {(selected.PDF.size / 1048576).toFixed(1)} MB</p>}{pdf && bookId && <a href={`/api/books/${bookId}/file?kind=PDF`} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-semibold text-teal underline">{t('currentPdf')} · {(pdf.sizeBytes / 1048576).toFixed(1)} MB</a>}</div>
    <div><label className="admin-label"><span className="flex items-center gap-2"><ImagePlus size={17}/>{t('coverFile')}</span><input aria-label={t('coverFile')} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" className="admin-input text-xs file:mr-2 file:rounded-md file:border-0 file:bg-emerald-50 file:px-2 file:py-1.5 file:font-semibold file:text-teal" onChange={event => {const input = event.currentTarget;void choose('COVER', input.files?.[0] || null).catch(() => {input.value = '';});}}/><span className="admin-help">{t('coverHint')}</span></label>{(preview || (cover && bookId)) && <img src={preview || `/api/books/${bookId}/file?kind=COVER&v=${cover!.id}`} alt={t('coverPreview')} className="mt-3 h-36 w-28 rounded-lg border border-emerald-100 bg-white object-contain"/>}</div>
  </div>;
}
