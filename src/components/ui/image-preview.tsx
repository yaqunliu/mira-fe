"use client";

import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ImagePreviewProps {
  /** 是否打开预览 */
  open: boolean;
  /** 打开状态变化回调 */
  onOpenChange: (open: boolean) => void;
  /** 图片URL */
  src?: string;
  /** 图片alt文本 */
  alt?: string;
  /** 自定义类名 */
  className?: string;
  /** 是否显示关闭按钮 */
  showCloseButton?: boolean;
  /** 关闭按钮位置 */
  closeButtonPosition?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
}

/**
 * 图像预览组件
 * 
 * 特性：
 * - 全屏预览图片
 * - 自适应图片尺寸
 * - 可自定义关闭按钮位置
 * - 支持透明背景
 * 
 * @example
 * ```tsx
 * <ImagePreview
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   src="/path/to/image.jpg"
 *   alt="图片描述"
 * />
 * ```
 */
export function ImagePreview({
  open,
  onOpenChange,
  src,
  alt = "图片预览",
  className,
  showCloseButton = true,
  closeButtonPosition = "top-right",
}: ImagePreviewProps) {
  const getCloseButtonPosition = () => {
    const baseClasses = "absolute p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors z-10";
    
    switch (closeButtonPosition) {
      case "top-left":
        return cn(baseClasses, "top-4 left-4");
      case "top-right":
        return cn(baseClasses, "top-4 right-4");
      case "bottom-left":
        return cn(baseClasses, "bottom-4 left-4");
      case "bottom-right":
        return cn(baseClasses, "bottom-4 right-4");
      default:
        return cn(baseClasses, "top-4 right-4");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={cn(
          "max-w-[90vw] max-h-[90vh] p-0 border-0 bg-transparent overflow-hidden",
          className
        )}
        showCloseButton={false}
      >
        <div className="relative flex items-center justify-center w-full h-full">
          {src && (
            <img
              src={src}
              alt={alt}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
          )}
          
          {/* 关闭按钮 */}
          {showCloseButton && (
            <DialogClose asChild>
              <button
                className={getCloseButtonPosition()}
                onClick={() => onOpenChange(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </DialogClose>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
