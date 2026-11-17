import {getLocale} from 'next-intl/server';
import './globals.css';
import type {Metadata} from 'next';
export const metadata:Metadata={title:{default:'Sbumiptk | Digital Library',template:'%s | Sbumiptk Digital Library'},applicationName:'Sbumiptk Digital Library',description:'Sbumiptk Digital Library — universitet elektron kutubxonasi.'};
export default async function RootLayout({children}:{children:React.ReactNode}){const locale=await getLocale();return <html lang={locale}><body>{children}</body></html>}
