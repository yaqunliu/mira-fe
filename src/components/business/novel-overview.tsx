"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { BookOpen, User, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { novelApi } from "@/lib/api/novel";
import { useQuery } from "@tanstack/react-query";
import { Novel } from "@/types";

interface NovelOverviewItem {
  id: string;
  title: string;
  author: string;
  chapters: { length: number } | any[];
}

export function NovelOverview() {
  const router = useRouter();
  const t = useTranslations();
  const params = useParams();
  const locale = params?.locale as string;

  const { data: novelsResponse, isFetching: isNovelsLoading } = useQuery({
    queryKey: ["novels"],
    queryFn: () => novelApi.getNovels(),
  });

  const novels = (novelsResponse as any)?.data?.data || [];
  const displayNovels = novels.slice(0, 3); // 只显示前3本小说

  const handleViewMore = () => {
    router.push(`/${locale}/novels`);
  };

  const handleNovelClick = (novelId: string) => {
    router.push(`/${locale}/novels/${novelId}`);
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
      <div className="text-center py-6">
        <BookOpen className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground mb-3">
          暂无小说，点击上传第一本小说
        </p>
        <Button
          size="sm"
          onClick={() => router.push(`/${locale}/novels/upload`)}
          className="text-xs"
        >
          上传小说
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 书籍网格布局 */}
      <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-3">
        {displayNovels.map((novel: Novel) => (
          <div
            key={novel.novelId}
            onClick={() => handleNovelClick(novel.novelId)}
            className="group cursor-pointer"
          >
            {/* 书籍封面 */}
            <div className="relative aspect-[3/4] rounded-md overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 transform group-hover:scale-105">
              {/* 封面背景渐变 */}
              {/* <div className="absolute inset-0 bg-radial-[at_25%_15%] from-amber-300/20 via-orange-400/60 to-orange-800/90 dark:from-amber-400/80 dark:via-amber-600/90 dark:to-orange-900/70" /> */}
              <div className="absolute inset-0" style={{ background: 'url(/novel-cover.png) no-repeat center center / cover'}} />
              <div className="absolute backdrop-opacity-10 inset-0 blur-lg backdrop-blur-md bg-gradient-to-br from-orange-500/40 to-stone-500/70"/>
              
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
                  <BookOpen className="h-3 w-3" />
                  <span className="text-xs">
                    {novel?.chapterList?.length || 0} {t("home.章节")}
                  </span>
                </div>
              </div>
            </div>
            </div>
          </div>
        ))}
      </div>

      {novels.length > 3 && (
        <button
          onClick={handleViewMore}
          className="w-full text-xs text-secondary underline flex items-center justify-center gap-1 py-2 rounded-md hover:bg-accent transition-colors"
        >
          {t("home.查看更多")}
          <ChevronRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
