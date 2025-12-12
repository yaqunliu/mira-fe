'use client'

import { useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { ForgotPassword } from '@/components/auth/forgot-password'
import { Sparkles } from 'lucide-react'

export default function ForgotPasswordPage() {
  const params = useParams()
  const locale = params?.locale as string

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* 动态渐变背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-950 dark:to-purple-950" />

      {/* 装饰性渐变球 */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 dark:bg-purple-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-70 animate-blob" />
      <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 dark:bg-yellow-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-70 animate-blob animation-delay-2000" />
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 dark:bg-pink-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-70 animate-blob animation-delay-4000" />

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Logo 和标题区域 */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-lg opacity-50" />
              <div className="relative bg-white dark:bg-gray-900 p-3 rounded-full shadow-lg">
                <Sparkles className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
            密码重置
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            让我们帮您找回账户访问权限
          </p>
        </div>

        {/* 忘记密码卡片 - 玻璃拟态风格 */}
        <Card className="border-none shadow-2xl backdrop-blur-xl bg-white/70 dark:bg-gray-900/70">
          <CardContent className="pt-6">
            <ForgotPassword locale={locale} />
          </CardContent>
        </Card>

        {/* 底部装饰文字 */}
        <p className="text-center text-xs text-gray-500 dark:text-gray-400">
          密码重置链接将在1小时后过期
        </p>
      </div>

      <style jsx global>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}
