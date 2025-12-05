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
        <Skeleton className="h-6 w-16" />
      </div>
    )
  }

  const handleClick = () => {
    router.push(`/${locale}/points`)
  }

  // 检查是否有临时积分（expires_at 不为 null 的积分）
  const hasTemporaryPoints = currentBalance?.points_by_type.some(
    (t) => t.expires_at !== null && t.expires_at !== undefined && t.points > 0
  )

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 gap-1.5 px-2"
      onClick={handleClick}
      title={t('viewDetails')}
    >
      <Coins className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
        {currentBalance?.available_points ?? 0}
      </span>
      {hasTemporaryPoints && (
        <span className="text-xs text-orange-600 dark:text-orange-400" title={t('expiringSoon')}>
          ⚠️
        </span>
      )}
    </Button>
  )
}

