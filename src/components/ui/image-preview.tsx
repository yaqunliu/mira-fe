"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogClose, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
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
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // 重置缩放和位置
  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // 监听打开状态变化，关闭时重置
  useEffect(() => {
    if (!open) {
      resetZoom();
    }
  }, [open, resetZoom]);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey || true) { // 允许直接滚轮缩放，或者可以限制按住 ctrl
      e.preventDefault();
      const delta = -e.deltaY;
      const factor = 0.1;
      const newScale = Math.min(Math.max(scale + (delta > 0 ? factor : -factor), 0.5), 5);
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
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        <DialogDescription className="sr-only">图片预览窗口</DialogDescription>
        <div 
          className="relative w-full h-full flex items-center justify-center overflow-hidden cursor-move"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {src && (
            <div
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                cursor: scale > 1 ? 'grabbing' : 'zoom-in'
              }}
              className="relative transition-transform duration-200 ease-out"
            >
              <img
                src={src}
                alt={alt}
                className="max-w-[200vw] max-h-[200vh] object-contain rounded-lg shadow-2xl pointer-events-none"
                draggable={false}
              />
            </div>
          )}
          
          {/* 工具栏 */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 px-4 py-2 bg-black/50 rounded-full text-white backdrop-blur-sm z-50">
            <button onClick={() => setScale(Math.max(scale - 0.2, 0.5))} className="hover:text-primary transition-colors">
              <ZoomOut className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium min-w-[3em] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button onClick={() => setScale(Math.min(scale + 0.2, 5))} className="hover:text-primary transition-colors">
              <ZoomIn className="w-5 h-5" />
            </button>
            <div className="w-px h-4 bg-white/20 mx-1" />
            <button onClick={resetZoom} className="hover:text-primary transition-colors" title="重置">
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

