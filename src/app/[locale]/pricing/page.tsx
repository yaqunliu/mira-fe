'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { productsApi, type Product } from '@/lib/api/products'
import { ordersApi } from '@/lib/api/orders'
import { subscriptionsApi, type Subscription } from '@/lib/api/subscriptions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Sparkles, ShieldCheck, Clock, ArrowUpRight, Coins, Repeat, Loader2, CheckCircle2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAuthStore } from '@/stores/auth'

const FALLBACK_ONETIME: Product[] = [
  { uuid: 'fallback-1', product_id: 0, name: '8,000 Credits', price: 1990, currency: 'USD', billing_type: 'onetime', points_amount: 8000, status: 'active' },
  { uuid: 'fallback-2', product_id: 0, name: '20,000 Credits', price: 3990, currency: 'USD', billing_type: 'onetime', points_amount: 20000, status: 'active' },
  { uuid: 'fallback-3', product_id: 0, name: '120,000 Credits', price: 9990, currency: 'USD', billing_type: 'onetime', points_amount: 120000, status: 'active' },
]

const FALLBACK_SUBS: Product[] = [
  { uuid: 'fallback-month', product_id: 0, name: 'Monthly · 20,000 credits/mo', price: 3990, currency: 'USD', billing_type: 'recurring', billing_period: 'every-month', points_amount: 20000, status: 'active' },
  { uuid: 'fallback-quarter', product_id: 0, name: 'Quarterly · 25,000 credits/mo', price: 11990, currency: 'USD', billing_type: 'recurring', billing_period: 'every-month', points_amount: 25000, status: 'active' },
  { uuid: 'fallback-year', product_id: 0, name: 'Yearly · 30,000 credits/mo', price: 39900, currency: 'USD', billing_type: 'recurring', billing_period: 'every-month', points_amount: 30000, status: 'active' },
]

function formatPrice(cents: number, currency = 'USD') {
  if (currency === 'USD') {
    return `$${(cents / 100).toFixed(2)}`
  } else if (currency === 'CNY') {
    return `¥${(cents / 100).toFixed(2)}`
  } else {
    return `${(cents / 100).toFixed(2)} ${currency}`
  }
}

