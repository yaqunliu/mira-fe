'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { XCircle } from 'lucide-react'
import Link from 'next/link'

export default function PaymentCancelPage() {
  const t = useTranslations()
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50/80 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-0 shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)] bg-white/90 backdrop-blur-sm">
        <CardHeader className="text-center">
          <XCircle className="h-16 w-16 mx-auto mb-4 text-amber-500" />
          <CardTitle className="text-2xl bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">
            {t('payment.cancelledTitle', { default: '支付已取消' })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-gray-600">
            {t('payment.cancelledMessage', { default: '您已取消支付，订单未完成。您可以随时返回继续购买。' })}
          </p>

          <div className="flex flex-col gap-2 pt-4">
            <Button
              asChild
              className="w-full bg-gradient-to-r from-[#FDBCB4] to-[#F9A899] hover:from-[#F9A899] hover:to-[#FDBCB4] text-white font-medium shadow-md hover:shadow-lg transition-all duration-300"
            >
              <Link href={'/pricing'}>
                {t('payment.backToPricing', { default: '返回套餐页面' })}
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full border-gray-200 text-gray-700 hover:bg-gray-50">
              <Link href={'/workspace'}>
                {t('payment.backToWorkspace', { default: '返回工作台' })}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

