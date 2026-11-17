type CoverFile = {id: string; kind: string};
export default function BookCover({bookId, title, files, className = ''}: {bookId: string; title: string; files: CoverFile[]; className?: string}) {
  const cover = files.find(file => file.kind === 'COVER');
  return cover ? <div className={`relative aspect-[3/4] overflow-hidden rounded-xl bg-slate-100 ${className}`}><img src={`/api/books/${bookId}/file?kind=COVER&v=${cover.id}`} alt={title} loading="lazy" className="h-full w-full object-contain"/></div> : <div className={`book-cover cover-one ${className}`}><span className="text-lg font-bold">{title.slice(0, 60)}</span></div>;
}
