'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useNotificationSettings } from '@/hooks';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface MyGamePostSettings {
  fullMeeting: boolean; // 다 모였을때 알람
  memberJoin: boolean; // 모임 참여 알람  
  memberLeave: boolean; // 모임 참여 취소 알람
  beforeMeeting: {
    enabled: boolean; // 모임 전 알람
    minutes: number; // 몇 분 전 (기본 30분)
    onlyFullMeeting: boolean; // 모임이 다 모였을때만
  };
  meetingStart: {
    enabled: boolean; // 모임 시작 알람
    onlyFullMeeting: boolean; // 모임이 다 모였을때만
  };
}

export default function MyGamePostNotificationSettings() {
  const router = useRouter();
  const { settings, updateMyGamePost, isLoading } = useNotificationSettings();
  
  const [gameSettings, setGameSettings] = useState<MyGamePostSettings>({
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
    if (settings.myGamePost.settings) {
      setGameSettings(prev => ({
        ...prev,
        ...settings.myGamePost.settings
      }));
    }
  }, [settings]);

  // 설정 저장
  const saveSettings = async () => {
    await updateMyGamePost(settings.myGamePost.enabled, gameSettings);
    router.back();
  };

  // 설정 업데이트 헬퍼
  const updateSetting = (key: keyof MyGamePostSettings, value: any) => {
    setGameSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const updateBeforeMeeting = (key: keyof MyGamePostSettings['beforeMeeting'], value: any) => {
    setGameSettings(prev => ({
      ...prev,
      beforeMeeting: {
        ...prev.beforeMeeting,
        [key]: value
      }
    }));
  };

  const updateMeetingStart = (key: keyof MyGamePostSettings['meetingStart'], value: any) => {
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
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="bg-white rounded-lg shadow-sm border">
        {/* 헤더 */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">내가 작성한 모임 알림</h1>
              <p className="text-gray-600 mt-1">내가 작성한 게임 모임의 상태 변화 알림을 설정하세요</p>
            </div>
          </div>
        </div>

        {/* 설정 내용 */}
        <div className="p-6 space-y-6">
          
          {/* 다 모였을때 알람 */}
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <h3 className="font-semibold text-gray-900">다 모였을때 알람</h3>
                <p className="text-sm text-gray-600">내 모임 인원이 가득 찼을 때 알림을 받습니다</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={gameSettings.fullMeeting}
                onChange={(e) => updateSetting('fullMeeting', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* 모임 참여 알람 */}
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-2xl">👋</span>
              <div>
                <h3 className="font-semibold text-gray-900">모임 참여 알람</h3>
                <p className="text-sm text-gray-600">누군가가 내 모임에 참여할 때마다 알림을 받습니다</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={gameSettings.memberJoin}
                onChange={(e) => updateSetting('memberJoin', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* 모임 참여 취소 알람 */}
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-2xl">💔</span>
              <div>
                <h3 className="font-semibold text-gray-900">모임 참여 취소 알람</h3>
                <p className="text-sm text-gray-600">누군가가 내 모임 참여를 취소할 때마다 알림을 받습니다</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={gameSettings.memberLeave}
                onChange={(e) => updateSetting('memberLeave', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* 모임 전 알람 */}
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⏰</span>
                <div>
                  <h3 className="font-semibold text-gray-900">모임 전 알람</h3>
                  <p className="text-sm text-gray-600">내 모임 시작 전 미리 알림을 받습니다</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={gameSettings.beforeMeeting.enabled}
                  onChange={(e) => updateBeforeMeeting('enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            {gameSettings.beforeMeeting.enabled && (
              <div className="ml-8 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    알림 시간
                  </label>
                  <select
                    value={gameSettings.beforeMeeting.minutes}
                    onChange={(e) => updateBeforeMeeting('minutes', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={10}>10분 전</option>
                    <option value={30}>30분 전</option>
                    <option value={60}>1시간 전</option>
                    <option value={180}>3시간 전</option>
                  </select>
                </div>
                
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gameSettings.beforeMeeting.onlyFullMeeting}
                    onChange={(e) => updateBeforeMeeting('onlyFullMeeting', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">모임이 다 모였을때만 알림</span>
                </label>
              </div>
            )}
          </div>

          {/* 모임 시작 알람 */}
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🚀</span>
                <div>
                  <h3 className="font-semibold text-gray-900">모임 시작 알람</h3>
                  <p className="text-sm text-gray-600">내 모임 시작 시간에 알림을 받습니다</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={gameSettings.meetingStart.enabled}
                  onChange={(e) => updateMeetingStart('enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            {gameSettings.meetingStart.enabled && (
              <div className="ml-8">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gameSettings.meetingStart.onlyFullMeeting}
                    onChange={(e) => updateMeetingStart('onlyFullMeeting', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">모임이 다 모였을때만 알림</span>
                </label>
              </div>
            )}
          </div>

        </div>

        {/* 하단 버튼 */}
        <div className="px-6 py-4 bg-gray-50 border-t rounded-b-lg flex justify-between">
          <button
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            취소
          </button>
          <button
            onClick={saveSettings}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
