'use client';
import Link from 'next/link';
import {useCallback, useEffect, useRef, useState} from 'react';
import {useTranslations} from 'next-intl';
import type {PDFDocumentProxy, PDFDocumentLoadingTask, RenderTask} from 'pdfjs-dist';
import {ArrowLeft, ArrowRight, CheckCircle2, Download, ExternalLink, LoaderCircle, Minus, Plus, RotateCcw} from 'lucide-react';
import SaveBookButton from './save-book-button';
import {readingPercent} from '@/lib/reading';
type Snapshot = {page: number; totalPages: number; completed: boolean};
export default function PdfReader({bookId, slug, fileId, title, locale, initialPage, initialCompleted, saved, downloadsAllowed}: {bookId: string; slug: string; fileId: string; title: string; locale: string; initialPage: number; initialCompleted: boolean; saved: boolean; downloadsAllowed: boolean}) {
  const t = useTranslations('reader');
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(initialPage);const [pageDraft, setPageDraft] = useState(String(initialPage));
  const [totalPages, setTotalPages] = useState(0);const [completed, setCompleted] = useState(initialCompleted);
  const [zoom, setZoom] = useState(1);const [stageWidth, setStageWidth] = useState(720);
  const [loading, setLoading] = useState(true);const [loadPercent, setLoadPercent] = useState(0);const [loadError, setLoadError] = useState(false);const [rendering, setRendering] = useState(false);const [renderError, setRenderError] = useState(false);const [reload, setReload] = useState(0);
  const [sync, setSync] = useState<'saving' | 'saved' | 'error' | 'idle'>('idle');
  const canvas = useRef<HTMLCanvasElement>(null);const stage = useRef<HTMLDivElement>(null);
  const initial = useRef({page: initialPage, completed: initialCompleted});const alive = useRef(true);
  const queue = useRef<Promise<void>>(Promise.resolve());const sequence = useRef(0);const latest = useRef<Snapshot | null>(null);
  const fileUrl = `/api/books/${bookId}/file?kind=PDF&v=${fileId}`;
  const persist = useCallback((snapshot: Snapshot) => {
    latest.current = snapshot;const version = ++sequence.current;setSync('saving');
    queue.current = queue.current.catch(() => {}).then(async () => {
      const response = await fetch(`/api/me/reading/${bookId}`, {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(snapshot), keepalive: true});
      if (!response.ok) throw new Error('Progress save failed');
      if (alive.current && version === sequence.current) setSync('saved');
    }).catch(() => {if (alive.current && version === sequence.current) setSync('error');});
  }, [bookId]);
  function goTo(next: number) {const value = Math.max(1, Math.min(totalPages || 1, next));setPage(value);setPageDraft(String(value));}

  useEffect(() => {alive.current = true;return () => {alive.current = false;};}, []);
  useEffect(() => {
    let cancelled = false;let task: PDFDocumentLoadingTask | undefined;
    setLoading(true);setLoadError(false);setLoadPercent(0);setDocument(null);setTotalPages(0);
    void (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        if (cancelled) return;
        pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs?v=${pdfjs.version}`;
        task = pdfjs.getDocument({url: fileUrl, withCredentials: true, disableRange: true, enableXfa: false});
        task.onProgress = ({loaded, total}: {loaded: number; total: number}) => {if (!cancelled && total > 0) setLoadPercent(Math.min(99, Math.round(loaded / total * 100)));};
        const pdf = await task.promise;if (cancelled) {await pdf.destroy();return;}
        const first = Math.max(1, Math.min(initial.current.page, pdf.numPages));
        setPage(first);setPageDraft(String(first));setCompleted(initial.current.completed);setTotalPages(pdf.numPages);setDocument(pdf);setLoading(false);
      } catch {if (!cancelled) {setLoadError(true);setLoading(false);}}
    })();
    return () => {cancelled = true;void task?.destroy().catch(() => {});};
  }, [fileUrl, reload]);
  useEffect(() => {
    if (!stage.current) return;
    const element = stage.current;const observer = new ResizeObserver(() => setStageWidth(Math.max(160, element.clientWidth - 32)));
    observer.observe(element);setStageWidth(Math.max(160, element.clientWidth - 32));return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!document || !canvas.current) return;
    let cancelled = false;let task: RenderTask | undefined;const surface = canvas.current;
    setRendering(true);setRenderError(false);
    void (async () => {
      try {
        const pdfPage = await document.getPage(page);if (cancelled) return;
        const base = pdfPage.getViewport({scale: 1});const viewport = pdfPage.getViewport({scale: stageWidth / base.width * zoom});
        const ratio = Math.min(window.devicePixelRatio || 1, 2);const context = surface.getContext('2d');if (!context) throw new Error('Canvas unavailable');
        surface.width = Math.floor(viewport.width * ratio);surface.height = Math.floor(viewport.height * ratio);surface.style.width = `${Math.floor(viewport.width)}px`;surface.style.height = `${Math.floor(viewport.height)}px`;
        task = pdfPage.render({canvas: surface, canvasContext: context, viewport, transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0]});
        await task.promise;if (!cancelled) setRendering(false);
      } catch (error) {if (!cancelled && (!(error instanceof Error) || error.name !== 'RenderingCancelledException')) {setRenderError(true);setRendering(false);}}
    })();
    return () => {cancelled = true;task?.cancel();};
  }, [document, page, stageWidth, zoom]);
  useEffect(() => {if (totalPages > 0 && !loading && !loadError) persist({page, totalPages, completed});}, [page, totalPages, completed, loading, loadError, persist]);
  useEffect(() => {
    const retry = () => {if (latest.current) persist(latest.current);};window.addEventListener('online', retry);return () => window.removeEventListener('online', retry);
  }, [persist]);
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && (event.target.closest('input,textarea,select,button,a') || event.target.isContentEditable)) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === 'ArrowRight' && page < totalPages) {event.preventDefault();setPage(page + 1);setPageDraft(String(page + 1));}
      if (event.key === 'ArrowLeft' && page > 1) {event.preventDefault();setPage(page - 1);setPageDraft(String(page - 1));}
    };
    window.addEventListener('keydown', keyboard);return () => window.removeEventListener('keydown', keyboard);
  }, [page, totalPages]);
  const percent = readingPercent(page, totalPages || null, completed);
  return <section className="container py-6 md:py-8">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><Link href={`/${locale}/account`} className="inline-flex items-center gap-2 text-sm font-semibold text-teal"><ArrowLeft size={16}/>{t('myLibrary')}</Link><Link href={`/${locale}/catalog/${slug}`} className="text-sm text-slate-500 hover:text-teal">{t('bookDetails')}</Link></div>
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4"><div className="min-w-0 flex-1"><h1 className="break-words text-xl font-bold leading-8 text-ink md:text-2xl">{title}</h1><p role="status" aria-live="polite" className={`mt-2 text-xs ${sync === 'error' ? 'text-red-700' : 'text-slate-500'}`}>{sync === 'saved' ? t('progressSaved') : sync === 'saving' ? t('progressSaving') : sync === 'error' ? t('progressError') : t('readerHint')}</p></div><SaveBookButton bookId={bookId} saved={saved}/></div>
    {sync === 'error' && <button type="button" className="admin-button secondary compact mb-4" onClick={() => {if (latest.current) persist(latest.current);}}><RotateCcw size={15}/>{t('retrySave')}</button>}
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-3 sm:px-5"><div className="flex items-center gap-2"><button type="button" className="admin-icon" aria-label={t('previous')} disabled={!document || page <= 1} onClick={() => goTo(page - 1)}><ArrowLeft size={18}/></button><form className="flex items-center gap-2 text-sm text-slate-500" onSubmit={event => {event.preventDefault();goTo(Number(pageDraft) || page);}}><label className="sr-only" htmlFor="reader-page">{t('page')}</label><input id="reader-page" type="number" min={1} max={totalPages || 1} disabled={!document} value={pageDraft} onChange={event => setPageDraft(event.target.value)} className="w-16 rounded-lg border border-slate-200 px-2 py-2 text-center text-ink"/><span>/ {totalPages || '—'}</span><button className="admin-button secondary compact" disabled={!document}>{t('go')}</button></form><button type="button" className="admin-icon" aria-label={t('next')} disabled={!document || page >= totalPages} onClick={() => goTo(page + 1)}><ArrowRight size={18}/></button></div><div className="flex items-center gap-2"><button type="button" className="admin-icon" aria-label={t('zoomOut')} disabled={zoom <= .5 || !document} onClick={() => setZoom(value => Math.max(.5, value - .25))}><Minus size={17}/></button><button type="button" className="rounded-lg px-2 py-2 text-xs font-semibold text-slate-500" disabled={!document} onClick={() => setZoom(1)} title={t('fitWidth')}>{Math.round(zoom * 100)}%</button><button type="button" className="admin-icon" aria-label={t('zoomIn')} disabled={zoom >= 2.5 || !document} onClick={() => setZoom(value => Math.min(2.5, value + .25))}><Plus size={17}/></button>{downloadsAllowed && <a href={`${fileUrl}&download=1`} className="admin-icon" aria-label={t('download')}><Download size={17}/></a>}</div></div>
      <div ref={stage} className="relative max-h-[72vh] min-h-[360px] overflow-auto bg-[#e8eeeb] p-4">
        {loading && <div className="flex min-h-[330px] flex-col items-center justify-center gap-4 text-sm text-slate-500"><LoaderCircle className="animate-spin text-teal" size={30}/>{t('loadingPdf')} {loadPercent > 0 ? `${loadPercent}%` : ''}</div>}
        {(loadError || renderError) && <div role="alert" className="mx-auto my-8 max-w-md rounded-2xl bg-white p-6 text-center"><p className="font-semibold text-ink">{t('pdfError')}</p><p className="mt-2 text-sm leading-6 text-slate-500">{t('pdfErrorHint')}</p><div className="mt-5 flex flex-wrap justify-center gap-2"><button type="button" className="admin-button" onClick={() => setReload(value => value + 1)}>{t('retry')}</button><a href={fileUrl} target="_blank" rel="noreferrer" className="admin-button secondary">{t('openOriginal')}<ExternalLink size={14}/></a></div></div>}
        <canvas ref={canvas} role="img" aria-label={t('pageOf', {page, total: totalPages || '—'})} className={`mx-auto bg-white shadow-md ${loading || loadError || renderError ? 'hidden' : 'block'} ${rendering ? 'opacity-50' : ''}`}/>
        {rendering && !loading && <p className="mt-3 text-center text-xs text-slate-500">{t('rendering')}</p>}
      </div>
      <div className="border-t border-slate-200 p-4 sm:px-5"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><span className="text-xs font-semibold text-slate-500">{t('progress')} · {percent}%</span><button type="button" disabled={!document} className={`admin-button compact ${completed ? 'secondary' : ''}`} onClick={() => {if (completed) {setCompleted(false);goTo(1);} else {setCompleted(true);goTo(totalPages);}}}><CheckCircle2 size={16}/>{t(completed ? 'readAgain' : 'markFinished')}</button></div><div role="progressbar" aria-label={t('progress')} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} className="h-1.5 overflow-hidden rounded-full bg-emerald-50"><span className="block h-full rounded-full bg-teal transition-[width]" style={{width: `${percent}%`}}/></div></div>
    </div>
  </section>;
}
