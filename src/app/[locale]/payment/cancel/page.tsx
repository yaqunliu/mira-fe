'use client'

import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { XCircle } from 'lucide-react'
import Link from 'next/link'

export default function PaymentCancelPage() {
  const t = useTranslations()
  const params = useParams()
  const router = useRouter()
  const locale = (params?.locale as string) || 'zh'

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-white/10 bg-slate-800/50 backdrop-blur-xl">
        <CardHeader className="text-center">
          <XCircle className="h-16 w-16 mx-auto mb-4 text-amber-500" />
          <CardTitle className="text-2xl text-amber-400">
            {t('payment.cancelledTitle', { default: '支付已取消' })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-gray-400">
            {t('payment.cancelledMessage', { default: '您已取消支付，订单未完成。您可以随时返回继续购买。' })}
          </p>

          <div className="flex flex-col gap-2 pt-4">
            <Button
              asChild
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
            >
              <Link href={`/${locale}/pricing`}>
                {t('payment.backToPricing', { default: '返回套餐页面' })}
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href={`/${locale}/workspace`}>
                {t('payment.backToWorkspace', { default: '返回工作台' })}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

