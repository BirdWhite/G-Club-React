'use client';

import { useState } from 'react';
import { UserRoleManager } from '@/components/admin/UserRoleManager';
import { PermissionManager } from '@/components/admin/PermissionManager';
import { GameManager } from '@/components/admin/GameManager';

interface DesktopAdminDashboardProps {
  initialTab: 'user' | 'permission' | 'games';
  onTabChange: (newTab: string) => void;
}

export function DesktopAdminDashboard({ initialTab, onTabChange }: DesktopAdminDashboardProps) {
  const [tab, setTab] = useState<'user' | 'permission' | 'games'>(initialTab);

  const handleTabChange = (newTab: string) => {
    setTab(newTab as any);
    onTabChange(newTab);
  };

  return (
    <div className="h-full bg-cyber-black-200 p-4 overflow-y-auto scrollbar-visible">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-cyber-black-100 rounded-lg border border-cyber-black-300 p-6">
          <h1 className="text-3xl font-bold text-cyber-gray mb-6">관리자 대시보드</h1>
          
          {/* 데스크톱용 탭 - 가로 배치 */}
          <div className="border-b border-cyber-black-300">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => handleTabChange('user')}
                className={`${
                  tab === 'user' 
                    ? 'border-cyber-blue text-cyber-blue' 
                    : 'border-transparent text-cyber-gray hover:text-cyber-blue hover:border-cyber-gray'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                사용자 관리
              </button>
              <button
                onClick={() => handleTabChange('permission')}
                className={`${
                  tab === 'permission' 
                    ? 'border-cyber-blue text-cyber-blue' 
                    : 'border-transparent text-cyber-gray hover:text-cyber-blue hover:border-cyber-gray'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                권한 관리
              </button>
              <button
                onClick={() => handleTabChange('games')}
                className={`${
                  tab === 'games' 
                    ? 'border-cyber-blue text-cyber-blue' 
                    : 'border-transparent text-cyber-gray hover:text-cyber-blue hover:border-cyber-gray'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                게임 관리
              </button>
            </nav>
          </div>

          <div className="mt-6">
            {tab === 'user' && <UserRoleManager />}
            {tab === 'permission' && <PermissionManager />}
            {tab === 'games' && <GameManager />}
          </div>
        </div>
      </div>
    </div>
  );
}
