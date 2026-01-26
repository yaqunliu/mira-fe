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
      <div className="space-y-8 text-center">
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-blue-500 rounded-full blur-lg opacity-50" />
            <div className="relative bg-gradient-to-br from-white to-blue-50 p-5 rounded-full shadow-[4px_4px_12px_rgba(0,0,0,0.1),-4px_-4px_12px_rgba(255,255,255,0.8)]">
              <Mail className="w-12 h-12 text-green-600" />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-2xl font-semibold text-gray-900">
            邮件已发送
          </h3>
          <p className="text-sm text-gray-600 max-w-md mx-auto">
            我们已向 <span className="font-medium text-gray-900">{submittedEmail}</span> 发送了密码重置链接
          </p>
          <p className="text-xs text-gray-500 pt-2 max-w-md mx-auto">
            请检查您的邮箱并点击链接重置密码。如果没有收到邮件，请检查垃圾邮件文件夹。
          </p>
        </div>

        <div className="pt-4 space-y-4">
          <button
            type="button"
            onClick={() => {
              setEmailSent(false)
              setSubmittedEmail('')
              form.reset()
            }}
            className="w-full py-3 rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200 text-gray-800 font-medium"
          >
            重新发送
          </button>

          <Link href={`/${locale}/auth/login`} className="block">
            <button
              type="button"
              className="w-full py-3 rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200 text-gray-800 font-medium flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              返回登录
            </button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3 text-center">
        <h3 className="text-2xl font-semibold text-gray-900">
          忘记密码？
        </h3>
        <p className="text-sm text-gray-600 max-w-md mx-auto">
          输入您的邮箱地址，我们将向您发送密码重置链接
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700 font-medium mb-2 block">邮箱</FormLabel>
                <FormControl>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    className="w-full h-12 px-4 rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[inset_2px_2px_6px_rgba(0,0,0,0.05),inset_-2px_-2px_6px_rgba(255,255,255,0.8)] focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-xs mt-1" />
              </FormItem>
            )}
          />

          <button
            type="submit"
            disabled={form.formState.isSubmitting}
            className={`w-full py-3 rounded-xl bg-gradient-to-br from-green-400 to-green-500 text-white font-medium shadow-[4px_4px_12px_rgba(0,0,0,0.1),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200 ${form.formState.isSubmitting ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {form.formState.isSubmitting ? '发送中...' : '发送重置链接'}
          </button>

          <Link href={`/${locale}/auth/login`} className="block">
            <button
              type="button"
              className="w-full py-3 rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200 text-gray-800 font-medium flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              返回登录
            </button>
          </Link>
        </form>
      </Form>
    </div>
  )
}
