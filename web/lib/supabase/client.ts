'use client';

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // 스토리지 전용 URL이 설정되어 있으면 사용, 없으면 기본 URL 사용
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
  
  return createBrowserClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}