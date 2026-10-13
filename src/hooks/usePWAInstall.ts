import { useState, useEffect, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface Window {
    __TWING_DEFERRED_PWA_PROMPT?: BeforeInstallPromptEvent | null;
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    return (typeof window !== 'undefined' && window.__TWING_DEFERRED_PWA_PROMPT) || null;
  });

  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://');
    return isStandalone;
  });

  const [isIOS, setIsIOS] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const ua = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(ua);
  });

  const [isAndroid, setIsAndroid] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const ua = window.navigator.userAgent.toLowerCase();
    return /android/.test(ua);
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check display mode
    const checkStandalone = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes('android-app://');
      setIsInstalled(standalone);
    };

    checkStandalone();

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
        setDeferredPrompt(null);
        window.__TWING_DEFERRED_PWA_PROMPT = null;
      }
    };
    try {
      mediaQuery.addEventListener('change', handleMediaChange);
    } catch {
      // Fallback for older browsers
      mediaQuery.addListener(handleMediaChange);
    }

    // Capture beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      window.__TWING_DEFERRED_PWA_PROMPT = promptEvent;
      setDeferredPrompt(promptEvent);
      console.log('⚡ TWING Hisabi PWA install prompt ready.');
    };

    // Listen for appinstalled
    const handleAppInstalled = () => {
      console.log('🎉 TWING Hisabi successfully installed on device!');
      setIsInstalled(true);
      setDeferredPrompt(null);
      window.__TWING_DEFERRED_PWA_PROMPT = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // If global prompt was captured before this hook mounted, sync it
    if (window.__TWING_DEFERRED_PWA_PROMPT && !deferredPrompt) {
      setDeferredPrompt(window.__TWING_DEFERRED_PWA_PROMPT);
    }

    return () => {
      try {
        mediaQuery.removeEventListener('change', handleMediaChange);
      } catch {
        mediaQuery.removeListener(handleMediaChange);
      }
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [deferredPrompt]);

  const triggerInstallPrompt = useCallback(async (): Promise<{
    outcome: 'accepted' | 'dismissed' | 'unavailable';
  }> => {
    const promptEvent = deferredPrompt || (typeof window !== 'undefined' ? window.__TWING_DEFERRED_PWA_PROMPT : null);

    if (!promptEvent) {
      return { outcome: 'unavailable' };
    }

    try {
      await promptEvent.prompt();
      const choiceResult = await promptEvent.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        if (typeof window !== 'undefined') {
          window.__TWING_DEFERRED_PWA_PROMPT = null;
        }
        return { outcome: 'accepted' };
      } else {
        return { outcome: 'dismissed' };
      }
    } catch (err) {
      console.warn('Error during PWA install prompt execution:', err);
      return { outcome: 'unavailable' };
    }
  }, [deferredPrompt]);

  return {
    isInstallable: !!(deferredPrompt || (typeof window !== 'undefined' && window.__TWING_DEFERRED_PWA_PROMPT)),
    isInstalled,
    isIOS,
    isAndroid,
    triggerInstallPrompt,
    deferredPrompt,
  };
}
