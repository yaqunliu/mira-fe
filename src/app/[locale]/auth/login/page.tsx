'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslations } from 'next-intl'
import { GoogleSignIn } from '@/components/auth/google-sign-in'
import { EmailSignIn } from '@/components/auth/email-sign-in'
import { Separator } from '@/components/ui/separator'

export default function LoginPage() {
  const router = useRouter()
  const params = useParams()
  const locale = params?.locale as string
  const t = useTranslations('auth')

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card className='border-none bg-card dark:bg-zinc-800'>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">{t('loginTitle')}</CardTitle>
            <CardDescription className="text-center">
              {t('loginDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* 邮箱登录 */}
              <EmailSignIn 
                locale={locale}
                onSuccess={() => {
                  router.push(`/${locale}`)
                }}
              />

              {/* 分隔线 */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground dark:bg-zinc-800">
                    或
                  </span>
                </div>
              </div>

              {/* Google 登录 */}
              <GoogleSignIn locale={locale} />
            </div>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">{t('noAccount')}</span>
              <Link href={`/${locale}/auth/register`} className="text-primary hover:underline">
                {t('register')}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
