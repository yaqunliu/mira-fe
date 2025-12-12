'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { toast } from 'sonner'
import { Mail, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const forgotPasswordSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

interface ForgotPasswordProps {
  locale?: string
}

export function ForgotPassword({ locale = 'zh' }: ForgotPasswordProps) {
  const [emailSent, setEmailSent] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')
  const supabase = createClient()

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      // Supabase 会自动处理邮件链接并重定向到这个 URL
      // URL 格式: /auth/reset-password#access_token=xxx&refresh_token=xxx&type=recovery
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/${locale}/auth/reset-password`,
      })

      if (error) throw error

      setEmailSent(true)
      setSubmittedEmail(data.email)
      toast.success('密码重置邮件已发送')
    } catch (error: any) {
      toast.error(error.message || '发送重置邮件失败，请稍后重试')
    }
  }

  if (emailSent) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-blue-500 rounded-full blur-lg opacity-50" />
            <div className="relative bg-white dark:bg-gray-900 p-4 rounded-full shadow-lg">
              <Mail className="w-12 h-12 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            邮件已发送
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            我们已向 <span className="font-medium text-gray-900 dark:text-gray-100">{submittedEmail}</span> 发送了密码重置链接
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 pt-2">
            请检查您的邮箱并点击链接重置密码。如果没有收到邮件，请检查垃圾邮件文件夹。
          </p>
        </div>

        <div className="pt-4 space-y-3">
          <Button
            type="button"
            variant="outline"
            className="w-full h-11"
            onClick={() => {
              setEmailSent(false)
              setSubmittedEmail('')
              form.reset()
            }}
          >
            重新发送
          </Button>

          <Link href={`/${locale}/auth/login`} className="block">
            <Button
              type="button"
              variant="ghost"
              className="w-full h-11 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回登录
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          忘记密码？
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          输入您的邮箱地址，我们将向您发送密码重置链接
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700 dark:text-gray-300 font-medium">邮箱</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    className="h-11 bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500/20 transition-all duration-200"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium shadow-lg shadow-blue-500/30 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/40"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? '发送中...' : '发送重置链接'}
          </Button>

          <Link href={`/${locale}/auth/login`} className="block">
            <Button
              type="button"
              variant="ghost"
              className="w-full h-11 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回登录
            </Button>
          </Link>
        </form>
      </Form>
    </div>
  )
}
