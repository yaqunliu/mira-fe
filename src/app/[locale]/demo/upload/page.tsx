'use client'

import { NovelUpload } from '@/components/business/novel-upload'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Upload, Zap, Shield } from 'lucide-react'

export default function UploadDemoPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">小说上传演示</h1>
        <p className="text-muted-foreground text-lg">
          支持大文件上传、分片处理、断点续传的智能上传组件
        </p>
      </div>

      {/* 功能特性 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">大文件支持</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              支持最大 100MB 的文件上传，自动分片处理，确保上传稳定性
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-600" />
              <CardTitle className="text-lg">断点续传</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              支持暂停、恢复上传，网络中断后可从断点继续，避免重复上传
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg">安全可靠</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              分片上传，自动重试机制，确保文件完整性和上传成功率
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* 技术规格 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            技术规格
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">上传配置</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>分片大小：1MB</div>
                <div>最大文件：100MB</div>
                <div>重试次数：3次</div>
                <div>支持格式：.txt</div>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">功能特性</h4>
              <div className="flex flex-wrap gap-1">
                <Badge variant="secondary">拖拽上传</Badge>
                <Badge variant="secondary">进度显示</Badge>
                <Badge variant="secondary">速度监控</Badge>
                <Badge variant="secondary">时间估算</Badge>
                <Badge variant="secondary">暂停恢复</Badge>
                <Badge variant="secondary">自动重试</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 上传组件 */}
      <NovelUpload />
    </div>
  )
}
