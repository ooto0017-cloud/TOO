'use client';
import {useEffect} from 'react';
import {Globe2} from 'lucide-react';
import {useLocale} from 'next-intl';
import {usePathname,useRouter} from '@/i18n/navigation';
export default function LocaleSwitcher(){const locale=useLocale();const pathname=usePathname();const router=useRouter();useEffect(()=>{document.documentElement.lang=locale;},[locale]);return <div className="flex items-center gap-0.5 rounded-full border border-slate-200 bg-white p-1 text-[11px]"><Globe2 size={13} className="mx-1.5 text-slate-400"/>{(['uz','ru','en'] as const).map(x=><button key={x} type="button" aria-label={`${x} language`} aria-current={locale===x?'true':undefined} onClick={()=>router.replace(`${pathname}${window.location.search}`,{locale:x})} className={`rounded-full px-2.5 py-1.5 font-bold transition ${locale===x?'bg-emerald-950 text-white':'text-slate-500 hover:bg-emerald-50 hover:text-teal'}`}>{x.toUpperCase()}</button>)}</div>}
