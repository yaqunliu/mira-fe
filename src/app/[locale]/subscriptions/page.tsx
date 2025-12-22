'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { subscriptionsApi, type Subscription } from '@/lib/api/subscriptions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Sparkles, ShieldCheck, Calendar, Coins, Repeat, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
function formatPrice(cents: number, currency = 'USD') {
  if (currency === 'USD') {
    return `$${(cents / 100).toFixed(2)}`
  } else if (currency === 'CNY') {
    return `¥${(cents / 100).toFixed(2)}`
  } else {
    return `${(cents / 100).toFixed(2)} ${currency}`
  }
}

function formatDate(dateString: string | undefined): string {
  if (!dateString) return '-'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  } catch {
    return '-'
  }
}

function getStatusBadge(status: string, t: any) {
  const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    active: { label: t('subscriptions.statusActive', { default: '活跃' }), variant: 'default' },
    past_due: { label: t('subscriptions.statusPastDue', { default: '逾期' }), variant: 'destructive' },
    cancelled: { label: t('subscriptions.statusCancelled', { default: '已取消' }), variant: 'secondary' },
    canceled: { label: t('subscriptions.statusCancelled', { default: '已取消' }), variant: 'secondary' },
    expired: { label: t('subscriptions.statusExpired', { default: '已过期' }), variant: 'secondary' },
    scheduled_cancel: { label: t('subscriptions.statusScheduledCancel', { default: '计划取消' }), variant: 'secondary' },
  }
  const statusInfo = statusMap[status] || { label: status, variant: 'outline' }
  return (
    <Badge variant={statusInfo.variant} className="ml-2">
      {statusInfo.label}
    </Badge>
  )
}

