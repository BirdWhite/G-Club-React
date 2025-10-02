'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/database/supabase';

export function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    try {
      // 현재 세션 확인
      const { data: { session } } = await supabase.auth.getSession();
      
      // Supabase 로그아웃
      await supabase.auth.signOut();
      
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
      
      router.refresh();
      router.push('/auth/login');
    } catch (error) {
      console.error('로그아웃 중 오류 발생:', error);
      router.refresh();
      router.push('/auth/login');
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
    >
      로그아웃
    </button>
  );
}
