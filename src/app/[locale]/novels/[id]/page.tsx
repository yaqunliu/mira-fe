"use client";

import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  User,
  Calendar,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { novelApi } from "@/lib/api/novel";
import { formatDate } from "@/lib/utils";
import type { Novel, Chapter, ChapterListItem, Character } from "@/types";
import { Creation } from "@/types/Creation";
import LoadingIcon from "@/components/ui/loading-icon";
import { CustomTabs } from "@/components/ui/custom-tabs";

import CharactorCard from "@/components/business/charactor-card";
import VideoCard from "@/components/business/creation-card";
import CreationCard from "@/components/business/creation-card";

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

  const {
    data: chaptersResponse,
    isLoading: isChaptersLoading,
    error: chaptersError,
  } = useQuery({
    queryKey: ["chapters", novelId],
    queryFn: () => novelApi.getChapters(novelId),
    enabled: !!novelId,
  });

  const {
    data: charactersResponse,
    isLoading: isCharactersLoading,
    error: charactersError,
  } = useQuery({
    queryKey: ["characters", novelId],
    queryFn: () => novelApi.getCharacters(novelId),
    enabled: !!novelId,
  });

  const {
    data: creationsResponse,
    isLoading: isCreationsLoading,
    error: creationsError,
  } = useQuery({
    queryKey: ["creations", novelId],
    queryFn: () => novelApi.getCreationsByNovelId(novelId),
    enabled: !!novelId,
  });

  const novel = (novelResponse as any)?.data as Novel;
  const chapters = (chaptersResponse as any)?.data?.data as ChapterListItem[];
  const characters = (charactersResponse as any)?.data?.data as Character[];
  const creations = (creationsResponse as any)?.data?.data as Creation[];

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

  const renderLoading = () => {
    return (
      <div className="flex items-center justify-center gap-2 h-full">
        <LoadingIcon />
        <span className="text-sm text-secondary">加载中...</span>
      </div>
    );
  };

  const renderChapters = () => {
    if (isChaptersLoading) {
      return renderLoading();
    }
    if (chaptersError) {
      return (
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm text-secondary">加载失败...</span>
        </div>
      );
    }
    return (
      <div className="bg-card-custom flex-1">
        <div className="">
          {chapters?.map((chapter: ChapterListItem, index: number) => (
            <div
              key={chapter.chapterId}
              className="w-full flex items-end justify-between p-4 group border-b border-slate-200 dark:border-zinc-700 gap-3"
            >
              <div className="flex flex-col flex-1 gap-2">
                <div className="flex items-center bg-amber-800/50 px-1 py-[2px] rounded w-fit">
                  <h4 className="text-xs font-medium text-orange-500">
                    {chapter.title}
                  </h4>
                </div>
              </div>
              <Button size="sm" variant="secondary" className="text-xs">
                {/* <PlayCircle className="h-4 w-4 mr-1" /> */}
                {t("novelDetail.去创作")}
              </Button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCharacters = () => {
    if (isCharactersLoading) {
      return renderLoading();
    }
    if (charactersError) {
      return (
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm text-secondary">加载失败...</span>
        </div>
      );
    }

    return (
      <div className="bg-card-custom flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {characters.map((character: Character, index: number) => (
            <CharactorCard key={character.characterId} character={character} />
          ))}
        </div>
      </div>
    );
  };

  const renderCreations = () => {
    if (isCreationsLoading) {
      return renderLoading();
    }
    if (creationsError) {
      return (
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm text-secondary">加载失败...</span>
        </div>
      );
    }
    return (
      <div className="bg-card-custom flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
          {creations.map((creation: Creation, index: number) => (
            <CreationCard key={creation.creationId} creation={creation} />
          ))}
        </div>
      </div>
    );
  };

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
      <div className="flex-1 overflow-scroll flex flex-col space-y-4 pt-4 h-[calc(100vh-56px)]">
        {/* 书籍信息 */}
        <div className="flex gap-4 px-6 flex-shrink-0">
          <div className="w-24 md:w-36 lg:w-42 aspect-[3/4] bg-[url('/novel-cover.png')] bg-cover bg-center rounded-lg" />
          <div className="flex-1 flex flex-col justify-between py-2">
            <div className="flex flex-col gap-2 lg:gap-3">
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
                  {novel?.chapterList?.length} {t("novelDetail.章节数")}
                </span>
              </div>
            </div>
            {/* <p className="text-sm text-muted-foreground leading-relaxed text-secondary">
              {novel.description || t("novelDetail.暂无简介")}
            </p> */}
            <div className="flex items-center gap-1 text-secondary">
              <Calendar className="h-3 w-3" />
              <span className="text-sm">
                {t("novelDetail.上传于")}: {formatDate(novel.uploadTime)}
              </span>
            </div>
          </div>
        </div>

        <CustomTabs
          variant="grid"
          size="md"
          defaultValue="chapters"
          className="gap-0"
          tabsListClassName="p-0 rounded-b-none"
          tabsTriggerClassName="rounded-b-none"
          tabsContentClassName="dark:data-[state=active]:bg-zinc-800 dark:bg-gray-700/30 mt-0 p-0 mt-[-1px] min-h-[200px]"
          onValueChange={(value) => {}}
          items={[
            {
              value: "chapters",
              label: "章节列表",
              content: renderChapters(),
            },
            {
              value: "characters",
              label: "角色库",
              content: renderCharacters(),
            },
            {
              value: "creations",
              label: "关联创作",
              content: renderCreations(),
            },
          ]}
        />
      </div>
    </div>
  );
}
