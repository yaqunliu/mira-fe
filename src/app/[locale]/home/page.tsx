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
import Image from 'next/image'
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
      icon: <BookOpenText className="h-6 w-6 text-[#22C55E]" />,
    },
    {
      title: t('homePage.feature2Title'),
      desc: t('homePage.feature2Description'),
      icon: <Sparkles className="h-6 w-6 text-[#22C55E]" />,
    },
    {
      title: t('homePage.feature3Title'),
      desc: t('homePage.feature3Description'),
      icon: <Video className="h-6 w-6 text-[#22C55E]" />,
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
      router.push('/auth/login')
    } else {
      router.push('/create-dynamic-comic')
    }
  }

  const handleBrowseCreations = () => {
    if (!isAuthenticated) {
      router.push('/auth/login')
    } else {
      router.push('/creations')
    }
  }

  const handleLogin = () => {
    router.push('/auth/login')
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-[#FDBCB4]/20 via-[#ADD8E6]/20 to-white">
      <div className="pointer-events-none absolute -left-10 -top-10 h-64 w-64 rounded-full bg-[#FDBCB4]/30 blur-3xl animate-blob-slow" />
      <div className="pointer-events-none absolute right-10 top-24 h-72 w-72 rounded-full bg-[#ADD8E6]/30 blur-3xl animate-blob-slower" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-[#22C55E]/20 blur-3xl animate-blob-slow" />

      <div className="relative container mx-auto px-4 py-10 lg:py-16">
        {/* 顶部操作栏 */}
        <div className="mb-12 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/home')}
              className="flex items-center gap-3 group cursor-pointer"
            >
              <Image
                src="/favicon.png"
                alt="Mira"
                width={48}
                height={48}
                className="object-contain group-hover:opacity-80 transition-opacity shadow-md shadow-[#ADD8E6]/30 rounded-xl"
              />
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-[#22C55E] to-[#ADD8E6] lg:text-4xl group-hover:opacity-80 transition-opacity">
                {t('homePage.title')}
              </h1>
            </button>
            <p className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-[#22C55E] shadow-[2px_2px_4px_rgba(173,221,230,0.3),-1px_-1px_3px_rgba(255,255,255,0.7)] hover:shadow-[3px_3px_6px_rgba(173,221,230,0.4),-2px_-2px_4px_rgba(255,255,255,0.8)] transition-all duration-300">
              <Sparkles className="h-4 w-4 text-[#22C55E]" />
              {t('homePage.heroBadge')}
            </p>
          </div>
          {/* 隐藏签到按钮 */}
        </div>

        {/* Hero 区块 */}
        <div className="mb-16 grid items-center gap-10 lg:grid-cols-2">
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl font-bold leading-tight text-gray-900 lg:text-5xl">
                {t('homePage.heroHeadline')}
              </h2>
              <p className="max-w-2xl text-lg text-gray-600">
                {t('homePage.heroDescription')}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Button
                onClick={handleStartCreating}
                size="lg"
                className="gap-2 rounded-lg px-8 transition-all hover:scale-[1.02]"
              >
                <Wand2 className="h-5 w-5" />
                {t('homePage.startCreating')}
                <ArrowRight className="h-5 w-5" />
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={handleBrowseCreations}
                className="gap-2 rounded-lg px-8"
              >
                <Video className="h-5 w-5" />
                {t('homePage.browseCreations')}
              </Button>
            </div>
            <div className="shadow-[4px_4px_8px_rgba(173,221,230,0.3),-2px_-2px_4px_rgba(255,255,255,0.7)] hover:shadow-[6px_6px_12px_rgba(173,221,230,0.4),-4px_-4px_8px_rgba(255,255,255,0.8)] rounded-xl p-6 bg-white transition-all duration-300">
              <div className="grid grid-cols-2 gap-6">
                {stats.map((item) => (
                  <div key={item.label} className="space-y-2">
                    <div className="text-3xl font-bold text-gray-900">{item.value}</div>
                    <p className="text-sm text-gray-600">{item.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 右侧卡片区块 */}
          <div className="relative">
            <div className="shadow-[8px_8px_16px_rgba(173,221,230,0.3),-6px_-6px_12px_rgba(255,255,255,0.7)] hover:shadow-[10px_10px_20px_rgba(173,221,230,0.4),-8px_-8px_16px_rgba(255,255,255,0.8)] rounded-2xl p-8 bg-white transition-all duration-300">
              <div className="flex flex-col gap-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{t('homePage.workspaceLabel')}</p>
                    <p className="mt-2 text-xl font-semibold text-gray-900">
                      {isGuest ? t('homePage.welcomeGuest') : t('homePage.welcomeBack', { name: user?.username || '' })}
                    </p>
                  </div>
                  <div className="rounded-full bg-[#22C55E]/20 px-4 py-2 text-xs font-medium text-[#22C55E]">
                    {t('homePage.realtimeSync')}
                  </div>
                </div>

                <div className="shadow-[inset_2px_2px_4px_rgba(173,221,230,0.3),inset_-1px_-1px_2px_rgba(255,255,255,0.7)] rounded-xl p-6 bg-white">
                  {authLoading || waitingForUserInfo ? (
                    <div className="flex items-center justify-center py-8 text-gray-500">
                      {t('common.loading')}
                    </div>
                  ) : isAuthenticated && user ? (
                    <div className="flex items-center gap-6">
                      <Avatar className="h-16 w-16">
                        {user.avatar ? <AvatarImage src={user.avatar} alt={user.username} /> : null}
                        <AvatarFallback className="bg-[#22C55E]">
                          <User className="h-8 w-8 text-white" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-lg font-semibold text-gray-900">{user.username}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        <div className="mt-3 flex items-center gap-2 text-xs text-[#22C55E]">
                          <ShieldCheck className="h-4 w-4" />
                          {t('homePage.dataProtected')}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <p className="text-lg font-semibold text-gray-900">
                          {t('homePage.notLoggedIn')}
                        </p>
                        <p className="text-sm text-gray-500">{t('homePage.loginPrompt')}</p>
                      </div>
                      <Button onClick={handleLogin} variant="secondary" className="rounded-lg">
                        {t('auth.login')}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-5 shadow-[4px_4px_8px_rgba(173,221,230,0.3),-2px_-2px_4px_rgba(255,255,255,0.7)] hover:shadow-[6px_6px_12px_rgba(173,221,230,0.4),-4px_-4px_8px_rgba(255,255,255,0.8)] hover:-translate-y-1 transition-all duration-300">
                    <div className="flex items-center gap-4">
                      <div className="rounded-xl bg-[#ADD8E6]/30 p-3">
                        <Cpu className="h-6 w-6 text-[#22C55E]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{t('homePage.cardSmartStoryboard')}</p>
                        <p className="text-xs text-gray-500">{t('homePage.cardSmartStoryboardDesc')}</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-5 shadow-[4px_4px_8px_rgba(173,221,230,0.3),-2px_-2px_4px_rgba(255,255,255,0.7)] hover:shadow-[6px_6px_12px_rgba(173,221,230,0.4),-4px_-4px_8px_rgba(255,255,255,0.8)] hover:-translate-y-1 transition-all duration-300">
                    <div className="flex items-center gap-4">
                      <div className="rounded-xl bg-[#FDBCB4]/30 p-3">
                        <Palette className="h-6 w-6 text-[#22C55E]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{t('homePage.cardMoodLight')}</p>
                        <p className="text-xs text-gray-500">{t('homePage.cardMoodLightDesc')}</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-5 shadow-[4px_4px_8px_rgba(173,221,230,0.3),-2px_-2px_4px_rgba(255,255,255,0.7)] hover:shadow-[6px_6px_12px_rgba(173,221,230,0.4),-4px_-4px_8px_rgba(255,255,255,0.8)] hover:-translate-y-1 transition-all duration-300">
                    <div className="flex items-center gap-4">
                      <div className="rounded-xl bg-[#22C55E]/20 p-3">
                        <Clock3 className="h-6 w-6 text-[#22C55E]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{t('homePage.cardRealtimePreview')}</p>
                        <p className="text-xs text-gray-500">{t('homePage.cardRealtimePreviewDesc')}</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-5 shadow-[4px_4px_8px_rgba(173,221,230,0.3),-2px_-2px_4px_rgba(255,255,255,0.7)] hover:shadow-[6px_6px_12px_rgba(173,221,230,0.4),-4px_-4px_8px_rgba(255,255,255,0.8)] hover:-translate-y-1 transition-all duration-300">
                    <div className="flex items-center gap-4">
                      <div className="rounded-xl bg-[#ADD8E6]/30 p-3">
                        <Wand2 className="h-6 w-6 text-[#22C55E]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{t('homePage.cardOneClickExport')}</p>
                        <p className="text-xs text-gray-500">{t('homePage.cardOneClickExportDesc')}</p>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 特性区块 */}
        <div className="mb-16 space-y-8">
          <div className="flex flex-col gap-3">
            <p className="text-sm uppercase tracking-[0.2em] text-[#22C55E]">{t('homePage.featureSectionTag')}</p>
            <h3 className="text-3xl font-bold text-gray-900">{t('homePage.featureSectionTitle')}</h3>
            <p className="text-gray-600">
              {t('homePage.featureSectionDesc')}
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {featureCards.map((item) => (
              <Card
                key={item.title}
                className="shadow-[6px_6px_12px_rgba(173,221,230,0.3),-4px_-4px_8px_rgba(255,255,255,0.7)] hover:shadow-[8px_8px_16px_rgba(173,221,230,0.4),-6px_-6px_12px_rgba(255,255,255,0.8)] p-6 hover:-translate-y-2 transition-all duration-300 bg-white"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white shadow-[2px_2px_4px_rgba(173,221,230,0.3),-1px_-1px_3px_rgba(255,255,255,0.7)]">
                  {item.icon}
                </div>
                <div className="mt-5 space-y-3">
                  <p className="text-xl font-semibold text-gray-900">{item.title}</p>
                  <p className="text-sm text-gray-600">{item.desc}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* 工作流程区块 */}
        <div className="mb-16 shadow-[8px_8px_16px_rgba(173,221,230,0.3),-6px_-6px_12px_rgba(255,255,255,0.7)] rounded-2xl p-8 bg-white transition-all duration-300">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-4 lg:max-w-md">
              <p className="text-sm font-medium text-[#22C55E]">{t('homePage.workflowTag')}</p>
              <h4 className="text-2xl font-bold text-gray-900">{t('homePage.workflowTitle')}</h4>
              <p className="text-gray-600">
                {t('homePage.workflowDesc')}
              </p>
            </div>
            <div className="grid w-full gap-4 lg:max-w-3xl lg:grid-cols-4">
              {workflow.map((step) => (
                <div
                  key={step.title}
                  className="shadow-[4px_4px_8px_rgba(173,221,230,0.3),-2px_-2px_4px_rgba(255,255,255,0.7)] hover:shadow-[6px_6px_12px_rgba(173,221,230,0.4),-4px_-4px_8px_rgba(255,255,255,0.8)] rounded-xl p-5 transition-all duration-300 hover:-translate-y-2 bg-white"
                >
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#22C55E]/20 px-4 py-2 text-[#22C55E]">
                    {step.icon}
                    <span className="text-xs font-semibold">{step.title}</span>
                  </div>
                  <p className="text-sm text-gray-600">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

