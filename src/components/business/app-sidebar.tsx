'use client'

import { usePathname } from '@/i18n/navigation';
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

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
      href: '/workspace',
      translationKey: 'workspace',
    },
    {
      label: t('create', { default: '创作' }),
      icon: Wand2,
      href: '/create-dynamic-comic',
      translationKey: 'create',
    },
    {
      label: t('creations', { default: '创作记录' }),
      icon: History,
      href: '/creations',
      translationKey: 'creations',
    },
    {
      label: t('scripts', { default: '文案列表' }),
      icon: FileText,
      href: '/scripts',
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
    router.push('/auth/login')
    if (window.innerWidth < 1024) {
      setSidebarOpen(false)
    }
  }

  const isActive = (href: string) => {
    if (href === '/home' || href === '/') {
      return pathname === '/home' || pathname === '/'
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
        <div className="fixed top-0 left-0 right-0 z-[100] h-14 bg-gradient-to-r from-white to-blue-50 backdrop-blur-xl flex items-center justify-between px-4 lg:hidden shadow-[0px_4px_16px_rgba(0,0,0,0.12),0px_-2px_8px_rgba(255,255,255,0.95)] border-b border-white/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="h-9 w-9 p-0 rounded-xl bg-gradient-to-br from-white to-blue-50 shadow-[2px_2px_8px_rgba(0,0,0,0.1),-2px_-2px_8px_rgba(255,255,255,0.9)] hover:shadow-[3px_3px_12px_rgba(0,0,0,0.15),-3px_-3px_12px_rgba(255,255,255,1)] transition-all duration-300 hover:-translate-y-0.5 border border-white/50"
          >
            <Menu className="h-5 w-5 text-gray-700" />
          </Button>

          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <>
                {/* 签到按钮 */}
                <CheckinButton />
                {/* 积分显示 */}
                {balanceLoading ? (
                  <div className="h-7 w-16 bg-gradient-to-r from-[#FDBCB4]/20 to-[#ADD8E6]/20 rounded-xl shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)] animate-pulse" />
                ) : (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                    <Coins className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      {currentBalance?.available_points ?? 0}
                    </span>
                  </div>
                )}
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center overflow-hidden shadow-md">
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
          'fixed left-0 top-0 h-screen bg-gradient-to-b from-white to-blue-50 z-[100] transition-all duration-300 ease-in-out shadow-[8px_8px_24px_rgba(0,0,0,0.15),-8px_-8px_24px_rgba(255,255,255,0.95)] border-r border-white/50',
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
            'flex items-center transition-all duration-300',
            isCollapsed ? 'justify-center p-3' : 'justify-between p-4'
          )}>
            <button
              onClick={() => handleNavClick('/home')}
              className="flex items-center gap-3 transition-transform hover:scale-105"
            >
              <div className="relative w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 shadow-[4px_4px_12px_rgba(0,0,0,0.15),-2px_-2px_8px_rgba(255,255,255,0.8)] bg-gradient-to-br from-white to-blue-50 border border-white/50">
                <Image
                  src="/favicon.png"
                  alt="Mira"
                  width={40}
                  height={40}
                  className="object-contain"
                />
              </div>
              {!isCollapsed && (
                <span className="text-xl font-bold bg-gradient-to-r from-blue-700 to-purple-700 dark:from-blue-500 dark:to-purple-500 bg-clip-text text-transparent whitespace-nowrap drop-shadow-sm">
                  Mira
                </span>
              )}
            </button>
            {/* 桌面端收缩按钮 */}
            {!isMobile && !isCollapsed && (
              <button
                onClick={() => setIsCollapsed(true)}
                className="p-1.5 rounded-xl bg-gradient-to-br from-white to-blue-50 shadow-[2px_2px_8px_rgba(0,0,0,0.1),-2px_-2px_8px_rgba(255,255,255,0.9)] hover:shadow-[3px_3px_12px_rgba(0,0,0,0.15),-3px_-3px_12px_rgba(255,255,255,1)] transition-all duration-300 flex-shrink-0 hover:-translate-y-0.5 border border-white/50"
              >
                <ChevronLeft className="h-4.5 w-4.5 text-gray-700" />
              </button>
            )}
            {/* 移动端关闭按钮 */}
            {isMobile && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-xl bg-gradient-to-br from-white to-blue-50 shadow-[2px_2px_8px_rgba(0,0,0,0.1),-2px_-2px_8px_rgba(255,255,255,0.9)] hover:shadow-[3px_3px_12px_rgba(0,0,0,0.15),-3px_-3px_12px_rgba(255,255,255,1)] transition-all duration-300 hover:-translate-y-0.5 border border-white/50 ml-auto"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-5 w-5 text-gray-700" />
              </Button>
            )}
          </div>

          {/* 收缩状态下的展开按钮 */}
          {!isMobile && isCollapsed && (
              <div className="absolute top-4 right-0 translate-x-full">
                <button
                  onClick={() => setIsCollapsed(false)}
                  className="p-2 rounded-xl bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.15),-2px_-2px_8px_rgba(255,255,255,0.8)] hover:shadow-[6px_6px_16px_rgba(0,0,0,0.2),-3px_-3px_12px_rgba(255,255,255,1)] transition-all duration-300 hover:-translate-y-0.5 border border-white/50"
                >
                  <ChevronRight className="h-4.5 w-4.5 text-gray-700" />
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
                    'w-full flex items-center rounded-xl transition-all duration-300 group relative overflow-hidden',
                    isCollapsed ? 'justify-center h-12 p-0' : 'gap-3 px-4 py-3.5',
                    active
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 shadow-[4px_4px_16px_rgba(34,197,94,0.3),-4px_-4px_16px_rgba(255,255,255,0.95)] text-white hover:shadow-[6px_6px_20px_rgba(34,197,94,0.4),-6px_-6px_20px_rgba(255,255,255,1)] hover:-translate-y-0.5 transform hover:scale-[1.02]'
                      : 'bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_16px_rgba(0,0,0,0.1),-4px_-4px_16px_rgba(255,255,255,0.95)] hover:shadow-[6px_6px_20px_rgba(0,0,0,0.15),-6px_-6px_20px_rgba(255,255,255,1)] hover:-translate-y-0.5 hover:bg-gradient-to-br from-blue-50 to-white transform hover:scale-[1.02] border border-white/50'
                  )}
                >
                  <Icon className={cn(
                    'h-5 w-5 flex-shrink-0 transition-all duration-300',
                    active
                      ? 'text-white drop-shadow-sm'
                      : 'text-gray-700 group-hover:text-gray-900 group-hover:scale-110'
                  )} />
                  {(!isCollapsed || isMobile) && (
                    <span className={cn(
                      'text-sm font-bold transition-all duration-300 whitespace-nowrap',
                      active
                        ? 'text-white drop-shadow-sm'
                        : 'text-gray-900 group-hover:text-gray-950 group-hover:translate-x-0.5'
                    )}>
                      {item.label}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          {/* 底部功能区 */}
          <div className={cn(isCollapsed ? "p-2 space-y-2" : "p-3 space-y-3")}>
            {/* 积分显示 */}
            {isAuthenticated && (
              <div className={cn(isCollapsed ? "flex flex-col items-center gap-2" : "space-y-3")}>
                {/* 积分显示 */}
                {isCollapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleNavClick('/points')}
                        className="rounded-lg transition-all duration-300 relative group overflow-hidden w-11 h-11 flex items-center justify-center bg-gradient-to-br from-amber-400 to-orange-500 shadow-md hover:shadow-lg hover:scale-105"
                      >
                        <Coins className="h-4.5 w-4.5 text-white" />
                        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-white/30" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{t('points', { default: '积分' })}: {currentBalance?.available_points?.toLocaleString() ?? 0}</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <button
                    onClick={() => handleNavClick('/points')}
                    className="w-full p-3 bg-gradient-to-br from-white to-blue-50 rounded-xl transition-all duration-300 shadow-[4px_4px_16px_rgba(0,0,0,0.12),-4px_-4px_16px_rgba(255,255,255,0.95)] hover:shadow-[6px_6px_20px_rgba(0,0,0,0.18),-6px_-6px_20px_rgba(255,255,255,1)] hover:-translate-y-0.5 border border-white/50"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex-shrink-0 shadow-md">
                        <Coins className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col items-start">
                        {balanceLoading ? (
                          <div className="h-5 w-20 bg-gradient-to-r from-[#FDBCB4]/20 to-[#ADD8E6]/20 rounded-xl shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)] animate-pulse" />
                        ) : (
                          <>
                            <div className="text-xl font-bold text-amber-700 dark:text-amber-300 lining-nums drop-shadow-sm">
                              {currentBalance?.available_points?.toLocaleString() ?? 0}
                            </div>
                            <div className="text-sm font-semibold text-amber-600 dark:text-amber-400">
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
                          onClick={() => window.open('/pricing', '_blank', 'noopener,noreferrer')}
                          className="rounded-lg transition-all duration-300 flex items-center justify-center w-11 h-11 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 text-blue-600 dark:text-blue-400"
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
                      onClick={() => window.open('/pricing', '_blank', 'noopener,noreferrer')}
                      className="rounded-xl transition-all duration-300 flex items-center justify-center flex-1 gap-2 py-3 px-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-[4px_4px_16px_rgba(59,130,246,0.3),-4px_-4px_16px_rgba(255,255,255,0.95)] hover:shadow-[6px_6px_20px_rgba(59,130,246,0.4),-6px_-6px_20px_rgba(255,255,255,1)] hover:-translate-y-0.5 border border-blue-400/30"
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
                          onClick={() => window.open('/subscriptions', '_blank', 'noopener,noreferrer')}
                          className="rounded-lg transition-all duration-300 flex items-center justify-center w-11 h-11 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 text-emerald-600 dark:text-emerald-400"
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
                      onClick={() => window.open('/subscriptions', '_blank', 'noopener,noreferrer')}
                      className="rounded-xl transition-all duration-300 flex items-center justify-center flex-1 gap-2 py-3 px-3 bg-gradient-to-br from-white to-blue-50 text-gray-900 shadow-[4px_4px_16px_rgba(0,0,0,0.12),-4px_-4px_16px_rgba(255,255,255,0.95)] hover:shadow-[6px_6px_20px_rgba(0,0,0,0.18),-6px_-6px_20px_rgba(255,255,255,1)] hover:-translate-y-0.5 border border-white/50"
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
                  'flex items-center rounded-xl bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_16px_rgba(0,0,0,0.12),-4px_-4px_16px_rgba(255,255,255,0.95)] hover:shadow-[6px_6px_20px_rgba(0,0,0,0.18),-6px_-6px_20px_rgba(255,255,255,1)] transition-all duration-300 hover:-translate-y-0.5 border border-white/50',
                  isCollapsed ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-3'
                )}>
                  <div className="relative h-10 w-10 rounded-full overflow-hidden shadow-md flex-shrink-0">
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
                      <div className="text-base font-bold text-gray-900 dark:text-white truncate drop-shadow-sm">
                        {user?.username || user?.email}
                      </div>
                      <div className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
                        {user?.email}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className={cn(
                    'w-full flex items-center rounded-xl bg-gradient-to-br from-white to-blue-50 text-sm font-semibold text-gray-800 transition-all duration-300 shadow-[4px_4px_16px_rgba(0,0,0,0.12),-4px_-4px_16px_rgba(255,255,255,0.95)] hover:shadow-[6px_6px_20px_rgba(0,0,0,0.18),-6px_-6px_20px_rgba(255,255,255,1)] hover:-translate-y-0.5 border border-white/50',
                    isCollapsed ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-3'
                  )}
                >
                  <LogOut className="h-4 w-4 flex-shrink-0" />
                  {!isCollapsed && <span>登出</span>}
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleNavClick('/auth/login')}
                className={cn(
                  'w-full flex items-center rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-sm font-semibold transition-all duration-300 shadow-[4px_4px_16px_rgba(34,197,94,0.3),-4px_-4px_16px_rgba(255,255,255,0.95)] hover:shadow-[6px_6px_20px_rgba(34,197,94,0.4),-6px_-6px_20px_rgba(255,255,255,1)] hover:-translate-y-0.5 border border-green-400/30',
                  isCollapsed ? 'justify-center px-2 py-3' : 'justify-center gap-2 px-3 py-3'
                )}
              >
                <LogIn className="h-4 w-4 flex-shrink-0" />
                {!isCollapsed && (
                  <span>{t('login', { default: '登录' })}</span>
                )}
              </button>
            )}
          </div>
        </div>
      </aside >
    </>
  )
}
