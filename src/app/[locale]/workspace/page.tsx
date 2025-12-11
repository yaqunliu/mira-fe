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
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";

export default function WorkspacePage() {
  const router = useRouter();
  const t = useTranslations();
  const params = useParams();
  const locale = params?.locale as string;
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const prevPathnameRef = useRef<string | null>(null);
  
  // 初始化 Supabase 认证，确保 session 同步到 auth store
  const { loading: authLoading } = useSupabaseAuth();
  const { token } = useAuthStore();

  useEffect(() => {
    // 等待 Supabase 认证初始化完成后再检查
    if (authLoading) return;
    
    // 检查认证状态：需要 isAuthenticated 为 true 且有 user.id，或者有 token（可能正在同步中）
    // 给一点时间让 token 同步完成
    const hasAuth = isAuthenticated && user?.id;
    const hasToken = !!token;
    
    if (!hasAuth && !hasToken) {
      // 如果既没有认证状态也没有 token，才跳转到登录页
      router.push(`/${locale}/auth/login`);
    }
  }, [router, locale, isAuthenticated, user?.id, authLoading, token]);

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

  // 监听路由变化，当从其他页面返回到创作工作台时刷新数据
  useEffect(() => {
    if (!isAuthenticated) return;

    const workspacePath = `/${locale}/workspace`;
    const isWorkspacePage = pathname === workspacePath;
    
    // 首次加载时，prevPathnameRef.current 为 null；从其他页面返回时，prevPathnameRef.current 不等于当前路径
    const wasNotWorkspace = prevPathnameRef.current && prevPathnameRef.current !== workspacePath;
    const isFirstLoad = prevPathnameRef.current === null && isWorkspacePage;

    // 如果是从其他页面返回或首次进入，刷新数据
    if (isWorkspacePage && (wasNotWorkspace || isFirstLoad)) {
      handleRefresh();
    }

    // 更新上一个路径
    prevPathnameRef.current = pathname;
  }, [pathname, locale, isAuthenticated, handleRefresh]);

  // 监听页面可见性变化，当从其他标签页返回时刷新数据
  useEffect(() => {
    if (!isAuthenticated) return;
    const workspacePath = `/${locale}/workspace`;

    const handleVisibilityChange = () => {
      // 当页面从隐藏变为可见时，刷新数据
      if (document.visibilityState === "visible" && pathname === workspacePath) {
        handleRefresh();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [pathname, locale, isAuthenticated, handleRefresh]);

  return (
    <div className="container h-screen mx-auto flex flex-col landscape-wide relative overflow-hidden bg-gradient-to-br from-orange-50/80 via-purple-50/60 to-blue-50/70 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* 装饰性背景元素 */}
      <div className="absolute -top-20 -left-20 w-60 h-60 bg-orange-400/10 dark:bg-orange-400/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute top-40 -right-20 w-80 h-80 bg-purple-400/10 dark:bg-purple-400/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute -bottom-20 left-1/3 w-60 h-60 bg-blue-400/10 dark:bg-blue-400/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />

      {/* 固定顶部 - 现代化设计 */}
      <div className="flex-shrink-0 relative z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-purple-600 rounded-xl shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 via-purple-600 to-blue-600 dark:from-orange-400 dark:via-purple-400 dark:to-blue-400 bg-clip-text text-transparent">
              {t("home.title")}
            </h1>
          </div>
          {/* 操作栏 */}
          <ActionBar />
        </div>
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-purple-200 dark:via-purple-800/30 to-transparent mb-6" />
      </div>

      {/* 可滚动内容区域 - 支持下拉刷新 */}
      <PullToRefresh onRefresh={handleRefresh} className="flex-1">
        <div className="px-4 pb-6 relative z-10">
          {/* 签到卡片 - 现代化设计 */}
          <div className="mb-6 group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 to-orange-400/20 dark:from-amber-600/10 dark:to-orange-600/10 blur-xl group-hover:blur-2xl transition-all duration-300" />
            <div className="relative flex items-center justify-between p-5 rounded-2xl border-2 border-amber-200/50 dark:border-amber-800/50 bg-gradient-to-r from-amber-50/80 to-orange-50/80 dark:from-amber-950/40 dark:to-orange-950/40 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-md">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-bold text-amber-800 dark:text-amber-300">
                    {t("home.dailyCheckin")}
                  </span>
                  <span className="text-sm text-amber-600 dark:text-amber-400">
                    {t("home.checkinDescription")}
                  </span>
                </div>
              </div>
              <CheckinButton />
            </div>
          </div>

          {/* 创建动画按钮 - 现代化设计 */}
          <div
            className="group relative overflow-hidden cursor-pointer"
            onClick={() => router.push(`/${locale}/create?from=workspace`)}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-orange-400/20 dark:from-purple-600/10 dark:to-orange-600/10 blur-xl group-hover:blur-2xl transition-all duration-300" />
            <div className="relative rounded-2xl border-2 border-purple-200/50 dark:border-purple-800/50 bg-gradient-to-br from-purple-100/80 via-pink-100/60 to-orange-100/80 dark:from-purple-950/40 dark:via-pink-950/30 dark:to-orange-950/40 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] p-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-gradient-to-br from-purple-600 to-orange-600 rounded-2xl shadow-xl group-hover:scale-110 transition-transform duration-300">
                    <FileVideoCamera className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-orange-600 dark:from-purple-400 dark:to-orange-400 bg-clip-text text-transparent">
                      {t("home.createAnimation")}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {t("home.startYourCreativeJourney")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-6 py-3 bg-white/60 dark:bg-gray-800/60 rounded-xl backdrop-blur-sm border border-purple-200 dark:border-purple-700 group-hover:bg-white/80 dark:group-hover:bg-gray-800/80 transition-colors">
                  <span className="text-sm font-medium text-purple-700 dark:text-purple-300">{t("home.getStarted")}</span>
                  <svg className="w-5 h-5 text-purple-600 dark:text-purple-400 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="px-4 pb-6 relative z-10">
          <div className="flex flex-col gap-8">
            {/* 我的创作 - 现代化设计 */}
            <div className="space-y-4">
              <div
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => router.push(`/${locale}/creations`)}
              >
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg shadow-md group-hover:scale-110 transition-transform">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                  {t("home.myCreations")}
                </h2>
                <svg className="w-5 h-5 text-purple-500 dark:text-purple-400 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400/10 to-pink-400/10 dark:from-purple-600/5 dark:to-pink-600/5 blur-xl" />
                <div className="relative">
                  <CreationOverview />
                </div>
              </div>
            </div>

            {/* 我的小说 - 现代化设计 */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg shadow-md">
                  <BookOpenText className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
                  {t("home.myNovels")}
                </h2>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 to-cyan-400/10 dark:from-blue-600/5 dark:to-cyan-600/5 blur-xl" />
                <div className="relative">
                  <NovelOverview />
                </div>
              </div>
            </div>
          </div>
        </div>
      </PullToRefresh>
    </div>
  );
}
