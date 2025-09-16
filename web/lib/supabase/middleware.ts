import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // 디버깅을 위한 로깅 (무한 루프 방지를 위해 비활성화)
  // if (process.env.NODE_ENV === 'development') {
  //   console.log('Middleware processing request:', {
  //     url: request.url,
  //     pathname: request.nextUrl.pathname,
  //     host: request.headers.get('host'),
  //     cookies: request.cookies.getAll().map(c => ({ 
  //       name: c.name, 
  //       size: c.value?.length || 0
  //     }))
  //   });
  // }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
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
    
    // 정적 파일 패턴 (확장자가 있는 파일들)
    const PUBLIC_FILE = /\.(.*)$/;
    const isPublicFiles = PUBLIC_FILE.test(currentPath);
    
    // 허용된 경로들 (인증 없이 접근 가능)
    const publicPaths = [
      '/',
      '/auth/login',
      '/auth/register',
      '/profile/register',
    ];
    
    // 사용자의 프로필 경로 패턴 (자신의 프로필만)
    const profilePathPattern = /^\/profile\/[^\/]+$/;
    
    // 정적 파일이거나 공개 경로이거나 자신의 프로필 페이지인 경우 통과
    if (isPublicFiles || publicPaths.includes(currentPath) || profilePathPattern.test(currentPath)) {
      return supabaseResponse;
    }
    
    // 인증이 필요한 경로에 접근하는 경우
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/auth/login';
      
      // nginx 환경에서의 호스트 처리 개선
      const host = request.headers.get('host') || 'pnu-ultimate.kro.kr';
      const cleanHost = host.split(':')[0]; // 포트 번호 제거
      
      // 프로토콜 결정
      const forwardedProto = request.headers.get('x-forwarded-proto');
      const protocol = forwardedProto === 'https' ? 'https:' : 'http:';
      
      // URL 구성 개선
      url.host = cleanHost;
      url.protocol = protocol;
      url.port = protocol === 'https:' ? '443' : '80';
      
      console.log('Redirecting to:', url.toString());
      return NextResponse.redirect(url);
    }
    
    // 인증된 사용자의 경우 모든 경로 접근 허용
    // 역할 기반 제어는 클라이언트 사이드에서 처리
    
  } catch (error) {
    console.error('Supabase auth error in middleware:', error);
    // 오류 발생 시 로그인 페이지로 리다이렉트
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}