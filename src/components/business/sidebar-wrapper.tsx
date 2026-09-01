'use client'

import { AppSidebar } from './app-sidebar'
import { usePathname } from '@/i18n/navigation';

export function SidebarWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublicPage = pathname === '/home' || pathname === '/' || pathname === '/contact'
  
  if (isPublicPage) {
    return (
      <div className="min-h-screen h-screen overflow-y-auto">
        {children}
      </div>
    )
  }
  
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      {/* 主内容区域：固定左边距，侧边栏浮动在上方 */}
      <main className="flex-1 lg:ml-20 overflow-y-auto transition-all duration-300">
        <div className="min-h-screen lg:pt-0 pt-14">
          {children}
        </div>
      </main>
    </div>
  )
}
