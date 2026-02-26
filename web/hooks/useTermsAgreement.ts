'use client';

import { useState, useEffect, useRef } from 'react';
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
  const checkedRef = useRef(false);
  const fetchInProgressRef = useRef(false);

  const checkAgreementStatus = async () => {
    if (fetchInProgressRef.current) return;
    fetchInProgressRef.current = true;

    try {
      if (!checkedRef.current) {
        setIsLoading(true);
      }
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/auth/terms-agreement', {
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error('약관 동의 상태를 확인할 수 없습니다.');
      }

      const result = await response.json();
      
      if (result.success) {
        setAgreementStatus(result.data);
        checkedRef.current = true;
        
        if (!result.data.termsAgreed || !result.data.privacyAgreed) {
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
      fetchInProgressRef.current = false;
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
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error('약관 동의 처리 중 오류가 발생했습니다.');
      }

      const result = await response.json();
      
      if (result.success) {
        setAgreementStatus(result.data);
        
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

    window.addEventListener('popstate', checkAgreementStatus);
    return () => {
      window.removeEventListener('popstate', checkAgreementStatus);
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
