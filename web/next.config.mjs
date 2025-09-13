/** @type {import('next').NextConfig} */
const nextConfig = {
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
    ];
  },
  // 프로덕션 환경에서만 HTTPS 강제
  ...(process.env.NODE_ENV === 'production' && {
    async redirects() {
      return [
        {
          source: '/(.*)',
          has: [
            {
              type: 'header',
              key: 'x-forwarded-proto',
              value: 'http',
            },
          ],
          destination: 'https://pnu-ultimate.kro.kr/:path*',
          permanent: true,
        },
      ];
    },
  }),
};

export default nextConfig;
