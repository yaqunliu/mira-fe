"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogClose, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export interface ImagePreviewProps {
  /** 是否打开预览 */
  open: boolean;
  /** 打开状态变化回调 */
  onOpenChange: (open: boolean) => void;
  /** 图片URL */
  src?: string | null;
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
 */
export function ImagePreview({
  open,
  onOpenChange,
  src,
  alt,
  className,
  showCloseButton = true,
  closeButtonPosition = "top-right",
}: ImagePreviewProps) {
  const t = useTranslations("common");
  const altLabel = alt ?? t("imagePreview");
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // 重置缩放和位置
  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // 监听键盘事件
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      } else if (e.key === "+" || e.key === "=") {
        setScale(prev => Math.min(prev + 0.2, 5));
      } else if (e.key === "-" || e.key === "_") {
        setScale(prev => Math.max(prev - 0.2, 0.5));
      } else if (e.key === "0") {
        resetZoom();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange, resetZoom]);

  // 监听打开状态变化，关闭时重置
  useEffect(() => {
    if (!open) {
      resetZoom();
    }
  }, [open, resetZoom]);

  const handleWheel = (e: React.WheelEvent) => {
    // 阻止默认滚轮行为（如页面滚动）
    e.preventDefault();
    
    const delta = -e.deltaY;
    const factor = 0.1;
    const newScale = Math.min(Math.max(scale + (delta > 0 ? factor : -factor), 0.5), 5);
    
    // 如果缩放比例发生变化，计算新的位置以保持鼠标中心点不变
    if (newScale !== scale) {
      setScale(newScale);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDoubleClick = () => {
    if (scale > 1) {
      resetZoom();
    } else {
      setScale(2);
    }
  };

  const getCloseButtonPosition = () => {
    const baseClasses = "absolute p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors z-50";
    
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
          "max-w-none w-screen h-screen p-0 border-0 bg-black/80 overflow-hidden sm:max-w-none flex items-center justify-center",
          className
        )}
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">{altLabel}</DialogTitle>
        <DialogDescription className="sr-only">{t("imagePreviewWindow")}</DialogDescription>
        <div 
          className="relative w-full h-full flex items-center justify-center overflow-hidden"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDoubleClick={handleDoubleClick}
        >
          {src && (
            <div
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0, 0.2, 1)',
                cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in'
              }}
              className="relative"
            >
              <img
                src={src || ""}
                alt={altLabel}
                className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl pointer-events-none"
                draggable={false}
              />
            </div>
          )}
          
          {/* 工具栏 */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 bg-black/60 rounded-full text-white backdrop-blur-md z-50 border border-white/10">
            <button 
              onClick={() => setScale(Math.max(scale - 0.2, 0.5))} 
              className="p-1 hover:text-primary hover:bg-white/10 rounded-full transition-all"
              title={t("zoomOut")}
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2 min-w-[120px]">
              <input
                type="range"
                min="0.5"
                max="5"
                step="0.1"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
              />
            </div>

            <span className="text-sm font-medium min-w-[3.5em] text-center font-mono">
              {Math.round(scale * 100)}%
            </span>

            <button 
              onClick={() => setScale(Math.min(scale + 0.2, 5))} 
              className="p-1 hover:text-primary hover:bg-white/10 rounded-full transition-all"
              title={t("zoomIn")}
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            
            <div className="w-px h-4 bg-white/20 mx-1" />
            
            <button 
              onClick={resetZoom} 
              className="p-1 hover:text-primary hover:bg-white/10 rounded-full transition-all" 
              title={t("resetZoom")}
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>

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

