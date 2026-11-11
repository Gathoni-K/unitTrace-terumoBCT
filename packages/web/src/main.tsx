/* ==========================================================================
   packages/web/src/main.tsx
   ========================================================================== */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import {
  AuthProvider,
  ConnectionProvider,
  DataClientProvider,
  EngineStatusProvider,
} from './providers';
import { ToastProvider } from './components/Toast';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <ConnectionProvider>
        <EngineStatusProvider>
          <DataClientProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </DataClientProvider>
        </EngineStatusProvider>
      </ConnectionProvider>
    </AuthProvider>
  </React.StrictMode>,
);
