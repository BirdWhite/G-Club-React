'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function NotificationSettingsPage() {
  const {
    settings,
    isLoading,
    error,
    updateDoNotDisturb,
    toggleCategory,
    updateSettings
  } = useNotificationSettings();

  const [showDoNotDisturbDetail, setShowDoNotDisturbDetail] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const toggleDoNotDisturb = () => {
    updateDoNotDisturb({ 
      ...settings.doNotDisturb,
      enabled: !settings.doNotDisturb.enabled 
    });
  };

  const toggleNewGamePost = () => {
    toggleCategory('newGamePost');
  };

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
    <div className="min-h-screen bg-cyber-black-200-oklch">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-cyber-gray">알람 설정</h1>
          <p className="text-cyber-gray/80 mt-2">
            원하는 알림만 받아보세요
          </p>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-6 p-4 bg-cyber-red/10 border border-cyber-red/30 rounded-lg">
            <p className="text-cyber-red">{error}</p>
          </div>
        )}

        {/* 설정 목록 */}
        <div className="space-y-4">
          {/* 방해 금지 시간 설정 */}
          <div className={`p-6 rounded-2xl shadow-lg border border-cyber-black-200-oklch transition-colors ${
            settings.doNotDisturb.enabled 
              ? 'bg-cyber-black-100-oklch hover:bg-cyber-black-50-oklch' 
              : 'bg-cyber-black-150-oklch hover:bg-cyber-black-50-oklch'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🌙</span>
                  <div>
                    <h3 className="font-semibold text-cyber-gray">방해 금지 시간</h3>
                    <p className="text-sm text-cyber-darkgray">
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
                  className="text-cyber-blue hover:text-cyber-blue/80 text-sm font-medium"
                >
                  상세 설정
                </button>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.doNotDisturb.enabled}
                    onChange={toggleDoNotDisturb}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-cyber-black-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyber-blue/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-cyber-black-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyber-blue"></div>
                </label>
              </div>
            </div>
          </div>

          {/* 방해 금지 시간 상세 설정 */}
          {showDoNotDisturbDetail && (
            <div className="p-6 bg-cyber-black-100-oklch rounded-2xl shadow-lg border border-cyber-black-200-oklch border-l-4 border-l-cyber-blue">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-cyber-gray mb-1">
                    시작 시간
                  </label>
                  <input
                    type="time"
                    value={settings.doNotDisturb.startTime}
                    onChange={(e) => updateDoNotDisturb({
                      ...settings.doNotDisturb,
                      startTime: e.target.value
                    })}
                    className="w-full px-3 py-2 bg-cyber-black-200-oklch border border-cyber-black-200-oklch text-cyber-gray rounded-md focus:outline-none focus:ring-2 focus:ring-cyber-blue focus:border-cyber-blue"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-cyber-gray mb-1">
                    종료 시간
                  </label>
                  <input
                    type="time"
                    value={settings.doNotDisturb.endTime}
                    onChange={(e) => updateDoNotDisturb({
                      ...settings.doNotDisturb,
                      endTime: e.target.value
                    })}
                    className="w-full px-3 py-2 bg-cyber-black-200-oklch border border-cyber-black-200-oklch text-cyber-gray rounded-md focus:outline-none focus:ring-2 focus:ring-cyber-blue focus:border-cyber-blue"
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-cyber-gray mb-2">
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
                          ? 'bg-cyber-blue text-white'
                          : 'bg-cyber-black-100-oklch text-cyber-darkgray hover:bg-cyber-black-50-oklch'
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
          <div className={`p-6 rounded-2xl shadow-lg border border-cyber-black-200-oklch transition-colors ${
            settings.newGamePost.enabled 
              ? 'bg-cyber-black-100-oklch hover:bg-cyber-black-50-oklch' 
              : 'bg-cyber-black-150-oklch hover:bg-cyber-black-50-oklch'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎮</span>
                <div>
                  <h3 className="font-semibold text-cyber-gray">신규 게임메이트 글 알림</h3>
                  <p className="text-sm text-cyber-darkgray">새로운 게임메이트 모집글이 올라올 때 알림</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link 
                  href="/notifications/settings/new-game-post"
                  className="text-cyber-blue hover:text-cyber-blue/80 text-sm font-medium"
                >
                  상세 설정
                </Link>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.newGamePost.enabled}
                    onChange={toggleNewGamePost}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-cyber-black-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyber-blue/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-cyber-black-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyber-blue"></div>
                </label>
              </div>
            </div>
          </div>

          {/* 참여중인 모임 알림 */}
          <div className={`p-6 rounded-2xl shadow-lg border border-cyber-black-200-oklch transition-colors ${
            settings.participatingGame.enabled 
              ? 'bg-cyber-black-100-oklch hover:bg-cyber-black-50-oklch' 
              : 'bg-cyber-black-150-oklch hover:bg-cyber-black-50-oklch'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">👥</span>
                <div>
                  <h3 className="font-semibold text-cyber-gray">참여중인 모임 알림</h3>
                  <p className="text-sm text-cyber-darkgray">내가 참여한 게임 모임 관련 알림</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link 
                  href="/notifications/settings/participating-game"
                  className="text-cyber-blue hover:text-cyber-blue/80 text-sm font-medium"
                >
                  상세 설정
                </Link>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.participatingGame.enabled}
                    onChange={() => toggleCategory('participatingGame')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-cyber-black-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyber-blue/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-cyber-black-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyber-blue"></div>
                </label>
              </div>
            </div>
          </div>

          {/* 내가 작성한 모임 알림 */}
          <div className={`p-6 rounded-2xl shadow-lg border border-cyber-black-200-oklch transition-colors ${
            settings.myGamePost.enabled 
              ? 'bg-cyber-black-100-oklch hover:bg-cyber-black-50-oklch' 
              : 'bg-cyber-black-150-oklch hover:bg-cyber-black-50-oklch'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">✍️</span>
                <div>
                  <h3 className="font-semibold text-cyber-gray">내가 작성한 모임 알림</h3>
                  <p className="text-sm text-cyber-darkgray">내가 작성한 게임 모임 관련 알림</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link 
                  href="/notifications/settings/my-game-post"
                  className="text-cyber-blue hover:text-cyber-blue/80 text-sm font-medium"
                >
                  상세 설정
                </Link>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.myGamePost.enabled}
                    onChange={() => toggleCategory('myGamePost')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-cyber-black-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyber-blue/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-cyber-black-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyber-blue"></div>
                </label>
              </div>
            </div>
          </div>

          {/* 예비 참여 알림 */}
          <div className={`p-6 rounded-2xl shadow-lg border border-cyber-black-200-oklch transition-colors ${
            settings.waitingList.enabled 
              ? 'bg-cyber-black-100-oklch hover:bg-cyber-black-50-oklch' 
              : 'bg-cyber-black-150-oklch hover:bg-cyber-black-50-oklch'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⏳</span>
                <div>
                  <h3 className="font-semibold text-cyber-gray">예비로 참여중인 모임 알림</h3>
                  <p className="text-sm text-cyber-darkgray">참여 요청이 왔을때 알림</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.waitingList.enabled}
                    onChange={() => toggleCategory('waitingList')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-cyber-black-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyber-blue/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-cyber-black-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyber-blue"></div>
                </label>
              </div>
            </div>
          </div>

          {/* 기본값 초기화 섹션 */}
          <div className="p-6 rounded-2xl shadow-lg border border-cyber-black-200-oklch bg-cyber-black-150-oklch hover:bg-cyber-black-50-oklch transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-cyber-gray">설정 초기화</h3>
                <p className="text-sm text-cyber-gray/80 mt-1">
                  모든 알림 설정을 기본값으로 되돌립니다
                </p>
              </div>
              <button
                onClick={() => setShowResetConfirm(true)}
                className="px-4 py-2 border border-cyber-black-200-oklch text-cyber-gray/80 rounded-lg hover:bg-cyber-black-50-oklch transition-colors"
              >
                기본값으로 초기화
              </button>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="mt-6 p-4 text-center">
          <p className="text-sm text-cyber-gray/60">
            💡 상세 설정에서 더 세밀한 알림 조건을 설정할 수 있습니다.
          </p>
        </div>
      </div>

      {/* 기본값 초기화 확인 모달 */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111113] border border-[#1e1e24] rounded-lg max-w-md w-full p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-cyber-yellow/20 mb-4">
                <svg className="h-6 w-6 text-cyber-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-cyber-gray mb-2">
                설정을 초기화하시겠습니까?
              </h3>
              <p className="text-sm text-cyber-gray/80 mb-6">
                모든 알림 설정이 기본값으로 되돌아갑니다. 이 작업은 되돌릴 수 없습니다.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="px-4 py-2 border border-[#1e1e24] text-cyber-gray/80 rounded-lg hover:bg-[#1e1e24] transition-colors"
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
