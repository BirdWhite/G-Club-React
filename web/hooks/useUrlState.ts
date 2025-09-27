'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface UseUrlStateOptions {
  replace?: boolean;
}

export function useUrlState<T extends Record<string, any>>(
  initialState: T,
  options: UseUrlStateOptions = {}
) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<T>(() => {
    // URL에서 초기 상태 복원
    const urlState: Partial<T> = {};
    Object.keys(initialState).forEach(key => {
      const value = searchParams.get(key);
      if (value !== null) {
        // 타입에 따라 적절히 변환
        const initialValue = initialState[key];
        if (typeof initialValue === 'boolean') {
          urlState[key as keyof T] = (value === 'true') as T[keyof T];
        } else if (typeof initialValue === 'number') {
          urlState[key as keyof T] = Number(value) as T[keyof T];
        } else {
          urlState[key as keyof T] = value as T[keyof T];
        }
      }
    });
    return { ...initialState, ...urlState };
  });

  const [pendingUpdate, setPendingUpdate] = useState<Partial<T> | null>(null);

  const updateState = useCallback((newState: Partial<T>) => {
    setState(prev => ({ ...prev, ...newState }));
    setPendingUpdate(newState);
  }, []);

  // URL 업데이트를 useEffect에서 처리
  useEffect(() => {
    if (pendingUpdate) {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(pendingUpdate).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      });
      
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      if (options.replace) {
        router.replace(newUrl);
      } else {
        router.push(newUrl);
      }
      
      setPendingUpdate(null);
    }
  }, [pendingUpdate, router, searchParams, options.replace]);

  // URL 파라미터가 변경될 때 상태 동기화
  useEffect(() => {
    const urlState: Partial<T> = {};
    let hasChanges = false;
    
    Object.keys(initialState).forEach(key => {
      const value = searchParams.get(key);
      const currentValue = state[key as keyof T];
      
      if (value !== null) {
        const initialValue = initialState[key];
        let parsedValue: unknown;
        
        if (typeof initialValue === 'boolean') {
          parsedValue = value === 'true';
        } else if (typeof initialValue === 'number') {
          parsedValue = Number(value);
        } else {
          parsedValue = value;
        }
        
        if (parsedValue !== currentValue) {
          urlState[key as keyof T] = parsedValue as T[keyof T];
          hasChanges = true;
        }
      } else if (currentValue !== initialState[key]) {
        // URL에 없는 파라미터는 초기값으로 리셋
        urlState[key as keyof T] = initialState[key];
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      setState(prev => ({ ...prev, ...urlState }));
    }
  }, [searchParams, initialState, state]);

  return [state, updateState] as const;
}
