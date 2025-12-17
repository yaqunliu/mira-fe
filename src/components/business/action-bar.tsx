'use client'

import { useState, useEffect } from 'react'
import { CheckinButton } from './checkin-button'

interface ActionBarProps {
  className?: string
}

export function ActionBar({ className = '' }: ActionBarProps) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // 移动端（竖版）不显示签到按钮，因为移动端顶部栏已经有签到按钮了
  if (isMobile) {
    return <div className={`flex items-center gap-1 ${className} h-8`} />
  }

  return (
    <div className={`flex items-center gap-1 ${className} h-8`}>
      <CheckinButton />
    </div>
  )
}
