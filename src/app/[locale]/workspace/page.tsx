"use client";

import { useEffect, useCallback, useRef } from "react";
import { FileVideoCamera, BookOpenText, Sparkles, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { usePathname } from '@/i18n/navigation';

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
      router.push('/auth/login');
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

    const workspacePath = '/workspace';
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
    const workspacePath = '/workspace';

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
    <div className="container h-screen mx-auto flex flex-col landscape-wide relative overflow-hidden bg-gradient-to-br from-[#FDBCB4]/20 via-[#ADD8E6]/20 to-white">
      {/* 装饰性背景元素 */}
      <div className="absolute -top-20 -left-20 w-60 h-60 bg-[#FDBCB4]/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute top-40 -right-20 w-80 h-80 bg-[#ADD8E6]/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute -bottom-20 left-1/3 w-60 h-60 bg-[#22C55E]/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />

      {/* 固定顶部 - 现代化设计 */}
      <div className="flex-shrink-0 relative z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-[#22C55E] to-[#ADD8E6] rounded-xl shadow-[4px_4px_8px_rgba(173,221,230,0.3),-2px_-2px_4px_rgba(255,255,255,0.7)] hover:shadow-[6px_6px_12px_rgba(173,221,230,0.4),-4px_-4px_8px_rgba(255,255,255,0.8)] transition-all duration-300">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-[#22C55E] to-[#ADD8E6] bg-clip-text text-transparent">
              {t("home.title")}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {/* 操作栏 */}
            <ActionBar />
          </div>
        </div>
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[#ADD8E6]/50 to-transparent mb-6" />
      </div>

      {/* 可滚动内容区域 - 支持下拉刷新 */}
      <PullToRefresh onRefresh={handleRefresh} className="flex-1">
        <div className="px-4 pb-6 relative z-10 max-w-7xl mx-auto">
          {/* 开始创作 - 大横幅按钮 */}
          <div className="mb-8">
            <div
              className="group relative overflow-hidden cursor-pointer rounded-3xl shadow-[8px_8px_16px_rgba(173,221,230,0.3),-6px_-6px_12px_rgba(255,255,255,0.7)] hover:shadow-[10px_10px_20px_rgba(173,221,230,0.4),-8px_-8px_16px_rgba(255,255,255,0.8)] transition-all duration-300"
              onClick={() => router.push('/create-dynamic-comic')}
            >
              {/* 背景渐变和模糊效果 - 使用柔和的颜色 */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#22C55E]/95 via-[#ADD8E6]/90 to-[#FDBCB4]/80 opacity-95 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute inset-0 bg-gradient-to-br from-[#22C55E]/30 via-[#ADD8E6]/20 to-[#FDBCB4]/10 blur-2xl group-hover:blur-3xl transition-all duration-500" />

              {/* 内容 */}
              <div className="relative p-5 md:p-8 min-h-[140px] md:min-h-[160px] flex flex-col md:flex-row items-center justify-between gap-4 md:gap-5">
                <div className="flex items-center gap-4 md:gap-5 flex-1">
                  <div className="p-3.5 md:p-4 bg-white/20 rounded-xl md:rounded-2xl backdrop-blur-sm shadow-[4px_4px_8px_rgba(173,221,230,0.3),-2px_-2px_4px_rgba(255,255,255,0.7)] group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                    <FileVideoCamera className="w-8 h-8 md:w-11 md:h-11 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 group-hover:scale-105 transition-transform duration-300">
                      {t("home.createAnimation")}
                    </h2>
                    <p className="text-sm md:text-base text-white/90 leading-relaxed max-w-2xl">
                      {t("home.startYourCreativeJourney")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 md:gap-4">
                  <div className="px-5 md:px-6 py-2.5 md:py-3 bg-white/20 rounded-lg md:rounded-xl backdrop-blur-sm shadow-[4px_4px_8px_rgba(173,221,230,0.3),-2px_-2px_4px_rgba(255,255,255,0.7)] group-hover:bg-white/30 transition-all duration-300 group-hover:scale-105">
                    <span className="text-base md:text-lg font-bold text-white flex items-center gap-2 md:gap-3">
                      {t("home.getStarted")}
                      <svg className="w-5 h-5 md:w-6 md:h-6 group-hover:translate-x-2 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 内容列表区域 - 优化间距和视觉层次 */}
          <div className="flex flex-col gap-10">
            {/* 我的创作 - 现代化设计 */}
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg">
                  <FileVideoCamera className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                    {t("home.myCreations")}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {t("home.manageYourCreations") || "管理您的创作作品"}
                  </p>
                </div>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400/10 via-pink-400/10 to-orange-400/10 dark:from-purple-600/5 dark:via-pink-600/5 dark:to-orange-600/5 blur-2xl rounded-3xl" />
                <div className="relative bg-white/40 dark:bg-gray-900/40 backdrop-blur-sm rounded-2xl p-5 border border-purple-200/30 dark:border-purple-800/30 shadow-lg">
                  <CreationOverview />
                </div>
              </div>
            </div>

            {/* 我的文案 - 现代化设计 */}
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl shadow-lg">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
                    {t("home.myNovels")}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {t("home.manageYourNovels")}
                  </p>
                </div>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 via-cyan-400/10 to-teal-400/10 dark:from-blue-600/5 dark:via-cyan-600/5 dark:to-teal-600/5 blur-2xl rounded-3xl" />
                <div className="relative bg-white/40 dark:bg-gray-900/40 backdrop-blur-sm rounded-2xl p-5 border border-blue-200/30 dark:border-blue-800/30 shadow-lg">
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
