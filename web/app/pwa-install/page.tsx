'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Lightbulb } from 'lucide-react';
import { FaWindows, FaAndroid, FaApple } from 'react-icons/fa';
import { MdInstallDesktop } from 'react-icons/md';

export default function PWAInstallPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'windows' | 'android' | 'ios'>('windows');

  // URL 파라미터에서 탭 상태 읽기
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['windows', 'android', 'ios'].includes(tab)) {
      setActiveTab(tab as 'windows' | 'android' | 'ios');
    }
  }, [searchParams]);

  const tabs = [
    { id: 'windows' as const, label: 'Windows', icon: FaWindows },
    { id: 'android' as const, label: 'Android', icon: FaAndroid },
    { id: 'ios' as const, label: 'iOS', icon: FaApple }
  ];

  const installInstructions = {
    windows: [
      {
        step: 1,
        title: 'Chrome 브라우저에서 사이트 열기',
        description: 'Chrome 브라우저로 얼티메이트 사이트에 접속하세요.'
      },
      {
        step: 2,
        title: '설치 방법 선택',
        description: '다음 두 가지 방법 중 하나를 선택하세요:'
      },
      {
        step: '2-1',
        title: '방법 1: 주소창 옆 설치 아이콘',
        description: '주소창 오른쪽에 있는 설치 아이콘을 클릭하세요.'
      },
      {
        step: '2-2',
        title: '방법 2: 우측 하단 설치 버튼',
        description: '화면 우측 하단에 나타나는 "앱 설치" 버튼을 클릭하세요.'
      },
      {
        step: 3,
        title: '설치 확인',
        description: '"얼티메이트 설치" 팝업에서 "설치" 버튼을 클릭하세요.'
      },
      {
        step: 4,
        title: '바탕화면에서 실행',
        description: '설치가 완료되면 바탕화면이나 시작 메뉴에서 앱을 실행할 수 있습니다.'
      }
    ],
    android: [
      {
        step: 1,
        title: 'Chrome 브라우저에서 사이트 열기',
        description: 'Android 기기의 Chrome 브라우저로 얼티메이트 사이트에 접속하세요.'
      },
      {
        step: 2,
        title: '설치 방법 선택',
        description: '다음 두 가지 방법 중 하나를 선택하세요:'
      },
      {
        step: '2-1',
        title: '방법 1: Chrome 메뉴에서 설치',
        description: 'Chrome 메뉴(⋮)를 열고 "홈 화면에 추가" 또는 "앱 설치"를 선택하세요.'
      },
      {
        step: '2-2',
        title: '방법 2: 우측 하단 설치 버튼',
        description: '화면 우측 하단에 나타나는 "앱 설치" 버튼을 탭하세요.'
      },
      {
        step: 3,
        title: '설치 확인',
        description: '"앱 추가" 팝업에서 "추가" 버튼을 탭하세요.'
      },
      {
        step: 4,
        title: '홈 화면에서 실행',
        description: '홈 화면에 생성된 앱 아이콘을 탭하여 실행하세요.'
      }
    ],
    ios: [
      {
        step: 1,
        title: 'Safari 브라우저에서 사이트 열기',
        description: 'iOS 기기의 Safari 브라우저로 얼티메이트 사이트에 접속하세요.'
      },
      {
        step: 2,
        title: '공유 버튼 탭',
        description: 'Safari 하단의 공유 버튼을 탭하세요.'
      },
      {
        step: 3,
        title: '홈 화면에 추가 선택',
        description: '공유 메뉴에서 "홈 화면에 추가"를 선택하세요.'
      },
      {
        step: 4,
        title: '추가 확인',
        description: '"추가" 버튼을 탭하여 홈 화면에 앱을 추가하세요.'
      },
      {
        step: 5,
        title: '홈 화면에서 실행',
        description: '홈 화면에 생성된 앱 아이콘을 탭하여 실행하세요.'
      }
    ]
  };

  return (
    <div className="bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">PWA 앱 설치 방법</h1>
              <p className="text-muted-foreground mt-2">
                얼티메이트를 앱처럼 사용해보세요
              </p>
            </div>
            <Link
              href="/notifications/settings"
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
            >
              알림 설정으로 돌아가기
            </Link>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="mb-8">
          <div className="flex space-x-1 bg-muted p-1 rounded-lg">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  // URL 파라미터 업데이트
                  const url = new URL(window.location.href);
                  url.searchParams.set('tab', tab.id);
                  window.history.replaceState({}, '', url.toString());
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 설치 방법 설명 */}
        <div className="bg-card rounded-2xl shadow-lg border border-border p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {tabs.find(tab => tab.id === activeTab)?.label} 설치 방법
            </h2>
            <p className="text-muted-foreground">
              {activeTab === 'windows' && 'Windows PC에서 Chrome 브라우저를 사용하여 설치하는 방법입니다.'}
              {activeTab === 'android' && 'Android 기기에서 Chrome 브라우저를 사용하여 설치하는 방법입니다.'}
              {activeTab === 'ios' && 'iOS 기기에서 Safari 브라우저를 사용하여 설치하는 방법입니다.'}
            </p>
          </div>

          <div className="space-y-6">
            {installInstructions[activeTab].map((instruction, index) => (
              <div key={index} className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                    {instruction.step}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-2">
                    {instruction.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {instruction.description}
                  </p>
                  {instruction.step === '2-1' && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">설치 아이콘:</span>
                      <MdInstallDesktop className="w-6 h-6 text-primary" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 추가 정보 */}
        <div className="mt-8 bg-muted/50 rounded-lg p-6">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            PWA 앱의 장점
          </h3>
          <ul className="space-y-2 text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>앱처럼 빠르고 부드러운 사용자 경험</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>푸시 알림을 통한 실시간 게임메이트 알림</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>홈 화면에서 바로 접근 가능</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
