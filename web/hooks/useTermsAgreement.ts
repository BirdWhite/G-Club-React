'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/database/supabase';

interface TermsAgreementStatus {
  termsAgreed: boolean;
  termsAgreedAt?: Date;
  privacyAgreed: boolean;
  privacyAgreedAt?: Date;
}

export function useTermsAgreement() {
  const [agreementStatus, setAgreementStatus] = useState<TermsAgreementStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const checkAgreementStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/auth/terms-agreement', {
        cache: 'no-store' // 캐시를 사용하지 않도록 설정
      });
      
      if (!response.ok) {
        throw new Error('약관 동의 상태를 확인할 수 없습니다.');
      }

      const result = await response.json();
      
      if (result.success) {
        setAgreementStatus(result.data);
        
        // 필수 약관에 동의하지 않은 경우 약관 동의 페이지로 리다이렉트
        if (!result.data.termsAgreed || !result.data.privacyAgreed) {
          // 인증 관련 페이지가 아닌 경우에만 리다이렉트
          if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth/')) {
            router.replace('/auth/terms');
          }
        }
      } else {
        throw new Error(result.error || '약관 동의 상태 확인에 실패했습니다.');
      }
    } catch (err) {
      console.error('Terms agreement check error:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateAgreementStatus = async (
    termsAgreed: boolean,
    privacyAgreed: boolean
  ) => {
    try {
      setError(null);

      const response = await fetch('/api/auth/terms-agreement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          termsAgreed,
          privacyAgreed,
          marketingAgreed: false
        }),
        cache: 'no-store' // 캐시를 사용하지 않도록 설정
      });

      if (!response.ok) {
        throw new Error('약관 동의 처리 중 오류가 발생했습니다.');
      }

      const result = await response.json();
      
      if (result.success) {
        setAgreementStatus(result.data);
        
        // 상태 업데이트 후 다시 한 번 확인
        setTimeout(() => {
          checkAgreementStatus();
        }, 100);
        
        return true;
      } else {
        throw new Error(result.error || '약관 동의 처리에 실패했습니다.');
      }
    } catch (err) {
      console.error('Terms agreement update error:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      return false;
    }
  };

  useEffect(() => {
    checkAgreementStatus();
  }, []);

  // 경로 변경 시마다 약관 동의 상태 확인
  useEffect(() => {
    const handleRouteChange = () => {
      // 인증 관련 페이지가 아닌 경우에만 확인
      if (!window.location.pathname.startsWith('/auth/')) {
        checkAgreementStatus();
      }
    };

    // 페이지 로드 시 확인
    handleRouteChange();

    // popstate 이벤트 리스너 추가 (뒤로가기/앞으로가기)
    window.addEventListener('popstate', handleRouteChange);

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  return {
    agreementStatus,
    isLoading,
    error,
    checkAgreementStatus,
    updateAgreementStatus,
    isAgreed: agreementStatus?.termsAgreed && agreementStatus?.privacyAgreed
  };
}
