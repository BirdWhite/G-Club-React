'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function useInstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(ios);

    // 이미 설치되어 있는지 확인
    const isIOSStandalone = (window.navigator as { standalone?: boolean }).standalone === true;
    const isPWAStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const wasInstalled = localStorage.getItem('pwa-installed') === 'true';

    if (isIOSStandalone || isPWAStandalone || wasInstalled) {
      setIsInstalled(true);
      return;
    }

    if (ios) {
      // iOS는 beforeinstallprompt 없이 설치 안내 가능
      setIsInstallable(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      localStorage.setItem('pwa-installed', 'true');
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    const standaloneMediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        localStorage.setItem('pwa-installed', 'true');
        setIsInstalled(true);
        setIsInstallable(false);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    standaloneMediaQuery.addEventListener('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      standaloneMediaQuery.removeEventListener('change', handleDisplayModeChange);
    };
  }, []);

  const install = async () => {
    if (isIOS) {
      // iOS 설치 안내 모달 열기 위해 true 반환
      return 'ios';
    }
    if (!deferredPrompt) return null;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    return outcome;
  };

  return { isInstallable, isInstalled, isIOS, install };
}
