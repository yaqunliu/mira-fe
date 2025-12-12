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

interface ResetPasswordProps {
  locale?: string
}

export function ResetPassword({ locale = 'zh' }: ResetPasswordProps) {
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
        router.push(`/${locale}/auth/login`)
      }, 3000)
    } catch (error: any) {
      toast.error(error.message || '密码重置失败，请重试')
    }
  }

  // 正在检查 session
  if (isCheckingSession) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <Loader2 className="w-12 h-12 text-blue-600 dark:text-blue-400 animate-spin" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            正在验证...
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            请稍候，我们正在验证您的重置请求
          </p>
        </div>
      </div>
    )
  }

  // 没有有效的 session
  if (!hasValidSession) {
    return (
      <div className="space-y-6 text-center">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            无效的重置链接
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            密码重置链接已过期或无效，请重新申请密码重置
          </p>
        </div>

        <Link href={`/${locale}/auth/forgot-password`} className="block">
          <Button
            type="button"
            className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium shadow-lg shadow-blue-500/30 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/40"
          >
            重新申请密码重置
          </Button>
        </Link>

        <Link href={`/${locale}/auth/login`} className="block">
          <Button
            type="button"
            variant="ghost"
            className="w-full h-11 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            返回登录
          </Button>
        </Link>
      </div>
    )
  }

  // 重置成功
  if (resetSuccess) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-blue-500 rounded-full blur-lg opacity-50" />
            <div className="relative bg-white dark:bg-gray-900 p-4 rounded-full shadow-lg">
              <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            密码重置成功
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            您的密码已成功更新
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 pt-2">
            页面将在 3 秒后自动跳转到登录页面...
          </p>
        </div>

        <Link href={`/${locale}/auth/login`} className="block">
          <Button
            type="button"
            className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium shadow-lg shadow-blue-500/30 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/40"
          >
            立即登录
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          设置新密码
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          请输入您的新密码
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700 dark:text-gray-300 font-medium">新密码</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="请输入新密码（至少6个字符）"
                      className="h-11 bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500/20 transition-all duration-200 pr-10"
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700 dark:text-gray-300 font-medium">确认新密码</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="请再次输入新密码"
                      className="h-11 bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500/20 transition-all duration-200 pr-10"
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
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
            {form.formState.isSubmitting ? '重置中...' : '重置密码'}
          </Button>
        </form>
      </Form>
    </div>
  )
}
