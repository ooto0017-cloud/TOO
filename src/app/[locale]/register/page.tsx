import SiteShell from '@/components/site-shell';
import RegisterForm from '@/components/register-form';
export default async function Register({params}:{params:Promise<{locale:string}>}){const {locale}=await params;return <SiteShell locale={locale}><section className="auth-background container grid min-h-[78vh] place-items-center py-14"><RegisterForm locale={locale}/></section></SiteShell>}
