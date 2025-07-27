/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'pnu-ultimate.kro.kr',
        port: '54321',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
