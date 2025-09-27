import withPWA from '@ducanh2912/next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 헤더 크기 최적화
  serverExternalPackages: ['@supabase/ssr'],
  // HTTPS 설정 (HSTS 헤더는 Nginx에서 처리)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
      // PWA 파일들에 대한 기본 캐시 헤더
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'https',
        hostname: 'pnu-ultimate.kro.kr',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'http',
        hostname: 'pnu-ultimate.kro.kr',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // 프로덕션 환경에서만 HTTPS 강제
  ...(process.env.NODE_ENV === 'production' && {
    async redirects() {
      return [
        {
          source: '/((?!manifest\\.json$|sw\\.js$|icons/).*)',
          has: [
            {
              type: 'header',
              key: 'x-forwarded-proto',
              value: 'http',
            },
          ],
          missing: [
            {
              type: 'header',
              key: 'x-forwarded-proto',
              value: 'https',
            },
          ],
          destination: 'https://pnu-ultimate.kro.kr/:path*',
          permanent: true,
        },
      ];
    },
  }),
};

const withPWAConfig = withPWA({
  dest: 'public',
  disable: false, // PWA 활성화
  customWorkerDir: 'worker', // 커스텀 워커 디렉토리
  workboxOptions: {
    disableDevLogs: true,
    // 항상 즉시 업데이트 적용
    skipWaiting: true,
    clientsClaim: true,
    // 강제 캐시 무효화
    cleanupOutdatedCaches: true,
    // 캐시 전략 개선
    runtimeCaching: [
      // 인증 관련 API는 캐시하지 않음
      {
        urlPattern: /^\/api\/(auth|profile).*/,
        handler: 'NetworkOnly',
        options: {
          cacheName: 'auth-cache',
          expiration: {
            maxEntries: 0,
            maxAgeSeconds: 0,
          },
        },
      },
      // 푸시 알림 관련 API는 캐시하지 않음
      {
        urlPattern: /^\/api\/push.*/,
        handler: 'NetworkOnly',
        options: {
          cacheName: 'push-cache',
          expiration: {
            maxEntries: 0,
            maxAgeSeconds: 0,
          },
        },
      },
      // 알림 설정 관련 API는 캐시하지 않음
      {
        urlPattern: /^\/api\/notifications.*/,
        handler: 'NetworkOnly',
        options: {
          cacheName: 'notifications-cache',
          expiration: {
            maxEntries: 0,
            maxAgeSeconds: 0,
          },
        },
      },
      // 기타 API 요청은 네트워크 우선
      {
        urlPattern: /^\/api\/.*/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-cache',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 5 * 60, // 5분
          },
          networkTimeoutSeconds: 10,
        },
      },
      // 정적 자산은 캐시 우선
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'images-cache',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30일
          },
        },
      },
      // 기타 요청은 네트워크 우선
      {
        urlPattern: /^https?.*/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'offline-cache',
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 24 * 60 * 60, // 24시간
          },
          networkTimeoutSeconds: 10,
        },
      },
    ],
    // 캐시에서 제외할 파일들
    exclude: [
      /\.map$/,
      /\.htaccess$/,
      /_next\/static\/development/,
    ],
    // 매니페스트 파일은 항상 네트워크에서 가져오기
    additionalManifestEntries: [
      {
        url: '/manifest.json',
        revision: Date.now().toString(),
      },
    ],
    // 인증 관련 요청은 캐시하지 않음
    navigateFallback: null,
    navigateFallbackDenylist: [/^\/api\/auth/, /^\/api\/profile/, /^\/api\/push/, /^\/api\/notifications/],
  },
});

export default withPWAConfig(nextConfig);
