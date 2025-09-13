import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    const currentPath = request.nextUrl.pathname;
    
    // 허용된 경로들 (인증 없이 접근 가능)
    const publicPaths = [
      '/',
      '/auth/login',
      '/auth/register',
      '/profile/register',
    ];
    
    // 사용자의 프로필 경로 패턴 (자신의 프로필만)
    const profilePathPattern = /^\/profile\/[^\/]+$/;
    
    // 공개 경로이거나 자신의 프로필 페이지인 경우 통과
    if (publicPaths.includes(currentPath) || profilePathPattern.test(currentPath)) {
      return supabaseResponse;
    }
    
    // 인증이 필요한 경로에 접근하는 경우
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/auth/login';
      // 호스트에서 포트 번호 제거 (nginx 환경)
      const host = request.headers.get('host') || 'pnu-ultimate.kro.kr';
      const cleanHost = host.split(':')[0]; // 포트 번호 제거
      url.host = cleanHost;
      url.protocol = request.headers.get('x-forwarded-proto') === 'https' ? 'https:' : 'http:';
      return NextResponse.redirect(url);
    }
    
    // 인증된 사용자의 경우 모든 경로 접근 허용
    // 역할 기반 제어는 클라이언트 사이드에서 처리
    
  } catch (error) {
    console.error('Supabase auth error in middleware:', error);
    // 오류 발생 시 요청을 그대로 통과시킴
  }

  return supabaseResponse;
}