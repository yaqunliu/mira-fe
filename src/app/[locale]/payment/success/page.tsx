'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams, useRouter, useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useQueryClient } from '@tanstack/react-query'
import { ordersApi } from '@/lib/api/orders'
import { pointsApi } from '@/lib/api/points'
import { usePointsStore } from '@/stores/points'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { useSupabaseAuth } from '@/hooks/use-supabase-auth'

export default function PaymentSuccessPage() {
  const t = useTranslations()
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const locale = (params?.locale as string) || 'zh'
  const queryClient = useQueryClient()
  const { setBalance } = usePointsStore()
  const { loading: authLoading } = useSupabaseAuth()
  const [orderStatus, setOrderStatus] = useState<'loading' | 'success' | 'pending' | 'failed'>('loading')
  const [order, setOrder] = useState<any>(null)
  const hasRefreshedRef = useRef(false) // 标记是否已刷新过数据
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null) // 轮询定时器引用

  const orderUuid = searchParams?.get('order_uuid') || searchParams?.get('orderUuid')

  // 刷新积分相关数据
  const refreshPointsData = async () => {
    if (hasRefreshedRef.current) return // 避免重复刷新
    hasRefreshedRef.current = true

    try {
      // 刷新所有积分相关的查询
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['points', 'balance'] }),
        queryClient.invalidateQueries({ queryKey: ['points', 'records'] }),
        queryClient.invalidateQueries({ queryKey: ['points', 'statistics'] }),
      ])
      
      // 更新积分余额到 store
      const balance = await pointsApi.getBalance()
      setBalance(balance)
    } catch (error) {
      console.error('刷新积分数据失败:', error)
    }
  }

  useEffect(() => {
    if (!orderUuid) {
      setOrderStatus('failed')
      return
    }

    // 等待认证完成后再开始查询
    if (authLoading) return

    // 立即查询一次订单状态
    checkOrderStatus()

    // 开始轮询，一直轮询直到订单状态变为最终状态（paid/failed/cancelled）
    pollIntervalRef.current = setInterval(() => {
      checkOrderStatus()
    }, 2000) // 每2秒轮询一次

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [orderUuid, authLoading])

  const checkOrderStatus = async () => {
    if (!orderUuid) return

    try {
      const orderData = await ordersApi.get(orderUuid)
      setOrder(orderData)

      if (orderData.status === 'paid' || orderData.status === 'completed') {
        setOrderStatus('success')
        // 停止轮询
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
        }
        // 支付成功后刷新积分数据
        await refreshPointsData()
        toast.success(t('payment.success', { default: '支付成功！积分已到账' }))
      } else if (orderData.status === 'failed' || orderData.status === 'cancelled' || orderData.status === 'refunded') {
        setOrderStatus('failed')
        // 停止轮询
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
        }
      } else {
        setOrderStatus('pending')
        // 继续轮询，不停止
      }
    } catch (error: any) {
      console.error('查询订单状态失败:', error)
      // 查询失败不停止轮询，继续尝试
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-white/10 bg-slate-800/50 backdrop-blur-xl">
        <CardHeader className="text-center">
          {orderStatus === 'loading' && (
            <>
              <Loader2 className="h-16 w-16 mx-auto mb-4 text-blue-500 animate-spin" />
              <CardTitle className="text-2xl">
                {t('payment.processing', { default: '正在处理支付...' })}
              </CardTitle>
            </>
          )}
          {orderStatus === 'pending' && (
            <>
              <Loader2 className="h-16 w-16 mx-auto mb-4 text-amber-500 animate-spin" />
              <CardTitle className="text-2xl">
                {t('payment.confirming', { default: '正在确认支付...' })}
              </CardTitle>
            </>
          )}
          {orderStatus === 'success' && (
            <>
              <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-500" />
              <CardTitle className="text-2xl text-green-400">
                {t('payment.successTitle', { default: '支付成功！' })}
              </CardTitle>
            </>
          )}
          {orderStatus === 'failed' && (
            <>
              <XCircle className="h-16 w-16 mx-auto mb-4 text-red-500" />
              <CardTitle className="text-2xl text-red-400">
                {t('payment.failedTitle', { default: '支付失败' })}
              </CardTitle>
            </>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {order && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">{t('payment.orderNumber', { default: '订单号' })}:</span>
                <span className="font-mono">{order.order_number}</span>
              </div>
              {order.points_amount && (
                <div className="flex justify-between">
                  <span className="text-gray-400">{t('payment.pointsAmount', { default: '积分数量' })}:</span>
                  <span className="font-semibold text-amber-400">{order.points_amount.toLocaleString()}</span>
                </div>
              )}
              {order.amount && (
                <div className="flex justify-between">
                  <span className="text-gray-400">{t('payment.amount', { default: '支付金额' })}:</span>
                  <span>
                    {order.currency === 'USD' 
                      ? `$${(order.amount / 100).toFixed(2)}`
                      : order.currency === 'CNY'
                      ? `¥${(order.amount / 100).toFixed(2)}`
                      : `${(order.amount / 100).toFixed(2)} ${order.currency}`}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2 pt-4">
            {orderStatus === 'success' && (
              <>
                <Button
                  asChild
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                >
                  <Link href={`/${locale}/points`}>
                    {t('payment.viewPoints', { default: '查看积分' })}
                  </Link>
                </Button>
                <Button variant="outline" asChild className="w-full">
                  <Link href={`/${locale}/workspace`}>
                    {t('payment.backToWorkspace', { default: '返回工作台' })}
                  </Link>
                </Button>
              </>
            )}
            {orderStatus === 'failed' && (
              <>
                <Button
                  asChild
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                >
                  <Link href={`/${locale}/pricing`}>
                    {t('payment.retryPayment', { default: '重新支付' })}
                  </Link>
                </Button>
                <Button variant="outline" asChild className="w-full">
                  <Link href={`/${locale}/workspace`}>
                    {t('payment.backToWorkspace', { default: '返回工作台' })}
                  </Link>
                </Button>
              </>
            )}
            {(orderStatus === 'loading' || orderStatus === 'pending') && (
              <Button variant="outline" asChild className="w-full">
                <Link href={`/${locale}/workspace`}>
                  {t('payment.backToWorkspace', { default: '返回工作台' })}
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

