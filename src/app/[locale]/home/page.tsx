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
import {
  User,
  Sparkles,
  BookOpenText,
  Video,
  Palette,
  Cpu,
  Clock3,
  Wand2,
  Clapperboard,
  ShieldCheck,
  ArrowRight,
  MousePointerClick,
} from 'lucide-react'
import { ActionBar } from '@/components/business/action-bar'

export default function HomePage() {
  const router = useRouter()
  const params = useParams()
  const locale = params?.locale as string
  const t = useTranslations()
  const { user, isAuthenticated } = useAuthStore()
  const { loading: authLoading, session } = useSupabaseAuth()
  const [waitingForUserInfo, setWaitingForUserInfo] = useState(false)
  const isGuest = !authLoading && (!isAuthenticated || !user)

  const featureCards = [
    {
      title: t('homePage.feature1Title'),
      desc: t('homePage.feature1Description'),
      icon: <BookOpenText className="h-5 w-5 text-orange-500" />,
      accent: 'from-orange-400/70 to-amber-500/50',
    },
    {
      title: t('homePage.feature2Title'),
      desc: t('homePage.feature2Description'),
      icon: <Sparkles className="h-5 w-5 text-purple-500" />,
      accent: 'from-purple-400/60 to-blue-500/40',
    },
    {
      title: t('homePage.feature3Title'),
      desc: t('homePage.feature3Description'),
      icon: <Video className="h-5 w-5 text-teal-500" />,
      accent: 'from-teal-400/60 to-emerald-400/40',
    },
  ]

  const stats = [
    { label: t('homePage.statSpeedLabel'), value: '8x', sub: t('homePage.statSpeedSub') },
    { label: t('homePage.statSatisfactionLabel'), value: '98%', sub: t('homePage.statSatisfactionSub') },
  ]

  const workflow = [
    { icon: <MousePointerClick className="h-4 w-4" />, title: t('homePage.flowStep1Title'), desc: t('homePage.flowStep1Desc') },
    { icon: <Palette className="h-4 w-4" />, title: t('homePage.flowStep2Title'), desc: t('homePage.flowStep2Desc') },
    { icon: <Clapperboard className="h-4 w-4" />, title: t('homePage.flowStep3Title'), desc: t('homePage.flowStep3Desc') },
    { icon: <ShieldCheck className="h-4 w-4" />, title: t('homePage.flowStep4Title'), desc: t('homePage.flowStep4Desc') },
  ]

  // 如果检测到有 session 但没有用户信息，等待同步完成
  useEffect(() => {
    let mounted = true
    let checkInterval: NodeJS.Timeout | null = null

    const checkAndWaitForUserInfo = async () => {
      // 如果已经有用户信息，不需要等待
      if (isAuthenticated && user && user.id) {
        if (waitingForUserInfo) {
          setWaitingForUserInfo(false)
        }
        return
      }

      // 如果有 session 但没有用户信息，说明可能是刚登录，需要等待同步
      if (session?.access_token && !isAuthenticated) {
        if (!waitingForUserInfo) {
          setWaitingForUserInfo(true)
        }

        let timeoutId: NodeJS.Timeout | null = null

        // 持续检查，直到用户信息同步完成
        checkInterval = setInterval(() => {
          if (!mounted) {
            if (checkInterval) clearInterval(checkInterval)
            if (timeoutId) clearTimeout(timeoutId)
            return
          }

          const { user: currentUser, isAuthenticated: currentAuth } = useAuthStore.getState()
          
          if (currentAuth && currentUser && currentUser.id) {
            if (checkInterval) {
              clearInterval(checkInterval)
              checkInterval = null
            }
            if (timeoutId) {
              clearTimeout(timeoutId)
              timeoutId = null
            }
            if (mounted) {
              setWaitingForUserInfo(false)
            }
          }
        }, 200)

        // 设置最大等待时间（5秒），超时后停止等待
        timeoutId = setTimeout(() => {
          if (checkInterval) {
            clearInterval(checkInterval)
            checkInterval = null
          }
          if (mounted) {
            const { user: currentUser, isAuthenticated: currentAuth } = useAuthStore.getState()
            setWaitingForUserInfo(false)
          }
        }, 5000) // 最多等待 5 秒
      } else if (!session?.access_token && waitingForUserInfo) {
        // 如果没有 session，停止等待
        setWaitingForUserInfo(false)
      }
    }

    // 等待 authLoading 完成后再检查
    if (!authLoading) {
      checkAndWaitForUserInfo()
    }

    return () => {
      mounted = false
      if (checkInterval) {
        clearInterval(checkInterval)
      }
    }
  }, [authLoading, session, isAuthenticated, user])

  const handleStartCreating = () => {
    if (!isAuthenticated) {
      router.push(`/${locale}/auth/login`)
    } else {
      router.push(`/${locale}/workspace`)
    }
  }

  const handleBrowseCreations = () => {
    if (!isAuthenticated) {
      router.push(`/${locale}/auth/login`)
    } else {
      router.push(`/${locale}/creations`)
    }
  }

  const handleLogin = () => {
    router.push(`/${locale}/auth/login`)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-orange-200 via-amber-100 to-amber-200 dark:from-zinc-950 dark:via-black dark:to-zinc-900">
      <div className="pointer-events-none absolute -left-10 -top-10 h-64 w-64 rounded-full bg-orange-500/10 blur-3xl animate-blob-slow" />
      <div className="pointer-events-none absolute right-10 top-24 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl animate-blob-slower" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-amber-400/10 blur-3xl animate-blob-slow" />

      <div className="relative container mx-auto px-4 py-10 lg:py-16">
        {/* 顶部操作栏 */}
        <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-sm text-muted-foreground shadow-sm ring-1 ring-orange-100/80 backdrop-blur dark:bg-white/5 dark:ring-white/10">
              <Sparkles className="h-4 w-4 text-orange-500" />
              {t('homePage.heroBadge')}
            </p>
            <h1 className="mt-3 text-3xl font-bold text-gradient-primary lg:text-4xl">
              {t('homePage.title')}
            </h1>
          </div>
          <ActionBar />
        </div>

        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="space-y-7">
            <div className="space-y-3">
              <h2 className="text-4xl font-semibold leading-tight text-zinc-900 dark:text-white lg:text-5xl">
                {t('homePage.heroHeadline')}
              </h2>
              <p className="max-w-2xl text-lg text-muted-foreground">
                {t('homePage.heroDescription')}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={handleStartCreating}
                size="lg"
                className="gap-2 rounded-full px-6 shadow-lg shadow-orange-300/30 transition hover:scale-[1.01] hover:shadow-orange-400/40"
              >
                <Wand2 className="h-5 w-5" />
                {t('homePage.startCreating')}
                <ArrowRight className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={handleBrowseCreations}
                className="gap-2 rounded-full border-orange-100 bg-white/60 px-6 text-orange-700 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white"
              >
                <Video className="h-5 w-5" />
                {t('homePage.browseCreations')}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4 rounded-2xl border border-white/80 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-white/5 dark:bg-white/5">
              {stats.map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="text-2xl font-semibold text-zinc-900 dark:text-white">{item.value}</div>
                  <p className="text-sm text-muted-foreground">{item.sub}</p>
                </div>
              ))}
            </div>
          </div>

        <div className="relative">
            <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-tr from-orange-300/50 via-amber-200/40 to-purple-300/40 blur-2xl dark:from-orange-500/10 dark:via-white/5 dark:to-purple-500/10" />
            <div className="rounded-3xl border border-white/60 bg-white/70 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
              <div className="flex flex-col gap-4 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('homePage.workspaceLabel')}</p>
                    <p className="mt-1 text-xl font-semibold text-zinc-900 dark:text-white">
                      {isGuest ? t('homePage.welcomeGuest') : t('homePage.welcomeBack', { name: user?.username || '' })}
                    </p>
                  </div>
                  <div className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700 dark:bg-orange-500/20 dark:text-orange-200">
                    {t('homePage.realtimeSync')}
                  </div>
                </div>

                <div className="rounded-2xl border border-orange-100/50 bg-gradient-to-r from-orange-100/70 via-amber-50/60 to-amber-200/60 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:from-orange-500/10 dark:via-white/5 dark:to-amber-400/10">
                  {authLoading || waitingForUserInfo ? (
                    <div className="flex items-center justify-center py-6 text-muted-foreground">
                      {t('common.loading')}
                    </div>
                  ) : isAuthenticated && user ? (
                    <div className="flex items-center gap-4">
                      <Avatar className="h-14 w-14 ring-2 ring-orange-200 dark:ring-orange-500/30">
                        {user.avatar ? <AvatarImage src={user.avatar} alt={user.username} /> : null}
                        <AvatarFallback className="bg-orange-500/10">
                          <User className="h-6 w-6 text-orange-500" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-lg font-semibold text-zinc-900 dark:text-white">{user.username}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <div className="mt-2 flex items-center gap-2 text-xs text-orange-600 dark:text-orange-300">
                          <ShieldCheck className="h-4 w-4" />
                          {t('homePage.dataProtected')}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-lg font-semibold text-zinc-900 dark:text-white">
                          {t('homePage.notLoggedIn')}
                        </p>
                        <p className="text-sm text-muted-foreground">{t('homePage.loginPrompt')}</p>
                      </div>
                      <Button onClick={handleLogin} variant="secondary" className="rounded-full">
                        {t('auth.login')}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Card className="border-none bg-white/60 p-4 shadow-sm backdrop-blur dark:bg-white/5">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-orange-500/10 p-2">
                        <Cpu className="h-5 w-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-white">{t('homePage.cardSmartStoryboard')}</p>
                        <p className="text-xs text-muted-foreground">{t('homePage.cardSmartStoryboardDesc')}</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="border-none bg-white/60 p-4 shadow-sm backdrop-blur dark:bg-white/5">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-purple-500/10 p-2">
                        <Palette className="h-5 w-5 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-white">{t('homePage.cardMoodLight')}</p>
                        <p className="text-xs text-muted-foreground">{t('homePage.cardMoodLightDesc')}</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="border-none bg-white/70 p-4 shadow-sm backdrop-blur dark:bg-white/5">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-teal-500/10 p-2">
                        <Clock3 className="h-5 w-5 text-teal-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-white">{t('homePage.cardRealtimePreview')}</p>
                        <p className="text-xs text-muted-foreground">{t('homePage.cardRealtimePreviewDesc')}</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="border-none bg-white/70 p-4 shadow-sm backdrop-blur dark:bg-white/5">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-emerald-500/10 p-2">
                        <Wand2 className="h-5 w-5 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-white">{t('homePage.cardOneClickExport')}</p>
                        <p className="text-xs text-muted-foreground">{t('homePage.cardOneClickExportDesc')}</p>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-14 space-y-8">
          <div className="flex flex-col gap-2">
            <p className="text-sm uppercase tracking-[0.2em] text-orange-500">{t('homePage.featureSectionTag')}</p>
            <h3 className="text-2xl font-semibold text-zinc-900 dark:text-white">{t('homePage.featureSectionTitle')}</h3>
            <p className="text-muted-foreground">
              {t('homePage.featureSectionDesc')}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {featureCards.map((item) => (
              <Card
                key={item.title}
                className="relative overflow-hidden border-none bg-white/80 p-5 shadow-md ring-1 ring-white/70 backdrop-blur hover:-translate-y-1 hover:shadow-xl transition dark:bg-white/5 dark:ring-white/10"
              >
                <div
                  className={`absolute inset-0 -z-10 bg-gradient-to-br ${item.accent} opacity-70 blur-3xl`}
                />
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/80 shadow-sm ring-1 ring-white/70 backdrop-blur dark:bg-white/10 dark:ring-white/10">
                  {item.icon}
                </div>
                <div className="mt-4 space-y-1">
                  <p className="text-lg font-semibold text-zinc-900 dark:text-white">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="mt-14 rounded-3xl border border-white/80 bg-white/70 p-6 shadow-lg backdrop-blur dark:border-white/10 dark:bg-white/5">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-orange-500">{t('homePage.workflowTag')}</p>
              <h4 className="text-xl font-semibold text-zinc-900 dark:text-white">{t('homePage.workflowTitle')}</h4>
              <p className="text-sm text-muted-foreground">
                {t('homePage.workflowDesc')}
              </p>
            </div>
            <div className="grid w-full gap-4 lg:max-w-3xl lg:grid-cols-4">
              {workflow.map((step) => (
                <div
                  key={step.title}
                  className="rounded-2xl border border-orange-100 bg-gradient-to-b from-white to-orange-50/60 p-4 text-sm shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-white/10 dark:from-white/10 dark:to-white/5"
                >
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-orange-500/10 px-3 py-1 text-orange-600 dark:text-orange-300">
                    {step.icon}
                    <span className="text-xs font-semibold">{step.title}</span>
                  </div>
                  <p className="text-muted-foreground">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

