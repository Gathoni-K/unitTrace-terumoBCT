import * as React from 'react';
import { BrowserRouter, Link, Navigate, Outlet, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { useAuth, useConnection, useEngineStatus, ThemeToggle } from './providers';
import { useT, type TranslationKey } from './i18n';
import type { Language } from './types';
import './styles.css';

const routes = [
  ['/', 'summary'], ['/queue', 'queue'], ['/approvals', 'approvals'], ['/audit', 'audit'],
  ['/methods', 'methods'], ['/settings', 'settings'], ['/sms-simulator', 'smsSimulator'],
] as const;
function Shell() {
  const { role } = useAuth(); const { state } = useConnection(); const { status } = useEngineStatus();
  const [language, setLanguage] = React.useState<Language>('en'); const t = useT(language);
  return <div className="shell"><header><strong>{t('product')}</strong><span>{role ? t(role) : t('signIn')}</span><select value={language} onChange={(event) => setLanguage(event.target.value as Language)}><option value="en">EN</option><option value="sw">SW</option></select><ThemeToggle /><span className="chip">{t(state)}</span><span className="chip">{t(status === 'smart' ? 'smart' : 'rulesOnly')}</span></header>{status === 'rules_only' && <div className="banner">{t('smartOffline')}</div>}<div className="layout"><nav>{routes.map(([path, key]) => (key !== 'approvals' || role === 'supervisor') && <Link key={path} to={path}>{t(key)}</Link>)}</nav><main><Outlet /></main></div><footer>{routes.slice(0, 4).map(([path, key]) => <Link key={path} to={path}>{t(key)}</Link>)}</footer></div>;
}
function Page({ title }: { title: TranslationKey }) { return <section><h1>{useT('en')(title)}</h1><p>{useT('en')('placeholder')}</p></section>; }
function SignIn() { const { setRole } = useAuth(); const navigate = useNavigate(); const t = useT('en'); return <section className="signin"><h1>{t('product')}</h1><p>{t('chooseRole')}</p><button onClick={() => { setRole('clerk'); navigate('/'); }}>{t('clerk')}</button><button onClick={() => { setRole('supervisor'); navigate('/'); }}>{t('supervisor')}</button></section>; }
function RequireRole({ role }: { role?: 'supervisor' }) { const { role: current } = useAuth(); return !current ? <Navigate to="/sign-in" replace /> : role && current !== role ? <Navigate to="/" replace /> : <Outlet />; }
function TaskPage() { const id = useParams().id ?? ''; const t = useT('en'); return <section><h1>{t('task')} {id}</h1><p>{t('placeholder')}</p></section>; }
export function App() { return <BrowserRouter><Routes><Route path="/sign-in" element={<SignIn />} /><Route element={<RequireRole />}><Route element={<Shell />}><Route path="/" element={<Page title="summary" />} /><Route path="/queue" element={<Page title="queue" />} /><Route path="/tasks/:id" element={<TaskPage />} /><Route path="/audit" element={<Page title="audit" />} /><Route path="/methods" element={<Page title="methods" />} /><Route path="/settings" element={<Page title="settings" />} /><Route path="/sms-simulator" element={<Page title="smsSimulator" />} /><Route element={<RequireRole role="supervisor" />}><Route path="/approvals" element={<Page title="approvals" />} /></Route></Route></Route></Routes></BrowserRouter>; }
