'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/database/supabase';
import { Gamepad2, Settings, Shield, Mail, Calendar, LogOut, Download, Edit3, ChevronRight, Bell } from 'lucide-react';
import type { FullUserProfile } from '@/lib/user';
import { ProfileAvatar } from '@/components/common/ProfileAvatar';

interface UserProfileViewProps {
  targetProfile: FullUserProfile;
  isOwnProfile: boolean;
}

export function UserProfileView({ targetProfile, isOwnProfile }: UserProfileViewProps) {
  const router = useRouter();
  const supabase = createClient();
  const displayName = targetProfile.name || '사용자';
  const createdAt = targetProfile.createdAt ? new Date(targetProfile.createdAt) : new Date();

  const handleSignOut = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      if (session?.user?.app_metadata?.provider === 'kakao') {
        try {
          const kakaoLogoutUrl = 'https://kauth.kakao.com/oauth/logout?client_id=' + 
            process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID + 
            '&logout_redirect_uri=' + encodeURIComponent(window.location.origin + '/auth/login');
          window.location.href = kakaoLogoutUrl;
          return;
        } catch (kakaoError) {
          console.error('카카오 로그아웃 중 오류:', kakaoError);
        }
      }
      
      router.push('/');
    } catch (error) {
      console.error('로그아웃 중 오류 발생:', error);
      router.push('/');
    }
  };

  const formattedDate = createdAt.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const formattedBirthDate = targetProfile?.birthDate 
    ? new Date(targetProfile.birthDate).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC'
      })
    : '설정 안 됨';

  const getRoleLabel = (roleName?: string) => {
    if (!roleName) return '일반 사용자';
    const roles: Record<string, string> = {
      USER: '일반 사용자',
      ADMIN: '관리자',
      SUPER_ADMIN: '최고 관리자',
      NONE: '역할 없음'
    };
    return roles[roleName] || roleName;
  };

  const isAdmin = targetProfile.role?.name === 'ADMIN' || targetProfile.role?.name === 'SUPER_ADMIN';

  const menuItems = [
    {
      href: '/profile/edit',
      label: '프로필 수정',
      icon: <Edit3 className="w-5 h-5" />,
      colorClass: 'text-cyber-blue'
    },
    {
      href: '/profile/game-mate-history',
      label: '게임메이트 내역',
      icon: <Gamepad2 className="w-5 h-5" />,
      colorClass: 'text-cyber-purple'
    },
    {
      href: '/profile/favorite-games',
      label: '관심 게임 설정',
      icon: <Settings className="w-5 h-5" />,
      colorClass: 'text-cyber-orange'
    },
    {
      href: '/notifications/settings',
      label: '알림 설정',
      icon: <Bell className="w-5 h-5" />,
      colorClass: 'text-cyber-blue'
    },
    ...(isAdmin ? [{
      href: '/admin/dashboard',
      label: '관리자 대시보드',
      icon: <Shield className="w-5 h-5" />,
      colorClass: 'text-purple-500'
    }] : []),
    {
      href: '/pwa-install',
      label: '앱 설치',
      icon: <Download className="w-5 h-5" />,
      colorClass: 'text-blue-500'
    }
  ];

  return (
    <div className="py-6 md:py-8 px-4 md:px-0 max-w-4xl mx-auto pb-[calc(4rem+max(1rem,env(safe-area-inset-bottom)))] md:pb-8">
      {/* 반응형 격자 레이아웃 - 모바일: 1열, 데스크톱(md): 2열 */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-6">
        
        {/* 1. 아바타 & 기본 정보 카드 */}
        <div className="flex flex-col items-center text-center bg-card border border-border rounded-xl p-6 h-fit shadow-md">
          <div className="relative mb-4 w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden border-4 border-cyber-blue/30 bg-white">
            <ProfileAvatar
              name={displayName}
              image={targetProfile.image}
              size="lg"
              className="w-full h-full object-cover"
              unoptimized={targetProfile.image?.includes('127.0.0.1') || targetProfile.image?.includes('kakaocdn.net')}
            />
          </div>

          <h2 className="text-xl md:text-2xl font-bold text-foreground mb-1">{displayName}</h2>
          <p className="text-sm text-muted-foreground mb-6">{getRoleLabel(targetProfile.role?.name)}</p>

          {/* 💻 데스크톱 전용 액션 버튼 목록 */}
          {isOwnProfile && (
            <div className="hidden md:flex flex-col gap-2.5 w-full">
              {menuItems.map((item, index) => (
                <Link
                  key={index}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-2.5 bg-secondary text-secondary-foreground hover:bg-muted transition-colors rounded-md text-sm font-medium border border-border"
                >
                  <span className={item.colorClass}>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 px-4 py-2.5 bg-danger hover:bg-red-600/90 transition-colors text-white rounded-md text-sm font-medium mt-4 cursor-pointer"
              >
                <LogOut className="w-5 h-5" />
                <span>로그아웃</span>
              </button>
            </div>
          )}
        </div>

        {/* 2. 세부 정보 패널 (모바일/데스크톱 공통 및 모바일 전용 메뉴) */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 shadow-md">
            <h3 className="text-lg font-bold text-foreground mb-4 border-b border-border pb-2">회원 정보</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-secondary/35 rounded-lg border border-border/50">
                <Mail className="w-5 h-5 text-cyber-blue shrink-0" />
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs text-muted-foreground font-medium">이메일</h4>
                  <p className="text-sm font-medium text-foreground truncate">{targetProfile.email || '이메일 없음'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-secondary/35 rounded-lg border border-border/50">
                <Calendar className="w-5 h-5 text-cyber-purple shrink-0" />
                <div>
                  <h4 className="text-xs text-muted-foreground font-medium">생년월일</h4>
                  <p className="text-sm font-medium text-foreground">{formattedBirthDate}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-secondary/35 rounded-lg border border-border/50">
                <Calendar className="w-5 h-5 text-cyber-orange shrink-0" />
                <div>
                  <h4 className="text-xs text-muted-foreground font-medium">가입일</h4>
                  <p className="text-sm font-medium text-foreground">{formattedDate}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-secondary/35 rounded-lg border border-border/50">
                <Shield className="w-5 h-5 text-purple-500 shrink-0" />
                <div>
                  <h4 className="text-xs text-muted-foreground font-medium">서비스 권한</h4>
                  <p className="text-sm font-medium text-foreground">{getRoleLabel(targetProfile.role?.name)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 📱 모바일 전용 액션 메뉴 목록 - 모바일에서만 노출 */}
          {isOwnProfile && (
            <div className="block md:hidden bg-card border border-border rounded-xl overflow-hidden shadow-md divide-y divide-border">
              {menuItems.map((item, index) => (
                <Link
                  key={index}
                  href={item.href}
                  className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className={item.colorClass}>{item.icon}</div>
                    <span className="font-medium text-base text-foreground">{item.label}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-cyber-darkgray" />
                </Link>
              ))}
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-between p-4 hover:bg-red-500/10 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center space-x-4">
                  <LogOut className="w-5 h-5 text-danger" />
                  <span className="font-medium text-base text-danger">로그아웃</span>
                </div>
                <ChevronRight className="w-5 h-5 text-danger" />
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
