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
        <Button variant="ghost" size="sm" className="h-8 w-full justify-start px-2 hover:bg-[#ADD8E6]/30 text-gray-600 hover:text-[#22C55E] transition-all shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)] hover:shadow-[6px_6px_12px_rgba(173,221,230,0.3),-4px_-4px_8px_rgba(255,255,255,0.8)] hover:-translate-y-0.5">
          <Globe className="h-4 w-4 flex-shrink-0" />
          <span className="ml-2 text-xs font-medium">{currentLocale?.toUpperCase()}</span>
          <span className="sr-only">{t('toggle')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-white shadow-[4px_4px_8px_rgba(173,221,230,0.3),-4px_-4px_8px_rgba(255,255,255,0.7)] z-[110]">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={cn(
              currentLocale === lang.code ? 'bg-[#22C55E]/20 text-[#22C55E]' : 'text-gray-700 hover:bg-[#ADD8E6]/30 hover:text-[#22C55E]',
              'cursor-pointer transition-all duration-300'
            )}
          >
            {lang.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
