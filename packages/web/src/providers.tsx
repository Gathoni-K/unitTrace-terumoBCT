import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Role, DataClient } from '@workbench/shared';
import type { Language, Theme } from './types';
import { MockDataClient } from './mockDataClient';
import { SupabaseDataClient } from './data/supabaseDataClient';
import { syncQueue, API_BASE } from './api';

export const AuthContext = createContext<{
  role: Role | null;
  setRole: (role: Role) => void;
}>({ role: null, setRole: () => undefined });
export function useAuth() {
  return useContext(AuthContext);
}
export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role | null>(null);
  return (
    <AuthContext.Provider value={{ role, setRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export const ConnectionContext = createContext<{
  state: 'online' | 'offline' | 'syncing';
}>({ state: 'offline' });
export function useConnection() {
  return useContext(ConnectionContext);
}
export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'online' | 'offline' | 'syncing'>(() =>
    navigator.onLine ? 'online' : 'offline',
  );
  useEffect(() => {
    const handleOnline = async () => {
      setState('syncing');
      try {
        await syncQueue();
      } catch (err) {
        console.error('[Offline Sync] Sync error on reconnect:', err);
      } finally {
        setState('online');
      }
    };
    const handleOffline = () => setState('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  return (
    <ConnectionContext.Provider value={{ state }}>
      {children}
    </ConnectionContext.Provider>
  );
}

export const EngineContext = createContext<{ status: 'smart' | 'rules_only' }>({
  status: 'rules_only',
});
export function useEngineStatus() {
  return useContext(EngineContext);
}
export function EngineStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'smart' | 'rules_only'>('rules_only');
  useEffect(() => {
    healthCheck()
      .then(setStatus)
      .catch(() => setStatus('rules_only'));
  }, []);
  return (
    <EngineContext.Provider value={{ status }}>
      {children}
    </EngineContext.Provider>
  );
}
async function healthCheck(): Promise<'smart' | 'rules_only'> {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    if (res.ok) {
      return 'smart';
    }
    return 'rules_only';
  } catch {
    return 'rules_only';
  }
}

export const DataClientContext = createContext<DataClient>(
  new MockDataClient(),
);
export function useDataClient() {
  return useContext(DataClientContext);
}
export function DataClientProvider({ children }: { children: ReactNode }) {
  const client = useMemo<DataClient>(() => {
    const source = import.meta.env.VITE_DATA_SOURCE as string | undefined;
    // Mock remains the safe default so the scaffold runs without backend configuration.
    return source === 'supabase'
      ? new SupabaseDataClient()
      : new MockDataClient();
  }, []);
  return (
    <DataClientContext.Provider value={client}>
      {children}
    </DataClientContext.Provider>
  );
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem('theme') as Theme | null) ?? 'system',
  );

  useEffect(() => {
    const resolved =
      theme === 'system'
        ? matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : theme;
    document.documentElement.dataset.theme = resolved;
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggle = () => {
    const current = document.documentElement.dataset.theme;
    setTheme(current === 'dark' ? 'light' : 'dark');
  };

  return (
    <button onClick={toggle} aria-label="Toggle theme" className="icon-btn">
      <span className="material-symbols-outlined">
        {document.documentElement.dataset.theme === 'dark'
          ? 'light_mode'
          : 'dark_mode'}
      </span>
    </button>
  );
}

export const LanguageContext = createContext<{
  language: Language;
  setLanguage: (lang: Language) => void;
}>({ language: 'en', setLanguage: () => {} });

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(
    () => (localStorage.getItem('language') as Language) || 'en',
  );

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

// Apply saved theme on module load (before React renders)
if (typeof window !== 'undefined') {
  const saved =
    (localStorage.getItem('theme') as 'light' | 'dark' | 'system') || 'system';
  const resolved =
    saved === 'system'
      ? matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : saved;
  document.documentElement.dataset.theme = resolved;
}
