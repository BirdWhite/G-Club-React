'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { createClient } from '@/lib/database/supabase';
import type { FullUserProfile } from '@/lib/user';

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
  const currentUserIdRef = useRef<string | null>(null);
  const fetchInProgressRef = useRef(false);

  const fetchProfile = async (showLoading = true) => {
    if (fetchInProgressRef.current) return;
    fetchInProgressRef.current = true;

    if (showLoading) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        currentUserIdRef.current = null;
        setProfile(null);
        setIsLoading(false);
        return;
      }

      currentUserIdRef.current = session.user.id;

      const res = await fetch('/api/profile', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      
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
      fetchInProgressRef.current = false;
    }
  };

  useEffect(() => {
    fetchProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        currentUserIdRef.current = null;
        setProfile(null);
        setIsLoading(false);
        return;
      }

      if (event === 'SIGNED_IN') {
        // Supabase는 탭 포커스 시 토큰 갱신 목적으로 SIGNED_IN을 발생시킴
        // 같은 유저면 이미 프로필이 로드되어 있으므로 스킵
        if (session?.user?.id === currentUserIdRef.current) {
          return;
        }
        fetchProfile();
      }
    });

    const handleRefreshProfile = () => {
      fetchProfile(false);
    };

    window.addEventListener('refreshProfile', handleRefreshProfile);

    return () => {
      authListener.subscription.unsubscribe();
      window.removeEventListener('refreshProfile', handleRefreshProfile);
    };
  }, [supabase]);

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