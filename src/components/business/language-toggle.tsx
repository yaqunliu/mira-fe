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
import { useParams, usePathname, useRouter } from 'next/navigation'
import { routing } from '@/i18n/routing'

export function LanguageToggle() {
  const t = useTranslations('language')
  const params = useParams()
  const pathname = usePathname()
  const router = useRouter()
  const currentLocale = (params?.locale as string) || routing.defaultLocale

  const languages = [
    { code: 'zh', name: t('zh') },
    { code: 'en', name: t('en') },
    { code: 'ja', name: t('ja') },
  ]

  const handleLanguageChange = (locale: string) => {
    // 替换当前路径中的语言代码
    const segments = pathname?.split('/') || []
    if (segments.length > 0 && routing.locales.includes(segments[1] as any)) {
      segments[1] = locale
    } else {
      segments.unshift('', locale)
    }
    const newPath = segments.join('/')
    router.push(newPath)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-12 p-0 gap-[4px]">
          <Globe className="h-4 w-4" />
          <span className="text-xs text-accent-foreground opacity-70">{currentLocale?.toUpperCase()}</span>
          <span className="sr-only">{t('toggle')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={currentLocale === lang.code ? 'bg-accent' : ''}
          >
            {lang.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
