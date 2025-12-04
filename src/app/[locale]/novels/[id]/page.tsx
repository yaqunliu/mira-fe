"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  User,
  Calendar,
  ChevronLeft,
  Pencil,
  Check,
  X,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { novelApi } from "@/lib/api/novel";
import { formatDate } from "@/lib/utils";
import type { Novel, Chapter, ChapterListItem } from "@/types";
import type { ICharacter } from "@/types/character";
import { ICreation } from "@/types/creation";
import LoadingIcon from "@/components/ui/loading-icon";
import { CustomTabs } from "@/components/ui/custom-tabs";
import { toast } from "sonner";

import CharactorCard from "@/components/business/charactor-card";
import VideoCard from "@/components/business/creation-card";
import CreationCard from "@/components/business/creation-card";
import creationApi from "@/lib/api/creation";
import { useConfirm } from "@/hooks/use-confirm";

export default function NovelDetailPage() {
  const router = useRouter();
  const params = useParams();
  const t = useTranslations();
  const locale = params?.locale as string;
  const novelId = params?.id as string;
  const queryClient = useQueryClient();
  const { confirm, ConfirmDialog: ConfirmDialogComponent } = useConfirm();

  // 编辑状态
  const [editingNovelTitle, setEditingNovelTitle] = useState(false);
  const [novelTitleValue, setNovelTitleValue] = useState("");
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [chapterTitleValue, setChapterTitleValue] = useState("");
  const [deletingChapterId, setDeletingChapterId] = useState<string | null>(null);
  // 章节分页状态
  const [chapterPage, setChapterPage] = useState(1);
  const [chapterPageInput, setChapterPageInput] = useState("");
  const chapterPageSize = 10;

  const {
    data: novelResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["novel", novelId],
    queryFn: () => novelApi.getNovel(novelId),
    enabled: !!novelId,
  });

  // 更新小说标题的mutation
  const updateNovelMutation = useMutation({
    mutationFn: (title: string) => novelApi.updateNovel(novelId, { title }),
    onSuccess: (data, variables) => {
      // 更新本地状态
      if (novel) {
        (novel as any).title = variables;
      }
      queryClient.invalidateQueries({ queryKey: ["novel", novelId] });
      queryClient.invalidateQueries({ queryKey: ["novels"] });
      setEditingNovelTitle(false);
      setNovelTitleValue("");
      toast.success(t("novelDetail.updateSuccess"));
    },
    onError: (error) => {
      toast.error(t("novelDetail.updateFailed"));
      console.error("更新小说标题失败:", error);
    },
  });

  // 更新章节标题的mutation
  const updateChapterMutation = useMutation({
    mutationFn: ({ chapterId, title }: { chapterId: string | number; title: string }) =>
      novelApi.updateChapter(novelId, String(chapterId), { title }),
    onSuccess: (data, variables) => {
      // 更新本地状态
      const updatedChapters = finalChapters.map((chapter: any) => {
        const id = String(chapter.chapter_id || chapter.chapterId);
        if (id === String(variables.chapterId)) {
          return { ...chapter, title: variables.title };
        }
        return chapter;
      });
      
      queryClient.invalidateQueries({ queryKey: ["novel", novelId] });
      queryClient.invalidateQueries({ queryKey: ["chapters", novelId] });
      setEditingChapterId(null);
      setChapterTitleValue("");
      toast.success(t("novelDetail.updateSuccess"));
    },
    onError: (error) => {
      toast.error(t("novelDetail.updateFailed"));
      console.error("更新章节标题失败:", error);
    },
  });

  // 删除章节的mutation
  const deleteChapterMutation = useMutation({
    mutationFn: (chapterId: string | number) =>
      novelApi.deleteChapter(novelId, String(chapterId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["novel", novelId] });
      queryClient.invalidateQueries({ queryKey: ["chapters", novelId] });
      setDeletingChapterId(null);
      toast.success(t("novelDetail.deleteChapterSuccess"));
    },
    onError: (error) => {
      toast.error(t("novelDetail.deleteChapterFailed"));
      console.error("删除章节失败:", error);
      setDeletingChapterId(null);
    },
  });

  // 处理 API 返回数据，兼容多种格式
  // API返回格式: { data: { novel_id, title, characters, creations, ... } }
  // 注意：章节数据不再从小说接口返回，需要通过章节列表接口单独获取
  const novelData = (novelResponse as any)?.data?.data || (novelResponse as any)?.data;
  const novel = novelData as Novel;
  
  // 从小说数据中提取角色、创作数据（API可能包含在响应中）
  const characters = (novelData as any)?.characters || [];
  const creations = (novelData as any)?.creations || [];
  
  // 始终使用章节列表API获取章节（支持分页）
  const {
    data: chaptersResponse,
    isLoading: isChaptersLoading,
    error: chaptersError,
  } = useQuery({
    queryKey: ["chapters", novelId, chapterPage, chapterPageSize],
    queryFn: () => novelApi.getChapters(novelId, { page: chapterPage, page_size: chapterPageSize }),
    enabled: !!novelId,
  });

  const {
    data: charactersResponse,
    isLoading: isCharactersLoading,
    error: charactersError,
  } = useQuery({
    queryKey: ["characters", novelId],
    queryFn: () => novelApi.getCharacters(novelId),
    enabled: !!novelId && !characters?.length,
  });

  const {
    data: creationsResponse,
    isLoading: isCreationsLoading,
    error: creationsError,
  } = useQuery({
    queryKey: ["creations", novelId],
    queryFn: () => novelApi.getCreationsByNovelId(novelId),
    enabled: !!novelId && !creations?.length,
  });

  // 处理章节响应数据，兼容多种格式
  const chaptersData = chaptersResponse as any;
  const finalChapters = 
    chaptersData?.data?.data || 
    chaptersData?.data?.items || 
    chaptersData?.data || 
    chaptersData?.items || 
    (Array.isArray(chaptersData) ? chaptersData : []);
  
  // 章节分页信息
  const chaptersTotal = chaptersData?.data?.total || chaptersData?.total || finalChapters.length;
  const chaptersTotalPages = Math.ceil(chaptersTotal / chapterPageSize);
  
  // 如果主响应中没有数据，使用单独的查询结果
  const finalCharacters = characters?.length ? characters : ((charactersResponse as any)?.data?.data || (charactersResponse as any)?.data || []);
  const finalCreations = creations?.length ? creations : ((creationsResponse as any)?.data?.data || (creationsResponse as any)?.data || []);

  const handleBack = () => {
    router.back();
  };

  const handleCreateVideo = async (chapterId?: string) => {
    if (!chapterId) {
      // 如果没有指定章节，跳转到创建页面，只传递小说ID
      router.push(`/${locale}/create?novel=${novelId}`);
      return;
    }

    // 先检查该章节是否已有创作
    // 从已有的创作列表中查找（小说详情API已经返回了creations列表）
    const existingCreation = finalCreations.find((creation: ICreation) => {
      const creationChapterId = String((creation as any).chapter_id || creation.chapter_id || "");
      return creationChapterId === String(chapterId);
    });

    if (existingCreation) {
      // 如果已有创作，跳转到已存在的创作
      const creationId = (existingCreation as any).creation_id || existingCreation.creationId;
      if (creationId) {
        router.push(`/${locale}/create?creationId=${creationId}`);
        return;
      }
    }

    // 如果列表中没有，调用API查询（后端已实现）
    try {
      const creationResponse = await creationApi.queryCreationByChapterId(String(chapterId));
      if (creationResponse?.data) {
        // 如果已有创作，跳转到已存在的创作
        const creationId = (creationResponse.data as any).creation_id;
        if (creationId) {
          router.push(`/${locale}/create?creationId=${creationId}`);
          return;
        }
      }
    } catch (error) {
      // 查询失败不影响创建流程，继续创建新创作
      // 静默处理，不输出错误日志
    }

    // 如果没有创作，跳转到创建页面，传递小说ID和章节ID
    router.push(`/${locale}/create?novel=${novelId}&chapter=${chapterId}`);
  };

  // 开始编辑小说标题
  const handleStartEditNovelTitle = () => {
    if (novel) {
      setNovelTitleValue(novel.title);
      setEditingNovelTitle(true);
    }
  };

  // 保存小说标题
  const handleSaveNovelTitle = () => {
    if (novelTitleValue.trim() && novelTitleValue !== novel?.title) {
      updateNovelMutation.mutate(novelTitleValue.trim());
    } else {
      setEditingNovelTitle(false);
    }
  };

  // 取消编辑小说标题
  const handleCancelEditNovelTitle = () => {
    setEditingNovelTitle(false);
    setNovelTitleValue("");
  };

  // 开始编辑章节标题
  const handleStartEditChapterTitle = (chapter: ChapterListItem) => {
    setChapterTitleValue(chapter.title);
    const chapterId = (chapter as any).chapter_id || (chapter as any).chapterId;
    if (chapterId) {
      setEditingChapterId(String(chapterId));
    }
  };

  // 保存章节标题
  const handleSaveChapterTitle = (chapterId: string | number) => {
    if (chapterTitleValue.trim()) {
      updateChapterMutation.mutate({ chapterId: String(chapterId), title: chapterTitleValue.trim() });
    } else {
      setEditingChapterId(null);
    }
  };

  // 取消编辑章节标题
  const handleCancelEditChapterTitle = () => {
    setEditingChapterId(null);
    setChapterTitleValue("");
  };

  // 删除章节
  const handleDeleteChapter = async (chapterId: string | number, chapterTitle: string) => {
    const confirmed = await confirm({
      title: t("novelDetail.deleteChapter"),
      description: t("novelDetail.deleteChapterConfirm", { title: chapterTitle }),
      confirmText: t("common.confirm") || "确认",
      cancelText: t("common.cancel") || "取消",
      variant: "destructive",
    });
    if (confirmed) {
      setDeletingChapterId(String(chapterId));
      deleteChapterMutation.mutate(chapterId);
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
        <span className="text-sm text-secondary">{t("novelDetail.loading")}</span>
      </div>
    );
  };

  const renderChapters = () => {
    if (isChaptersLoading && !finalChapters?.length) {
      return renderLoading();
    }
    if (chaptersError && !finalChapters?.length) {
      return (
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm text-secondary">加载失败...</span>
        </div>
      );
    }
    if (!finalChapters?.length) {
      return (
        <div className="flex items-center justify-center gap-2 p-4">
          <span className="text-sm text-secondary">暂无章节</span>
        </div>
      );
    }
    return (
      <div className="bg-card-custom flex-1">
        <div className="">
          {finalChapters?.map((chapter: ChapterListItem, index: number) => {
            const chapterId = String((chapter as any).chapter_id || (chapter as any).chapterId || `chapter-${index}`);
            const isEditing = editingChapterId === chapterId;
            const chapterPreview = (chapter as any).preview || "";

            return (
              <div
                key={chapterId}
                className="w-full flex items-start justify-between p-4 group border-b border-slate-200 dark:border-zinc-700 gap-3"
              >
                <div className="flex flex-col flex-1 gap-2">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={chapterTitleValue}
                        onChange={(e) => setChapterTitleValue(e.target.value)}
                        className="text-xs h-7 flex-1"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleSaveChapterTitle(chapterId);
                          } else if (e.key === "Escape") {
                            handleCancelEditChapterTitle();
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => handleSaveChapterTitle(chapterId)}
                        disabled={updateChapterMutation.isPending}
                      >
                        <Check className="h-4 w-4 text-green-500" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={handleCancelEditChapterTitle}
                        disabled={updateChapterMutation.isPending}
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group/item">
                      <div
                        className="flex items-center bg-orange-100 dark:bg-amber-800/50 px-1 py-[2px] rounded w-fit cursor-pointer hover:bg-orange-200 dark:hover:bg-amber-800/70 transition-colors border border-orange-300 dark:border-transparent"
                        onClick={() => handleStartEditChapterTitle(chapter)}
                      >
                        <h4 className="text-xs font-medium text-orange-800 dark:text-orange-500">
                          {chapter.title}
                        </h4>
                      </div>
                      <Pencil
                        className="h-3 w-3 text-secondary opacity-0 group-hover/item:opacity-100 transition-opacity cursor-pointer"
                        onClick={() => handleStartEditChapterTitle(chapter)}
                      />
                    </div>
                  )}
                  {chapterPreview && (
                    <p className="text-xs text-secondary mt-1 line-clamp-2">
                      {chapterPreview}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteChapter(chapterId, chapter.title);
                    }}
                    disabled={deletingChapterId === chapterId || deleteChapterMutation.isPending}
                    title={t("novelDetail.deleteChapter")}
                  >
                    {deletingChapterId === chapterId ? (
                      <LoadingIcon />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="text-xs"
                    onClick={() => handleCreateVideo(chapterId)}
                  >
                    {t("novelDetail.goToCreate")}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* 章节分页 */}
        {chaptersTotalPages > 1 && (
          <div className="flex items-center justify-center gap-2 p-4 border-t border-slate-200 dark:border-zinc-700">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setChapterPage((p) => Math.max(1, p - 1));
                setChapterPageInput("");
              }}
              disabled={chapterPage <= 1 || isChaptersLoading}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {chapterPage} / {chaptersTotalPages}
              </span>
              <Input
                type="number"
                min={1}
                max={chaptersTotalPages}
                value={chapterPageInput}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "" || (Number(value) >= 1 && Number(value) <= chaptersTotalPages)) {
                    setChapterPageInput(value);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && chapterPageInput) {
                    const page = Number(chapterPageInput);
                    if (page >= 1 && page <= chaptersTotalPages) {
                      setChapterPage(page);
                      setChapterPageInput("");
                    }
                  }
                }}
                placeholder={String(chapterPage)}
                className="w-20 h-8 text-center text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (chapterPageInput) {
                    const page = Number(chapterPageInput);
                    if (page >= 1 && page <= chaptersTotalPages) {
                      setChapterPage(page);
                      setChapterPageInput("");
                    }
                  }
                }}
                disabled={!chapterPageInput || isChaptersLoading}
                className="h-8 text-xs"
              >
                跳转
              </Button>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setChapterPage((p) => Math.min(chaptersTotalPages, p + 1));
                setChapterPageInput("");
              }}
              disabled={chapterPage >= chaptersTotalPages || isChaptersLoading}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="w-4 h-4 rotate-180" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderCharacters = () => {
    if (isCharactersLoading && !finalCharacters?.length) {
      return renderLoading();
    }
    if (charactersError && !finalCharacters?.length) {
      return (
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm text-secondary">加载失败...</span>
        </div>
      );
    }
    if (!finalCharacters?.length) {
      return (
        <div className="flex items-center justify-center gap-2 p-4">
          <span className="text-sm text-secondary">暂无角色</span>
        </div>
      );
    }

    return (
      <div className="bg-card-custom flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {finalCharacters.map((character: ICharacter, index: number) => (
            <CharactorCard key={(character as any).character_id || `character-${index}`} character={character} />
          ))}
        </div>
      </div>
    );
  };

  const renderCreations = () => {
    if (isCreationsLoading && !finalCreations?.length) {
      return renderLoading();
    }
    if (creationsError && !finalCreations?.length) {
      return (
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm text-secondary">加载失败...</span>
        </div>
      );
    }
    if (!finalCreations?.length) {
      return (
        <div className="flex items-center justify-center gap-2 p-4">
          <span className="text-sm text-secondary">暂无创作</span>
        </div>
      );
    }
    return (
      <div className="bg-card-custom flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
          {finalCreations.map((creation: ICreation, index: number) => (
            <CreationCard key={(creation as any).creation_id || `creation-${index}`} creation={creation} />
          ))}
        </div>
      </div>
    );
  };


  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50/60 via-purple-50/30 to-slate-50/30 dark:bg-black">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto text-center">
            <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">
              {t("novelDetail.bookNotFound")}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {error instanceof Error ? error.message : '加载失败'}
            </p>
            <Button onClick={handleBack} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("novelDetail.back")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoading && !novel) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50/60 via-purple-50/30 to-slate-50/30 dark:bg-black">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto text-center">
            <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">
              {t("novelDetail.bookNotFound")}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              小说ID: {novelId}
            </p>
            <Button onClick={handleBack} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("novelDetail.back")}
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
          <h1 className="text-base text-secondary">{t("novelDetail.back")}</h1>
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
              {editingNovelTitle ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={novelTitleValue}
                    onChange={(e) => setNovelTitleValue(e.target.value)}
                    className="text-xl font-bold flex-1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSaveNovelTitle();
                      } else if (e.key === "Escape") {
                        handleCancelEditNovelTitle();
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={handleSaveNovelTitle}
                    disabled={updateNovelMutation.isPending}
                  >
                    <Check className="h-4 w-4 text-green-500" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={handleCancelEditNovelTitle}
                    disabled={updateNovelMutation.isPending}
                  >
                    <X className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group/item">
                  <h1
                    className="text-xl font-bold text-primary mb-2 cursor-pointer hover:text-primary/80 transition-colors"
                    onClick={handleStartEditNovelTitle}
                  >
                    {novel.title}
                  </h1>
                  <Pencil
                    className="h-4 w-4 text-secondary opacity-0 group-hover/item:opacity-100 transition-opacity cursor-pointer mb-2"
                    onClick={handleStartEditNovelTitle}
                  />
                </div>
              )}
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span className="text-sm">{novel.author}</span>
              </div>
              <div className="flex items-center gap-1">
                <BookOpen className="h-3 w-3 flex-shrink-0" />
                <span className="text-sm whitespace-nowrap">
                  {novel?.chapter_count || finalChapters?.length || 0} {t("novelDetail.chapterCount")}
                </span>
              </div>
            </div>
            {/* <p className="text-sm text-muted-foreground leading-relaxed text-secondary">
              {novel.description || t("novelDetail.noDescription")}
            </p> */}
            <div className="flex items-center gap-1 text-secondary">
              <Calendar className="h-3 w-3" />
              <span className="text-sm">
                {t("novelDetail.uploadedOn")}: {formatDate((novel as any)?.created_at || (novel as any)?.uploadTime || novel?.update_time)}
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
              label: t("novelDetail.chapterList"),
              content: renderChapters(),
            },
            {
              value: "characters",
              label: t("novelDetail.characterLibrary"),
              content: renderCharacters(),
            },
            {
              value: "creations",
              label: t("novelDetail.relatedCreations"),
              content: renderCreations(),
            },
          ]}
        />
      </div>
      <ConfirmDialogComponent />
    </div>
  );
}
