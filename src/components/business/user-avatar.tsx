'use client'

import { User, LogOut, Coins } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/stores/auth'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useQueryClient } from '@tanstack/react-query'
import { clearUserDataCache } from '@/lib/utils/clear-user-data'
import { authApi } from '@/lib/api/auth'

export function UserAvatar() {
  const t = useTranslations();
  const { user, logout, isAuthenticated } = useAuthStore()
  const router = useRouter()
  const params = useParams()
  const locale = params?.locale as string
  const queryClient = useQueryClient()

  const handleLogout = async () => {
    try {
      // 调用后端退出登录接口
      await authApi.logout()
    } catch (error) {
      // 即使后端调用失败，也继续执行前端的清空逻辑
      console.error('Logout API error:', error)
    } finally {
      // 清空所有用户相关的 React Query 缓存
      clearUserDataCache(queryClient)
      // 清空 auth store 和其他 store 的数据
      logout()
      // 跳转到登录页
      router.push(`/${locale}/auth/login`)
    }
  }

  const handlePointsClick = () => {
    router.push(`/${locale}/points`)
  }

  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex items-center gap-2 pl-2">
          <User className="h-4 w-4" />
          <span className="sr-only">{t("user.userMenu")}</span>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="flex items-center justify-start gap-2 p-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <User className="h-4 w-4" />
          </div>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.username}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handlePointsClick}>
          <Coins className="mr-2 h-4 w-4" />
          {t("user.pointsRecords")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          {t("user.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
