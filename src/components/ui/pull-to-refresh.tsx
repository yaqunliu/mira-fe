"use client";

import React, { useState, useRef, useCallback } from "react";
import { Loader2, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function PullToRefresh({
  onRefresh,
  children,
  className,
  disabled = false,
}: PullToRefreshProps) {
  const t = useTranslations("common");
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);

  const threshold = 80; // 触发刷新的阈值
  const maxPull = 120; // 最大下拉距离

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || isRefreshing) return;
      
      const container = containerRef.current;
      if (!container) return;

      // 只有在滚动到顶部时才允许下拉刷新
      if (container.scrollTop > 0) return;

      startYRef.current = e.touches[0].clientY;
      setIsPulling(true);
    },
    [disabled, isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isPulling || disabled || isRefreshing) return;

      const container = containerRef.current;
      if (!container || container.scrollTop > 0) {
        setIsPulling(false);
        setPullDistance(0);
        return;
      }

      currentYRef.current = e.touches[0].clientY;
      const diff = currentYRef.current - startYRef.current;

      if (diff > 0) {
        // 使用阻尼效果，拉得越远阻力越大
        const dampedDistance = Math.min(maxPull, diff * 0.5);
        setPullDistance(dampedDistance);
      }
    },
    [isPulling, disabled, isRefreshing]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling || disabled) return;

    setIsPulling(false);

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(60); // 保持在刷新位置

      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [isPulling, pullDistance, threshold, isRefreshing, onRefresh, disabled]);

  const indicatorOpacity = Math.min(1, pullDistance / threshold);
  const indicatorRotation = (pullDistance / threshold) * 180;

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-y-auto", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 下拉刷新指示器 */}
      <div
        className="absolute left-0 right-0 flex items-center justify-center transition-all duration-200 pointer-events-none z-10"
        style={{
          top: -60,
          transform: `translateY(${pullDistance}px)`,
          opacity: indicatorOpacity,
        }}
      >
        <div className="flex flex-col items-center gap-1 py-2">
          {isRefreshing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-[#22C55E]" />
              <span className="text-xs text-muted-foreground">{t("refreshing")}</span>
            </>
          ) : (
            <>
              <ArrowDown
                className="w-5 h-5 text-[#22C55E] transition-transform"
                style={{ transform: `rotate(${indicatorRotation}deg)` }}
              />
              <span className="text-xs text-muted-foreground">
                {pullDistance >= threshold ? t("releaseToRefresh") : t("pullToRefresh")}
              </span>
            </>
          )}
        </div>
      </div>

      {/* 内容区域 */}
      <div
        className="transition-transform duration-200"
        style={{
          transform: `translateY(${isRefreshing ? 60 : pullDistance}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

