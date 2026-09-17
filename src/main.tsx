import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {ErrorBoundary} from './components/ErrorBoundary';
import './index.css';
import { initTvRemoteNavigation, isSmartTv } from './utils/tvNavigation';

// Initialize Smart TV Remote & Keyboard Spatial Navigation
try {
  initTvRemoteNavigation();
} catch (e) {
  console.debug('TV Navigation init note:', e);
}

// Progressive Web App (PWA) Service Worker Management
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  let isIframe = false;
  try {
    isIframe = window.self !== window.top;
  } catch {
    isIframe = true;
  }

  const isDevHost =
    window.location.hostname.includes('localhost') ||
    window.location.hostname.includes('.run.app') ||
    window.location.port === '3000';

  const isTv = isSmartTv();

  // On Smart TV, iframe, or dev server: unregister service workers to avoid stale cache locks
  if (isIframe || isDevHost || isTv) {
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

  // Smoothly remove instant splash loader once React renders
  try {
    if (typeof (window as any).__TWING_LOADER_DONE__ === 'function') {
      (window as any).__TWING_LOADER_DONE__();
    } else {
      const instantLoader = document.getElementById('app-instant-loader');
      if (instantLoader) {
        instantLoader.style.opacity = '0';
        instantLoader.style.pointerEvents = 'none';
        setTimeout(() => {
          try {
            instantLoader.remove();
          } catch {}
        }, 300);
      }
    }
  } catch {}
}

