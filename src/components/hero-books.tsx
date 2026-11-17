import Link from 'next/link';
import {Atom, Cpu, DraftingCompass, Globe2} from 'lucide-react';
type HeroBook = {id: string; title: string; slug: string; files: {id: string; kind: string}[]};
type Collection = {eyebrow: string; title: string; tone: string};
const icons = [Atom, Cpu, DraftingCompass, Globe2];
export default function HeroBooks({books, collections, locale}: {books: HeroBook[]; collections: Collection[]; locale: string}) {
  return <div className="hero-books-grid" aria-label="Sbumiptk Digital Library">
    {collections.map((collection, index) => {
      const book = books[index]; const cover = book?.files.find(file => file.kind === 'COVER');const Icon = icons[index];
      return <Link key={book?.id || collection.title} href={book ? `/${locale}/catalog/${book.slug}` : `/${locale}/catalog`} className={`hero-book-slot hero-book-slot-${index + 1}`} aria-label={book?.title || collection.title}>
        <div className="hero-book-object"><span className="hero-book-pages" aria-hidden="true"/><div className={`hero-book-front ${collection.tone}`}>
          {cover ? <img src={`/api/books/${book.id}/file?kind=COVER&v=${cover.id}`} alt={book.title} className="h-full w-full object-contain"/> : <div className="hero-book-design"><span className="hero-book-publisher">SBUMIPTK <span>0{index + 1}</span></span><div className="hero-book-illustration" aria-hidden="true"><span/><Icon size={62} strokeWidth={1}/><span/></div><div><p className="hero-book-category">{collection.eyebrow}</p><h2 className="hero-book-title">{book?.title || collection.title}</h2><span className="hero-book-rule"/></div><span className="hero-book-edition">Digital Library</span></div>}
        </div></div>
      </Link>;
    })}
  </div>;
}
