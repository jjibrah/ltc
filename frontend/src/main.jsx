import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import AppProviders from './app/providers/AppProviders';
import './shared/styles/globals.css';
import './shared/styles/index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppProviders><App /></AppProviders>
  </StrictMode>,
);
