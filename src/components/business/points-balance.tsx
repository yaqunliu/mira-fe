'use client'

import { Coins } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { pointsApi } from '@/lib/api/points'
import { usePointsStore } from '@/stores/points'
import { useTranslations } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/stores/auth'

export function PointsBalance() {
  const t = useTranslations('points')
  const router = useRouter()
  const params = useParams()
  const locale = params?.locale as string
  const { isAuthenticated } = useAuthStore()
  const { balance, setBalance } = usePointsStore()

  // 查询积分余额
  const { data, isLoading } = useQuery({
    queryKey: ['points', 'balance'],
    queryFn: () => pointsApi.getBalance(),
    // 移除 enabled,让 apiClient 自动处理认证
    // 如果未登录,apiClient 会返回 401,React Query 会捕获错误
    staleTime: 5 * 60 * 1000, // 5分钟内不重新请求
    refetchOnWindowFocus: false,
    retry: 1,
    onSuccess: (data) => {
      setBalance(data)
    },
    onError: () => {
      // 静默处理错误,不显示给用户
    },
  })

  const currentBalance = balance || data

  if (!isAuthenticated) {
    return null
  }

  if (isLoading && !currentBalance) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-8 w-24 bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] animate-pulse flex items-center justify-center">
          <div className="h-4 w-4 rounded-full bg-gradient-to-br from-#FDBCB4 to-#ADD8E6 animate-pulse" />
          <div className="h-4 w-10 ml-2 bg-gradient-to-br from-#22C55E/20 to-#16A34A/20 rounded-lg animate-pulse" />
        </div>
      </div>
    )
  }

  const handleClick = () => {
    router.push('/points')
  }

  // 检查是否有临时积分（expires_at 不为 null 的积分）
  const hasTemporaryPoints = currentBalance?.points_by_type.some(
    (t) => t.expires_at !== null && t.expires_at !== undefined && t.points > 0
  )

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 gap-1.5 px-3 rounded-xl bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] border border-blue-100 hover:scale-105 transition-all duration-200"
      onClick={handleClick}
      title={t('viewDetails')}
    >
      <Coins className="h-4 w-4 text-#22C55E" />
      <span className="text-sm font-medium text-gray-800">
        {currentBalance?.available_points ?? 0}
      </span>
      {hasTemporaryPoints && (
        <span className="text-xs text-orange-600" title={t('expiringSoon')}>
          ⚠️
        </span>
      )}
    </Button>
  )
}

