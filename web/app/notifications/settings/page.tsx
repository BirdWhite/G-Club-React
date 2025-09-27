'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { PushNotificationManager } from '@/components/notifications/PushNotificationManager';
import { useProfile } from '@/contexts/ProfileProvider';

export default function NotificationSettingsPage() {
  const { profile } = useProfile();
  const {
    settings,
    isLoading,
    error,
    updateDoNotDisturb,
    toggleCategory,
    updateSettings
  } = useNotificationSettings();

  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [pushSubscription, setPushSubscription] = useState<PushSubscription | null>(null);
  const [serverHasSubscription, setServerHasSubscription] = useState<boolean | null>(null); // 서버 구독 상태 (null: 로딩 중)
  const [isToggling, setIsToggling] = useState(false); // 토글 처리 중 상태
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true); // 구독 상태 로딩 중
  const [isPWA, setIsPWA] = useState(false); // PWA 상태

  const [showDoNotDisturbDetail, setShowDoNotDisturbDetail] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // PWA 상태 확인
  useEffect(() => {
    const checkPWAStatus = () => {
      // PWA 감지 조건들 - 실제 PWA 앱으로 설치된 경우만 true
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInApp = (window.navigator as { standalone?: boolean }).standalone === true; // iOS Safari
      
      // manifest.json 존재 여부는 PWA 설치 여부와 무관하므로 제거
      setIsPWA(isStandalone || isInApp);
    };

    checkPWAStatus();
  }, []);

  // 푸시 알림 권한 변경 핸들러
  const handlePermissionChange = (permission: NotificationPermission, subscription: PushSubscription | null) => {
    setPushPermission(permission);
    setPushSubscription(subscription);
  };

  // 서버 구독 상태 확인
  const checkServerSubscription = async (): Promise<boolean> => {
    try {
      const response = await fetch(`/api/push/check?userId=${profile?.userId}`, {
        cache: 'no-store', // 캐시 방지
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      if (response.ok) {
        const data = await response.json();
        return data.hasSubscription;
      }
      return false;
    } catch (error) {
      console.error('서버 구독 확인 실패:', error);
      return false;
    }
  };

  // PWA 환경에서 권한 상태 정확히 확인
  const checkPWAPermission = async (): Promise<NotificationPermission> => {
    try {
      // 현재 기기의 권한 상태만 확인 (다른 기기 구독과 무관)
      const currentPermission = Notification.permission;
      
      return currentPermission;
    } catch (error) {
      console.error('PWA 권한 확인 실패:', error);
      return Notification.permission;
    }
  };

  // 서버 구독 상태 로드
  const loadServerSubscriptionStatus = async () => {
    setIsLoadingSubscription(true);
    if (profile?.userId) {
      try {
        // PWA 환경에서 권한 상태도 함께 확인
        const pwaPermission = await checkPWAPermission();
        setPushPermission(pwaPermission);
        
        const hasSubscription = await checkServerSubscription();
        setServerHasSubscription(hasSubscription);
      } catch (error) {
        console.error('서버 구독 상태 로드 실패:', error);
        // 오류 발생 시 기본값(false) 유지
        setServerHasSubscription(false);
      }
    } else {
      // userId가 없으면 기본값(false) 유지
      setServerHasSubscription(false);
    }
    setIsLoadingSubscription(false);
  };

  // 마스터 토글 상태 계산 (서버 구독 상태 기반)
  const isMasterEnabled = serverHasSubscription === true;

  // 마스터 토글 변경 핸들러
  const handleMasterToggle = async () => {
    if (isToggling) return; // 이미 처리 중이면 무시
    
    setIsToggling(true);
    
    try {
      if (!isMasterEnabled) {
        // 마스터 토글을 켜려면 푸시 알림 권한이 필요
        if (pushPermission !== 'granted') {
          // 브라우저 기본 권한 요청 UI 사용
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            setIsToggling(false);
            return;
          }
          setPushPermission(permission);
        }
        // 권한이 있으면 푸시 구독 생성 후 서버에 저장
        if ('serviceWorker' in navigator && 'PushManager' in window) {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
          });
          
          const response = await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache',
            },
            cache: 'no-store',
            body: JSON.stringify({
              userId: profile?.userId,
              subscription: subscription.toJSON()
            })
          });
          
          if (response.ok) {
            setServerHasSubscription(true);
            setPushSubscription(subscription);
          }
        }
      } else {
        // 마스터 토글을 끄면 서버에서 구독 정보 삭제
        const response = await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
          cache: 'no-store',
          body: JSON.stringify({ userId: profile?.userId })
        });
        if (response.ok) {
          setServerHasSubscription(false);
          // 브라우저 구독도 취소
          if (pushSubscription) {
            await pushSubscription.unsubscribe();
            setPushSubscription(null);
          }
        }
      }
    } catch (error) {
      console.error('마스터 토글 처리 실패:', error);
    } finally {
      setIsToggling(false);
    }
  };


  const toggleDoNotDisturb = () => {
    updateDoNotDisturb({ 
      ...settings.doNotDisturb,
      enabled: !settings.doNotDisturb.enabled 
    });
  };

  const toggleNewGamePost = () => {
    toggleCategory('newGamePost');
  };

  // 컴포넌트 마운트 시 서버 구독 상태 로드
  useEffect(() => {
    loadServerSubscriptionStatus();
  }, [profile?.userId]);

  const handleResetToDefaults = async () => {
    try {
      await updateSettings({
        doNotDisturb: {
          enabled: false,
          startTime: "22:00",
          endTime: "08:00",
          days: ["0", "1", "2", "3", "4", "5", "6"]
        },
        newGamePost: { enabled: true },
        participatingGame: { enabled: true },
        myGamePost: { enabled: true },
        waitingList: { enabled: true }
      });
      setShowResetConfirm(false);
    } catch (error) {
      console.error('기본값 초기화 실패:', error);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">알림 설정</h1>
              <p className="text-muted-foreground mt-2">
                원하는 알림만 받아보세요
              </p>
            </div>
            <Link
              href="/notifications"
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
            >
              알림 보기
            </Link>
          </div>
        </div>

        {/* 푸시 알림 관리자 */}
        <div className="mb-8">
          <PushNotificationManager 
            userId={profile?.userId} 
            onPermissionChange={handlePermissionChange}
            masterEnabled={isMasterEnabled} // 서버 구독 상태 기반
          />
        </div>


        {/* 마스터 알림 토글 */}
        <div className="mb-8">
          <div className={`p-6 rounded-2xl shadow-lg border border-border transition-colors ${
            isMasterEnabled 
              ? 'bg-card hover:bg-card/80' 
              : 'bg-card hover:bg-card/80'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔔</span>
                <div>
                  <h3 className="font-semibold text-foreground">알림 설정</h3>
                  <p className="text-sm text-muted-foreground">
                    {!isPWA
                      ? (
                        <span>
                          PWA 앱을 설치해야 알림을 활성화할 수 있습니다.{' '}
                          <Link 
                            href="/pwa-install" 
                            className="text-primary hover:text-primary/80 underline font-medium cursor-pointer"
                          >
                            PWA 설치 방법 보기
                          </Link>
                        </span>
                      )
                      : isMasterEnabled 
                        ? '모든 알림이 활성화되어 있습니다' 
                        : pushPermission === 'granted' && pushSubscription
                          ? '알림을 받으려면 토글을 켜주세요'
                          : '푸시 알림 권한이 필요합니다'
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {(isToggling || isLoadingSubscription) && (
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                )}
                <label className={`relative inline-flex items-center ${(isToggling || isLoadingSubscription || !isPWA) ? 'cursor-wait' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    checked={isMasterEnabled}
                    onChange={handleMasterToggle}
                    disabled={isToggling || isLoadingSubscription || !isPWA}
                    className="sr-only peer"
                  />
                  <div className={`w-11 h-6 bg-card-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-card-muted after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary ${(isToggling || isLoadingSubscription || !isPWA) ? 'opacity-50' : ''}`}></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
            <p className="text-destructive">{error}</p>
          </div>
        )}

        {/* 설정 목록 */}
        <div className="space-y-4">
          {/* 방해 금지 시간 설정 */}
          <div className={`p-6 rounded-2xl shadow-lg border border-border transition-colors ${
            settings.doNotDisturb.enabled 
              ? 'bg-card hover:bg-card/80' 
              : 'bg-card hover:bg-card/80'
          } ${(!isMasterEnabled || !isPWA) ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🌙</span>
                  <div>
                    <h3 className="font-semibold text-foreground">방해 금지 시간</h3>
                    <p className="text-sm text-muted-foreground">
                      {settings.doNotDisturb.enabled 
                        ? `${settings.doNotDisturb.startTime} - ${settings.doNotDisturb.endTime}`
                        : '설정 안함'
                      }
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowDoNotDisturbDetail(!showDoNotDisturbDetail)}
                  className="text-primary hover:text-primary/80 text-sm font-medium cursor-pointer"
                  disabled={!isMasterEnabled || !isPWA}
                >
                  상세 설정
                </button>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.doNotDisturb.enabled}
                    onChange={toggleDoNotDisturb}
                    className="sr-only peer"
                    disabled={!isMasterEnabled || !isPWA}
                  />
                  <div className="w-11 h-6 bg-card-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-card-muted after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>
          </div>

          {/* 방해 금지 시간 상세 설정 */}
          {showDoNotDisturbDetail && (
            <div className="p-6 bg-card rounded-2xl shadow-lg border border-border border-l-4 border-l-primary">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    시작 시간
                  </label>
                  <input
                    type="time"
                    value={settings.doNotDisturb.startTime}
                    onChange={(e) => updateDoNotDisturb({
                      ...settings.doNotDisturb,
                      startTime: e.target.value
                    })}
                    className="w-full px-3 py-2 bg-background border border-border text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    종료 시간
                  </label>
                  <input
                    type="time"
                    value={settings.doNotDisturb.endTime}
                    onChange={(e) => updateDoNotDisturb({
                      ...settings.doNotDisturb,
                      endTime: e.target.value
                    })}
                    className="w-full px-3 py-2 bg-background border border-border text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-foreground mb-2">
                  적용 요일
                </label>
                <div className="flex flex-wrap gap-2">
                  {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        const days = settings.doNotDisturb.days;
                        const dayStr = index.toString();
                        const newDays = days.includes(dayStr)
                          ? days.filter(d => d !== dayStr)
                          : [...days, dayStr];
                        updateDoNotDisturb({
                          ...settings.doNotDisturb,
                          days: newDays
                        });
                      }}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        settings.doNotDisturb.days.includes(index.toString())
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 신규 게임메이트 글 알림 */}
          <div className={`p-6 rounded-2xl shadow-lg border border-border transition-colors ${
            settings.newGamePost.enabled 
              ? 'bg-card hover:bg-card/80' 
              : 'bg-card hover:bg-card/80'
          } ${(!isMasterEnabled || !isPWA) ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎮</span>
                <div>
                  <h3 className="font-semibold text-foreground">신규 게임메이트 글 알림</h3>
                  <p className="text-sm text-muted-foreground">새로운 게임메이트 모집글이 올라올 때 알림</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link 
                  href="/notifications/settings/new-game-post"
                  className={`text-primary hover:text-primary/80 text-sm font-medium ${(!isMasterEnabled || !isPWA) ? 'pointer-events-none' : ''}`}
                >
                  상세 설정
                </Link>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.newGamePost.enabled}
                    onChange={toggleNewGamePost}
                    className="sr-only peer"
                    disabled={!isMasterEnabled || !isPWA}
                  />
                  <div className="w-11 h-6 bg-card-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-card-muted after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>
          </div>

          {/* 참여중인 모임 알림 */}
          <div className={`p-6 rounded-2xl shadow-lg border border-border transition-colors ${
            settings.participatingGame.enabled 
              ? 'bg-card hover:bg-card/80' 
              : 'bg-card hover:bg-card/80'
          } ${(!isMasterEnabled || !isPWA) ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">👥</span>
                <div>
                  <h3 className="font-semibold text-foreground">참여중인 모임 알림</h3>
                  <p className="text-sm text-muted-foreground">내가 참여한 게임 모임 관련 알림</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link 
                  href="/notifications/settings/participating-game"
                  className={`text-primary hover:text-primary/80 text-sm font-medium ${(!isMasterEnabled || !isPWA) ? 'pointer-events-none' : ''}`}
                >
                  상세 설정
                </Link>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.participatingGame.enabled}
                    onChange={() => toggleCategory('participatingGame')}
                    className="sr-only peer"
                    disabled={!isMasterEnabled || !isPWA}
                  />
                  <div className="w-11 h-6 bg-card-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-card-muted after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>
          </div>

          {/* 내가 작성한 모임 알림 */}
          <div className={`p-6 rounded-2xl shadow-lg border border-border transition-colors ${
            settings.myGamePost.enabled 
              ? 'bg-card hover:bg-card/80' 
              : 'bg-card hover:bg-card/80'
          } ${(!isMasterEnabled || !isPWA) ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">✍️</span>
                <div>
                  <h3 className="font-semibold text-foreground">내가 작성한 모임 알림</h3>
                  <p className="text-sm text-muted-foreground">내가 작성한 게임 모임 관련 알림</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link 
                  href="/notifications/settings/my-game-post"
                  className={`text-primary hover:text-primary/80 text-sm font-medium ${(!isMasterEnabled || !isPWA) ? 'pointer-events-none' : ''}`}
                >
                  상세 설정
                </Link>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.myGamePost.enabled}
                    onChange={() => toggleCategory('myGamePost')}
                    className="sr-only peer"
                    disabled={!isMasterEnabled || !isPWA}
                  />
                  <div className="w-11 h-6 bg-card-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-card-muted after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>
          </div>

          {/* 예비 참여 알림 */}
          <div className={`p-6 rounded-2xl shadow-lg border border-border transition-colors ${
            settings.waitingList.enabled 
              ? 'bg-card hover:bg-card/80' 
              : 'bg-card hover:bg-card/80'
          } ${(!isMasterEnabled || !isPWA) ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⏳</span>
                <div>
                  <h3 className="font-semibold text-foreground">예비로 참여중인 모임 알림</h3>
                  <p className="text-sm text-muted-foreground">참여 요청이 왔을때 알림</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.waitingList.enabled}
                    onChange={() => toggleCategory('waitingList')}
                    className="sr-only peer"
                    disabled={!isMasterEnabled || !isPWA}
                  />
                  <div className="w-11 h-6 bg-card-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-card-muted after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>
          </div>

          {/* 기본값 초기화 섹션 */}
          <div className="p-6 rounded-2xl shadow-lg border border-border bg-card hover:bg-card/80 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-foreground">설정 초기화</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  모든 알림 설정을 기본값으로 되돌립니다
                </p>
              </div>
              <button
                onClick={() => setShowResetConfirm(true)}
                className="px-4 py-2 bg-card-muted text-muted-foreground rounded-lg hover:bg-primary transition-colors cursor-pointer"
              >
                초기화
              </button>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="mt-6 p-4 text-center">
          <p className="text-sm text-muted-foreground">
            💡 상세 설정에서 더 세밀한 알림 조건을 설정할 수 있습니다.
          </p>
        </div>
      </div>

      {/* 기본값 초기화 확인 모달 */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg max-w-md w-full p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-cyber-yellow/20 mb-4">
                <svg className="h-6 w-6 text-cyber-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                설정을 초기화하시겠습니까?
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                모든 알림 설정이 기본값으로 되돌아갑니다. 이 작업은 되돌릴 수 없습니다.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="px-4 py-2 border border-border text-muted-foreground rounded-lg hover:bg-muted transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleResetToDefaults}
                  className="px-4 py-2 bg-cyber-yellow text-black rounded-lg hover:bg-cyber-yellow/80 transition-colors font-medium"
                >
                  초기화
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
