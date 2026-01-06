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
    router.push(`/${locale}/scripts`)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('uploadNovel')}</h1>
        <p className="text-muted-foreground">
          上传您的小说，我们将自动拆分成章节
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('uploadNovel')}</CardTitle>
          <CardDescription>
            选择包含小说内容的 .txt 文件
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NovelUpload onComplete={handleComplete} />
        </CardContent>
      </Card>
    </div>
  )
}