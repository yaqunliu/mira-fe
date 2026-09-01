'use client'

import { useRouter, useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { NovelUpload } from '@/components/business/novel-upload'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function NovelUploadPage() {
  const router = useRouter()
  const params = useParams()
  const locale = params?.locale as string
  const t = useTranslations('novel')

  const handleComplete = (novelId: string) => {
    // 上传完成后跳转到小说列表页面
    router.push('/scripts')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50/50 via-white to-gray-100/30 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">{t('uploadNovel')}</h1>
          <p className="bg-gradient-to-r from-gray-500 to-gray-700 bg-clip-text text-transparent">
            {t('upload.description')}
          </p>
        </div>

        <div className="rounded-2xl shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)] bg-gradient-to-br from-white to-gray-50/80 p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent mb-2">{t('uploadNovel')}</h2>
            <p className="bg-gradient-to-r from-gray-500 to-gray-700 bg-clip-text text-transparent">
              {t('upload.cardDescription')}
            </p>
          </div>
          <NovelUpload onComplete={handleComplete} />
        </div>
      </div>
    </div>
  )
}