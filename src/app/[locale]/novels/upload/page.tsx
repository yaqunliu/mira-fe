'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { novelUploadSchema, type NovelUploadFormData } from '@/lib/validations/novel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Progress } from '@/components/ui/progress'
import { novelApi } from '@/lib/api/novel'
import { toast } from 'sonner'
import { Upload, FileText, X, CheckCircle } from 'lucide-react'
import { formatFileSize } from '@/lib/utils'

export default function NovelUploadPage() {
  const router = useRouter()
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const form = useForm<NovelUploadFormData>({
    resolver: zodResolver(novelUploadSchema),
    defaultValues: {
      title: '',
      author: '',
      description: '',
    },
  })

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      // 验证文件类型
      if (!file.name.endsWith('.txt')) {
        toast.error('Please select a .txt file')
        return
      }
      
      // 验证文件大小 (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB')
        return
      }
      
      setSelectedFile(file)
      
      // 尝试从文件名提取标题
      const fileName = file.name.replace('.txt', '')
      if (fileName && !form.getValues('title')) {
        form.setValue('title', fileName)
      }
    }
  }

  const removeFile = () => {
    setSelectedFile(null)
    setUploadProgress(0)
  }

  const onSubmit = async (data: NovelUploadFormData) => {
    if (!selectedFile) {
      toast.error('Please select a file to upload')
      return
    }

    try {
      setIsUploading(true)
      setUploadProgress(0)

      const response = await novelApi.uploadNovel(selectedFile, {
        title: data.title,
        author: data.author,
        description: data.description,
      })

      if (response.success && response.data) {
        toast.success('Novel uploaded successfully!')
        router.push(`/novels/${response.data.id}`)
      } else {
        toast.error(response.message || 'Upload failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Upload Novel</h1>
        <p className="text-muted-foreground">
          Upload your novel and we'll automatically break it into chapters
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload Novel</CardTitle>
          <CardDescription>
            Select a .txt file containing your novel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 文件上传区域 */}
          <div
            onDrop={(e) => {
              e.preventDefault()
              onDrop(Array.from(e.dataTransfer.files))
            }}
            onDragOver={(e) => e.preventDefault()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              'border-muted-foreground/25 hover:border-primary/50'
            }`}
          >
            {selectedFile ? (
              <div className="space-y-4">
                <CheckCircle className="h-12 w-12 mx-auto text-green-600" />
                <div>
                  <p className="text-lg font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={removeFile}
                >
                  <X className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-lg font-medium">
                    Drag & drop your novel here
                  </p>
                  <p className="text-sm text-muted-foreground">
                    or click to select a .txt file
                  </p>
                </div>
                <Button type="button" variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Select File
                </Button>
              </div>
            )}
          </div>

          {/* 上传进度 */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          {/* 表单 */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Novel Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter novel title"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="author"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Author</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter author name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter novel description"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!selectedFile || isUploading}
                  className="flex-1"
                >
                  {isUploading ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}