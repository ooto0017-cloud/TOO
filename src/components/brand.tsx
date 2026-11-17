import Image from 'next/image';
export default function Brand({light = false}: {light?: boolean}) {
  return <span className="flex items-center gap-3"><Image src="/brand/logo.png" alt="Sbumiptk" width={44} height={44} priority className="h-11 w-11 shrink-0 rounded-full object-contain"/><span className={`text-sm font-extrabold leading-tight ${light ? 'text-white' : 'text-ink'}`}>Sbumiptk<span className={`mt-1 block text-xs font-medium ${light ? 'text-emerald-100/75' : 'text-slate-500'}`}>Digital Library</span></span></span>;
}
