'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Clock, Hand, HeartCrack, Rocket, UserRoundCheck } from 'lucide-react';
import type { MyGamePostSettings } from '@/types/models';

export default function MyGamePostNotificationSettings() {
  const router = useRouter();
  const { settings, updateMyGamePost, isLoading } = useNotificationSettings();
  
  const [gameSettings, setGameSettings] = useState<MyGamePostSettings>({
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
  });

  // 초기 설정 로드
  useEffect(() => {
    setGameSettings(prev => ({
      ...prev,
      ...settings.myGamePost
    }));
  }, [settings]);

  // 설정 저장
  const saveSettings = async () => {
    await updateMyGamePost(settings.myGamePost.enabled, gameSettings);
    router.back();
  };

  // 설정 업데이트 헬퍼
  const updateSetting = (key: keyof MyGamePostSettings, value: unknown) => {
    setGameSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const updateBeforeMeeting = (key: keyof MyGamePostSettings['beforeMeeting'], value: unknown) => {
    setGameSettings(prev => ({
      ...prev,
      beforeMeeting: {
        ...prev.beforeMeeting,
        [key]: value
      }
    }));
  };

  const updateMeetingStart = (key: keyof MyGamePostSettings['meetingStart'], value: unknown) => {
    setGameSettings(prev => ({
      ...prev,
      meetingStart: {
        ...prev.meetingStart,
        [key]: value
      }
    }));
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex flex-col items-center px-8 sm:px-10 lg:px-12 py-8">
        <div className="w-full max-w-4xl">
      {/* 헤더 */}
      <div className="mb-8 sm:mb-12">
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-muted rounded-lg transition-colors flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">내가 작성한 모임 알림</h1>
          </div>
        </div>
      </div>

      {/* 설정 내용 */}
      <div className="space-y-6">
          
          {/* 다 모였을때 알림 */}
          <div className="flex items-center justify-between p-3 sm:p-4 border border-border rounded-lg bg-card hover:bg-card/80 transition-colors gap-3">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <UserRoundCheck className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm sm:text-base text-foreground">다 모였을때 알림</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">내 모임 인원이 가득 찼을 때 알림을 받습니다</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={gameSettings.fullMeeting}
                onChange={(e) => updateSetting('fullMeeting', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-card-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-card-muted after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {/* 모임 참여 알림 */}
          <div className="flex items-center justify-between p-3 sm:p-4 border border-border rounded-lg bg-card hover:bg-card/80 transition-colors gap-3">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <Hand className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm sm:text-base text-foreground">모임 참여 알림</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">누군가가 내 모임에 참여할 때마다 알림을 받습니다</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={gameSettings.memberJoin}
                onChange={(e) => updateSetting('memberJoin', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-card-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-card-muted after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {/* 모임 참여 취소 알림 */}
          <div className="flex items-center justify-between p-3 sm:p-4 border border-border rounded-lg bg-card hover:bg-card/80 transition-colors gap-3">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <HeartCrack className="w-5 h-5 sm:w-6 sm:h-6 text-destructive flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm sm:text-base text-foreground">모임 참여 취소 알림</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">누군가가 내 모임 참여를 취소할 때마다 알림을 받습니다</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={gameSettings.memberLeave}
                onChange={(e) => updateSetting('memberLeave', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-card-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-card-muted after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {/* 모임 전 알림 */}
          <div className="p-3 sm:p-4 border border-border rounded-lg bg-card hover:bg-card/80 transition-colors">
            <div className="flex items-center justify-between mb-3 sm:mb-4 gap-3">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base text-foreground">모임 전 알림</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">내 모임 시작 전 미리 알림을 받습니다</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={gameSettings.beforeMeeting.enabled}
                  onChange={(e) => updateBeforeMeeting('enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-card-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-card-muted after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
            
            {gameSettings.beforeMeeting.enabled && (
              <div className="ml-6 sm:ml-8 space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-foreground mb-2">
                    알림 시간
                  </label>
                  <select
                    value={gameSettings.beforeMeeting.minutes}
                    onChange={(e) => updateBeforeMeeting('minutes', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                  >
                    <option value={10}>10분 전</option>
                    <option value={30}>30분 전</option>
                    <option value={60}>1시간 전</option>
                  </select>
                </div>
                
                <label className="flex items-center gap-2 sm:gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gameSettings.beforeMeeting.onlyFullMeeting}
                    onChange={(e) => updateBeforeMeeting('onlyFullMeeting', e.target.checked)}
                    className="w-4 h-4 text-primary border-border rounded focus:ring-primary flex-shrink-0"
                  />
                  <span className="text-xs sm:text-sm text-foreground">모임이 다 모였을때만 알림</span>
                </label>
              </div>
            )}
          </div>

          {/* 모임 시작 알림 */}
          <div className="p-3 sm:p-4 border border-border rounded-lg bg-card hover:bg-card/80 transition-colors">
            <div className="flex items-center justify-between mb-3 sm:mb-4 gap-3">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <Rocket className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base text-foreground">모임 시작 알림</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">내 모임 시작 시간에 알림을 받습니다</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={gameSettings.meetingStart.enabled}
                  onChange={(e) => updateMeetingStart('enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-card-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-card-muted after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
            
            {gameSettings.meetingStart.enabled && (
              <div className="ml-6 sm:ml-8">
                <label className="flex items-center gap-2 sm:gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gameSettings.meetingStart.onlyFullMeeting}
                    onChange={(e) => updateMeetingStart('onlyFullMeeting', e.target.checked)}
                    className="w-4 h-4 text-primary border-border rounded focus:ring-primary flex-shrink-0"
                  />
                  <span className="text-xs sm:text-sm text-foreground">모임이 다 모였을때만 알림</span>
                </label>
              </div>
            )}
          </div>

        </div>

        {/* 하단 버튼 */}
        <div className="mt-8 sm:mt-12 flex justify-between gap-3">
          <button
            onClick={() => router.back()}
            className="flex-1 sm:flex-none px-4 sm:px-6 py-2 border border-border text-foreground rounded-lg hover:bg-muted transition-colors text-sm sm:text-base"
          >
            취소
          </button>
          <button
            onClick={saveSettings}
            className="flex-1 sm:flex-none px-4 sm:px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm sm:text-base"
          >
            저장
          </button>
        </div>
        </div>
      </div>
  );
}
