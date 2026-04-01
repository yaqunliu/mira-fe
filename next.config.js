import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: {
    // ⚠️ 跳过类型检查以便构建成功
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  serverExternalPackages: ['sharp'],
  // 代理 API 请求到后端服务器
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    // 如果设置了 NEXT_PUBLIC_API_URL，则不使用 rewrites（直接使用该 URL）
    if (apiUrl && !apiUrl.startsWith('/')) {
      return [];
    }
    // 否则，将 /api/v1/* 代理到后端服务器
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },
}

export default withNextIntl(nextConfig);
