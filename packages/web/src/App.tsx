/* ==========================================================================
   packages/web/src/App.tsx
   ========================================================================== */

import * as React from 'react';
import {
  BrowserRouter,
  Link,
  Navigate,
  Outlet,
  Route,
  Routes,
  useNavigate,
  useParams,
} from 'react-router-dom';
import {
  useAuth,
  useConnection,
  useEngineStatus,
  ThemeToggle,
} from './providers';
import { useT, type TranslationKey } from './i18n';
import type { Language } from './types';
import { SignIn } from './components/SignIn';
import { AppShell } from './components/AppShell';
import { Dashboard } from './pages/Dashboard';
import { RecordsToReview } from './pages/RecordsToReview';
import './styles.css';

const routes = [
  ['/', 'summary'],
  ['/queue', 'queue'],
  ['/approvals', 'approvals'],
  ['/audit', 'audit'],
  ['/methods', 'methods'],
  ['/settings', 'settings'],
  ['/sms-simulator', 'smsSimulator'],
] as const;

function Page({ title }: { title: TranslationKey }) {
  return (
    <section>
      <h1>{useT('en')(title)}</h1>
      <p>{useT('en')('placeholder')}</p>
    </section>
  );
}

// Wrapper to handle React Router navigation properly
function SignInPage() {
  const navigate = useNavigate();
  return <SignIn onSignIn={() => navigate('/')} />;
}

function RequireRole({ role }: { role?: 'supervisor' }) {
  const { role: current } = useAuth();
  return !current ? (
    <Navigate to="/sign-in" replace />
  ) : role && current !== role ? (
    <Navigate to="/" replace />
  ) : (
    <Outlet />
  );
}

function TaskPage() {
  const id = useParams().id ?? '';
  const t = useT('en');
  return (
    <section>
      <h1>
        {t('task')} {id}
      </h1>
      <p>{t('placeholder')}</p>
    </section>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/sign-in" element={<SignInPage />} />
        <Route element={<RequireRole />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/queue" element={<RecordsToReview />} />
            <Route path="/tasks/:id" element={<TaskPage />} />
            <Route path="/audit" element={<Page title="audit" />} />
            <Route path="/methods" element={<Page title="methods" />} />
            <Route path="/settings" element={<Page title="settings" />} />
            <Route
              path="/sms-simulator"
              element={<Page title="smsSimulator" />}
            />
            <Route element={<RequireRole role="supervisor" />}>
              <Route path="/approvals" element={<Page title="approvals" />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
