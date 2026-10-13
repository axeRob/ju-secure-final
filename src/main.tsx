import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { AppProvider } from './state/AppContext.tsx';
import './styles/tokens.css';
import './styles/app.css';
import './styles/final.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProvider><App /></AppProvider>
  </React.StrictMode>,
);
