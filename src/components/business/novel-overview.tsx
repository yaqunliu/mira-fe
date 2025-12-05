"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { BookOpen, User, ChevronRight, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { novelApi } from "@/lib/api/novel";
import { useQuery } from "@tanstack/react-query";
import { Novel } from "@/types";
import { NovelUploadModal } from "../modals/novel-upload-modal";
import { useAuthStore } from "@/stores/auth";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";

export function NovelOverview() {
  const router = useRouter();
  const t = useTranslations();
  const params = useParams();
  const locale = params?.locale as string;
  const [showUploadModal, setShowUploadModal] = useState(false);
  const { token, isAuthenticated } = useAuthStore();
  const { loading: authLoading } = useSupabaseAuth();

  const {
    data: novelsResponse,
    isFetching: isNovelsLoading,
    refetch: refetchNovels,
  } = useQuery({
    queryKey: ["novels"],
    queryFn: async () => {
      const result = await novelApi.getNovels();
      return result;
    },
    enabled: !authLoading, // 只要认证初始化完成就请求,apiClient 会自动从 Supabase 获取 token
    retry: 1, // 如果首次失败,重试一次
  });

  // 处理 API 返回数据，兼容多种格式
  const responseData = novelsResponse as any;
  const novels: Novel[] = 
    responseData?.data?.items ||  // { data: { items: [...] } }
    responseData?.data ||         // { data: [...] }
    responseData?.items ||        // { items: [...] }
    (Array.isArray(responseData) ? responseData : []); // 直接数组
  
  const displayNovels = novels.slice(0, 3); // 只显示前3本小说

  const handleViewMore = () => {
    router.push(`/${locale}/novels`);
  };

  const handleNovelClick = (novelUuid: string) => {
    router.push(`/${locale}/novels/${novelUuid}`);
  };

  const handleUploadClick = () => {
    setShowUploadModal(true);
  };

  const handleUploadComplete = (novelUuid?: string) => {
    setShowUploadModal(false);
    refetchNovels();
    // 如果有 novelUuid，可以跳转到小说详情
    if (novelUuid) {
      router.push(`/${locale}/novels/${novelUuid}`);
    }
  };

  if (isNovelsLoading) {
    return (
      <div className="grid sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-md aspect-[3/4] w-full skeleton" />
        ))}
      </div>
    );
  }

  if (novels.length === 0) {
    return (
      <>
        <div className="text-center py-6">
          <BookOpen className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-3">
            {t("home.noNovelsEmpty")}
          </p>
          <Button
            size="sm"
            onClick={handleUploadClick}
            className="text-xs gap-1"
          >
            <Upload className="w-3 h-3" />
            {t("novel.uploadNovel")}
          </Button>
        </div>
        
        {/* 上传弹窗 - 空状态也需要显示 */}
        <NovelUploadModal
          open={showUploadModal}
          onOpenChange={setShowUploadModal}
          onComplete={handleUploadComplete}
        />
      </>
    );
  }

  return (
    <div className="space-y-3">
      {/* 书籍网格布局 */}
      <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-3">
        {displayNovels.map((novel: Novel) => (
          <div
            key={novel.novel_id}
            onClick={() => handleNovelClick(novel.uuid || novel.novel_id)}
            className="group cursor-pointer"
          >
            {/* 书籍封面 */}
            <div className="relative aspect-[3/4] rounded-md overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 transform group-hover:scale-105">
              {/* 封面背景 */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "url(/novel-cover.png) no-repeat center center / cover",
                }}
              />
              <div className="absolute backdrop-opacity-10 inset-0 blur-lg backdrop-blur-md bg-gradient-to-br from-orange-500/40 to-stone-500/70" />

              {/* 封面装饰线条 */}
              <div className="absolute inset-0 border-2 border-amber-200/30 dark:border-amber-400/20 m-2 rounded-sm" />

              {/* 封面内容 */}
              <div className="relative h-full flex flex-col justify-between p-3">
                {/* 书名 */}
                <div className="flex-1 flex items-center justify-center">
                  <h3 className="font-bold text-sm text-center text-white line-clamp-3 leading-relaxed">
                    {novel.title}
                  </h3>
                </div>

                {/* 作者和章节信息 */}
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1 text-white/90">
                    <User className="h-3 w-3" />
                    <span className="text-xs font-medium line-clamp-1">
                      {novel.author}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-1 text-white/80">
                    <BookOpen className="h-3 w-3 flex-shrink-0" />
                    <span className="text-xs whitespace-nowrap">
                      {novel?.chapter_count || 0} {t("home.chapters")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {novels.length > 0 && (
        <button
          onClick={handleViewMore}
          className="w-full text-xs text-secondary underline flex items-center justify-center gap-1 py-2 rounded-md hover:bg-accent transition-colors"
        >
          {t("home.viewMore")}
          <ChevronRight className="h-3 w-3" />
        </button>
      )}

      {/* 上传弹窗 */}
      <NovelUploadModal
        open={showUploadModal}
        onOpenChange={setShowUploadModal}
        onComplete={handleUploadComplete}
      />
    </div>
  );
}
