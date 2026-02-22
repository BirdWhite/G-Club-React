'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@/lib/database/supabase';
import type { FullUserProfile } from '@/lib/user'; // getUserProfile에서 정의한 타입을 재사용합니다.

interface ProfileContextType {
  profile: FullUserProfile | null;
  isLoading: boolean;
  error: Error | null;
  refetchProfile: () => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<FullUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [supabase] = useState(() => createClient());

  const fetchProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setProfile(null);
        setIsLoading(false);
        return;
      }
      
      // 사용자 프로필 정보를 가져오는 API 호출
      const res = await fetch('/api/profile', {
        cache: 'no-store', // 캐시 방지
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      
      // 401 에러는 인증되지 않은 사용자
      if (res.status === 401) {
        setProfile(null);
        return;
      }
      
      if (!res.ok) {
        throw new Error('프로필 정보를 불러오는데 실패했습니다.');
      }
      const data = await res.json();
      setProfile(data.profile);
    } catch (e) {
      setError(e as Error);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile(); // 컴포넌트 마운트 시 프로필 정보 가져오기

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      // 로그인 또는 로그아웃 시 프로필 정보 다시 가져오기
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        fetchProfile();
      }
    });

    // refreshProfile 이벤트 리스너 추가
    const handleRefreshProfile = () => {
      fetchProfile();
    };

    window.addEventListener('refreshProfile', handleRefreshProfile);

    return () => {
      authListener.subscription.unsubscribe();
      window.removeEventListener('refreshProfile', handleRefreshProfile);
    };
  }, [supabase]); // supabase 의존성 복구

  return (
    <ProfileContext.Provider value={{ profile, isLoading, error, refetchProfile: fetchProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
} 