'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslations } from 'next-intl'
import { Sparkles, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

export default function ConfirmPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const locale = params?.locale as string
  const t = useTranslations('auth')

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    const confirmEmail = async () => {
      const tokenHash = searchParams.get('token_hash')
      const type = searchParams.get('type') || 'signup'

      if (!tokenHash) {
        setStatus('error')
        setErrorMessage('缺少验证令牌')
        return
      }

      try {
        const supabase = createClient()

        // 验证邮箱 - 根据 type 参数选择验证类型
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as any, // 'signup', 'email', 'invite' 等
        })

        if (error) {
          console.error('Email confirmation error:', error)
          setStatus('error')
          setErrorMessage(error.message || '邮箱验证失败')
        } else {
          setStatus('success')
          // 3秒后自动跳转到登录页面
          setTimeout(() => {
            router.push(`/${locale}/auth/login`)
          }, 3000)
        }
      } catch (error) {
        console.error('Confirmation error:', error)
        setStatus('error')
        setErrorMessage('验证过程中发生错误')
      }
    }

    confirmEmail()
  }, [searchParams, router, locale])

  const handleGoToLogin = () => {
    router.push(`/${locale}/auth/login`)
  }

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
            邮箱验证
          </h1>
        </div>

        {/* 确认卡片 */}
        <Card className="border-none shadow-2xl backdrop-blur-xl bg-white/70 dark:bg-gray-900/70">
          <CardContent className="pt-6">
            <div className="space-y-6 text-center">
              {status === 'loading' && (
                <>
                  <div className="flex justify-center">
                    <Loader2 className="w-16 h-16 text-blue-600 dark:text-blue-400 animate-spin" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      正在验证您的邮箱...
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      请稍候，我们正在处理您的验证请求
                    </p>
                  </div>
                </>
              )}

              {status === 'success' && (
                <>
                  <div className="flex justify-center">
                    <div className="relative">
                      <div className="absolute inset-0 bg-green-500 rounded-full blur-xl opacity-50 animate-pulse" />
                      <CheckCircle2 className="w-16 h-16 text-green-600 dark:text-green-400 relative" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      验证成功！
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      您的邮箱已成功验证，即将跳转到登录页面...
                    </p>
                    <Button
                      onClick={handleGoToLogin}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                    >
                      立即前往登录
                    </Button>
                  </div>
                </>
              )}

              {status === 'error' && (
                <>
                  <div className="flex justify-center">
                    <XCircle className="w-16 h-16 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      验证失败
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {errorMessage || '邮箱验证失败，请重试或联系支持团队'}
                    </p>
                    <Button
                      onClick={handleGoToLogin}
                      variant="outline"
                      className="w-full"
                    >
                      返回登录页面
                    </Button>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 底部装饰文字 */}
        <p className="text-center text-xs text-gray-500 dark:text-gray-400">
          遇到问题？请联系我们的支持团队
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
