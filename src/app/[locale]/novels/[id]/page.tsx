"use client";

import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  User,
  Calendar,
  FileText,
  PlayCircle,
  Edit,
  Trash2,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { novelApi } from "@/lib/api/novel";
import { formatDate } from "@/lib/utils";
import type { Novel, Chapter } from "@/types";

export default function NovelDetailPage() {
  const router = useRouter();
  const params = useParams();
  const t = useTranslations();
  const locale = params?.locale as string;
  const novelId = params?.id as string;

  const {
    data: novelResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["novel", novelId],
    queryFn: () => novelApi.getNovel(novelId),
    enabled: !!novelId,
  });

  console.log("novelResponse:", novelResponse);
  const novel = (novelResponse as any)?.data as Novel;
  console.log("novel:", novel);

  const handleBack = () => {
    router.back();
  };

  const handleCreateVideo = (chapterId?: string) => {
    if (chapterId) {
      router.push(`/${locale}/create?novel=${novelId}&chapter=${chapterId}`);
    } else {
      router.push(`/${locale}/create?novel=${novelId}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50/60 via-purple-50/30 to-slate-50/30 dark:bg-black">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-muted rounded w-1/3"></div>
              <div className="h-64 bg-muted rounded"></div>
              <div className="h-96 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !novel) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50/60 via-purple-50/30 to-slate-50/30 dark:bg-black">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto text-center">
            <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">
              {t("novelDetail.未找到该书籍")}
            </h2>
            <Button onClick={handleBack} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("novelDetail.返回")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* 头部导航 */}
      <div className="flex justify-between flex-shrink-0">
        <div
          className="flex items-center gap-1 m-3"
          onClick={() => router.back()}
        >
          <ChevronLeft className="w-4 h-4 text-secondary" />
          <h1 className="text-base text-secondary">返回</h1>
        </div>
      </div>
      <div className="h-[1px] w-full divider-primary flex-shrink-0" />
      
      {/* 主内容区域 */}
      <div className="flex-1 overflow-hidden flex flex-col space-y-4 pt-4">
        {/* 书籍信息 */}
        <div className="flex gap-4 px-6 flex-shrink-0">
          <div className="w-24 aspect-[3/4] bg-[url('/novel-cover.png')] bg-cover bg-center rounded-lg" />
          <div className="flex-1 space-y-2">
            <h1 className="text-xl font-bold text-primary mb-2">
              {novel.title}
            </h1>
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span className="text-sm">{novel.author}</span>
            </div>
            <div className="flex items-center gap-1">
              <BookOpen className="h-3 w-3" />
              <span className="text-sm">
                {novel.chapters.length} {t("novelDetail.章节数")}
              </span>
            </div>
            {/* <p className="text-sm text-muted-foreground leading-relaxed text-secondary">
              {novel.description || t("novelDetail.暂无简介")}
            </p> */}
            <div className="flex items-center gap-1 text-secondary">
              <Calendar className="h-3 w-3" />
              <span className="text-sm">
                {t("novelDetail.上传于")}: {formatDate(novel.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {/* 章节列表 */}
        <div className="flex-1 overflow-hidden flex flex-col space-y-2">
          <div className="flex items-center gap-1 text-base font-bold px-6 flex-shrink-0">
            <FileText className="h-4 w-4 text-primary" />
            {t("novelDetail.章节列表")}
          </div>
          <div className="bg-card-custom flex-1 overflow-y-auto">
            <div className="">
              {novel.chapters.map((chapter: Chapter, index: number) => (
                <div
                  key={chapter.id}
                  className="w-full flex items-center justify-between p-6 group border-b border-slate-200 dark:border-zinc-700"
                >
                  <div className="flex flex-col flex-1 gap-1">
                    <div className="flex items-center bg-amber-800/50 px-1 py-[2px] rounded w-fit">
                      <h4 className="text-xs font-medium text-primary">
                        {chapter.title}
                      </h4>
                    </div>
                    <p className="text-sm text-secondary line-clamp-1">
                      {chapter.content.substring(0, 50)}...
                    </p>
                  </div>
                  <Button size="sm" variant="secondary" className="text-sm">
                    {/* <PlayCircle className="h-4 w-4 mr-1" /> */}
                    {t("novelDetail.开始创作")}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
