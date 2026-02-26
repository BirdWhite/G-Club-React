'use client';

import { useState } from 'react';
import { UserRoleManager } from '@/components/admin/UserRoleManager';
import { PermissionManager } from '@/components/admin/PermissionManager';
import { GameManager } from '@/components/admin/GameManager';

interface MobileAdminDashboardProps {
  initialTab: 'user' | 'permission' | 'games';
  onTabChange: (newTab: string) => void;
}

export function MobileAdminDashboard({ initialTab, onTabChange }: MobileAdminDashboardProps) {
  const [tab, setTab] = useState<'user' | 'permission' | 'games'>(initialTab);

  const handleTabChange = (newTab: string) => {
    setTab(newTab as 'user' | 'permission' | 'games');
    onTabChange(newTab);
  };

  return (
    <div className="h-full bg-admin-background p-4 overflow-y-auto scrollbar-visible">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-admin-card rounded-lg border border-admin-border p-6">
          <h1 className="text-2xl font-bold text-admin-foreground mb-6">관리자 대시보드</h1>
          
          {/* 모바일용 탭 - 세로 배치 */}
          <div className="border-b border-admin-border mb-6">
            <nav className="flex flex-col space-y-2">
              <button
                onClick={() => handleTabChange('user')}
                className={`${
                  tab === 'user' 
                    ? 'border-admin-primary text-admin-foreground bg-admin-primary/20' 
                    : 'border-transparent text-admin-foreground hover:text-admin-primary hover:bg-admin-100'
                } text-left py-3 px-4 border-l-4 font-medium text-sm rounded-r-md transition-colors`}
              >
                사용자 관리
              </button>
              <button
                onClick={() => handleTabChange('games')}
                className={`${
                  tab === 'games' 
                    ? 'border-admin-primary text-admin-foreground bg-admin-primary/20' 
                    : 'border-transparent text-admin-foreground hover:text-admin-primary hover:bg-admin-100'
                } text-left py-3 px-4 border-l-4 font-medium text-sm rounded-r-md transition-colors`}
              >
                게임 관리
              </button>
              <button
                onClick={() => handleTabChange('permission')}
                className={`${
                  tab === 'permission' 
                    ? 'border-admin-primary text-admin-foreground bg-admin-primary/20' 
                    : 'border-transparent text-admin-foreground hover:text-admin-primary hover:bg-admin-100'
                } text-left py-3 px-4 border-l-4 font-medium text-sm rounded-r-md transition-colors`}
              >
                권한 관리 (미구현)
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
