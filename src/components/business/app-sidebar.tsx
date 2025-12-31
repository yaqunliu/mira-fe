'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { pointsApi } from '@/lib/api/points'
import { usePointsStore } from '@/stores/points'
import { clearUserDataCache } from '@/lib/utils/clear-user-data'
import { createClient } from '@/lib/supabase/client'
import {
  Sparkles,
  BookOpen,
  Coins,
  Menu,
  X,
  LogIn,
  LogOut,
  User,
  History,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  Wand2,
  Repeat,
  FileText,
} from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { LanguageToggle } from '@/components/business/language-toggle'
import { CheckinButton } from '@/components/business/checkin-button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface NavItem {
  label: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  translationKey: string
}

export function AppSidebar() {
  const t = useTranslations('sidebar')
  const pathname = usePathname()
  const router = useRouter()
  const params = useParams()
  const locale = (params?.locale as string) || 'zh'
  const { user, isAuthenticated, logout } = useAuthStore()
  const { sidebarOpen, setSidebarOpen } = useUIStore()
  const { balance, setBalance } = usePointsStore()
  const queryClient = useQueryClient()
  const [mounted, setMounted] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    setMounted(true)
    // 刷新后默认收起（无论桌面端还是移动端）
    if (typeof window !== 'undefined') {
      setIsCollapsed(true)
    }
  }, [])

  // 查询积分余额
  const { data: balanceData, isLoading: balanceLoading } = useQuery({
    queryKey: ['points', 'balance'],
    queryFn: () => pointsApi.getBalance(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  })

  useEffect(() => {
    if (balanceData) {
      setBalance(balanceData)
    }
  }, [balanceData, setBalance])

  const currentBalance = balance || balanceData

  const navItems: NavItem[] = [
    {
      label: t('workspace', { default: '工作台' }),
      icon: LayoutDashboard,
      href: `/${locale}/workspace`,
      translationKey: 'workspace',
    },
    {
      label: t('create', { default: '创作' }),
      icon: Wand2,
      href: `/${locale}/create-dynamic-comic`,
      translationKey: 'create',
    },
    {
      label: t('creations', { default: '创作记录' }),
      icon: History,
      href: `/${locale}/creations`,
      translationKey: 'creations',
    },
    {
      label: t('scripts', { default: '文案列表' }),
      icon: FileText,
      href: `/${locale}/scripts`,
      translationKey: 'scripts',
    },
  ]

  const handleNavClick = (href: string) => {
    router.push(href)
    if (window.innerWidth < 1024) {
      setSidebarOpen(false)
    }
  }

  const handleLogout = async () => {
    // 使用 Supabase 登出（处理 Supabase 端的登出）
    const supabase = createClient()
    if (supabase) {
      await supabase.auth.signOut()
    }

    // 清空所有用户相关的 React Query 缓存
    clearUserDataCache(queryClient)
    // 清空 auth store 和其他 store 的数据
    logout()

    // 跳转到登录页
    router.push(`/${locale}/auth/login`)
    if (window.innerWidth < 1024) {
      setSidebarOpen(false)
    }
  }

  const isActive = (href: string) => {
    if (href === `/${locale}/home` || href === `/${locale}`) {
      return pathname === `/${locale}/home` || pathname === `/${locale}` || pathname === `/${locale}/`
    }
    return pathname === href || pathname?.startsWith(href + '/')
  }

  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      if (mobile) {
        setIsCollapsed(true)
      }
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (!mounted) {
    return (
      <>
        <div className="h-14 lg:hidden" />
        <div className="w-20 hidden lg:block" />
      </>
    )
  }

  const sidebarWidth = isCollapsed ? 'w-20' : 'w-64'

  return (
    <>
      {/* 移动端顶部栏 */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-[100] h-14 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/10 flex items-center justify-between px-4 lg:hidden shadow-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="h-9 w-9 p-0 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-all"
          >
            <Menu className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          </Button>

          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <>
                {/* 签到按钮 */}
                <CheckinButton />
                {/* 积分显示 */}
                {balanceLoading ? (
                  <Skeleton className="h-7 w-16 bg-gray-200 dark:bg-white/10" />
                ) : (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                    <Coins className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      {currentBalance?.available_points ?? 0}
                    </span>
                  </div>
                )}
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center overflow-hidden border-2 border-gray-200 dark:border-white/20">
                  {user?.avatar ? (
                    <Image src={user.avatar} alt={user.username || ''} width={32} height={32} className="object-cover" />
                  ) : (
                    <User className="h-4 w-4 text-white" />
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 移动端遮罩 */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 侧边栏 */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 border-r border-gray-200/50 dark:border-white/10 z-[100] transition-all duration-300 ease-in-out shadow-lg',
          'lg:translate-x-0',
          isMobile
            ? sidebarOpen
              ? 'translate-x-0'
              : '-translate-x-full'
            : '',
          isMobile ? 'w-64 top-14 h-[calc(100vh-3.5rem)]' : `${sidebarWidth} top-0 h-screen`
        )}
      >
        <div className="flex flex-col h-full">
          {/* 头部 */}
          <div className={cn(
            'flex items-center border-b border-gray-200/50 dark:border-white/10 transition-all duration-300',
            isCollapsed ? 'justify-center p-3' : 'justify-between p-4'
          )}>
            <button
              onClick={() => handleNavClick(`/${locale}/home`)}
              className="flex items-center gap-3 transition-transform hover:scale-105"
            >
              <div className="relative w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
                <Image
                  src="/favicon.png"
                  alt="Mira"
                  width={40}
                  height={40}
                  className="object-contain"
                />
              </div>
              {!isCollapsed && (
                <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent whitespace-nowrap">
                  Mira
                </span>
              )}
            </button>
            {/* 桌面端收缩按钮 */}
            {!isMobile && !isCollapsed && (
              <button
                onClick={() => setIsCollapsed(true)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors flex-shrink-0"
              >
                <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </button>
            )}
            {/* 移动端关闭按钮 */}
            {isMobile && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-all ml-auto"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              </Button>
            )}
          </div>

          {/* 收缩状态下的展开按钮 */}
          {!isMobile && isCollapsed && (
            <div className="absolute top-4 right-0 translate-x-full">
              <button
                onClick={() => setIsCollapsed(false)}
                className="p-2 rounded-r-lg bg-white dark:bg-slate-900 border border-l-0 border-gray-200/50 dark:border-white/10 shadow-md hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          )}

          {/* 导航菜单 */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <button
                  key={item.href}
                  onClick={() => handleNavClick(item.href)}
                  className={cn(
                    'w-full flex items-center rounded-xl transition-all duration-300 group relative',
                    isCollapsed ? 'justify-center h-12 p-0' : 'gap-3 px-3 py-2.5',
                    active
                      ? 'bg-blue-600 shadow-blue-500/30 text-white shadow-lg'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  <Icon className={cn(
                    'h-5 w-5 flex-shrink-0 transition-colors',
                    active
                      ? 'text-white'
                      : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200'
                  )} />
                  {(!isCollapsed || isMobile) && (
                    <span className={cn(
                      'text-sm font-medium transition-colors whitespace-nowrap',
                      active
                        ? 'text-blue-700 dark:text-blue-300'
                        : 'text-gray-700 dark:text-gray-300'
                    )}>
                      {item.label}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          {/* 底部功能区 */}
          <div className={cn("border-t border-gray-200/50 dark:border-white/10", isCollapsed ? "p-2 space-y-2" : "p-3 space-y-3")}>
            {/* 积分显示 */}
            {isAuthenticated && (
              <div className={cn(isCollapsed ? "flex flex-col items-center gap-2" : "space-y-3")}>
                {/* 积分显示 */}
                {isCollapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleNavClick(`/${locale}/points`)}
                        className="rounded-lg transition-all duration-300 relative group overflow-hidden w-11 h-11 flex items-center justify-center bg-gradient-to-br from-amber-400 to-orange-500 shadow-md hover:shadow-lg hover:scale-105"
                      >
                        <Coins className="h-4.5 w-4.5 text-white" />
                        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-white/30 border border-white/20" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{t('points', { default: '积分' })}: {currentBalance?.available_points?.toLocaleString() ?? 0}</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <button
                    onClick={() => handleNavClick(`/${locale}/points`)}
                    className="w-full p-3 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200/50 dark:border-amber-800/50 rounded-xl hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex-shrink-0 shadow-sm">
                        <Coins className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col items-start">
                        {balanceLoading ? (
                          <Skeleton className="h-5 w-20 bg-amber-200/50 dark:bg-amber-800/30" />
                        ) : (
                          <>
                            <div className="text-lg font-bold text-amber-700 dark:text-amber-300 lining-nums">
                              {currentBalance?.available_points?.toLocaleString() ?? 0}
                            </div>
                            <div className="text-xs text-amber-600/80 dark:text-amber-400/80 font-medium">
                              {t('points', { default: '积分余额' })}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                )}

                <div className={cn("flex", isCollapsed ? "flex-col gap-2" : "gap-2 w-full")}>
                  {/* 充值按钮 */}
                  {isCollapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => window.open(`/${locale}/pricing`, '_blank', 'noopener,noreferrer')}
                          className="rounded-lg transition-all duration-300 flex items-center justify-center w-11 h-11 bg-white dark:bg-slate-800 border-2 border-dashed border-blue-200 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                        >
                          <Sparkles className="h-4 w-4 flex-shrink-0" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{t('recharge', { default: '立即充值' })}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <button
                      onClick={() => window.open(`/${locale}/pricing`, '_blank', 'noopener,noreferrer')}
                      className="rounded-xl transition-all duration-300 flex items-center justify-center flex-1 gap-2 py-2.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5"
                    >
                      <Sparkles className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm font-semibold">{t('recharge', { default: '充值' })}</span>
                    </button>
                  )}

                  {/* 订阅管理按钮 */}
                  {isCollapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => window.open(`/${locale}/subscriptions`, '_blank', 'noopener,noreferrer')}
                          className="rounded-lg transition-all duration-300 flex items-center justify-center w-11 h-11 bg-white dark:bg-slate-800 border-2 border-dashed border-emerald-200 dark:border-emerald-700 hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                        >
                          <Repeat className="h-4 w-4 flex-shrink-0" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{t('subscriptions', { default: '我的订阅' })}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <button
                      onClick={() => window.open(`/${locale}/subscriptions`, '_blank', 'noopener,noreferrer')}
                      className="rounded-xl transition-all duration-300 flex items-center justify-center flex-1 gap-2 py-2.5 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-sm hover:shadow-md"
                    >
                      <Repeat className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm font-semibold">{t('subscriptionsShort', { default: '订阅' })}</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 用户信息 */}
            {isAuthenticated ? (
              <div className="space-y-2">
                <div className={cn(
                  'flex items-center rounded-xl bg-gray-50 dark:bg-white/5',
                  isCollapsed ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-2'
                )}>
                  <div className="relative h-10 w-10 rounded-full overflow-hidden border-2 border-gray-200 dark:border-white/20 flex-shrink-0">
                    {user?.avatar ? (
                      <Image
                        src={user.avatar}
                        alt={user.username || ''}
                        width={40}
                        height={40}
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                        <User className="h-5 w-5 text-white" />
                      </div>
                    )}
                  </div>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {user?.username || user?.email}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {user?.email}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className={cn(
                    'w-full flex items-center rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors',
                    isCollapsed ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-2'
                  )}
                >
                  <LogOut className="h-4 w-4 flex-shrink-0" />
                  {!isCollapsed && <span>登出</span>}
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleNavClick(`/${locale}/auth/login`)}
                className={cn(
                  'w-full flex items-center rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white text-sm font-medium transition-all shadow-md hover:shadow-lg',
                  isCollapsed ? 'justify-center px-2 py-2' : 'justify-center gap-2 px-3 py-2'
                )}
              >
                <LogIn className="h-4 w-4 flex-shrink-0" />
                {!isCollapsed && (
                  <span>{t('login', { default: '登录' })}</span>
                )}
              </button>
            )}

            {/* 语言切换 */}
            <div className="pt-2 border-t border-gray-200/50 dark:border-white/10">
              <div className={cn(
                'flex items-center',
                isCollapsed ? 'justify-center' : 'justify-start'
              )}>
                <LanguageToggle />
              </div>
            </div>
          </div>
        </div>
      </aside >
    </>
  )
}
