import Link from 'next/link';
import {getTranslations} from 'next-intl/server';
import SiteShell from '@/components/site-shell';
import {db} from '@/lib/db';
import {Search,ArrowRight,BookOpen,GraduationCap,FileText,Bookmark,LibraryBig,Sparkles} from 'lucide-react';

export default async function Home({params}:{params:Promise<{locale:string}>}) {
  const {locale}=await params;
  const t=await getTranslations({locale});
  const books=await db.book.findMany({where:{status:'ACTIVE'},take:8,orderBy:{createdAt:'desc'},include:{authors:{include:{author:true}}}}).catch(()=>[]);
  const collections = [
    {eyebrow:t('home.collections.academic'),title:t('home.collections.knowledge'),tone:'cover-one'},
    {eyebrow:t('home.collections.digital'),title:t('home.collections.engineering'),tone:'cover-two'},
    {eyebrow:t('home.collections.study'),title:t('home.collections.sciences'),tone:'cover-three'},
    {eyebrow:t('home.collections.research'),title:t('home.collections.global'),tone:'cover-four'},
  ];
  const services=[
    {icon:BookOpen,title:t('home.services.textbooks'),desc:t('home.services.textbooksDesc'),number:'01'},
    {icon:FileText,title:t('home.services.research'),desc:t('home.services.researchDesc'),number:'02'},
    {icon:Bookmark,title:t('home.services.reader'),desc:t('home.services.readerDesc'),number:'03'},
    {icon:GraduationCap,title:t('home.services.study'),desc:t('home.services.studyDesc'),number:'04'},
  ];
  return <SiteShell locale={locale}>
    <section className="hero-grid relative overflow-hidden">
      <div className="container relative grid min-h-[570px] items-center gap-12 py-16 md:grid-cols-[1.08fr_.92fr] lg:min-h-[610px]">
        <div className="reveal-up relative z-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white/85 px-4 py-2 text-xs font-bold uppercase tracking-[.16em] text-teal"><Sparkles size={14}/>{t('home.eyebrow')}</div>
          <h1 className="max-w-3xl text-5xl font-extrabold leading-[1.04] tracking-tight text-ink md:text-6xl lg:text-7xl">{t('home.title')}</h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-slate-600 md:text-lg">{t('home.description')}</p>
          <form action={`/${locale}/catalog`} className="glass mt-8 flex max-w-2xl items-center gap-3 rounded-2xl p-2 shadow-soft transition focus-within:ring-2 focus-within:ring-emerald-600/20"><Search className="ml-3 shrink-0 text-slate-400"/><input name="q" aria-label={t('home.search')} placeholder={t('home.search')} className="min-w-0 flex-1 bg-transparent px-1 py-3 text-sm outline-none"/><button className="rounded-xl bg-teal px-5 py-3 text-sm font-bold text-white transition hover:bg-teal-800">{t('home.button')} <ArrowRight className="ml-1 inline" size={15}/></button></form>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-500"><span className="flex items-center gap-2"><BookOpen size={16} className="text-teal"/>{t('home.tags.books')}</span><span className="flex items-center gap-2"><GraduationCap size={16} className="text-teal"/>{t('home.tags.resources')}</span><span className="flex items-center gap-2"><FileText size={16} className="text-teal"/>{t('home.tags.papers')}</span></div>
          <div className="mt-8 flex items-center gap-3 text-sm"><span className="grid h-11 w-11 place-items-center rounded-xl border border-emerald-100 bg-white text-teal shadow-sm"><LibraryBig size={20}/></span><span><strong className="block text-ink">{t('home.promise')}</strong><span className="text-xs text-slate-500">{t('home.promiseSub')}</span></span></div>
        </div>
        <div className="relative mx-auto w-full max-w-[510px] reveal-up reveal-delay-2">
          <div className="glow-orbit absolute -inset-8 rounded-full bg-emerald-300/20 blur-3xl"/><div className="absolute inset-2 rounded-full border border-emerald-800/10"/>
          <div className="relative grid grid-cols-2 gap-4 p-2 sm:gap-5">{collections.map((item,i)=><div key={item.title} className={`book-cover ${item.tone} ${i===0?'float-soft':''} ${i===1?'float-soft-delay':''} ${i===2?'float-soft-delay':''} ${i===3?'float-soft':''}`}><span className="book-number">0{i+1}</span><div><div className="mb-3 text-[10px] font-bold uppercase tracking-[.16em] text-emerald-100">{item.eyebrow}</div><div className="text-xl font-extrabold leading-tight sm:text-2xl">{item.title}</div></div></div>)}</div>
          <div className="absolute -bottom-3 right-0 rounded-full border border-white bg-white/90 px-4 py-2 text-xs font-semibold text-slate-600 shadow-lg backdrop-blur"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-500"/>{t('home.idea')}</div>
        </div>
        <div className="absolute bottom-0 left-5 right-5 hidden items-center justify-between border-t border-emerald-900/10 py-4 text-[10px] font-bold uppercase tracking-[.18em] text-slate-400 md:flex"><span>{t('home.heroFoot')}</span><span className="text-teal">{t('home.heroFootRight')} <ArrowRight className="ml-1 inline" size={13}/></span></div>
      </div>
    </section>

    <section className="container py-16 md:py-20" id="featured">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-teal">{t('home.curated')}</p><h2 className="mt-2 text-3xl font-bold tracking-tight text-ink md:text-4xl">{t('home.featured')}</h2><p className="mt-2 text-sm text-slate-500">{t('home.featuredSub')}</p></div><Link href={`/${locale}/catalog`} className="group flex items-center gap-2 text-sm font-bold text-teal">{t('home.catalog')} <ArrowRight size={16} className="transition group-hover:translate-x-1"/></Link></div>
      {books.length===0 ? <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-emerald-200 bg-white/80 px-6 py-10 text-center shadow-sm"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-teal"><BookOpen size={26}/></span><h3 className="text-lg font-bold text-ink">{t('home.emptyTitle')}</h3><p className="max-w-xl text-sm leading-6 text-slate-500">{t('home.emptyDesc')}</p><Link href={`/${locale}/catalog`} className="mt-2 inline-flex items-center gap-2 rounded-full bg-teal px-5 py-2.5 text-sm font-bold text-white transition hover:bg-teal-800">{t('home.catalog')} <ArrowRight size={15}/></Link></div> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{books.map((book,i)=><Link key={book.id} href={`/${locale}/catalog/${book.slug}`} className="book-card group rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><div className={`book-cover mb-4 min-h-52 ${['cover-one','cover-two','cover-three','cover-four'][i%4]}`}><span className="text-lg font-bold">{book.title.slice(0,48)}</span></div><h3 className="font-bold text-ink transition group-hover:text-teal">{book.title}</h3><p className="mt-1 text-sm text-slate-500">{book.authors.map(a=>a.author.fullName).join(', ')||'—'}</p><p className="mt-3 text-xs font-semibold uppercase tracking-wide text-teal">{t('home.bookDetails')} <ArrowRight className="ml-1 inline" size={13}/></p></Link>)}</div>}
    </section>

    <section className="bg-white py-16 md:py-20"><div className="container"><div className="mb-8 max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.18em] text-teal">{t('home.servicesEyebrow')}</p><h2 className="mt-2 text-3xl font-bold tracking-tight text-ink md:text-4xl">{t('home.servicesTitle')}</h2><p className="mt-3 text-slate-500">{t('home.servicesIntro')}</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{services.map((item,i)=><div key={item.number} className={`hover-lift reveal-up rounded-2xl border border-slate-100 bg-[#fbfdfb] p-6 ${i===1?'reveal-delay-1':''} ${i===2?'reveal-delay-2':''} ${i===3?'reveal-delay-3':''}`}><div className="mb-7 flex items-center justify-between"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-teal"><item.icon size={23}/></span><span className="text-xs font-bold tracking-widest text-slate-300">{item.number}</span></div><h3 className="font-bold text-ink">{item.title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{item.desc}</p><ArrowRight size={17} className="mt-5 text-teal"/></div>)}</div></div></section>

    <section className="container py-16 md:py-20"><div className="animated-accent relative overflow-hidden rounded-[2rem] bg-[linear-gradient(115deg,#0b4938,#177653_55%,#c5a45b)] px-7 py-10 text-white shadow-xl md:px-12 md:py-14"><div className="absolute -right-10 -top-20 h-64 w-64 rounded-full border border-white/15"/><div className="absolute -right-2 -top-12 h-48 w-48 rounded-full border border-white/15"/><div className="relative max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-100">{t('home.ctaEyebrow')}</p><h2 className="mt-3 text-3xl font-extrabold leading-tight md:text-4xl">{t('home.ctaTitle')}</h2><p className="mt-3 max-w-xl text-sm leading-7 text-white/80">{t('home.ctaDesc')}</p><div className="mt-7 flex flex-wrap gap-3"><Link href={`/${locale}/catalog`} className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-emerald-900 transition hover:-translate-y-0.5">{t('home.catalog')}</Link><Link href={`/${locale}/register`} className="rounded-xl border border-white/50 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10">{t('home.createAccount')}</Link></div></div></div></section>
  </SiteShell>;
}
