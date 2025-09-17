'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useNotificationSettings } from '@/hooks';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function NotificationSettingsPage() {
  const {
    settings,
    isLoading,
    error,
    toggleCategory,
    toggleDoNotDisturb,
    updateDoNotDisturb
  } = useNotificationSettings();

  const [showDoNotDisturbDetail, setShowDoNotDisturbDetail] = useState(false);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="bg-white rounded-lg shadow-sm border">
        {/* 헤더 */}
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-gray-900">알림 설정</h1>
          <p className="text-gray-600 mt-1">
            원하는 알림만 받아보세요
          </p>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mx-6 mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* 설정 목록 */}
        <div className="p-6 space-y-6">
          
          {/* 방해 금지 시간 설정 */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🌙</span>
                <div>
                  <h3 className="font-semibold text-gray-900">방해 금지 시간</h3>
                  <p className="text-sm text-gray-600">
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
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
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
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {/* 방해 금지 시간 상세 설정 */}
          {showDoNotDisturbDetail && (
            <div className="ml-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    시작 시간
                  </label>
                  <input
                    type="time"
                    value={settings.doNotDisturb.startTime}
                    onChange={(e) => updateDoNotDisturb({
                      ...settings.doNotDisturb,
                      startTime: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    종료 시간
                  </label>
                  <input
                    type="time"
                    value={settings.doNotDisturb.endTime}
                    onChange={(e) => updateDoNotDisturb({
                      ...settings.doNotDisturb,
                      endTime: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  적용 요일
                </label>
                <div className="flex gap-2">
                  {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
                    <button
                      key={day}
                      onClick={() => {
                        const dayStr = index.toString();
                        const newDays = settings.doNotDisturb.days.includes(dayStr)
                          ? settings.doNotDisturb.days.filter(d => d !== dayStr)
                          : [...settings.doNotDisturb.days, dayStr];
                        
                        updateDoNotDisturb({
                          ...settings.doNotDisturb,
                          days: newDays
                        });
                      }}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        settings.doNotDisturb.days.includes(index.toString())
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
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
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎮</span>
              <div>
                <h3 className="font-semibold text-gray-900">신규 게임메이트 글 알림</h3>
                <p className="text-sm text-gray-600">새로운 게임메이트 모집글이 올라올 때 알림</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link 
                href="/notifications/settings/new-game-post"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                상세 설정
              </Link>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.newGamePost.enabled}
                  onChange={() => toggleCategory('newGamePost')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {/* 참여중인 모임 알림 */}
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-2xl">👥</span>
              <div>
                <h3 className="font-semibold text-gray-900">참여중인 모임 알림</h3>
                <p className="text-sm text-gray-600">내가 참여한 게임 모임 관련 알림</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link 
                href="/notifications/settings/participating-game"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
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
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {/* 내가 작성한 모임 알림 */}
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✍️</span>
              <div>
                <h3 className="font-semibold text-gray-900">내가 작성한 모임 알림</h3>
                <p className="text-sm text-gray-600">내가 작성한 게임 모임 관련 알림</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link 
                href="/notifications/settings/my-game-post"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
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
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {/* 예비 참여 알림 */}
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⏳</span>
              <div>
                <h3 className="font-semibold text-gray-900">예비로 참여중인 모임 알림</h3>
                <p className="text-sm text-gray-600">참여 요청이 왔을때 알림</p>
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
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 bg-gray-50 border-t rounded-b-lg">
          <p className="text-sm text-gray-600">
            💡 상세 설정에서 더 세밀한 알림 조건을 설정할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
