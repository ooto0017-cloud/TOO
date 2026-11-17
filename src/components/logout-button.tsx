'use client';
import {useState} from 'react';
import {useTranslations} from 'next-intl';
import {LogOut} from 'lucide-react';
export default function LogoutButton({locale}: {locale: string}) {
  const t = useTranslations('admin');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  return <><button type="button" aria-label={t('signOut')} className="admin-button secondary compact" disabled={busy} onClick={async () => {
    setBusy(true);setError(false);
    try {const response = await fetch('/api/auth/logout', {method: 'POST'});if (!response.ok) throw new Error();window.location.assign(`/${locale}/login`);} catch {setBusy(false);setError(true);}
  }}><LogOut size={15}/><span className="hidden sm:inline">{t('signOut')}</span></button>{error && <span role="alert" className="text-xs text-red-700">{t('failed')}</span>}</>;
}
