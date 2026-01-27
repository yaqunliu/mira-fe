'use client'

import { Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTranslations } from 'next-intl'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { cn } from '@/lib/utils'

export function LanguageToggle() {
  const t = useTranslations('language')
  const params = useParams()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const currentLocale = (params?.locale as string) || routing.defaultLocale

  const languages = [
    { code: 'zh', name: t('zh') },
    { code: 'en', name: t('en') },
  ]

  const handleLanguageChange = (locale: string) => {
    // 构建新的路径，替换当前语言代码
    const segments = pathname?.split('/') || [];
    let newSegments = [...segments];
    
    // 检查路径是否已经包含语言代码
    if (newSegments.length > 1 && routing.locales.includes(newSegments[1] as any)) {
      // 替换现有的语言代码
      newSegments[1] = locale;
    } else {
      // 添加语言代码
      newSegments.splice(1, 0, locale);
    }
    
    let newPath = newSegments.join('/');
    
    // 保留查询参数
    if (searchParams && searchParams.toString()) {
      newPath += `?${searchParams.toString()}`;
    }
    
    router.push(newPath);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-10 w-full justify-center px-3 bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_16px_rgba(0,0,0,0.12),-4px_-4px_16px_rgba(255,255,255,0.95)] border border-white/50 rounded-xl hover:shadow-[6px_6px_20px_rgba(0,0,0,0.18),-6px_-6px_20px_rgba(255,255,255,1)] hover:-translate-y-0.5 transition-all duration-300 text-gray-800 hover:text-green-600">
          <span className="text-sm font-medium">{currentLocale?.toUpperCase()}</span>
          <span className="sr-only">{t('toggle')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-gradient-to-br from-white to-blue-50 shadow-[8px_8px_24px_rgba(0,0,0,0.15),-8px_-8px_24px_rgba(255,255,255,0.95)] border border-white/50 rounded-xl z-[110]">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={cn(
              currentLocale === lang.code ? 'bg-green-50 text-green-600 font-medium' : 'text-gray-800 hover:bg-blue-50 hover:text-green-600',
              'cursor-pointer transition-all duration-300 py-2 px-4'
            )}
          >
            {lang.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
