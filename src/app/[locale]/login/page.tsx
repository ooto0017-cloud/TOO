import SiteShell from '@/components/site-shell';
import LoginForm from '@/components/login-form';
export default async function Login({params}:{params:Promise<{locale:string}>}){const {locale}=await params;return <SiteShell locale={locale}><section className="auth-background container grid min-h-[78vh] place-items-center py-14"><LoginForm locale={locale}/></section></SiteShell>}
