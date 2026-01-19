/** @type {import('next').NextConfig} */
const nextConfig = {
  // Increase timeout for long-running AI operations
  experimental: {
    proxyTimeout: 300000, // 5 minutes in milliseconds
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`
          : 'http://backend:3001/api/:path*',
      },
    ];
  },
};

export default nextConfig;
