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
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-gradient-to-b from-[#FDBCB4]/30 via-[#ADD8E6]/30 to-white">
      {/* 装饰性渐变球 */}
      <div className="pointer-events-none absolute -left-10 -top-10 h-64 w-64 rounded-full bg-[#FDBCB4]/20 blur-3xl animate-blob-slow" />
      <div className="pointer-events-none absolute right-10 top-24 h-72 w-72 rounded-full bg-[#ADD8E6]/20 blur-3xl animate-blob-slower" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-[#22C55E]/20 blur-3xl animate-blob-slow" />

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Logo 和标题区域 */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="clay-sm p-4 rounded-full">
              <Sparkles className="w-8 h-8 text-vibrant-green" />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#22C55E] to-[#22C55E]/80 bg-clip-text text-transparent">
            {t('loginTitle')}
          </h1>
          <p className="text-sm text-gray-600">
            {t('loginDescription')}
          </p>
        </div>

        {/* 登录卡片 - Claymorphism 风格 */}
        <Card className="clay-lg">
          <CardContent className="pt-8">
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
                  <Separator className="bg-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-4 py-2 text-gray-500 rounded-full shadow-sm">
                    或
                  </span>
                </div>
              </div>

              {/* Google 登录 */}
              <GoogleSignIn locale={locale} />
            </div>

            {/* 注册链接 */}
            <div className="mt-8 text-center text-sm">
              <span className="text-gray-600">{t('noAccount')}</span>
              <Link
                href={`/${locale}/auth/register`}
                className="ml-1 font-medium text-[#22C55E] hover:text-[#22C55E]/80 transition-colors"
              >
                {t('register')}
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* 底部装饰文字 */}
        <div className="text-center text-xs text-gray-500">
          {t('agreementPrefix')}
          <Link href={`/${locale}/privacy`} className="underline hover:text-[#22C55E] transition-colors">
            {t('privacyPolicy')}
          </Link>
          {t('and')}
          <Link href={`/${locale}/terms`} className="underline hover:text-[#22C55E] transition-colors">
            {t('termsOfService')}
          </Link>
        </div>
      </div>
    </div>
  )
}
