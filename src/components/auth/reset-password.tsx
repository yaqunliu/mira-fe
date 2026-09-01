'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, CheckCircle2, Loader2 } from 'lucide-react'
import Link from 'next/link'

const resetPasswordSchema = z.object({
  password: z.string().min(6, '密码至少需要6个字符'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword'],
})

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

export function ResetPassword() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [hasValidSession, setHasValidSession] = useState(false)
  const supabase = createClient()

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  // 检查是否有有效的重置密码 session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Session check error:', error)
          setHasValidSession(false)
        } else if (session) {
          // 有 session 说明用户已经通过邮件链接验证
          setHasValidSession(true)
        } else {
          setHasValidSession(false)
        }
      } catch (error) {
        console.error('Error checking session:', error)
        setHasValidSession(false)
      } finally {
        setIsCheckingSession(false)
      }
    }

    checkSession()
  }, [])

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      })

      if (error) throw error

      setResetSuccess(true)
      toast.success('密码重置成功')

      // 3秒后跳转到登录页
      setTimeout(() => {
        router.push('/auth/login')
      }, 3000)
    } catch (error: any) {
      toast.error(error.message || '密码重置失败，请重试')
    }
  }

  // 正在检查 session
  if (isCheckingSession) {
    return (
      <div className="space-y-8 text-center">
        <div className="flex justify-center">
          <div className="bg-gradient-to-br from-white to-blue-50 p-6 rounded-full shadow-[4px_4px_12px_rgba(0,0,0,0.1),-4px_-4px_12px_rgba(255,255,255,0.8)]">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          </div>
        </div>
        <div className="space-y-3">
          <h3 className="text-2xl font-semibold text-gray-900">
            正在验证...
          </h3>
          <p className="text-sm text-gray-600 max-w-md mx-auto">
            请稍候，我们正在验证您的重置请求
          </p>
        </div>
      </div>
    )
  }

  // 没有有效的 session
  if (!hasValidSession) {
    return (
      <div className="space-y-8 text-center">
        <div className="space-y-3">
          <h3 className="text-2xl font-semibold text-gray-900">
            无效的重置链接
          </h3>
          <p className="text-sm text-gray-600 max-w-md mx-auto">
            密码重置链接已过期或无效，请重新申请密码重置
          </p>
        </div>

        <div className="space-y-4">
          <Link href={'/auth/forgot-password'} className="block">
            <button
              type="button"
              className="w-full py-3 rounded-xl bg-gradient-to-br from-green-400 to-green-500 text-white font-medium shadow-[4px_4px_12px_rgba(0,0,0,0.1),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200"
            >
              重新申请密码重置
            </button>
          </Link>

          <Link href={'/auth/login'} className="block">
            <button
              type="button"
              className="w-full py-3 rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200 text-gray-800 font-medium"
            >
              返回登录
            </button>
          </Link>
        </div>
      </div>
    )
  }

  // 重置成功
  if (resetSuccess) {
    return (
      <div className="space-y-8 text-center">
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-blue-500 rounded-full blur-lg opacity-50" />
            <div className="relative bg-gradient-to-br from-white to-blue-50 p-5 rounded-full shadow-[4px_4px_12px_rgba(0,0,0,0.1),-4px_-4px_12px_rgba(255,255,255,0.8)]">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-2xl font-semibold text-gray-900">
            密码重置成功
          </h3>
          <p className="text-sm text-gray-600 max-w-md mx-auto">
            您的密码已成功更新
          </p>
          <p className="text-xs text-gray-500 pt-2 max-w-md mx-auto">
            页面将在 3 秒后自动跳转到登录页面...
          </p>
        </div>

        <Link href={'/auth/login'} className="block">
          <button
            type="button"
            className="w-full py-3 rounded-xl bg-gradient-to-br from-green-400 to-green-500 text-white font-medium shadow-[4px_4px_12px_rgba(0,0,0,0.1),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200"
          >
            立即登录
          </button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3 text-center">
        <h3 className="text-2xl font-semibold text-gray-900">
          设置新密码
        </h3>
        <p className="text-sm text-gray-600 max-w-md mx-auto">
          请输入您的新密码
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700 font-medium mb-2 block">新密码</FormLabel>
                <FormControl>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="请输入新密码（至少6个字符）"
                      className="w-full h-12 px-4 pr-12 rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[inset_2px_2px_6px_rgba(0,0,0,0.05),inset_-2px_-2px_6px_rgba(255,255,255,0.8)] focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-0 top-0 h-full px-4 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors duration-200"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage className="text-xs mt-1" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700 font-medium mb-2 block">确认新密码</FormLabel>
                <FormControl>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="请再次输入新密码"
                      className="w-full h-12 px-4 pr-12 rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[inset_2px_2px_6px_rgba(0,0,0,0.05),inset_-2px_-2px_6px_rgba(255,255,255,0.8)] focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-0 top-0 h-full px-4 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors duration-200"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
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
            {form.formState.isSubmitting ? '重置中...' : '重置密码'}
          </button>
        </form>
      </Form>
    </div>
  )
}
