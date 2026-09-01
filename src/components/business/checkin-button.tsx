'use client'

import { Calendar, CheckCircle2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { pointsApi } from '@/lib/api/points'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth'
import { usePointsStore } from '@/stores/points'

interface CheckinButtonProps {
  className?: string
}

export function CheckinButton({ className }: CheckinButtonProps = {}) {
  const t = useTranslations('points')
  const { isAuthenticated } = useAuthStore()
  const { setBalance } = usePointsStore()
  const queryClient = useQueryClient()

  // 检查今日是否已签到
  const { data: todayCheckin } = useQuery({
    queryKey: ['points', 'checkin', 'today'],
    queryFn: async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const records = await pointsApi.getRecords({
        operation_type: 'daily_checkin',
        start_date: today.toISOString(),
        page_size: 1,
      })
      return records.items.length > 0
    },
    // 移除 enabled,让 apiClient 自动处理认证
    staleTime: 60 * 60 * 1000, // 1小时内不重新请求
    retry: 1,
    onError: () => {
      // 静默处理错误
    },
  })

  // 签到 mutation
  const checkinMutation = useMutation({
    mutationFn: () => pointsApi.checkin(),
    onSuccess: (data) => {
      toast.success(t('checkinSuccess', { points: data.points }))
      // 刷新余额
      queryClient.invalidateQueries({ queryKey: ['points', 'balance'] })
      queryClient.invalidateQueries({ queryKey: ['points', 'checkin', 'today'] })
      // 更新本地状态
      pointsApi.getBalance().then(setBalance)
    },
    onError: (error: Error) => {
      if (error.message.includes(t('checkedIn'))) {
        toast.error(t('alreadyCheckedIn'))
      } else {
        toast.error(t('checkinFailed'))
      }
    },
  })

  const handleCheckin = () => {
    checkinMutation.mutate()
  }

  if (!isAuthenticated) {
    return null
  }

  const isCheckedIn = todayCheckin === true
  const isLoading = checkinMutation.isPending

  return (
    <Button
      variant={isCheckedIn ? 'outline' : 'default'}
      size="sm"
      className={`h-8 gap-1.5 ${className || ''}`}
      onClick={handleCheckin}
      disabled={isCheckedIn || isLoading}
    >
      {isCheckedIn ? (
        <>
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-xs">{t('checkedIn')}</span>
        </>
      ) : (
        <>
          <Calendar className="h-4 w-4" />
          <span className="text-xs">{t('checkin')}</span>
        </>
      )}
    </Button>
  )
}

