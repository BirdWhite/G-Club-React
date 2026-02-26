'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { PushNotificationManager } from '@/components/notifications/PushNotificationManager';
import { useProfile } from '@/contexts/ProfileProvider';
import { Bell, Gamepad2, Users, Lightbulb, Moon, Clock, PenTool, Megaphone, Settings } from 'lucide-react';
import { MdOutlineDevices, MdSmartphone } from 'react-icons/md';
import { FaAndroid, FaApple, FaWindows, FaLinux } from 'react-icons/fa';
import { AiOutlineMacCommand } from 'react-icons/ai';
import { RiComputerLine } from 'react-icons/ri';

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
  const [hasLoadedSubscription, setHasLoadedSubscription] = useState(false); // 구독 상태 로드 완료 플래그
  const [allDeviceSubscriptions, setAllDeviceSubscriptions] = useState<Array<{
    id: string;
    deviceName: string | null;
    browser: string | null;
    deviceType: string;
    isEnabled: boolean;
    createdAt: string;
    userAgent: string | null;
    isCurrentDevice: boolean;
  }>>([]); // 모든 디바이스 구독 정보
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
  const handlePermissionChange = useCallback((permission: NotificationPermission, subscription: PushSubscription | null) => {
    setPushPermission(permission);
    setPushSubscription(subscription);
  }, []);

  // 기기 핑거프린트 생성 (모든 기기 정보 포함)
  const generateDeviceFingerprint = (): string => {
    const userAgent = navigator.userAgent;
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    
    // 기기 타입과 이름
    let deviceType = 'unknown';
    let deviceName = 'Unknown';
    
    if (isMobile) {
      deviceType = 'mobile';
      if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
        deviceName = 'iOS';
      } else if (userAgent.includes('Android')) {
        deviceName = 'Android';
      } else {
        deviceName = 'Mobile';
      }
    } else {
      deviceType = 'desktop';
      if (userAgent.includes('Windows')) {
        deviceName = 'Windows';
      } else if (userAgent.includes('Mac')) {
        deviceName = 'Mac';
      } else if (userAgent.includes('Linux')) {
        deviceName = 'Linux';
      } else {
        deviceName = 'Desktop';
      }
    }
    
    // 브라우저 정보
    let browser = 'Unknown';
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    
    return [
      deviceName,                              // 기기 이름
      deviceType,                              // 기기 타입
      browser,                                 // 브라우저
      navigator.maxTouchPoints || '0',        // 터치 지원
      screen.colorDepth,                      // 색상 깊이
      navigator.hardwareConcurrency || '0'    // CPU 코어 수
    ].join('|');
  };


  // 서버 구독 상태 확인
  const checkServerSubscription = useCallback(async (): Promise<boolean> => {
    try {
             // 디바이스 타입 감지
             const userAgent = navigator.userAgent.toLowerCase();
             const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
             const deviceType = isMobile ? 'mobile' : 'desktop';

      const response = await fetch(`/api/push/check?userId=${profile?.userId}&deviceFingerprint=${encodeURIComponent(generateDeviceFingerprint())}&deviceType=${deviceType}`, {
        cache: 'no-store', // 캐시 방지
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setAllDeviceSubscriptions(data.allDeviceSubscriptions || []);
        return data.currentDeviceSubscription;
      }
      return false;
    } catch (error) {
      console.error('서버 구독 확인 실패:', error);
      return false;
    }
  }, [profile?.userId]);

  // PWA 환경에서 권한 상태 정확히 확인
  const checkPWAPermission = useCallback(async (): Promise<NotificationPermission> => {
    try {
      // 현재 기기의 권한 상태만 확인 (다른 기기 구독과 무관)
      const currentPermission = Notification.permission;
      
      return currentPermission;
    } catch (error) {
      console.error('PWA 권한 확인 실패:', error);
      return Notification.permission;
    }
  }, []);

  // 서버 구독 상태 로드
  const loadServerSubscriptionStatus = useCallback(async () => {
    // 이미 로드했다면 중복 실행 방지
    if (hasLoadedSubscription) {
      return;
    }
    
    setIsLoadingSubscription(true);
    if (profile?.userId) {
      try {
        // PWA 환경에서 권한 상태도 함께 확인
        const pwaPermission = await checkPWAPermission();
        setPushPermission(pwaPermission);
        
        const hasSubscription = await checkServerSubscription();
        setServerHasSubscription(hasSubscription);
        setHasLoadedSubscription(true);
      } catch (error) {
        console.error('서버 구독 상태 로드 실패:', error);
        // 오류 발생 시 기본값(false) 유지
        setServerHasSubscription(false);
        setHasLoadedSubscription(true);
      }
    } else {
      // userId가 없으면 기본값(false) 유지
      setServerHasSubscription(false);
      setHasLoadedSubscription(true);
    }
    setIsLoadingSubscription(false);
  }, [profile?.userId, hasLoadedSubscription, checkServerSubscription, checkPWAPermission]);

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

  // userId가 변경될 때 플래그 리셋
  useEffect(() => {
    setHasLoadedSubscription(false);
  }, [profile?.userId]);

  // 컴포넌트 마운트 시 서버 구독 상태 로드
  useEffect(() => {
    if (!hasLoadedSubscription && profile?.userId) {
      loadServerSubscriptionStatus();
    }
  }, [profile?.userId, hasLoadedSubscription, loadServerSubscriptionStatus]);

  const handleResetToDefaults = async () => {
    try {
      await updateSettings({
        doNotDisturb: {
          enabled: false,
          startTime: "22:00",
          endTime: "08:00",
          days: ["0", "1", "2", "3", "4", "5", "6"]
        },
        newGamePost: { 
          enabled: true,
          mode: 'favorites',
          customGameIds: []
        },
        participatingGame: { 
          enabled: true,
          fullMeeting: true,
          memberJoin: true,
          memberLeave: true,
          timeChange: true,
          gameCancelled: true,
          beforeMeeting: {
            enabled: true,
            minutes: 30,
            onlyFullMeeting: false
          },
          meetingStart: {
            enabled: true,
            onlyFullMeeting: false
          }
        },
        myGamePost: { 
          enabled: true,
          fullMeeting: true,
          memberJoin: true,
          memberLeave: true,
          beforeMeeting: {
            enabled: true,
            minutes: 30,
            onlyFullMeeting: false
          },
          meetingStart: {
            enabled: true,
            onlyFullMeeting: false
          }
        },
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
    <div className="bg-background">
      <div className="flex flex-col items-center px-8 sm:px-10 lg:px-12 py-8">
        <div className="w-full max-w-4xl">
        {/* 헤더 */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => window.history.back()}
              className="p-2 hover:bg-muted rounded-lg transition-colors flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">알림 설정</h1>
            </div>
            <Link
              href="/notifications"
              className="px-3 sm:px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors text-sm whitespace-nowrap"
            >
              <span className="hidden sm:inline">알림 보기</span>
              <span className="sm:hidden">알림</span>
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
        <div className="mb-6 sm:mb-8">
          <div className={`p-4 sm:p-6 rounded-2xl shadow-lg border border-border transition-colors ${
            isMasterEnabled 
              ? 'bg-card hover:bg-card/80' 
              : 'bg-muted/50' // Only background is transparent
          }`}>
            <div className="flex items-center justify-between w-full gap-3">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <Bell className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold text-sm sm:text-base text-foreground ${!isMasterEnabled ? 'opacity-60' : ''}`}>알림 설정</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {!isPWA
                        ? (
                          <span className={!isMasterEnabled ? 'text-foreground font-medium' : ''}>
                            PWA 앱을 설치해야 알림을 활성화할 수 있습니다.{' '}
                            <br />
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
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                {(isToggling || isLoadingSubscription) && (
                  <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                )}
                <label className={`relative inline-flex items-center ${(isToggling || isLoadingSubscription || !isPWA) ? 'cursor-wait' : 'cursor-pointer'} ${!isMasterEnabled ? 'opacity-60' : ''}`}>
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

        {/* 기기 구독 상태 */}
        {allDeviceSubscriptions.length > 0 && (
          <div className="mb-6 p-4 sm:p-6 bg-card rounded-2xl shadow-lg border border-border">
            <div className="flex items-center gap-2 sm:gap-3 mb-4">
              <MdOutlineDevices className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm sm:text-base text-foreground">기기 구독 상태</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  현재 계정으로 구독된 기기의 알림 상태입니다
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              {allDeviceSubscriptions.map((device, index) => {
                // API에서 받은 현재 기기 여부 사용
                const isCurrentDevice = device.isCurrentDevice;
                
                // 기기 정보 표시
                let deviceName = device.deviceName || '알 수 없는 기기';
                const deviceInfo = device.browser || '알 수 없음';
                
                       // 기기 이름을 한국어로 변환
                       if (deviceName === 'iOS') deviceName = 'iOS 기기';
                       else if (deviceName === 'Android') deviceName = 'Android 기기';
                       else if (deviceName === 'Windows') deviceName = 'Windows PC';
                       else if (deviceName === 'Mac') deviceName = 'Mac';
                       else if (deviceName === 'Linux') deviceName = 'Linux PC';
                
                return (
                  <div key={index} className={`p-3 rounded-lg border ${
                    isCurrentDevice 
                      ? 'bg-primary/10 border-primary/30' 
                      : 'bg-muted/50 border-border'
                  }`}>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        {deviceName === 'Android 기기' ? (
                          <FaAndroid className="w-5 h-5 text-green-500" />
                        ) : deviceName === 'iOS 기기' ? (
                          <FaApple className="w-5 h-5 text-gray-600" />
                        ) : deviceName === 'Mac' ? (
                          <AiOutlineMacCommand className="w-5 h-5 text-gray-600" />
                        ) : deviceName === 'Windows PC' ? (
                          <FaWindows className="w-5 h-5 text-blue-500" />
                        ) : deviceName === 'Linux PC' ? (
                          <FaLinux className="w-5 h-5 text-orange-500" />
                        ) : (
                          device.deviceType === 'mobile' || device.deviceType === 'tablet' ? (
                            <MdSmartphone className="w-5 h-5 text-gray-500" />
                          ) : (
                            <RiComputerLine className="w-5 h-5 text-gray-500" />
                          )
                        )}
                        <div>
                          <p className="font-medium text-foreground">
                            {deviceName} ({deviceInfo})
                            {device.isEnabled && (
                              <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                활성
                              </span>
                            )}
                          </p>
                          <div className="flex items-center gap-2">
                            {isCurrentDevice && (
                              <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                                현재 기기
                              </span>
                            )}
                            <p className="text-xs text-muted-foreground">
                              구독일: {new Date(device.createdAt).toLocaleDateString('ko-KR')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
            <p className="text-destructive">{error}</p>
          </div>
        )}

        {/* 설정 목록 */}
        <div className="space-y-4">
          {/* 방해 금지 시간 설정 */}
          <div className={`p-4 sm:p-6 rounded-2xl shadow-lg border border-border transition-colors min-h-[5rem] sm:min-h-[6rem] flex items-center ${
            settings.doNotDisturb.enabled 
              ? 'bg-card hover:bg-card/80' 
              : 'bg-card hover:bg-card/80'
          }`}>
            <div className="flex items-center justify-between w-full gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Moon className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm sm:text-base text-foreground">방해 금지 시간</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {settings.doNotDisturb.enabled 
                        ? `${settings.doNotDisturb.startTime} - ${settings.doNotDisturb.endTime}`
                        : '설정 안함'
                      }
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                <button
                  onClick={() => setShowDoNotDisturbDetail(!showDoNotDisturbDetail)}
                  className="text-primary hover:text-primary/80 cursor-pointer p-1 rounded-md hover:bg-primary/10 transition-colors"
                  title="상세 설정"
                >
                  <Settings className="w-5 h-5" />
                </button>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.doNotDisturb.enabled}
                    onChange={toggleDoNotDisturb}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-card-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-card-muted after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>
          </div>

          {/* 방해 금지 시간 상세 설정 */}
          {showDoNotDisturbDetail && (
            <div className="p-4 sm:p-6 bg-card rounded-2xl shadow-lg border border-border border-l-4 border-l-primary">
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
                    className="w-full px-3 py-2 bg-background border border-border text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
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
                    className="w-full px-3 py-2 bg-background border border-border text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
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
          <div className={`p-4 sm:p-6 rounded-2xl shadow-lg border border-border transition-colors min-h-[5rem] sm:min-h-[6rem] flex items-center ${
            settings.newGamePost.enabled 
              ? 'bg-card hover:bg-card/80' 
              : 'bg-card hover:bg-card/80'
          }`}>
            <div className="flex items-center justify-between w-full gap-3">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <Gamepad2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base text-foreground">신규 모임 알림</h3>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                <Link 
                  href="/notifications/settings/new-game-post"
                  className="text-primary hover:text-primary/80 cursor-pointer p-1 rounded-md hover:bg-primary/10 transition-colors"
                  title="상세 설정"
                >
                  <Settings className="w-5 h-5" />
                </Link>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.newGamePost.enabled}
                    onChange={toggleNewGamePost}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-card-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-card-muted after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>
          </div>

          {/* 참여중인 모임 알림 */}
          <div className={`p-4 sm:p-6 rounded-2xl shadow-lg border border-border transition-colors min-h-[5rem] sm:min-h-[6rem] flex items-center ${
            settings.participatingGame.enabled 
              ? 'bg-card hover:bg-card/80' 
              : 'bg-card hover:bg-card/80'
          }`}>
            <div className="flex items-center justify-between w-full gap-3">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base text-foreground">참여중인 모임 알림</h3>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                <Link 
                  href="/notifications/settings/participating-game"
                  className="text-primary hover:text-primary/80 cursor-pointer p-1 rounded-md hover:bg-primary/10 transition-colors"
                  title="상세 설정"
                >
                  <Settings className="w-5 h-5" />
                </Link>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.participatingGame.enabled}
                    onChange={() => toggleCategory('participatingGame')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-card-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-card-muted after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>
          </div>

          {/* 내가 작성한 모임 알림 */}
          <div className={`p-4 sm:p-6 rounded-2xl shadow-lg border border-border transition-colors min-h-[5rem] sm:min-h-[6rem] flex items-center ${
            settings.myGamePost.enabled 
              ? 'bg-card hover:bg-card/80' 
              : 'bg-card hover:bg-card/80'
          }`}>
            <div className="flex items-center justify-between w-full gap-3">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <PenTool className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base text-foreground">작성한 모임 알림</h3>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                <Link 
                  href="/notifications/settings/my-game-post"
                  className="text-primary hover:text-primary/80 cursor-pointer p-1 rounded-md hover:bg-primary/10 transition-colors"
                  title="상세 설정"
                >
                  <Settings className="w-5 h-5" />
                </Link>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.myGamePost.enabled}
                    onChange={() => toggleCategory('myGamePost')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-card-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-card-muted after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>
          </div>

          {/* 공지사항 알림 */}
          <div className={`p-4 sm:p-6 rounded-2xl shadow-lg border border-border transition-colors min-h-[5rem] sm:min-h-[6rem] flex items-center ${
            settings.notice?.enabled 
              ? 'bg-card hover:bg-card/80' 
              : 'bg-card hover:bg-card/80'
          }`}>
            <div className="flex items-center justify-between w-full gap-3">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <Megaphone className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base text-foreground">공지사항 알림</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">새로운 공지사항 알림</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notice?.enabled ?? true}
                    onChange={() => toggleCategory('notice')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-card-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-card-muted after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>
          </div>

          {/* 예비 참여 알림 */}
          <div className={`p-4 sm:p-6 rounded-2xl shadow-lg border border-border transition-colors min-h-[5rem] sm:min-h-[6rem] flex items-center ${
            settings.waitingList.enabled 
              ? 'bg-card hover:bg-card/80' 
              : 'bg-card hover:bg-card/80'
          }`}>
            <div className="flex items-center justify-between w-full gap-3">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base text-foreground">예비 참가중인 모임 알림</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">참가 요청이 왔을때 알림</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.waitingList.enabled}
                    onChange={() => toggleCategory('waitingList')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-card-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-card-muted after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>
          </div>

          {/* 기본값 초기화 섹션 */}
          <div className="p-4 sm:p-6 rounded-2xl shadow-lg border border-border bg-card hover:bg-card/80 transition-colors min-h-[4rem] sm:min-h-[5rem] flex items-center">
            <div className="flex items-center justify-between w-full gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm sm:text-base text-foreground">설정 초기화</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  모든 값을 기본값으로 되돌립니다
                </p>
              </div>
              <button
                onClick={() => setShowResetConfirm(true)}
                className="px-3 sm:px-4 py-2 bg-card-muted text-muted-foreground rounded-lg hover:bg-primary transition-colors cursor-pointer text-sm whitespace-nowrap flex-shrink-0"
              >
                초기화
              </button>
            </div>
          </div>

        </div>

        {/* 푸터 */}
        <div className="mt-6 p-4 text-center">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            설정에서 더 상세한 설정이 가능합니다.
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
    </div>
  );
}
