import withPWA from '@ducanh2912/next-pwa';

// 크론 작업은 instrumentation.ts에서 자동 초기화됩니다

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Edge Runtime 경고 무시를 위한 webpack 설정
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    return config;
  },
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
        hostname: 'pnu-ultimate.kro.kr',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'http',
        hostname: 'pnu-ultimate.kro.kr',
        pathname: '/storage/v1/object/public/**',
      },
      // 로컬 Supabase Storage (개발용)
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '8000',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/storage/v1/object/public/**',
      },
      // 카카오 프로필 이미지 (k.kakaocdn.net, img1.kakaocdn.net 등)
      {
        protocol: 'https',
        hostname: 'k.kakaocdn.net',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'k.kakaocdn.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img1.kakaocdn.net',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'img1.kakaocdn.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 't1.kakaocdn.net',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 't1.kakaocdn.net',
        pathname: '/**',
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
  reloadOnOnline: false, // 탭 복귀 시 'online' 이벤트로 인한 강제 새로고침 방지
  workboxOptions: {
    disableDevLogs: true,
    skipWaiting: false, // 탭 복귀 시 새 SW 즉시 활성화 → controllerchange → 리로드 방지
    clientsClaim: true,
    cleanupOutdatedCaches: true,
    cacheId: 'ultimate-pwa-v2', // 버전 업데이트
    // 최소한의 캐시 전략 - 정적 자산만 캐시
    runtimeCaching: [
      // 모든 API 요청은 캐시하지 않음 (NetworkOnly)
      {
        urlPattern: /^\/api\/.*/,
        handler: 'NetworkOnly',
        options: {
          cacheName: 'api-no-cache',
          expiration: {
            maxEntries: 0,
            maxAgeSeconds: 0,
          },
        },
      },
      // 모든 페이지 요청은 캐시하지 않음 (NetworkOnly)
      {
        urlPattern: /^\/(?!_next\/static|icons|images).*/,
        handler: 'NetworkOnly',
        options: {
          cacheName: 'pages-no-cache',
          expiration: {
            maxEntries: 0,
            maxAgeSeconds: 0,
          },
        },
      },
      // 정적 이미지만 캐시 (프로필 사진, 아이콘 등)
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'static-images',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 7 * 24 * 60 * 60, // 7일
          },
        },
      },
      // Next.js 정적 자산만 캐시
      {
        urlPattern: /^\/_next\/static\/.*/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'next-static',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30일
          },
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
    // 오프라인 폴백 비활성화
    navigateFallback: null,
    navigateFallbackDenylist: [/.*/], // 모든 경로에서 폴백 비활성화
  },
});

export default withPWAConfig(nextConfig);
