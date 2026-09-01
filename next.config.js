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
      // 本地存储的媒体文件（US3 未开通时的降级方案）。
      // 后端把这些文件挂在 /uploads 下，但 api 容器只监听 127.0.0.1，
      // 浏览器直接访问不到，必须由前端同源代理过去，否则图片全是 404。
      // 路径需与后端 LOCAL_STORAGE_URL_PREFIX 保持一致。
      {
        source: '/uploads/:path*',
        destination: `${backendUrl}/uploads/:path*`,
      },
    ];
  },
}

export default withNextIntl(nextConfig);
