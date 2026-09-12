import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {ErrorBoundary} from './components/ErrorBoundary';
import './index.css';

// Progressive Web App (PWA) Service Worker Management
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const isIframe = window.self !== window.top;
  const isDevHost =
    window.location.hostname.includes('localhost') ||
    window.location.hostname.includes('.run.app') ||
    window.location.port === '3000';

  if (isIframe || isDevHost) {
    // In iframe preview / development, unregister service worker to prevent stale caching issues
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        reg.unregister();
      }
    }).catch(() => {});
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js', { scope: '/' })
        .then((reg) => {
          console.log('✅ TWING Hisabi PWA ServiceWorker active with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('ServiceWorker registration notice:', err);
        });
    });
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}

