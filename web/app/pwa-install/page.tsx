'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useInstallPWA } from '@/hooks/useInstallPWA';
import { Share } from 'lucide-react';

type Tab = 'windows' | 'android' | 'ios';

export default function PWAInstallPage() {
  const router = useRouter();
  const { isInstallable, isInstalled, isIOS, install } = useInstallPWA();

  const detectTab = (): Tab => {
    if (typeof navigator === 'undefined') return 'windows';
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return 'ios';
    if (/Android/.test(navigator.userAgent)) return 'android';
    return 'windows';
  };

  const [activeTab, setActiveTab] = useState<Tab>(detectTab());

  const STEPS: Record<Tab, { title: string; steps: React.ReactNode[] }> = {
    windows: {
      title: 'Windows / Mac (Chrome / Edge)',
      steps: [
        <>이 페이지를 <strong>Chrome</strong> 또는 <strong>Edge</strong> 브라우저로 여세요.</>,
        <>
          주소창 오른쪽의{' '}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/install_desktop_24dp_E3E3E3.svg"
            alt="설치 아이콘"
            width={20}
            height={20}
            className="inline-block align-middle mx-1 opacity-80"
            style={{ filter: 'invert(0.3)' }}
          />
          <strong>설치 아이콘</strong>을 클릭하세요.
          <br />
          <span className="text-muted-foreground text-xs">아이콘이 없으면 우측 상단 메뉴 <strong>(⋮)</strong> → <strong>얼티메이트 앱 설치</strong>를 클릭하세요.</span>
        </>,
        <><strong>설치</strong> 버튼을 클릭하면 완료됩니다.</>,
      ],
    },
    android: {
      title: 'Android (Chrome)',
      steps: [
        <><strong>Chrome</strong> 브라우저로 사이트를 여세요.</>,
        <>우측 상단 메뉴 <strong>(⋮)</strong>를 탭하세요.</>,
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/install_mobile_24dp_E3E3E3.svg"
            alt="설치 아이콘"
            width={20}
            height={20}
            className="inline-block align-middle mr-1 opacity-80"
            style={{ filter: 'invert(0.3)' }}
          />
          <strong>홈 화면에 추가</strong> 또는 <strong>앱 설치</strong>를 탭하세요.
        </>,
        <><strong>설치</strong>를 탭하면 완료됩니다.</>,
      ],
    },
    ios: {
      title: 'iPhone / iPad (Safari)',
      steps: [
        <><strong>Safari</strong> 브라우저로 사이트를 여세요.</>,
        <>하단 툴바의 <strong>공유 버튼</strong> (<Share className="inline-block align-middle w-4 h-4 mx-0.5" />)을 탭하세요.</>,
        <>스크롤해서 <strong>홈 화면에 추가</strong>를 탭하세요.</>,
        <>오른쪽 상단의 <strong>추가</strong>를 탭하면 완료됩니다.</>,
      ],
    },
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'windows',
      label: 'PC',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" width="28" height="28" fill="currentColor">
          <path d="M4 4H24V24H4zM26 4H46V24H26zM4 26H24V46H4zM26 26H46V46H26z"/>
        </svg>
      ),
    },
    {
      id: 'android',
      label: 'Android',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" width="28" height="28" fill="currentColor">
          <path d="M 16.28125 0.03125 C 16.152344 0.0546875 16.019531 0.078125 15.90625 0.15625 C 15.449219 0.464844 15.347656 1.105469 15.65625 1.5625 L 17.8125 4.78125 C 14.480469 6.546875 11.996094 9.480469 11.1875 13 L 38.8125 13 C 38.003906 9.480469 35.519531 6.546875 32.1875 4.78125 L 34.34375 1.5625 C 34.652344 1.105469 34.550781 0.464844 34.09375 0.15625 C 33.632813 -0.152344 32.996094 -0.0195313 32.6875 0.4375 L 30.3125 3.9375 C 28.664063 3.335938 26.875 3 25 3 C 23.125 3 21.335938 3.335938 19.6875 3.9375 L 17.3125 0.4375 C 17.082031 0.09375 16.664063 -0.0429688 16.28125 0.03125 Z M 19.5 8 C 20.328125 8 21 8.671875 21 9.5 C 21 10.332031 20.328125 11 19.5 11 C 18.667969 11 18 10.332031 18 9.5 C 18 8.671875 18.667969 8 19.5 8 Z M 30.5 8 C 31.332031 8 32 8.671875 32 9.5 C 32 10.332031 31.332031 11 30.5 11 C 29.671875 11 29 10.332031 29 9.5 C 29 8.671875 29.671875 8 30.5 8 Z M 8 15 C 6.34375 15 5 16.34375 5 18 L 5 32 C 5 33.65625 6.34375 35 8 35 C 8.351563 35 8.6875 34.925781 9 34.8125 L 9 15.1875 C 8.6875 15.074219 8.351563 15 8 15 Z M 11 15 L 11 37 C 11 38.652344 12.347656 40 14 40 L 36 40 C 37.652344 40 39 38.652344 39 37 L 39 15 Z M 42 15 C 41.648438 15 41.3125 15.074219 41 15.1875 L 41 34.8125 C 41.3125 34.921875 41.648438 35 42 35 C 43.65625 35 45 33.65625 45 32 L 45 18 C 45 16.34375 43.65625 15 42 15 Z M 15 42 L 15 46 C 15 48.207031 16.792969 50 19 50 C 21.207031 50 23 48.207031 23 46 L 23 42 Z M 27 42 L 27 46 C 27 48.207031 28.792969 50 31 50 C 33.207031 50 35 48.207031 35 46 L 35 42 Z"/>
        </svg>
      ),
    },
    {
      id: 'ios',
      label: 'iPhone',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30" width="28" height="28" fill="currentColor">
          <path d="M25.565,9.785c-0.123,0.077-3.051,1.702-3.051,5.305c0.138,4.109,3.695,5.55,3.756,5.55 c-0.061,0.077-0.537,1.963-1.947,3.94C23.204,26.283,21.962,28,20.076,28c-1.794,0-2.438-1.135-4.508-1.135 c-2.223,0-2.852,1.135-4.554,1.135c-1.886,0-3.22-1.809-4.4-3.496c-1.533-2.208-2.836-5.673-2.882-9 c-0.031-1.763,0.307-3.496,1.165-4.968c1.211-2.055,3.373-3.45,5.734-3.496c1.809-0.061,3.419,1.242,4.523,1.242 c1.058,0,3.036-1.242,5.274-1.242C21.394,7.041,23.97,7.332,25.565,9.785z M15.001,6.688c-0.322-1.61,0.567-3.22,1.395-4.247 c1.058-1.242,2.729-2.085,4.17-2.085c0.092,1.61-0.491,3.189-1.533,4.339C18.098,5.937,16.488,6.872,15.001,6.688z"/>
        </svg>
      ),
    },
  ];

  const current = STEPS[activeTab];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center px-4 py-4 border-b border-border">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          aria-label="뒤로 가기"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-foreground ml-2">앱 설치</h1>
      </div>

      <div className="flex-1 px-4 py-8 max-w-lg mx-auto w-full space-y-6">
        {/* 앱 아이콘 */}
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center shadow-lg mb-3">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-foreground">얼티메이트</h2>
          <p className="text-muted-foreground text-sm mt-1">홈 화면에 추가하여 앱처럼 사용하세요</p>
        </div>

        {/* 이미 설치됨 */}
        {isInstalled && (
          <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
            <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-green-600 dark:text-green-400 font-medium">이미 앱이 설치되어 있습니다!</p>
          </div>
        )}

        {/* 시스템 설치 버튼 (Chrome/Edge 프롬프트 발생 시) */}
        {isInstallable && !isInstalled && !isIOS && (
          <button
            id="pwa-install-btn"
            onClick={() => install()}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-xl text-white font-semibold text-base transition-all active:scale-95 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/install_desktop_24dp_E3E3E3.svg" alt="" width={22} height={22} className="opacity-90" />
            지금 바로 설치하기
          </button>
        )}

        {/* 플랫폼 탭 */}
        <div>
          <p className="text-sm font-semibold text-foreground mb-3">기기별 설치 방법</p>
          <div className="flex gap-2 mb-5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                  activeTab === tab.id
                    ? 'border-blue-500 bg-blue-500/10 text-blue-500'
                    : 'border-border bg-card text-muted-foreground hover:border-blue-400 hover:text-foreground'
                }`}
              >
                <div className={activeTab === tab.id ? 'text-blue-500' : 'text-foreground opacity-70'}>
                  {tab.icon}
                </div>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* 단계별 안내 */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{current.title}</p>
            <ol className="space-y-4">
              {current.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-4">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-500 text-white text-sm font-bold flex items-center justify-center shadow">
                    {i + 1}
                  </span>
                  <p className="text-sm text-foreground pt-0.5 leading-relaxed">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* 설치하면 좋은 점 */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">설치하면 좋은 점</p>
          {[
            { icon: 'M13 10V3L4 14h7v7l9-11h-7z', text: '홈 화면에서 바로 실행' },
            { icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', text: '푸시 알림 수신 가능' },
            { icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z', text: '전체 화면 앱처럼 사용' },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                </svg>
              </div>
              <p className="text-sm text-foreground">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
