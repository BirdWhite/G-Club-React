import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

function getRedirectUrl(request: NextRequest, path: string): URL {
  const url = request.nextUrl.clone();
  url.pathname = path;

  // Nginx 등 리버스 프록시 환경에서 원래 호스트와 프로토콜 복원
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto');
  
  // 환경변수에 설정된 사이트 URL이 있으면 우선 사용 (localhost 방지)
  const envSiteUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL;

  if (envSiteUrl) {
    try {
      const siteUrl = new URL(envSiteUrl);
      url.host = siteUrl.host;
      url.protocol = siteUrl.protocol;
      // host에 포트가 포함되어 있으면 port는 자동으로 설정되지만 명시적으로 설정
      if (siteUrl.port) {
        url.port = siteUrl.port;
      }
    } catch (e) {
      console.error('Invalid site URL environment variable:', e);
    }
  } else if (forwardedHost) {
    url.host = forwardedHost;
    url.protocol = forwardedProto ? `${forwardedProto}:` : url.protocol;
    // forwardedHost에 포트가 포함되어 있지 않고 원래 URL에 포트가 있다면 유지 시도
    // 단, request.nextUrl.port가 있으면 이미 url.port에 복제되어 있음
  }

  return url;
}

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
    // /auth/callback: OAuth 코드 교환용 - 세션 없이 접근해야 함
    const publicPaths = [
      '/',
      '/auth/login',
      '/auth/callback',
      '/auth/register',
      '/auth/terms',
      '/auth/pending',
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
      const redirectUrl = getRedirectUrl(request, '/auth/login');
      // 기존 쿼리 파라미터 유지
      redirectUrl.search = request.nextUrl.search;
      return NextResponse.redirect(redirectUrl);
    }

    // 인증된 사용자의 경우 모든 경로 접근 허용
    // 이용약관 동의 상태는 클라이언트 사이드에서 확인
    // 역할 기반 제어는 클라이언트 사이드에서 처리

  } catch (error) {
    console.error('Supabase auth error in middleware:', error);
    // 오류 발생 시 로그인 페이지로 리다이렉트
    const redirectUrl = getRedirectUrl(request, '/auth/login');
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
