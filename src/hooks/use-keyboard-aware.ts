// hooks/use-keyboard-aware.ts
import { useEffect, useState, useCallback } from 'react'

interface KeyboardState {
  isVisible: boolean
  height: number
}

export function useKeyboardAware() {
  const [keyboard, setKeyboard] = useState<KeyboardState>({
    isVisible: false,
    height: 0,
  })

  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // 检测是否为移动端
    const checkMobile = () => {
      setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
    }
    checkMobile()
  }, [])

  useEffect(() => {
    if (!isMobile) return

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        // 延迟执行，等待键盘弹出
        setTimeout(() => {
          const rect = target.getBoundingClientRect()
          const windowHeight = window.innerHeight
          const keyboardHeight = Math.max(0, windowHeight - rect.bottom - 20) // 20px安全距离
          
          if (keyboardHeight > 0) {
            setKeyboard({
              isVisible: true,
              height: keyboardHeight,
            })
            
            // 滚动元素到可视区域
            target.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'nearest'
            })
          }
        }, 300)
      }
    }

    const handleFocusOut = () => {
      setTimeout(() => {
        setKeyboard({
          isVisible: false,
          height: 0,
        })
      }, 100)
    }

    // 监听窗口大小变化（键盘弹出/收起）
    const handleResize = () => {
      setTimeout(() => {
        const activeElement = document.activeElement as HTMLElement
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
          const rect = activeElement.getBoundingClientRect()
          const windowHeight = window.innerHeight
          
          if (rect.bottom > windowHeight - 100) { // 如果输入框在底部区域
            activeElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'nearest'
            })
          }
        }
      }, 100)
    }

    document.addEventListener('focusin', handleFocusIn)
    document.addEventListener('focusout', handleFocusOut)
    window.addEventListener('resize', handleResize)

    return () => {
      document.removeEventListener('focusin', handleFocusIn)
      document.removeEventListener('focusout', handleFocusOut)
      window.removeEventListener('resize', handleResize)
    }
  }, [isMobile])

  return { keyboard, isMobile }
}