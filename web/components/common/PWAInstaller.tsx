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

export function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // PWA가 이미 설치되어 있는지 확인
    const checkStandalone = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                              (window.navigator as { standalone?: boolean }).standalone === true;
      setIsStandalone(isStandaloneMode);
    };

    checkStandalone();

    // iOS 감지
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    // iOS에서는 beforeinstallprompt 이벤트가 지원되지 않으므로 수동으로 버튼 표시
    if (isIOS && !isStandalone) {
      setShowInstallButton(true);
      return;
    }

    // next-pwa가 자동으로 서비스 워커를 등록하므로 수동 등록 불필요
    // PWA 설치 프롬프트만 처리

    // PWA 설치 프롬프트 이벤트 리스너 (Windows/Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!isStandalone) {
        setShowInstallButton(true);
      }
    };

    // PWA 설치 완료 이벤트 리스너
    const handleAppInstalled = () => {
      setShowInstallButton(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isStandalone]);

  const handleInstallClick = async () => {
    // iOS 감지
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isIOS) {
      // iOS에서는 설치 페이지로 리다이렉트
      window.location.href = '/pwa-install?tab=ios';
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    
    setDeferredPrompt(null);
    setShowInstallButton(false);
  };

  if (!showInstallButton) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={handleInstallClick}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg transition-colors duration-200 flex items-center gap-2"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        앱 설치
      </button>
    </div>
  );
}
