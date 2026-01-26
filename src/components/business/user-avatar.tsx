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
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { useAuthStore } from '@/stores/auth'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useQueryClient } from '@tanstack/react-query'
import { clearUserDataCache } from '@/lib/utils/clear-user-data'
import { createClient } from '@/lib/supabase/client'

export function UserAvatar() {
  const t = useTranslations();
  const { user, logout, isAuthenticated } = useAuthStore()
  const router = useRouter()
  const params = useParams()
  const locale = params?.locale as string
  const queryClient = useQueryClient()

  const handleLogout = async () => {
    // 使用 Supabase 登出（处理 Supabase 端的登出）
    const supabase = createClient()
    await supabase.auth.signOut()
    
    // 清空所有用户相关的 React Query 缓存
    clearUserDataCache(queryClient)
    // 清空 auth store 和其他 store 的数据
    logout()
    // 跳转到登录页
    router.push(`/${locale}/auth/login`)
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
        <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] border border-blue-100 hover:scale-105 transition-all duration-200">
          <Avatar className="h-8 w-8">
            {user.avatar ? (
              <AvatarImage src={user.avatar} alt={user.username} />
            ) : null}
            <AvatarFallback className="bg-gradient-to-br from-#FDBCB4 to-#ADD8E6 text-white">
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <span className="sr-only">{t("user.userMenu")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-2xl bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] border border-blue-100 p-3">
        <div className="flex items-center justify-start gap-3 p-2">
          <Avatar className="h-10 w-10 border-2 border-blue-100 shadow-md">
            {user.avatar ? (
              <AvatarImage src={user.avatar} alt={user.username} />
            ) : null}
            <AvatarFallback className="bg-gradient-to-br from-#FDBCB4 to-#ADD8E6 text-white">
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none text-gray-800">{user.username}</p>
            <p className="text-xs text-gray-600">{user.email}</p>
          </div>
        </div>
        <DropdownMenuSeparator className="my-2 bg-blue-100" />
        <DropdownMenuItem onClick={handlePointsClick} className="hover:bg-blue-50 rounded-xl">
          <Coins className="mr-2 h-4 w-4 text-#22C55E" />
          {t("user.pointsRecords")}
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-2 bg-blue-100" />
        <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 hover:bg-red-50 rounded-xl">
          <LogOut className="mr-2 h-4 w-4" />
          {t("user.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
