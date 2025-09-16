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
  workboxOptions: {
    disableDevLogs: true,
    // 개발 환경에서 HMR 충돌 방지 설정
    skipWaiting: process.env.NODE_ENV === 'production',
    clientsClaim: process.env.NODE_ENV === 'production',
    // 개발 환경에서는 캐시 비활성화
    runtimeCaching: process.env.NODE_ENV === 'development' ? [] : [
      {
        urlPattern: /^https?.*/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'offlineCache',
          expiration: {
            maxEntries: 200,
          },
        },
      },
    ],
    // 개발 환경에서 파일 변경 감지 제외
    exclude: process.env.NODE_ENV === 'development' ? [
      /\.map$/,
      /manifest$/,
      /\.htaccess$/,
      /_next\/static\/chunks\/.*\.js$/,
      /_next\/static\/development/,
    ] : [],
  },
});

export default withPWAConfig(nextConfig);
