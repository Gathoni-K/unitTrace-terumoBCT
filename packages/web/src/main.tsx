import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { AuthProvider, ConnectionProvider, DataClientProvider, EngineStatusProvider } from './providers';
import './styles.css';

createRoot(document.getElementById('root')!).render(<React.StrictMode><AuthProvider><ConnectionProvider><EngineStatusProvider><DataClientProvider><App /></DataClientProvider></EngineStatusProvider></ConnectionProvider></AuthProvider></React.StrictMode>);
