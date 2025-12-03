'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema, type RegisterFormData } from '@/lib/validations/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/lib/api/auth'
import { toast } from 'sonner'
import { Eye, EyeOff } from 'lucide-react'
import { useTranslations } from 'next-intl'
import axios from 'axios'

export default function RegisterPage() {
  const router = useRouter()
  const { setLoading } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const params = useParams()
  const locale = params?.locale as string
  const t = useTranslations('auth')
  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setLoading(true)
      const response = await authApi.register(data)
      
      // 检查是否有 data 字段来判断是否成功（实际API返回格式：{ data: {...}, message: "..." }）
      if (response.data) {
        toast.success(response.message || t('registerSuccess'))
        form.reset() // 清空表单
        router.push(`/${locale}/auth/login`)
      } else {
        toast.error(response.message || t('serverError'))
      }
    } catch (error) {
      console.error('Register error:', error)
      
      // 检查是否是 axios 错误，并提取错误消息
      let errorMessage = t('networkError')
      
      if (axios.isAxiosError(error)) {
        // 优先使用 response.data.message（API 返回的错误消息）
        if (error.response?.data?.message) {
          errorMessage = error.response.data.message
        } 
        // 如果没有 message，检查 error 字段
        else if (error.response?.data?.error) {
          errorMessage = error.response.data.error
        }
        // 如果错误对象本身有 message（由 apiClient 拦截器设置的）
        else if (error.message) {
          errorMessage = error.message
        }
      } 
      // 如果是普通 Error 对象，使用其 message
      else if (error instanceof Error) {
        errorMessage = error.message
      }
      
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card className='border-none bg-card dark:bg-zinc-800'>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">{t('registerTitle')}</CardTitle>
            <CardDescription className="text-center">
              {t('registerDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('username')}</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder={t('usernamePlaceholder')}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('email')}</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder={t('emailPlaceholder')}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('password')}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder={t('passwordPlaceholder')}
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
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
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('confirmPassword')}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder={t('confirmPasswordPlaceholder')}
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
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
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? t('registerButtonLoading') : t('registerButton')}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">{t('hasAccount')}</span>
              <Link href={`/${locale}/auth/login`} className="text-primary hover:underline">
                {t('login')}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
