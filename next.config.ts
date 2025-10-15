/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'code.webspaceai.in',
        pathname: '/lovable-uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'gateway.lighthouse.storage',
      },
    ],
    unoptimized: true,
  },
};

export default nextConfig;
