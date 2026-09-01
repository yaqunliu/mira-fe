'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
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
  const router = useRouter()
  const searchParams = useSearchParams()
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
        toast.success(t('payment.success'))
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
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50/80 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-0 shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)] bg-white/90 backdrop-blur-sm">
        <CardHeader className="text-center">
          {orderStatus === 'loading' && (
            <>
              <Loader2 className="h-16 w-16 mx-auto mb-4 text-blue-500 animate-spin" />
              <CardTitle className="text-2xl bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">
                {t('payment.processing')}
              </CardTitle>
            </>
          )}
          {orderStatus === 'pending' && (
            <>
              <Loader2 className="h-16 w-16 mx-auto mb-4 text-amber-500 animate-spin" />
              <CardTitle className="text-2xl bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">
                {t('payment.confirming')}
              </CardTitle>
            </>
          )}
          {orderStatus === 'success' && (
            <>
              <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-[#22C55E]" />
              <CardTitle className="text-2xl text-[#22C55E]">
                {t('payment.successTitle')}
              </CardTitle>
            </>
          )}
          {orderStatus === 'failed' && (
            <>
              <XCircle className="h-16 w-16 mx-auto mb-4 text-red-500" />
              <CardTitle className="text-2xl text-red-500">
                {t('payment.failedTitle')}
              </CardTitle>
            </>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {order && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('payment.orderNumber')}:</span>
                <span className="font-mono text-gray-800">{order.order_number}</span>
              </div>
              {order.points_amount && (
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('payment.pointsAmount')}:</span>
                  <span className="font-semibold text-[#22C55E]">{order.points_amount.toLocaleString()}</span>
                </div>
              )}
              {order.amount && (
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('payment.amount')}:</span>
                  <span className="text-gray-800">
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
                  className="w-full bg-gradient-to-r from-[#FDBCB4] to-[#F9A899] hover:from-[#F9A899] hover:to-[#FDBCB4] text-white font-medium shadow-md hover:shadow-lg transition-all duration-300"
                >
                  <Link href={'/points'}>
                    {t('payment.viewPoints')}
                  </Link>
                </Button>
                <Button variant="outline" asChild className="w-full border-gray-200 text-gray-700 hover:bg-gray-50">
                  <Link href={'/workspace'}>
                    {t('payment.backToWorkspace')}
                  </Link>
                </Button>
              </>
            )}
            {orderStatus === 'failed' && (
              <>
                <Button
                  asChild
                  className="w-full bg-gradient-to-r from-[#FDBCB4] to-[#F9A899] hover:from-[#F9A899] hover:to-[#FDBCB4] text-white font-medium shadow-md hover:shadow-lg transition-all duration-300"
                >
                  <Link href={'/pricing'}>
                    {t('payment.retryPayment')}
                  </Link>
                </Button>
                <Button variant="outline" asChild className="w-full border-gray-200 text-gray-700 hover:bg-gray-50">
                  <Link href={'/workspace'}>
                    {t('payment.backToWorkspace')}
                  </Link>
                </Button>
              </>
            )}
            {(orderStatus === 'loading' || orderStatus === 'pending') && (
              <Button variant="outline" asChild className="w-full border-gray-200 text-gray-700 hover:bg-gray-50">
                <Link href={'/workspace'}>
                  {t('payment.backToWorkspace')}
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

