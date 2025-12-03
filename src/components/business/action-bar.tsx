'use client'

import { LanguageToggle } from './language-toggle'
import { ThemeToggle } from './theme-toggle'
import { UserAvatar } from './user-avatar'
import { PointsBalance } from './points-balance'

interface ActionBarProps {
  className?: string
}

export function ActionBar({ className = '' }: ActionBarProps) {
  return (
    <div className={`flex items-center gap-1 ${className} h-8`}>
      <LanguageToggle />
      <div className='divider-primary h-4 w-[1px]' />
      <ThemeToggle />
      <div className='divider-primary h-4 w-[1px]' />
      <PointsBalance />
      <div className='divider-primary h-4 w-[1px]' />
      <UserAvatar />
    </div>
  )
}
