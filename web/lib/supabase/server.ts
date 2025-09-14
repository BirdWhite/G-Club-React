'use server';

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  
  // 스토리지 전용 URL이 설정되어 있으면 사용, 없으면 기본 URL 사용
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;

  return createServerClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // JWT 만료 시간을 1시간으로 제한
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        // 토큰 만료 시간 설정
        flowType: 'pkce'
      },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}