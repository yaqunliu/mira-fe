"use client";

import { useEffect, useCallback } from "react";
import { FileVideoCamera, BookOpenText, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ActionBar } from "@/components/business/action-bar";
import { NovelOverview } from "@/components/business/novel-overview";
import { CreationOverview } from "@/components/business/creation-overview";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { useAuthStore } from "@/stores/auth";

export default function RootPage() {
  const router = useRouter();
  const t = useTranslations();
  const params = useParams();
  const locale = params?.locale as string;
  const { user, isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      router.push(`/${locale}/auth/login`);
    }
  }, [router, locale, isAuthenticated, user?.id]);

  // 下拉刷新 - 刷新创作和小说列表
  const handleRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["creations"] }),
      queryClient.invalidateQueries({ queryKey: ["novels"] }),
    ]);
  }, [queryClient]);

  return (
    <div className="container h-screen mx-auto bg-gradient-to-br from-orange-200/60 via-purple-200/30 to-slate-200/30 dark:bg-black dark:from-transparent dark:via-transparent dark:to-transparent flex flex-col">
      {/* 固定顶部 */}
      <div className="flex-shrink-0">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-2xl font-bold text-gradient-primary">
            AI动画短剧
          </h1>
          {/* 操作栏 */}
          <ActionBar />
        </div>
        <div className="h-[1px] w-full divider-primary mb-4" />
      </div>

      {/* 可滚动内容区域 - 支持下拉刷新 */}
      <PullToRefresh onRefresh={handleRefresh} className="flex-1">
        <div className="px-4 pb-6">
          <div className="flex" onClick={() => router.push(`/${locale}/create`)}>
            <div className="w-1/2 lg:w-50 aspect-[7/3] rounded-md flex items-center justify-center gap-3 border border-orange-300 dark:border-orange-600 bg-gradient-to-br from-violet-100/30 to-orange-300/40 to-95% dark:bg-slate-900 hover:from-violet-200/40 hover:to-orange-400/50 dark:hover:bg-slate-800 cursor-pointer transition-all">
              <div className="text-lg font-semibold text-orange-800 dark:text-orange-300">
                {t("home.制作动画")}
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
                  {t("home.我的创作")}
                </h2>
              </div>
              <CreationOverview />
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-1">
                <BookOpenText className="w-4 h-4 text-amber-800 dark:text-amber-400" />
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                  {t("home.我的小说")}
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
