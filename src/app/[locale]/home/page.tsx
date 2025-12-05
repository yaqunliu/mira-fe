'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/stores/auth'
import { useSupabaseAuth } from '@/hooks/use-supabase-auth'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { User, Sparkles, BookOpenText, Video } from 'lucide-react'
import { ActionBar } from '@/components/business/action-bar'
import { waitForUserInfoInStore, waitForSupabaseSession } from '@/lib/utils/wait-for-supabase-token'
import { createClient } from '@/lib/supabase/client'

export default function HomePage() {
  const router = useRouter()
  const params = useParams()
  const locale = params?.locale as string
  const t = useTranslations()
  const { user, isAuthenticated } = useAuthStore()
  const { loading: authLoading, session } = useSupabaseAuth()
  const [waitingForUserInfo, setWaitingForUserInfo] = useState(false)

  // 如果检测到有 session 但没有用户信息，等待同步完成
  useEffect(() => {
    const checkAndWaitForUserInfo = async () => {
      // 如果已经有用户信息，不需要等待
      if (isAuthenticated && user && user.id) {
        return
      }

      // 如果有 session 但没有用户信息，说明可能是刚登录，需要等待同步
      if (session?.access_token && !isAuthenticated) {
        console.log('[HomePage] Session found but no user info, waiting for sync...')
        setWaitingForUserInfo(true)
        
        try {
          // 先等待 Supabase session
          await waitForSupabaseSession(5000, 200)
          
          // 再等待用户信息同步到 store
          await waitForUserInfoInStore(5000, 100)
          
          console.log('[HomePage] User info sync completed')
        } catch (error) {
          console.error('[HomePage] Error waiting for user info:', error)
        } finally {
          setWaitingForUserInfo(false)
        }
      }
    }

    // 等待 authLoading 完成后再检查
    if (!authLoading) {
      checkAndWaitForUserInfo()
    }
  }, [authLoading, session, isAuthenticated, user])

  const handleStartCreating = () => {
    if (!isAuthenticated) {
      router.push(`/${locale}/auth/login`)
    } else {
      router.push(`/${locale}`)
    }
  }

  const handleLogin = () => {
    router.push(`/${locale}/auth/login`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-200/60 via-purple-200/30 to-slate-200/30 dark:bg-black dark:from-transparent dark:via-transparent dark:to-transparent">
      <div className="container mx-auto px-4 py-8">
        {/* 顶部操作栏 */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gradient-primary">
            {t('homePage.title')}
          </h1>
          <ActionBar />
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* 用户信息卡片 */}
          <Card className="border-none bg-card dark:bg-zinc-800">
            <CardHeader>
              <CardTitle>{t('homePage.userInfo')}</CardTitle>
            </CardHeader>
            <CardContent>
              {authLoading || waitingForUserInfo ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">{t('common.loading')}</div>
                </div>
              ) : isAuthenticated && user ? (
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    {user.avatar ? (
                      <AvatarImage src={user.avatar} alt={user.username} />
                    ) : null}
                    <AvatarFallback className="bg-primary/10">
                      <User className="h-8 w-8" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-lg font-semibold">{user.username}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className="bg-primary/10">
                        <User className="h-8 w-8" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-lg font-semibold">{t('homePage.notLoggedIn')}</p>
                      <p className="text-sm text-muted-foreground">{t('homePage.loginPrompt')}</p>
                    </div>
                  </div>
                  <Button onClick={handleLogin} variant="default">
                    {t('auth.login')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 介绍信息 */}
          <Card className="border-none bg-card dark:bg-zinc-800">
            <CardHeader>
              <CardTitle>{t('homePage.introduction')}</CardTitle>
              <CardDescription>{t('homePage.introductionDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <BookOpenText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{t('homePage.feature1Title')}</h3>
                    <p className="text-sm text-muted-foreground">{t('homePage.feature1Description')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{t('homePage.feature2Title')}</h3>
                    <p className="text-sm text-muted-foreground">{t('homePage.feature2Description')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Video className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{t('homePage.feature3Title')}</h3>
                    <p className="text-sm text-muted-foreground">{t('homePage.feature3Description')}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 开始创作按钮 */}
          <div className="flex justify-center">
            <Button
              onClick={handleStartCreating}
              size="lg"
              className="w-full max-w-md h-16 text-lg"
            >
              {t('homePage.startCreating')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

