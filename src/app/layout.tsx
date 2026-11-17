import {getLocale} from 'next-intl/server';
import './globals.css';
import type {Metadata} from 'next';
export const metadata:Metadata={title:{default:'University Digital Library',template:'%s | University Digital Library'},description:'Official digital library of the Belarus–Uzbekistan joint institute.'};
export default async function RootLayout({children}:{children:React.ReactNode}){const locale=await getLocale();return <html lang={locale}><body>{children}</body></html>}
