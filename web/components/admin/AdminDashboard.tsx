'use client';

import { useState } from 'react';
import { UserRoleManager } from '@/components/admin/UserRoleManager';
import { PermissionManager } from '@/components/admin/PermissionManager';
import { GameManager } from '@/components/admin/GameManager';
import { AuctionManager } from '@/components/admin/AuctionManager';

interface AdminDashboardProps {
  initialTab: 'user' | 'permission' | 'games' | 'auction';
  onTabChange: (newTab: string) => void;
}

export function AdminDashboard({ initialTab, onTabChange }: AdminDashboardProps) {
  const [tab, setTab] = useState<'user' | 'permission' | 'games' | 'auction'>(initialTab);

  const handleTabChange = (newTab: string) => {
    setTab(newTab as 'user' | 'permission' | 'games' | 'auction');
    onTabChange(newTab);
  };

  return (
    <div className="h-full bg-admin-background p-4 overflow-y-auto scrollbar-visible pb-[calc(4rem+max(1rem,env(safe-area-inset-bottom)))] md:pb-4">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-admin-card rounded-lg border border-admin-border p-4 md:p-6">
          <h1 className="text-2xl md:text-3xl font-bold text-admin-foreground mb-6">관리자 대시보드</h1>
          
          {/* 반응형 탭 레이아웃 - 모바일: 세로(flex-col), 데스크톱(md): 가로(flex-row) */}
          <div className="border-b border-admin-border mb-6">
            <nav className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-8 md:-mb-px">
              <button
                onClick={() => handleTabChange('user')}
                className={`${
                  tab === 'user' 
                    ? 'border-admin-primary text-admin-primary md:text-admin-foreground bg-admin-primary/10 md:bg-transparent' 
                    : 'border-transparent text-admin-foreground hover:text-admin-primary hover:bg-admin-100/50 md:hover:bg-transparent md:hover:border-admin-border'
                } text-left md:text-center py-3 px-4 md:py-4 md:px-1 border-l-4 md:border-l-0 md:border-b-2 font-medium text-sm rounded-r-md md:rounded-none transition-colors whitespace-nowrap`}
              >
                사용자 관리
              </button>
              <button
                onClick={() => handleTabChange('games')}
                className={`${
                  tab === 'games' 
                    ? 'border-admin-primary text-admin-primary md:text-admin-foreground bg-admin-primary/10 md:bg-transparent' 
                    : 'border-transparent text-admin-foreground hover:text-admin-primary hover:bg-admin-100/50 md:hover:bg-transparent md:hover:border-admin-border'
                } text-left md:text-center py-3 px-4 md:py-4 md:px-1 border-l-4 md:border-l-0 md:border-b-2 font-medium text-sm rounded-r-md md:rounded-none transition-colors whitespace-nowrap`}
              >
                게임 관리
              </button>
              <button
                onClick={() => handleTabChange('permission')}
                className={`${
                  tab === 'permission' 
                    ? 'border-admin-primary text-admin-primary md:text-admin-foreground bg-admin-primary/10 md:bg-transparent' 
                    : 'border-transparent text-admin-foreground hover:text-admin-primary hover:bg-admin-100/50 md:hover:bg-transparent md:hover:border-admin-border'
                } text-left md:text-center py-3 px-4 md:py-4 md:px-1 border-l-4 md:border-l-0 md:border-b-2 font-medium text-sm rounded-r-md md:rounded-none transition-colors whitespace-nowrap`}
              >
                권한 관리 (미구현)
              </button>
              <button
                onClick={() => handleTabChange('auction')}
                className={`${
                  tab === 'auction' 
                    ? 'border-admin-primary text-admin-primary md:text-admin-foreground bg-admin-primary/10 md:bg-transparent' 
                    : 'border-transparent text-admin-foreground hover:text-admin-primary hover:bg-admin-100/50 md:hover:bg-transparent md:hover:border-admin-border'
                } text-left md:text-center py-3 px-4 md:py-4 md:px-1 border-l-4 md:border-l-0 md:border-b-2 font-medium text-sm rounded-r-md md:rounded-none transition-colors whitespace-nowrap`}
              >
                경매 관리
              </button>
            </nav>
          </div>

          <div className="mt-6">
            {tab === 'user' && <UserRoleManager />}
            {tab === 'permission' && <PermissionManager />}
            {tab === 'games' && <GameManager />}
            {tab === 'auction' && <AuctionManager />}
          </div>
        </div>
      </div>
    </div>
  );
}
