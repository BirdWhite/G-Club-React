'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/database/supabase';
import { Gamepad2 } from 'lucide-react';
import type { FullUserProfile } from '@/lib/user';

interface DesktopProfilePageProps {
  targetProfile: FullUserProfile;
  isOwnProfile: boolean;
}

export function DesktopProfilePage({ targetProfile, isOwnProfile }: DesktopProfilePageProps) {
  const router = useRouter();
  const supabase = createClient();
  const displayName = targetProfile.name || '사용자';
  const createdAt = targetProfile.createdAt ? new Date(targetProfile.createdAt) : new Date();

  const handleSignOut = async () => {
    try {
      // 현재 세션 확인
      const { data: { session } } = await supabase.auth.getSession();
      
      // Supabase 로그아웃
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // 카카오 OAuth 세션도 로그아웃 (카카오 계정이면)
      if (session?.user?.app_metadata?.provider === 'kakao') {
        try {
          // 카카오 로그아웃 URL로 리다이렉트
          const kakaoLogoutUrl = 'https://kauth.kakao.com/oauth/logout?client_id=' + 
            process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID + 
            '&logout_redirect_uri=' + encodeURIComponent(window.location.origin + '/auth/login');
          
          // 카카오 로그아웃 후 로그인 페이지로 리다이렉트
          window.location.href = kakaoLogoutUrl;
          return;
        } catch (kakaoError) {
          console.error('카카오 로그아웃 중 오류:', kakaoError);
          // 카카오 로그아웃 실패해도 계속 진행
        }
      }
      
      router.push('/');
    } catch (error) {
      console.error('로그아웃 중 오류 발생:', error);
      router.push('/');
    }
  };
  
  // 날짜 포맷팅
  const formattedDate = createdAt.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // 생년월일 포맷팅
  const formattedBirthDate = targetProfile?.birthDate 
    ? new Date(targetProfile.birthDate).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC' // 시간대 문제 방지
      })
    : '...';

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

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="bg-card border border-border shadow-lg overflow-hidden p-6" style={{borderRadius: 'var(--radius)'}}>
        <div className="flex flex-col md:flex-row gap-6">
          {/* 프로필 이미지 */}
          <div className="w-32 h-32 md:w-40 md:h-40 relative rounded-full overflow-hidden border-4 border-border bg-white">
            {targetProfile.image && !targetProfile.image.includes('kakaocdn.net') ? (
              <Image
                src={targetProfile.image}
                alt={displayName}
                fill
                className="object-cover"
                priority
                unoptimized={targetProfile.image.includes('127.0.0.1') || targetProfile.image.includes('pnu-ultimate.kro.kr')}
              />
            ) : (
              <div className="w-full h-full bg-background flex items-center justify-center text-muted-foreground">
                <span className="text-4xl font-bold">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          
          {/* 프로필 정보 */}
          <div className="flex-1">
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold text-foreground">{targetProfile.name || '사용자'}</h1>
              
              {/* 버튼들 - 자신의 프로필일 때만 표시 */}
              {isOwnProfile && (
                <div className="flex flex-col gap-3 mt-6">
                  {/* 프로필 수정 */}
                  <Link 
                    href="/profile/edit"
                    className="flex items-center gap-3 px-4 py-3 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors w-fit"
                    style={{borderRadius: 'var(--radius)'}}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    프로필 수정
                  </Link>

                  {/* 게임메이트 내역 */}
                  <Link 
                    href="/profile/game-mate-history"
                    className="flex items-center gap-3 px-4 py-3 bg-popover text-popover-foreground hover:bg-popover/80 transition-colors w-fit"
                    style={{borderRadius: 'var(--radius)'}}
                  >
                    <Gamepad2 className="w-5 h-5" />
                    게임메이트 내역
                  </Link>

                  {/* 관심 게임 설정 */}
                  <Link 
                    href="/profile/favorite-games"
                    className="flex items-center gap-3 px-4 py-3 bg-popover text-popover-foreground hover:bg-popover/80 transition-colors w-fit"
                    style={{borderRadius: 'var(--radius)'}}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    관심 게임 설정
                  </Link>

                  {/* 알림 설정 */}
                  <Link 
                    href="/notifications/settings"
                    className="flex items-center gap-3 px-4 py-3 bg-popover text-popover-foreground hover:bg-popover/80 transition-colors w-fit"
                    style={{borderRadius: 'var(--radius)'}}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    알림 설정
                  </Link>

                  {/* 관리자 대시보드 - 어드민만 보임 */}
                  {(targetProfile.role?.name === 'ADMIN' || targetProfile.role?.name === 'SUPER_ADMIN') && (
                    <Link 
                      href="/admin/dashboard"
                      className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700 transition-colors w-fit shadow-lg"
                      style={{borderRadius: 'var(--radius)'}}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      관리자 대시보드
                    </Link>
                  )}

                  {/* 로그아웃 */}
                  <button 
                    onClick={handleSignOut}
                    className="flex items-center gap-3 px-4 py-3 bg-danger text-white hover:bg-red-600 transition-colors w-fit cursor-pointer"
                    style={{borderRadius: 'var(--radius)'}}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    로그아웃
                  </button>
                </div>
              )}
            </div>
            
            <div className="mt-6 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">이메일</h3>
                <p className="mt-1 text-foreground">
                  {targetProfile.email || '이메일 없음'}
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">생년월일</h3>
                <p className="mt-1 text-foreground">
                  {formattedBirthDate}
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">가입일</h3>
                <p className="mt-1 text-foreground">
                  {formattedDate}
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">권한</h3>
                <p className="mt-1 text-foreground">
                  {getRoleLabel(targetProfile.role?.name)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
