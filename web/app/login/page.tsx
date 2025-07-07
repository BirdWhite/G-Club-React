'use client';

import { useLogin } from '@/hooks';
import { LoginForm } from '@/components';

export default function LoginPage() {
  // 로그인 관련 로직 - 세션 체크, 프로필 확인, 카카오 로그인
  const { session, handleKakaoLogin } = useLogin();

  // 세션이 있는 경우 로딩 중 상태로 간주
  if (session) {
    // 로딩 중에는 아무것도 렌더링하지 않음
    return null;
  }

  // LoginForm 컴포넌트 렌더링
  return <LoginForm onKakaoLogin={handleKakaoLogin} />;
}
