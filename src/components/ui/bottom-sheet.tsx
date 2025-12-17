"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface BottomSheetAction {
  label: string;
  onClick: () => void;
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export interface BottomSheetProps {
  /** 是否打开 */
  open: boolean;
  /** 打开状态变化回调 */
  onOpenChange: (open: boolean) => void;
  /** 弹窗标题 */
  title: string;
  /** 副标题/描述（可选） */
  description?: string;
  /** 弹窗内容 */
  children: React.ReactNode;
  /** 底部操作按钮 */
  actions?: BottomSheetAction[];
  /** 是否显示关闭按钮 */
  showCloseButton?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 内容区域自定义类名 */
  contentClassName?: string;
  /** 自定义样式 */
  style?: React.CSSProperties;
}

/**
 * 底部弹窗组件
 * 
 * 特性：
 * - 紧贴底部，宽度100%
 * - 自动处理键盘遮挡
 * - 内容区域可滚动
 * - 底部操作栏固定
 * - 支持深色模式
 * 
 * @example
 * ```tsx
 * <BottomSheet
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="编辑信息"
 *   description="请填写以下信息"
 *   actions={[
 *     { label: "取消", onClick: handleCancel, variant: "secondary" },
 *     { label: "保存", onClick: handleSave, loading: isLoading }
 *   ]}
 * >
 *   <YourFormContent />
 * </BottomSheet>
 * ```
 */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  actions,
  showCloseButton = true,
  className,
  style,
  contentClassName,
}: BottomSheetProps) {
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);

  // 获取屏幕尺寸和断点
  const getScreenSize = () => {
    if (typeof window === "undefined") return "sm";
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // 移动端断点
    if (width <= 480) return "xs";      // 小屏手机
    if (width <= 768) return "sm";      // 大屏手机/小平板
    if (width <= 1024) return "md";     // 平板
    return "lg";                        // 桌面
  };

  // 根据断点设置弹窗高度
  const getSheetHeight = () => {
    const screenSize = getScreenSize();
    const baseHeight = {
      xs: 500,  // 小屏手机
      sm: 600,  // 大屏手机
      md: 700,  // 平板
      lg: 800   // 桌面
    }[screenSize];

    // 如果有键盘，减去键盘高度
    return baseHeight //keyboardHeight > 0 ? baseHeight - keyboardHeight : baseHeight;
  };

  // 监听键盘高度变化
  React.useEffect(() => {
    if (!open) return;
    const initViewportHeight = window.visualViewport?.height || window.innerHeight;

    const handleViewportResize = () => {
      if (typeof window !== "undefined" && "visualViewport" in window && window.visualViewport) {
        const viewport = window.visualViewport;
        const newKeyboardHeight = initViewportHeight - viewport.height;
        
        // 只有当键盘高度大于阈值时才应用
        if (newKeyboardHeight > 100) {
          setKeyboardHeight(newKeyboardHeight);
        } else {
          setKeyboardHeight(0);
        }
      }
    };

    if ("visualViewport" in window && window.visualViewport) {
      const viewport = window.visualViewport;
      viewport.addEventListener("resize", handleViewportResize);
      viewport.addEventListener("scroll", handleViewportResize);
      
      return () => {
        viewport.removeEventListener("resize", handleViewportResize);
        viewport.removeEventListener("scroll", handleViewportResize);
      };
    }
  }, [open]);

  // 计算弹窗高度（像素值）
  const sheetHeight = getSheetHeight();

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* 遮罩层 */}
        <DialogPrimitive.Overlay 
          className="fixed inset-0 z-50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 bg-black/50"
        />
        
        {/* 弹窗内容 */}
        <DialogPrimitive.Content
          className={cn(
            "fixed left-0 right-0 bottom-0 z-50 w-full flex flex-col",
            "shadow-2xl rounded-t-3xl overflow-hidden",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
            "duration-300",
            "bg-zinc-900",
            className
          )}
          style={{
            height: `${sheetHeight}px`,
            maxHeight: `${sheetHeight}px`,
            transition: "height 0.3s ease, max-height 0.3s ease",
            ...style,
          }}
        >
          {/* 顶部拖动指示条 */}
          <div className="flex items-center justify-center pt-4 pb-2 flex-shrink-0">
            <div className="w-12 h-1.5 rounded-full bg-zinc-700" />
          </div>

          {/* 关闭按钮 */}
          {showCloseButton && (
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none disabled:pointer-events-none z-10 text-zinc-400">
              <X className="h-6 w-6" />
              <span className="sr-only">关闭</span>
            </DialogPrimitive.Close>
          )}

          {/* 标题区域 */}
          <div className="flex flex-col space-y-2 px-6 pb-4 flex-shrink-0 border-b border-zinc-700">
            <DialogPrimitive.Title className="text-lg font-semibold leading-none tracking-tight text-zinc-100">
              {title}
            </DialogPrimitive.Title>
            {description && (
              <DialogPrimitive.Description className="text-sm text-zinc-400">
                {description}
              </DialogPrimitive.Description>
            )}
          </div>

          {/* 内容区域（可滚动） */}
          <div
            className={cn(
              "flex-1 overflow-y-auto overscroll-contain px-6 py-4",
              "scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700",
              contentClassName
            )}
            style={{ 
              WebkitOverflowScrolling: "touch",
              minHeight: 100,
              maxHeight: "100%"
            }}
          >
            {children}
          </div>

          {/* 底部操作栏 */}
          {actions && actions.length > 0 && (
            <div className="flex flex-row items-center gap-4 px-6 py-5 border-t flex-shrink-0 border-zinc-700 bg-zinc-800">
              {actions.map((action, index) => (
                <Button
                  key={index}
                  type="button"
                  variant={action.variant || "default"}
                  onClick={action.onClick}
                  disabled={action.disabled || action.loading}
                  className={cn(
                    action.className || (index === 0 && actions.length > 1 ? "flex-1" : "flex-1")
                  )}
                >
                  {action.icon && <span>{action.icon}</span>}
                  <span className="tracking-wider">{action.loading ? "处理中..." : action.label}</span>
                </Button>
              ))}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

