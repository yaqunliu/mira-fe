"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { novelApi } from "@/lib/api/novel";
import { formatDate } from "@/lib/utils";
import type { Novel, Chapter, ChapterListItem } from "@/types";
import type { ICharacter } from "@/types/character";
import { ICreation } from "@/types/creation";
import LoadingIcon from "@/components/ui/loading-icon";
import { CustomTabs } from "@/components/ui/custom-tabs";
import { toast } from "sonner";

import CharactorCard from "@/components/business/charactor-card";
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
    mutationFn: ({ chapterUuid, title }: { chapterUuid: string; title: string }) =>
      novelApi.updateChapter(novelId, chapterUuid, { title }),
    onSuccess: (data, variables) => {
      // 更新本地状态
      const updatedChapters = finalChapters.map((chapter: any) => {
        const uuid = String(chapter.uuid || chapter.chapter_id || chapter.chapterId);
        if (uuid === String(variables.chapterUuid)) {
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
    mutationFn: (chapterUuid: string) =>
      novelApi.deleteChapter(novelId, chapterUuid),
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

  // 当当前页为空且不是第一页时，自动跳转到最后一页
  useEffect(() => {
    if (!isChaptersLoading && finalChapters.length === 0 && chapterPage > 1 && chaptersTotalPages > 0) {
      // 如果当前页为空，且不是第一页，跳转到最后一页
      const targetPage = Math.max(1, chaptersTotalPages);
      setChapterPage(targetPage);
      setChapterPageInput("");
    }
  }, [finalChapters.length, chapterPage, chaptersTotalPages, isChaptersLoading]);

  // 当总页数变化且当前页超出范围时，自动调整到最后一页
  useEffect(() => {
    if (!isChaptersLoading && chaptersTotalPages > 0 && chapterPage > chaptersTotalPages) {
      setChapterPage(chaptersTotalPages);
      setChapterPageInput("");
    }
  }, [chaptersTotalPages, chapterPage, isChaptersLoading]);

  // 如果主响应中没有数据，使用单独的查询结果
  const finalCharacters = characters?.length ? characters : ((charactersResponse as any)?.data?.data || (charactersResponse as any)?.data || []);
  const finalCreations = creations?.length ? creations : ((creationsResponse as any)?.data?.data || (creationsResponse as any)?.data || []);

  const handleCreateVideo = async (chapterUuid?: string) => {
    if (!chapterUuid) {
      // 如果没有指定章节，跳转到创建页面，只传递小说UUID
      router.push(`/create-dynamic-comic?novel=${novelId}`);
      return;
    }

    // 先检查该章节是否已有创作
    // 从已有的创作列表中查找（小说详情API已经返回了creations列表）
    const existingCreation = finalCreations.find((creation: ICreation) => {
      const creationChapterUuid = String((creation as any).chapter_uuid || (creation as any).chapter_id || "");
      return creationChapterUuid === String(chapterUuid);
    });

    if (existingCreation) {
      // 如果已有创作，跳转到已存在的创作
      const creationUuid = (existingCreation as any).uuid || (existingCreation as any).creation_id || existingCreation.creationId;
      if (creationUuid) {
        router.push(`/dynamic-comic-editor?taskId=${creationUuid}`);
        return;
      }
    }

    // 如果列表中没有，调用API查询（后端已实现）
    try {
      const creationResponse = await creationApi.queryCreationByChapterId(String(chapterUuid));
      if (creationResponse?.data) {
        // 如果已有创作，跳转到已存在的创作
        const creationUuid = (creationResponse.data as any).uuid || (creationResponse.data as any).creation_id;
        if (creationUuid) {
          router.push(`/dynamic-comic-editor?taskId=${creationUuid}`);
          return;
        }
      }
    } catch (error) {
      // 查询失败不影响创建流程，继续创建新创作
      // 静默处理，不输出错误日志
    }

    // 如果没有创作，跳转到创建页面，传递小说UUID和章节UUID
    router.push(`/create-dynamic-comic?novel=${novelId}&chapter=${chapterUuid}`);
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
    const chapterUuid = (chapter as any).uuid || (chapter as any).chapter_id || (chapter as any).chapterId;
    if (chapterUuid) {
      setEditingChapterId(String(chapterUuid));
    }
  };

  // 保存章节标题
  const handleSaveChapterTitle = (chapterUuid: string) => {
    if (chapterTitleValue.trim()) {
      updateChapterMutation.mutate({ chapterUuid: String(chapterUuid), title: chapterTitleValue.trim() });
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
  const handleDeleteChapter = async (chapterUuid: string, chapterTitle: string) => {
    const confirmed = await confirm({
      title: t("novelDetail.deleteChapter"),
      description: t("novelDetail.deleteChapterConfirm", { title: chapterTitle }),
      confirmText: t("common.confirm"),
      cancelText: t("common.cancel"),
      variant: "destructive",
    });
    if (confirmed) {
      setDeletingChapterId(String(chapterUuid));
      deleteChapterMutation.mutate(chapterUuid);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50/50 via-white to-gray-100/30">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gradient-to-r from-[#ADD8E6]/20 to-[#ADD8E6]/10 rounded w-1/3 shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]"></div>
              <div className="h-64 bg-gradient-to-br from-white to-gray-50/80 rounded-2xl shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]"></div>
              <div className="h-96 bg-gradient-to-br from-white to-gray-50/80 rounded-2xl shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]"></div>
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
          <span className="text-sm text-secondary">{t("novelDetail.loadFailed")}</span>
        </div>
      );
    }
    if (!finalChapters?.length) {
      return (
        <Card className="overflow-hidden">
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <BookOpen className="h-7 w-7 text-muted-foreground" />
            </div>
            <div className="text-sm font-medium">{t("novelDetail.noChaptersYet")}</div>
            <div className="text-xs text-muted-foreground mt-1">{t("novelDetail.noChaptersHint")}</div>
            <div className="mt-5 flex items-center justify-center gap-2">
              <Button size="sm" onClick={() => handleCreateVideo()}>
                {t("novelDetail.goToCreate")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => router.push('/novels/upload')}>
                {t("novel.uploadNovel")}
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }
    return (
      <Card className="overflow-hidden">
        <CardHeader className="flex-row items-center justify-between space-y-0 border-b bg-muted/30">
          <div className="space-y-1">
            <CardTitle className="text-base">{t("novelDetail.chapterList")}</CardTitle>
            <CardDescription className="text-xs">{t("novelDetail.chaptersCount", { count: chaptersTotal })}</CardDescription>
          </div>
          <Button size="sm" onClick={() => handleCreateVideo()}>
            {t("novelDetail.goToCreate")}
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          <div>
            {finalChapters?.map((chapter: ChapterListItem, index: number) => {
              const chapterUuid = String((chapter as any).uuid || (chapter as any).chapter_id || (chapter as any).chapterId || `chapter-${index}`);
              const isEditing = editingChapterId === chapterUuid;
              const chapterPreview = (chapter as any).preview || "";

              return (
                <div
                  key={chapterUuid}
                  className="w-full flex items-start justify-between p-4 group border-b border-border gap-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex flex-col flex-1 gap-2">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={chapterTitleValue}
                          onChange={(e) => setChapterTitleValue(e.target.value)}
                          className="text-sm h-8 flex-1"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleSaveChapterTitle(chapterUuid);
                            } else if (e.key === "Escape") {
                              handleCancelEditChapterTitle();
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => handleSaveChapterTitle(chapterUuid)}
                          disabled={updateChapterMutation.isPending}
                        >
                          <Check className="h-4 w-4 text-green-500" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={handleCancelEditChapterTitle}
                          disabled={updateChapterMutation.isPending}
                        >
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h4
                          className="text-sm font-medium cursor-pointer hover:text-primary transition-colors"
                          onClick={() => handleStartEditChapterTitle(chapter)}
                        >
                          {chapter.title}
                        </h4>
                        <Pencil
                          className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          onClick={() => handleStartEditChapterTitle(chapter)}
                        />
                      </div>
                    )}
                    {chapterPreview && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {chapterPreview}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteChapter(chapterUuid, chapter.title);
                      }}
                      disabled={deletingChapterId === chapterUuid || deleteChapterMutation.isPending}
                      title={t("novelDetail.deleteChapter")}
                    >
                      {deletingChapterId === chapterUuid ? (
                        <LoadingIcon />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8"
                      onClick={() => handleCreateVideo(chapterUuid)}
                    >
                      {t("novelDetail.goToCreate")}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {chaptersTotalPages > 0 && chaptersTotal > 0 && (
            <div className="flex items-center justify-center gap-2 p-4 border-t border-border bg-muted/10">
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
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
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
                  {t("novelDetail.jumpToPage")}
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
        </CardContent>
      </Card>
    );
  };

  const renderCharacters = () => {
    if (isCharactersLoading && !finalCharacters?.length) {
      return renderLoading();
    }
    if (charactersError && !finalCharacters?.length) {
      return (
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm text-secondary">{t("novelDetail.loadFailed")}</span>
        </div>
      );
    }
    if (!finalCharacters?.length) {
      return (
        <Card className="overflow-hidden">
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <User className="h-7 w-7 text-muted-foreground" />
            </div>
            <div className="text-sm font-medium">{t("novelDetail.noCharacters")}</div>
            <div className="text-xs text-muted-foreground mt-1">{t("novelDetail.noCharactersHint")}</div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="text-base">{t("novelDetail.characterLibrary")}</CardTitle>
          <CardDescription className="text-xs">{t("novelDetail.charactersCount", { count: finalCharacters.length })}</CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {finalCharacters.map((character: ICharacter, index: number) => (
              <CharactorCard key={(character as any).uuid || (character as any).character_id || `character-${index}`} character={character} />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderCreations = () => {
    if (isCreationsLoading && !finalCreations?.length) {
      return renderLoading();
    }
    if (creationsError && !finalCreations?.length) {
      return (
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm text-secondary">{t("novelDetail.loadFailed")}</span>
        </div>
      );
    }
    if (!finalCreations?.length) {
      return (
        <Card className="overflow-hidden">
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <BookOpen className="h-7 w-7 text-muted-foreground" />
            </div>
            <div className="text-sm font-medium">{t("novelDetail.noCreations")}</div>
            <div className="text-xs text-muted-foreground mt-1">{t("novelDetail.noCreationsHint")}</div>
          </CardContent>
        </Card>
      );
    }
    return (
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="text-base">{t("novelDetail.relatedCreations")}</CardTitle>
          <CardDescription className="text-xs">{t("novelDetail.creationsCount", { count: finalCreations.length })}</CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {finalCreations.map((creation: ICreation, index: number) => (
              <CreationCard key={(creation as any).creation_id || `creation-${index}`} creation={creation} />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };


  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50/50 via-white to-gray-100/30">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-r from-[#ADD8E6]/20 to-[#FDBCB4]/20 flex items-center justify-center mb-4 shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]">
              <BookOpen className="h-12 w-12 text-[#ADD8E6]" />
            </div>
            <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">
              {t("novelDetail.bookNotFound")}
            </h2>
            <p className="text-sm bg-gradient-to-r from-gray-500 to-gray-700 bg-clip-text text-transparent mb-4">
              {error instanceof Error ? error.message : t("novelDetail.loadFailedShort")}
            </p>
            <Button onClick={() => router.push('/novels')} className="mt-4 bg-gradient-to-r from-[#ADD8E6] to-[#ADD8E6]/80 text-white shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]">
              {t("novelDetail.back")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoading && !novel) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50/50 via-white to-gray-100/30">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-r from-[#ADD8E6]/20 to-[#FDBCB4]/20 flex items-center justify-center mb-4 shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]">
              <BookOpen className="h-12 w-12 text-[#ADD8E6]" />
            </div>
            <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">
              {t("novelDetail.bookNotFound")}
            </h2>
            <p className="text-sm bg-gradient-to-r from-gray-500 to-gray-700 bg-clip-text text-transparent mb-4">
              {t("novelDetail.novelId", { id: novelId })}
            </p>
            <Button onClick={() => router.push('/novels')} className="mt-4 bg-gradient-to-r from-[#ADD8E6] to-[#ADD8E6]/80 text-white shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]">
              {t("novelDetail.back")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50/50 via-white to-gray-100/30">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="hover:bg-[#ADD8E6]/10 text-[#ADD8E6] hover:text-[#ADD8E6] shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)] bg-white rounded-xl">
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t("novelDetail.back")}
            </Button>
            <Button size="sm" onClick={() => handleCreateVideo()} className="bg-gradient-to-r from-[#FDBCB4] to-[#F9A899] hover:from-[#F9A899] hover:to-[#F69689] text-white shadow-[4px_4px_8px_rgba(253,188,180,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]">
              {t("novelDetail.goToCreate")}
            </Button>
          </div>

          <div className="overflow-hidden rounded-2xl shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)] bg-gradient-to-br from-white to-gray-50/80">
            <div className="p-6 md:p-8">
              <div className="flex gap-6 items-start">
                <div className="w-28 md:w-32 aspect-[3/4] bg-[url('/novel-cover.png')] bg-cover bg-center rounded-xl shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]" />
                <div className="flex-1 space-y-3">
                  {editingNovelTitle ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={novelTitleValue}
                        onChange={(e) => setNovelTitleValue(e.target.value)}
                        className="text-2xl font-bold h-10 flex-1 bg-white shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleSaveNovelTitle();
                          } else if (e.key === "Escape") {
                            handleCancelEditNovelTitle();
                          }
                        }}
                      />
                      <Button className="h-10 bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white shadow-[4px_4px_8px_rgba(34,197,94,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]" onClick={handleSaveNovelTitle} disabled={updateNovelMutation.isPending}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button className="h-10" variant="ghost" onClick={handleCancelEditNovelTitle} disabled={updateNovelMutation.isPending} className="hover:bg-gray-100 shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group">
                      <h1
                        className="text-2xl md:text-3xl font-bold tracking-tight cursor-pointer bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent"
                        onClick={handleStartEditNovelTitle}
                      >
                        {novel.title}
                      </h1>
                      <Pencil
                        className="h-5 w-5 text-[#ADD8E6] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        onClick={handleStartEditNovelTitle}
                      />
                    </div>
                  )}

                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-1.5 bg-gradient-to-r from-[#ADD8E6]/20 to-[#ADD8E6]/10 px-3 py-1 rounded-full shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]">
                      <User className="h-4 w-4 text-[#ADD8E6]" />
                      <span className="bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">{novel.author || t("novelDetail.unknownAuthor")}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-gradient-to-r from-[#ADD8E6]/20 to-[#ADD8E6]/10 px-3 py-1 rounded-full shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]">
                      <BookOpen className="h-4 w-4 text-[#ADD8E6]" />
                      <span className="bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">{(novel as any)?.chapter_count || chaptersTotal || finalChapters?.length || 0} {t("novelDetail.chapterCount")}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-gradient-to-r from-[#ADD8E6]/20 to-[#ADD8E6]/10 px-3 py-1 rounded-full shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]">
                      <Calendar className="h-4 w-4 text-[#ADD8E6]" />
                      <span className="bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">{t("novelDetail.uploadedOn")}: {formatDate((novel as any)?.created_at || (novel as any)?.uploadTime || novel?.update_time)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4">
              <CustomTabs
                variant="grid"
                size="md"
                defaultValue="chapters"
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
          </div>
        </div>
      </div>
      <ConfirmDialogComponent />
    </div>
  );
}
