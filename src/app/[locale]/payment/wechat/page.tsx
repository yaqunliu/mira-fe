'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter, useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ordersApi } from '@/lib/api/orders'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import QRCode from 'qrcode'
import Image from 'next/image'

export default function WechatPaymentPage() {
  const t = useTranslations()
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const locale = (params?.locale as string) || 'zh'
  
  const codeUrl = searchParams?.get('code_url')
  const orderUuid = searchParams?.get('order_uuid')
  const [orderStatus, setOrderStatus] = useState<'pending' | 'paid' | 'failed'>('pending')
  const [polling, setPolling] = useState(false)
  const [order, setOrder] = useState<any>(null)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')

  // 获取订单信息
  useEffect(() => {
    if (!orderUuid) return
    
    const fetchOrder = async () => {
      try {
        const orderData = await ordersApi.get(orderUuid)
        setOrder(orderData)
      } catch (error) {
        console.error('获取订单信息失败:', error)
      }
    }
    
    fetchOrder()
  }, [orderUuid])

  // 轮询订单状态
  useEffect(() => {
    if (!orderUuid) return
    
    let interval: NodeJS.Timeout | null = null
    
    const pollOrderStatus = async () => {
      try {
        const orderData = await ordersApi.get(orderUuid)
        if (orderData.status === 'paid' || orderData.status === 'completed') {
          setOrderStatus('paid')
          setPolling(false)
          // 停止轮询
          if (interval) {
            clearInterval(interval)
            interval = null
          }
          // 跳转到成功页面
          setTimeout(() => {
            router.push(`/${locale}/payment/success?order_uuid=${orderUuid}`)
          }, 2000)
        } else if (orderData.status === 'failed' || orderData.status === 'cancelled' || orderData.status === 'refunded') {
          setOrderStatus('failed')
          setPolling(false)
          // 停止轮询
          if (interval) {
            clearInterval(interval)
            interval = null
          }
        } else {
          // 订单还在 pending 状态，继续轮询
          setPolling(true)
        }
      } catch (error) {
        console.error('查询订单状态失败:', error)
        // 查询失败不停止轮询，继续尝试
      }
    }

    // 立即查询一次
    pollOrderStatus()
    
    // 每3秒轮询一次，一直轮询直到订单状态变为最终状态
    interval = setInterval(pollOrderStatus, 3000)
    setPolling(true)

    return () => {
      if (interval) {
        clearInterval(interval)
        interval = null
      }
      setPolling(false)
    }
  }, [orderUuid, locale, router])

  if (!codeUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <p className="text-center text-red-500">缺少支付二维码链接</p>
        </div>
      </div>
    )
  }

  // 格式化金额
  const formatAmount = (amount: number, currency: string) => {
    if (currency === 'CNY') {
      return `¥${(amount / 100).toFixed(2)}`
    } else if (currency === 'USD') {
      return `$${(amount / 100).toFixed(2)}`
    }
    return `${(amount / 100).toFixed(2)} ${currency}`
  }

  // 根据内容长度计算二维码大小（符合微信支付标准）
  // 表2：二维码边长对应的内容长度要求
  // 2-3cm: ≤30字符, 3-4cm: ≤50字符, 4-6cm: ≤80字符, 6cm以上: ≤100字符
  // 屏幕显示分辨率计算：
  // - 72dpi: 1cm = 28.35px
  // - 96dpi: 1cm = 37.8px (现代屏幕常用)
  // 为确保清晰度，我们使用 96dpi 标准，并适当放大以确保扫描识别
  const getQRCodeSize = (contentLength: number): number => {
    // 根据内容长度选择合适的大小（基于96dpi，确保≥72dpi要求）
    if (contentLength <= 30) {
      // 2-3cm: 76-113px (96dpi)，使用 150px 确保清晰
      return 150
    } else if (contentLength <= 50) {
      // 3-4cm: 113-151px (96dpi)，使用 200px 确保清晰
      return 200
    } else if (contentLength <= 80) {
      // 4-6cm: 151-227px (96dpi)，使用 280px 确保清晰
      return 280
    } else {
      // 6cm以上: ≥227px (96dpi)，使用 320px 确保清晰
      return 320
    }
  }

  // 获取容错等级（屏幕显示使用低容错等级 L）
  // L: 7%, M: 15%, Q: 25%, H: 30%
  // 屏幕显示建议使用 L 等级
  const getErrorCorrectionLevel = (): 'L' | 'M' | 'Q' | 'H' => {
    return 'L' // 屏幕显示使用低容错等级
  }

  // 生成二维码
  useEffect(() => {
    if (!codeUrl) return

    const codeUrlLength = codeUrl.length
    const qrSize = getQRCodeSize(codeUrlLength)
    const errorLevel = getErrorCorrectionLevel()

    // 使用 qrcode 库生成二维码
    QRCode.toDataURL(
      codeUrl,
      {
        width: qrSize,
        margin: 2, // 边距
        color: {
          dark: '#000000', // 前景色（黑色）
          light: '#FFFFFF', // 背景色（白色）
        },
        errorCorrectionLevel: errorLevel,
        type: 'image/png',
        quality: 1.0,
        rendererOpts: {
          quality: 1.0,
        },
      },
      (err: Error | null | undefined, url: string) => {
        if (err) {
          console.error('生成二维码失败:', err)
          return
        }
        setQrCodeDataUrl(url)
      }
    )
  }, [codeUrl])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl font-bold text-black">Mira-猩猩科技</div>
              <div className="text-lg text-black">收银台</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600 mb-1">
                {order?.order_number && (
                  <div>订单编号: {order.order_number}</div>
                )}
                {order?.order_type && (
                  <div>订单类型: {order.order_type === 'onetime' ? '一次性支付' : '订阅支付'}</div>
                )}
              </div>
              <div className="text-xl font-semibold text-black mt-2">
                应付金额: {order ? formatAmount(order.amount, order.currency) : '¥0.00'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Payment Method Tab */}
          <div className="bg-gray-100 px-6 py-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="px-4 py-2 bg-white rounded-t-lg border-b-2 border-green-500">
                  <span className="text-base font-medium text-black">微信支付</span>
                </div>
                <div className="absolute -top-2 -right-2">
                  <Image
                    src="/wechat-pay-tab-label.png"
                    alt="Recommended"
                    width={40}
                    height={20}
                    className="object-contain"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Payment Content */}
          <div className="p-8">
            <div className="flex flex-col items-center space-y-6">
              {/* WeChat Pay Logo and Title */}
              <div className="flex items-center gap-3">
                <Image
                  src="/wechat-pay-green-logo.png"
                  alt="WeChat Pay"
                  width={40}
                  height={40}
                  className="object-contain"
                />
                <span className="text-xl font-medium text-black">微信支付</span>
              </div>

              {/* QR Code */}
              <div className="bg-white p-6 rounded-lg border-2 border-gray-200">
                {qrCodeDataUrl ? (
                  <img 
                    src={qrCodeDataUrl} 
                    alt="微信支付二维码" 
                    className="w-full h-auto"
                    style={{ 
                      imageRendering: 'crisp-edges', // 确保清晰度
                      maxWidth: '100%',
                      height: 'auto'
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center" style={{ width: 280, height: 280 }}>
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                  </div>
                )}
              </div>

              {/* Instruction */}
              <div className="flex items-center gap-2 bg-blue-50 px-4 py-3 rounded-lg border border-blue-200">
                <Image
                  src="/wechat-pay-instruction.png"
                  alt="Instruction"
                  width={24}
                  height={24}
                  className="object-contain"
                />
                <span className="text-sm text-gray-700">
                  请使用微信扫描二维码以完成支付
                </span>
              </div>

              {/* Status Messages */}
              {polling && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>等待支付确认...</span>
                </div>
              )}

              {orderStatus === 'paid' && (
                <div className="text-center text-green-600 font-medium">
                  支付成功！正在跳转...
                </div>
              )}

              {orderStatus === 'failed' && (
                <div className="text-center text-red-600 font-medium">
                  支付失败或已取消
                </div>
              )}

              {/* Back Button */}
              <Button
                variant="outline"
                onClick={() => router.push(`/${locale}/pricing`)}
                className="mt-4 border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900 hover:border-gray-400 bg-white"
              >
                返回产品页面
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
