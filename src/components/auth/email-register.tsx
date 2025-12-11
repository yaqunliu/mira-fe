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
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'

const emailRegisterSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(6, '密码至少需要6个字符'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword'],
})

type EmailRegisterFormData = z.infer<typeof emailRegisterSchema>

interface EmailRegisterProps {
  locale?: string
  onSuccess?: () => void
}

export function EmailRegister({ locale = 'zh', onSuccess }: EmailRegisterProps) {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [emailValidated, setEmailValidated] = useState(false)
  const [validatedEmail, setValidatedEmail] = useState('')
  const supabase = createClient()
  
  // 第一步：邮箱验证表单
  const emailForm = useForm<{ email: string }>({
    resolver: zodResolver(z.object({ email: z.string().email('请输入有效的邮箱地址') })),
    defaultValues: {
      email: '',
    },
  })

  // 第二步：密码注册表单
  const passwordForm = useForm<EmailRegisterFormData>({
    resolver: zodResolver(emailRegisterSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  // 验证邮箱
  const onEmailSubmit = async (data: { email: string }) => {
    const result = z.string().email().safeParse(data.email)
    if (result.success) {
      setEmailValidated(true)
      setValidatedEmail(data.email)
      passwordForm.setValue('email', data.email)
    }
  }

  // 提交注册
  const onPasswordSubmit = async (data: EmailRegisterFormData) => {
    try {
      // 使用 Supabase 邮箱注册
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/${locale}/auth/callback`,
        },
      })

      if (error) throw error

      if (authData.user) {
        toast.success('注册成功！请检查您的邮箱以验证账户')
        
        if (onSuccess) {
          onSuccess()
        } else {
          // 跳转到登录页面，提示用户验证邮箱
          router.push(`/${locale}/auth/login?message=${encodeURIComponent('请检查您的邮箱以验证账户')}`)
        }
      }
    } catch (error: any) {
      toast.error(error.message || '注册失败，请重试')
    }
  }

  return (
    <div className="space-y-4">
      {!emailValidated ? (
        // 第一步：输入邮箱
        <Form {...emailForm}>
          <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
            <FormField
              control={emailForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 dark:text-gray-300 font-medium">邮箱</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      className="h-11 bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:border-green-500 dark:focus:border-green-400 focus:ring-green-500/20 transition-all duration-200"
                      {...field}
                      onBlur={(e) => {
                        field.onBlur(e)
                        if (e.target.value && z.string().email().safeParse(e.target.value).success) {
                          emailForm.handleSubmit(onEmailSubmit)()
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-medium shadow-lg shadow-green-500/30 transition-all duration-200 hover:shadow-xl hover:shadow-green-500/40"
              disabled={emailForm.formState.isSubmitting || !emailForm.watch('email')}
            >
              继续
            </Button>
          </form>
        </Form>
      ) : (
        // 第二步：输入密码
        <Form {...passwordForm}>
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <span className="text-sm text-green-700 dark:text-green-300 font-medium">{validatedEmail}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEmailValidated(false)
                  setValidatedEmail('')
                  emailForm.reset()
                  passwordForm.reset()
                }}
                className="text-xs text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40"
              >
                更改
              </Button>
            </div>

            <FormField
              control={passwordForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 dark:text-gray-300 font-medium">密码</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="至少6个字符"
                        className="h-11 bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:border-green-500 dark:focus:border-green-400 focus:ring-green-500/20 transition-all duration-200 pr-10"
                        {...field}
                        autoFocus
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
              control={passwordForm.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 dark:text-gray-300 font-medium">确认密码</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="再次输入密码"
                        className="h-11 bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:border-green-500 dark:focus:border-green-400 focus:ring-green-500/20 transition-all duration-200 pr-10"
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
              className="w-full h-11 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-medium shadow-lg shadow-green-500/30 transition-all duration-200 hover:shadow-xl hover:shadow-green-500/40"
              disabled={passwordForm.formState.isSubmitting}
            >
              {passwordForm.formState.isSubmitting ? '注册中...' : '注册'}
            </Button>
          </form>
        </Form>
      )}
    </div>
  )
}

