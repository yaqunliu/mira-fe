"use client";

import { useEffect, useCallback, useRef } from "react";
import { FileVideoCamera, BookOpenText, Sparkles } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ActionBar } from "@/components/business/action-bar";
import { NovelOverview } from "@/components/business/novel-overview";
import { CreationOverview } from "@/components/business/creation-overview";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { CheckinButton } from "@/components/business/checkin-button";
import { useAuthStore } from "@/stores/auth";

export default function RootPage() {
  const router = useRouter();
  const t = useTranslations();
  const params = useParams();
  const locale = params?.locale as string;
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const prevPathnameRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      router.push(`/${locale}/auth/login`);
    }
  }, [router, locale, isAuthenticated, user?.id]);

  // 下拉刷新 - 刷新创作、小说列表和积分数据
  const handleRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["creations"] }),
      queryClient.invalidateQueries({ queryKey: ["novels"] }),
      // 刷新积分数据（先刷新 balance，因为获取 balance 时会处理积分过期）
      queryClient.invalidateQueries({ queryKey: ["points", "balance"] }),
      // 然后刷新积分记录和统计
      queryClient.invalidateQueries({ queryKey: ["points", "records"] }),
      queryClient.invalidateQueries({ queryKey: ["points", "statistics"] }),
    ]);
  }, [queryClient]);

  // 监听路由变化，当从其他页面返回到首页时刷新数据
  useEffect(() => {
    if (!isAuthenticated) return;

    const homePath = `/${locale}`;
    const isHomePage = pathname === homePath;
    
    // 首次加载首页时，prevPathnameRef.current 为 null
    // 从其他页面返回首页时，prevPathnameRef.current 不为 null 且不等于 homePath
    const wasNotHomePage = prevPathnameRef.current && prevPathnameRef.current !== homePath;
    const isFirstLoad = prevPathnameRef.current === null && isHomePage;

    // 如果是从其他页面返回首页，或者是首次加载首页，都刷新数据
    if (isHomePage && (wasNotHomePage || isFirstLoad)) {
      console.log(`[Home Page] ${isFirstLoad ? '首次加载' : '从其他页面返回'}首页，刷新数据: ${prevPathnameRef.current || 'null'} -> ${pathname}`);
      handleRefresh();
    }

    // 更新上一个路径
    prevPathnameRef.current = pathname;
  }, [pathname, locale, isAuthenticated, handleRefresh]);

  // 监听页面可见性变化，当从其他标签页返回时刷新数据
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleVisibilityChange = () => {
      // 当页面从隐藏变为可见时，刷新数据
      if (document.visibilityState === "visible" && pathname === `/${locale}`) {
        handleRefresh();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [pathname, locale, isAuthenticated, handleRefresh]);

  return (
    <div className="container h-screen mx-auto bg-gradient-to-br from-orange-200/60 via-purple-200/30 to-slate-200/30 dark:bg-black dark:from-transparent dark:via-transparent dark:to-transparent flex flex-col">
      {/* 固定顶部 */}
      <div className="flex-shrink-0">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-2xl font-bold text-gradient-primary">
            {t("home.title")}
          </h1>
          {/* 操作栏 */}
          <ActionBar />
        </div>
        <div className="h-[1px] w-full divider-primary mb-4" />
      </div>

      {/* 可滚动内容区域 - 支持下拉刷新 */}
      <PullToRefresh onRefresh={handleRefresh} className="flex-1">
        <div className="px-4 pb-6">
          {/* 签到卡片 */}
          <div className="mb-4 flex items-center justify-between p-3 rounded-md border border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/30">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
                {t("home.dailyCheckin")}
              </span>
              <span className="text-xs text-amber-600 dark:text-amber-400">
                {t("home.checkinDescription")}
              </span>
            </div>
            <CheckinButton />
          </div>
          <div className="flex" onClick={() => router.push(`/${locale}/create`)}>
            <div className="w-1/2 lg:w-50 aspect-[7/3] rounded-md flex items-center justify-center gap-3 border border-orange-300 dark:border-orange-600 bg-gradient-to-br from-violet-100/30 to-orange-300/40 to-95% dark:bg-slate-900 hover:from-violet-200/40 hover:to-orange-400/50 dark:hover:bg-slate-800 cursor-pointer transition-all">
              <div className="text-lg font-semibold text-orange-800 dark:text-orange-300">
                {t("home.createAnimation")}
              </div>
              <FileVideoCamera className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>
        <div className="px-4 pb-6">
          <div className="flex flex-col gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-1 cursor-pointer" onClick={() => router.push(`/${locale}/creations`)}>
                <Sparkles className="w-4 h-4 text-amber-800 dark:text-amber-400" />
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                  {t("home.myCreations")}
                </h2>
              </div>
              <CreationOverview />
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-1">
                <BookOpenText className="w-4 h-4 text-amber-800 dark:text-amber-400" />
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                  {t("home.myNovels")}
                </h2>
              </div>
              <NovelOverview />
            </div>
          </div>
        </div>
      </PullToRefresh>
    </div>
  );
}
