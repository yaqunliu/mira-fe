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
    // 替换当前路径中的语言代码
    const segments = pathname?.split('/') || []
    if (segments.length > 0 && routing.locales.includes(segments[1] as any)) {
      segments[1] = locale
    } else {
      segments.unshift('', locale)
    }
    let newPath = segments.join('/')
    
    // 保留查询参数
    if (searchParams && searchParams.toString()) {
      newPath += `?${searchParams.toString()}`
    }
    
    router.push(newPath)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-full justify-start px-2 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all">
          <Globe className="h-4 w-4 flex-shrink-0" />
          <span className="ml-2 text-xs font-medium">{currentLocale?.toUpperCase()}</span>
          <span className="sr-only">{t('toggle')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-white dark:bg-slate-900 border-gray-200 dark:border-white/10 z-[110]">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={cn(
              currentLocale === lang.code ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white',
              'cursor-pointer'
            )}
          >
            {lang.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