function SubscriptionCard({ subscription, t, onCancel }: { subscription: Subscription; t: any; onCancel: (uuid: string) => void }) {
  const product = subscription.product
  const isActive = subscription.status === 'active'
  const isCancelled = subscription.status === 'cancelled' || subscription.cancel_at_period_end
  const isExpired = subscription.status === 'expired'
  // 检查是否为手动续费（微信订阅）
  const isManualRenewal = subscription.subscription_metadata?.auto_renewal === false || 
                          subscription.subscription_metadata?.renewal_type === 'manual' ||
                          subscription.payment_method === 'wechat'

  return (
    <Card className="border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-800/70 shadow-xl">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-400" />
              {product?.name || t('subscriptions.unknownProduct', { default: '未知产品' })}
              {getStatusBadge(subscription.status, t)}
            </CardTitle>
            <div className="mt-2 flex items-center gap-4 text-sm text-slate-300">
              <div className="flex items-center gap-1">
                <Coins className="h-4 w-4 text-amber-400" />
                <span>
                  {subscription.points_per_period.toLocaleString()} {t('subscriptions.pointsPerPeriod', { default: '积分/周期' })}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Repeat className="h-4 w-4 text-blue-400" />
                <span>
                  {subscription.billing_period === 'every-year'
                    ? t('subscriptions.billingYear', { default: '年付' })
                    : subscription.billing_period === 'every-quarter'
                    ? t('subscriptions.billingQuarter', { default: '季付' })
                    : t('subscriptions.billingMonth', { default: '月付' })}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-lg font-semibold text-white">
                  {formatPrice(product?.price || 0, product?.currency || 'USD')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-white/5 p-3 border border-white/10">
          <div className="flex items-center gap-2 text-sm text-slate-300 mb-2">
            <Calendar className="h-4 w-4 text-blue-400" />
            <span className="font-semibold">{t('subscriptions.currentPeriod', { default: '订阅周期' })}</span>
          </div>
          <div className="text-xs text-slate-400 space-y-1">
            <div>
              {t('subscriptions.periodStart', { default: '开始' })}:{' '}
              {formatDate(subscription.current_period_start)}
            </div>
            <div>
              {t('subscriptions.periodEnd', { default: '结束' })}:{' '}
              {formatDate(subscription.current_period_end)}
            </div>
            {/* 微信订阅永远不显示下次扣款时间（next_billing_date永远为null） */}
            {!isManualRenewal && (
              <div className="flex items-center gap-2 text-sm text-slate-300 pt-1">
                <AlertCircle className="h-4 w-4 text-amber-400" />
                <span className="text-xs text-slate-400">
                  {t('subscriptions.nextBilling', { default: '下次扣款' })}:{' '}
                  {subscription.status === 'active' 
                    ? (subscription.next_billing_date ? formatDate(subscription.next_billing_date) : t('subscriptions.noBillingDate', { default: '-' }))
                    : t('subscriptions.noBillingDate', { default: '-' })}
                </span>
              </div>
            )}
            {isManualRenewal && (
              <div className="flex items-center gap-2 text-sm text-blue-300 pt-1">
                <AlertCircle className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-blue-300">
                  {t('subscriptions.manualRenewal', { default: '手动续费' })} - {t('subscriptions.noBillingDate', { default: '-' })}
                </span>
              </div>
            )}
          </div>
        </div>
        {subscription.cancel_at_period_end && (
          <div className="flex items-start gap-2 text-sm text-amber-300 bg-amber-500/10 border border-amber-200/30 dark:border-amber-500/30 rounded-lg p-2">
            <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <span>
              {t('subscriptions.cancelAtPeriodEnd', { default: '已设置到期取消，本周期结束后不再自动扣费' })}
            </span>
          </div>
        )}
        {isCancelled && subscription.cancelled_at && (
          <div className="flex items-center gap-2 text-sm text-red-400">
            <XCircle className="h-4 w-4" />
            <span>
              {t('subscriptions.cancelledAt', { default: '已取消于' })}:{' '}
              {formatDate(subscription.cancelled_at)}
            </span>
          </div>
        )}
        {/* 微信订阅不显示取消按钮（因为没有自动续费，不需要取消） */}
        {isManualRenewal && (
          <div className="space-y-2">
            <div className="flex items-start gap-2 text-sm text-blue-300 bg-blue-500/10 border border-blue-200/30 dark:border-blue-500/30 rounded-lg p-2">
              <AlertCircle className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <span>
                {t('subscriptions.manualRenewalDesc', { default: '本订阅为手动续费，到期后需要手动购买续费' })}
              </span>
            </div>
          </div>
        )}
        {/* 只有Creem订阅显示取消按钮 */}
        {!isManualRenewal && isActive && !subscription.cancel_at_period_end && (
          <Button
            variant="outline"
            className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            onClick={() => onCancel(subscription.uuid)}
          >
            {t('subscriptions.cancelSubscription', { default: '取消订阅' })}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export default function SubscriptionsPage() {
  const t = useTranslations()
  const params = useParams()
  const locale = (params?.locale as string) || 'zh'
  const { isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()

  const { data: subscriptions, isLoading, error } = useQuery({
    queryKey: ['subscriptions', 'list'],
    queryFn: () => subscriptionsApi.list({ page_size: 50 }),
    enabled: isAuthenticated,
    retry: 1,
  })

  const cancelMutation = useMutation({
    mutationFn: (uuid: string) => subscriptionsApi.cancel(uuid, { cancel_at_period_end: true }),
    onSuccess: () => {
      toast.success(t('subscriptions.cancelSuccess', { default: '已设置到期取消，当前周期结束后不再扣费' }))
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
    },
    onError: (error: any) => {
      toast.error(error?.message || t('subscriptions.cancelError', { default: '取消订阅失败' }))
    },
  })

  const handleCancel = (uuid: string) => {
    if (confirm(t('subscriptions.confirmCancel', { default: '确定要取消订阅吗？取消后当前周期结束将不再自动扣费。' }))) {
      cancelMutation.mutate(uuid)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
        <div className="mx-auto w-full max-w-4xl px-4 py-8">
          <Card className="border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-800/70">
            <CardContent className="p-8 text-center">
              <ShieldCheck className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-300">{t('subscriptions.loginRequired', { default: '请先登录以查看您的订阅' })}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="mx-auto w-full max-w-4xl px-4 py-8">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs text-amber-300 border border-white/10 mb-4">
            <Repeat className="h-4 w-4" />
            {t('subscriptions.title', { default: '我的订阅' })}
          </div>
          <h1 className="text-3xl font-bold leading-tight md:text-4xl">
            {t('subscriptions.headline', { default: '订阅管理' })}
          </h1>
          <p className="mt-2 text-slate-300">
            {t('subscriptions.subtitle', { default: '查看和管理您的订阅服务' })}
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 w-full rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : error ? (
          <Card className="border border-red-500/50 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-800/70">
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <p className="text-red-400">{t('subscriptions.loadError', { default: '加载订阅失败' })}</p>
            </CardContent>
          </Card>
        ) : !subscriptions || subscriptions.items.length === 0 ? (
          <Card className="border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-800/70">
            <CardContent className="p-8 text-center">
              <Sparkles className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-300 mb-4">{t('subscriptions.noSubscriptions', { default: '您还没有任何订阅' })}</p>
              <Button
                onClick={() => (window.location.href = `/${locale}/pricing`)}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                {t('subscriptions.browsePlans', { default: '浏览套餐' })}
              </Button>
            </CardContent>
          </Card>
        ) : (
              <div className="space-y-4">
                {subscriptions.items.map((sub) => (
                  <SubscriptionCard key={sub.uuid} subscription={sub} t={t} onCancel={handleCancel} />
                ))}
              </div>
        )}
      </div>
    </div>
  )
}

