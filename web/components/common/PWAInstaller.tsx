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

  useEffect(() => {
    // PWA가 이미 설치되어 있는지 확인
    const checkStandalone = () => {
      // iOS standalone 모드 확인
      const isIOSStandalone = (window.navigator as { standalone?: boolean }).standalone === true;
      // 일반 PWA standalone 모드 확인
      const isPWAStandalone = window.matchMedia('(display-mode: standalone)').matches;
      // localStorage로 설치 완료 상태 확인 (iOS용)
      const wasInstalled = localStorage.getItem('pwa-installed') === 'true';
      
      const isStandaloneMode = isIOSStandalone || isPWAStandalone || wasInstalled;
      
      // standalone 모드면 설치 완료로 표시
      if (isIOSStandalone || isPWAStandalone) {
        localStorage.setItem('pwa-installed', 'true');
      }
      
      return isStandaloneMode;
    };

    const isCurrentlyStandalone = checkStandalone();

    // iOS 감지
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    // iOS에서는 beforeinstallprompt 이벤트가 지원되지 않으므로 수동으로 버튼 표시
    if (isIOS && !isCurrentlyStandalone) {
      setShowInstallButton(true);
      return;
    }

    // next-pwa가 자동으로 서비스 워커를 등록하므로 수동 등록 불필요
    // PWA 설치 프롬프트만 처리

    // PWA 설치 프롬프트 이벤트 리스너 (Windows/Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!isCurrentlyStandalone) {
        setShowInstallButton(true);
      }
    };

    // PWA 설치 완료 이벤트 리스너
    const handleAppInstalled = () => {
      localStorage.setItem('pwa-installed', 'true');
      setShowInstallButton(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // display-mode 변경 감지 (standalone으로 전환되었을 때)
    const standaloneMediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) {
        localStorage.setItem('pwa-installed', 'true');
        setShowInstallButton(false);
      }
    };
    
    standaloneMediaQuery.addEventListener('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      standaloneMediaQuery.removeEventListener('change', handleDisplayModeChange);
    };
  }, []);

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

  const handleDismiss = () => {
    setShowInstallButton(false);
    // X 누르면 72시간 동안 숨기기
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // 이전에 X로 닫았다면 72시간 동안 표시하지 않음
  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      const seventyTwoHoursInMs = 72 * 60 * 60 * 1000;
      if (Date.now() - dismissedTime < seventyTwoHoursInMs) {
        setShowInstallButton(false);
      }
    }
  }, []);

  if (!showInstallButton) return null;

  return (
    <div className="pwa-installer-popup fixed bottom-[calc(4rem+0.75rem+env(safe-area-inset-bottom))] left-0 right-0 z-[60] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:bottom-4 md:left-4 md:right-auto md:max-w-sm md:pb-4">
      <div className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl p-4 shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg
              className="w-6 h-6"
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
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">앱</h3>
            <p className="text-xs opacity-90">홈 화면에 추가</p>
          </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleInstallClick}
            className="bg-white text-blue-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/90 transition-colors whitespace-nowrap"
          >
            설치하기
          </button>
          <button
            onClick={handleDismiss}
            className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors"
            aria-label="닫기"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}