function PriceCard({
  product,
  highlight,
  onPurchase,
  t,
  isLoading,
  hasActiveSubscription,
}: {
  product: Product
  highlight?: string
  onPurchase: (p: Product) => void
  t: any
  isLoading?: boolean
  hasActiveSubscription?: boolean
}) {
  return (
    <Card className="group relative flex flex-col h-full overflow-hidden border-0 bg-white shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)] transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
      <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_20%_20%,rgba(253,188,180,0.12),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(173,221,230,0.18),transparent_25%),radial-gradient(circle_at_50%_80%,rgba(253,188,180,0.18),transparent_30%)] group-hover:opacity-60 transition-opacity duration-300" />
      {highlight && (
        <Badge className="absolute right-4 top-4 bg-gradient-to-r from-[#FDBCB4] to-[#F9A899] text-white shadow-md animate-pulse z-10">{highlight}</Badge>
      )}
      <CardHeader className="relative space-y-2 flex-shrink-0">
        <CardTitle className="text-xl font-bold bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[#FDBCB4] group-hover:animate-spin" />
          {product.name}
        </CardTitle>
        <div className="text-3xl font-extrabold text-gray-800">
          {formatPrice(product.price, product.currency)}
          {product.billing_type === 'recurring' && (
            <span className="text-sm text-gray-500 ml-1">
              / {product.billing_period === 'every-year'
                ? t('pricing.year')
                : product.billing_period === 'every-quarter'
                ? t('pricing.quarter')
                : t('pricing.month')}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600">
          {product.billing_type === 'onetime'
            ? `${product.points_amount.toLocaleString()} ${t('pricing.points')} · ${t('pricing.instantDelivery')}`
            : `${product.points_amount.toLocaleString()} ${t('pricing.points')} / ${t('pricing.month')} · ${t('pricing.autoDelivery')}`}
        </p>
      </CardHeader>
      <CardContent className="relative flex flex-col flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto mb-3">
          {product.description ? (
            <div className="prose prose-sm max-w-none text-gray-700 [&>*]:text-gray-700 [&>ul]:list-disc [&>ul]:ml-4 [&>ul]:space-y-1 [&>ol]:list-decimal [&>ol]:ml-4 [&>ol]:space-y-1 [&>p]:text-gray-600 [&>p]:text-sm [&>h1]:text-gray-800 [&>h2]:text-gray-800 [&>h3]:text-gray-800 [&>h4]:text-gray-800 [&>strong]:text-gray-800 [&>a]:text-[#FDBCB4] [&>a]:hover:text-[#F9A899]">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {product.description}
              </ReactMarkdown>
            </div>
          ) : (
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#FDBCB4]" />
                {t('pricing.feature1')}
              </li>
              <li className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#ADD8E6]" />
                {t('pricing.feature2')}
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#22C55E]" />
                {t('pricing.feature3')}
              </li>
            </ul>
          )}
        </div>
        {hasActiveSubscription && product.billing_type === 'recurring' ? (
          <Button
            className="w-full flex-shrink-0 bg-gradient-to-r from-[#22C55E] to-[#16A34A] hover:from-[#16A34A] hover:to-[#22C55E] text-white transition-all duration-300 hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
            disabled
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {t('pricing.alreadySubscribed')}
          </Button>
        ) : (
          <Button
            className="w-full flex-shrink-0 bg-gradient-to-r from-[#FDBCB4] to-[#F9A899] hover:from-[#F9A899] hover:to-[#FDBCB4] text-white transition-all duration-300 hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
            onClick={() => onPurchase(product)}
            disabled={isLoading}
          >
            {product.billing_type === 'onetime'
              ? t('pricing.buyNow')
              : t('pricing.subscribeNow')}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export default function PricingPage() {
  const t = useTranslations()
  const [tab, setTab] = useState<'onetime' | 'recurring'>('recurring')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { isAuthenticated } = useAuthStore()

  // 海外交付：商品目录固定取英文分区（对应 Creem 支付）。
  const language = 'en'
  
  const { data: onetimeData, isLoading: loadingOnetime, error: onetimeError } = useQuery({
    queryKey: ['products', 'onetime', language],
    queryFn: () => productsApi.list({ language, billing_type: 'onetime', status: 'active', page_size: 50 }),
    retry: 1,
  })
  const { data: subsData, isLoading: loadingSubs, error: subsError } = useQuery({
    queryKey: ['products', 'recurring', language],
    queryFn: () => productsApi.list({ language, billing_type: 'recurring', status: 'active', page_size: 50 }),
    retry: 1,
  })
  
  // 查询用户当前活跃订阅
  const { data: activeSubscriptions, isLoading: loadingSubscriptions } = useQuery({
    queryKey: ['subscriptions', 'active'],
    queryFn: () => subscriptionsApi.getActive(),
    enabled: isAuthenticated, // 只有登录用户才查询
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5分钟内不重新请求
  })
  
  // 调试：打印错误信息
  if (onetimeError) {
    console.error('获取一次性产品列表失败:', onetimeError)
  }
  if (subsError) {
    console.error('获取订阅产品列表失败:', subsError)
  }

  const onetimeProducts = useMemo(() => {
    const data = onetimeData as any
    return data?.items || data?.data?.items || FALLBACK_ONETIME
  }, [onetimeData])
  const subsProducts = useMemo(() => {
    const data = subsData as any
    return data?.items || data?.data?.items || FALLBACK_SUBS
  }, [subsData])
  
  // 创建产品UUID到订阅的映射，用于快速查找
  const productSubscriptionMap = useMemo(() => {
    if (!activeSubscriptions) return new Map<string, Subscription>()
    const map = new Map<string, Subscription>()
    activeSubscriptions.forEach((sub) => {
      if (sub.product?.uuid) {
        map.set(sub.product.uuid, sub)
      }
    })
    return map
  }, [activeSubscriptions])

  const handlePurchase = async (product: Product) => {
    setIsSubmitting(true)
    try {
      // 先创建订单，获取order_uuid
      const order = await ordersApi.create({
        product_uuid: product.uuid,
        order_type: product.billing_type === 'onetime' ? 'onetime' : 'subscription',
        success_url: `${window.location.origin}/payment/success`,
        cancel_url: `${window.location.origin}/payment/cancel`,
        metadata: {},
      })
      
      
      // 海外交付只走 Creem。后端若仍返回 wechat，视为无可用支付链接。
      if (order.payment_method === 'creem' && order.payment_info?.checkout_url) {
        window.location.href = order.payment_info.checkout_url
      } else {
        toast.error(t('pricing.errorNoCheckoutUrl'))
      }
    } catch (error: any) {
      toast.error(error?.message || t('pricing.errorCreateOrder'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50/80">
      {isSubmitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-xl bg-white shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)] px-4 py-3 text-gray-800">
            <Loader2 className="h-5 w-5 animate-spin text-[#FDBCB4]" />
            <span>{t('pricing.processing')}</span>
          </div>
        </div>
      )}
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="mb-10 flex flex-col gap-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#FDBCB4]/20 px-3 py-1 text-xs text-[#F9A899] border border-[#FDBCB4]/30">
            <Sparkles className="h-4 w-4" />
            {t('pricing.title')}
          </div>
          <div>
            <h1 className="text-3xl font-bold leading-tight md:text-4xl bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">
              {t('pricing.headline')}
            </h1>
            <p className="mt-2 text-gray-600">
              {t('pricing.subtitle')}
            </p>
          </div>
        </div>

        {/* 居中显示的 Tab 切换，带动态效果 */}
        <div className="flex justify-center mb-8">
          <div className="relative inline-flex items-center gap-1 p-1.5 rounded-2xl bg-white shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)] w-full max-w-md">
            <button
              onClick={() => setTab('recurring')}
              className={`relative z-10 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-300 flex-1 min-w-0 ${
                tab === 'recurring'
                  ? 'text-gray-800 shadow-md'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Repeat className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{t('pricing.tabSubscription')}</span>
            </button>
            <button
              onClick={() => setTab('onetime')}
              className={`relative z-10 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-300 flex-1 min-w-0 ${
                tab === 'onetime'
                  ? 'text-gray-800 shadow-md'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Coins className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{t('pricing.tabOnetime')}</span>
            </button>
            {/* 动态背景指示器 */}
            <div
              className={`absolute top-1.5 bottom-1.5 rounded-xl bg-gradient-to-r from-[#FDBCB4]/30 to-[#F9A899]/30 shadow-sm transition-all duration-300 ease-out ${
                tab === 'recurring' ? 'left-1.5 right-1/2' : 'left-1/2 right-1.5'
              }`}
            />
          </div>
        </div>

        {/* Tab 内容 */}
        {tab === 'recurring' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {loadingSubs ? (
              <div className="grid gap-4 md:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-64 w-full rounded-2xl bg-white shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]">
                    <div className="h-full w-full animate-pulse rounded-2xl bg-gradient-to-r from-[#FDBCB4]/20 to-[#ADD8E6]/20" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-3 items-stretch">
                {subsProducts.map((p: Product, idx: number) => (
                  <PriceCard
                    key={p.uuid || idx}
                    product={p}
                    highlight={
                      idx === 0
                        ? t('pricing.recommended')
                        : idx === 2
                        ? t('pricing.yearSave')
                        : undefined
                    }
                    onPurchase={handlePurchase}
                    t={t}
                    isLoading={isSubmitting}
                    hasActiveSubscription={!!productSubscriptionMap.get(p.uuid)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {loadingOnetime ? (
              <div className="grid gap-4 md:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-64 w-full rounded-2xl bg-white shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]">
                    <div className="h-full w-full animate-pulse rounded-2xl bg-gradient-to-r from-[#FDBCB4]/20 to-[#ADD8E6]/20" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-3 items-stretch">
                {onetimeProducts.map((p: Product, idx: number) => (
                  <PriceCard
                    key={p.uuid || idx}
                    product={p}
                    highlight={idx === 1 ? t('pricing.popular') : undefined}
                    onPurchase={handlePurchase}
                    t={t}
                    isLoading={isSubmitting}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}