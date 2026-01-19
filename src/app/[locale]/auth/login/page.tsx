'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslations } from 'next-intl'
import { GoogleSignIn } from '@/components/auth/google-sign-in'
import { EmailSignIn } from '@/components/auth/email-sign-in'
import { Separator } from '@/components/ui/separator'
import { Sparkles } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const params = useParams()
  const locale = params?.locale as string
  const t = useTranslations('auth')

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
            {t('loginTitle')}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('loginDescription')}
          </p>
        </div>

        {/* 登录卡片 - 玻璃拟态风格 */}
        <Card className="border-none shadow-2xl backdrop-blur-xl bg-white/70 dark:bg-gray-900/70">
          <CardContent className="pt-6">
            <div className="space-y-6">
              {/* 邮箱登录 */}
              <EmailSignIn
                locale={locale}
                onSuccess={() => {
                  router.push(`/${locale}/home`)
                }}
              />

              {/* 分隔线 */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="bg-gray-200 dark:bg-gray-700" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white/80 dark:bg-gray-900/80 px-3 py-1 text-gray-500 dark:text-gray-400 rounded-full">
                    或
                  </span>
                </div>
              </div>

              {/* Google 登录 */}
              <GoogleSignIn locale={locale} />
            </div>

            {/* 注册链接 */}
            <div className="mt-6 text-center text-sm">
              <span className="text-gray-600 dark:text-gray-400">{t('noAccount')}</span>
              <Link
                href={`/${locale}/auth/register`}
                className="ml-1 font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              >
                {t('register')}
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* 底部装饰文字 */}
        <div className="text-center text-xs text-gray-500 dark:text-gray-400">
          {t('agreementPrefix')}
          <Link href={`/${locale}/privacy`} className="underline hover:text-blue-500 transition-colors">
            {t('privacyPolicy')}
          </Link>
          {t('and')}
          <Link href={`/${locale}/terms`} className="underline hover:text-blue-500 transition-colors">
            {t('termsOfService')}
          </Link>
        </div>
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
