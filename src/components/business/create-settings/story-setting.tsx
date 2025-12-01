"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { useTranslations } from "next-intl";
import { CustomTabs } from "@/components/ui/custom-tabs";
import { NovelSelect } from "../novel-select";
import { Novel, Chapter } from "@/types";
import { ArrowRight, X } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import creationApi from "@/lib/api/creation";
import { toast } from "sonner";
import { CreationStatus } from "@/types/creation";
import { useParams, useRouter } from "next/navigation";
import { useTaskSubmission } from "@/hooks/use-task-submission";

export function StorySetting() {
  const t = useTranslations("");
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale as string;
  const [selectedNovel, setSelectedNovel] = useState<Novel | null>(null);
  const [selectedChapters, setSelectedChapters] = useState<Chapter[]>([]);
  const [creationId, setCreationId] = useState<string | null>(null);
  const {data: creation, isLoading} = useQuery({
    queryKey: ["creation", creationId],
    queryFn: () => creationApi.queryCreationById(creationId as string),
    enabled: !!creationId,
    refetchInterval: (query) => {
      if (query.state.data?.data?.status === CreationStatus.CREATED) {
        return false;
      }
      return 2000;
    },
  });

  useEffect(() => {
    if (creation?.data?.status === CreationStatus.CREATED) {
      router.replace(`/${locale}/create?creationId=${creation?.data?.creation_id}`);
    }
  }, [creation]);

  const handleNovelChange = (novel: Novel | null) => {
    setSelectedNovel(novel);
    setSelectedChapters([]); // 清空章节选择
  };

  const handleChaptersChange = (chapters: Chapter[]) => {
    setSelectedChapters(chapters);
  };

  // 创建视频创作的 mutation
  const createCreationMutation = useMutation({
    mutationFn: ({ novelId, chapterIds }: { novelId: string; chapterIds: string[] }) =>
      creationApi.createCreation({ novelId, chapterId: chapterIds[0] }),
    onSuccess: (response: any) => {
      toast.success(t("creation.shotsGenerationStart"));
      console.log("ICreation response:", response);
      setCreationId(response?.data?.creation_id || response);
    },
    onError: (error: Error) => {
      toast.error(error.message || t("errors.generationFailed"));
      console.error("ICreation error:", error);
    },
  });

  // 分析内容的内部函数
  const analyseContentInternal = useCallback(async () => {
    // 验证是否选择了小说和章节
    if (!selectedNovel) {
      toast.error(t("novel.noNovels"));
      throw new Error(t("novel.noNovels"));
    }

    if (selectedChapters.length === 0) {
      toast.error(t("novel.chapters"));
      throw new Error(t("novel.chapters"));
    }

    // 检查LLM调用积分（创建创作会触发LLM调用生成剧本）
    const { checkAndNotifyPoints } = await import('@/lib/utils/points-check')
    const pointsAvailable = await checkAndNotifyPoints(
      {
        operation_type: 'llm_call',
        model_name: 'Qwen/Qwen-Plus',
        estimated_prompt_tokens: 5000,
        estimated_completion_tokens: 10000,
      },
      t
    )

    if (!pointsAvailable) {
      throw new Error('积分不足')
    }

    // 调用创建接口
    return new Promise<void>((resolve, reject) => {
      createCreationMutation.mutate(
        {
          novelId: selectedNovel.novel_id,
          chapterIds: selectedChapters.map((chapter) => chapter.chapter_id),
        },
        {
          onSuccess: () => resolve(),
          onError: (error) => reject(error),
        }
      );
    });
  }, [selectedNovel, selectedChapters, t, createCreationMutation]);

  // 使用任务提交 hook 包装分析函数
  const { submit: analyseContent, isSubmitting: isSubmittingAnalysis } = useTaskSubmission(
    analyseContentInternal,
    {
      debounceDelay: 500,
      enableDebounce: true,
      onError: (error) => {
        console.error('积分检查失败:', error);
        // 错误已经在 analyseContentInternal 中处理了
      },
    }
  );

  const handleResetNovel = () => {
    setSelectedNovel(null);
    setSelectedChapters([]);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto border-none p-0 gap-3">
      <CardContent className="space-y-4">
        {/** 添加Tabs切换，有两个选项"从小说列表中选择"和"上传小说" */}
        <div className="text-base font-bold text-gray-300">{t("createVideo.selectScript")}</div>
        <CustomTabs
          variant="grid"
          size="md"
          defaultValue="novel"
          className="gap-0"
          tabsListClassName="p-0 rounded-b-none"
          tabsTriggerClassName="rounded-b-none"
          tabsContentClassName="dark:data-[state=active]:bg-zinc-800 dark:bg-gray-700/30 mt-0 px-3 py-4 mt-[-1px] rounded-b-lg"
          onValueChange={(value) => {}}
          items={[
            {
              value: "novel",
              label: t("createVideo.novelAdaptation"),
              content: (
                <div className="space-y-4">
                  <NovelSelect
                    selectedNovel={selectedNovel}
                    selectedChapters={selectedChapters}
                    onNovelChange={handleNovelChange}
                    onChaptersChange={handleChaptersChange}
                    novelFixedClassName="border-none bg-stone-700/60"
                    chapterClassName="border-none p-0"
                    fixedAction={
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleResetNovel}
                        className="text-secondary text-xs"
                      >
                        <X className="w-3 h-3" />
                        {t("createVideo.reset")}
                      </Button>
                    }
                  />
                  {selectedChapters.length > 0 && (
                    <div className="flex justify-center">
                      <Button
                        variant="default"
                        size="lg"
                        onClick={() => analyseContent()}
                        disabled={createCreationMutation.isPending || isLoading || isSubmittingAnalysis}
                        className="bg-primary"
                      >
                        {createCreationMutation.isPending || isLoading || isSubmittingAnalysis ? t("createVideo.analyzingContent") : t("createVideo.next")}
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  )}
                </div>
              ),
            },
            {
              value: "list",
              label: t("createVideo.aiGeneration"),
              content: <div>{t("createVideo.planning")}</div>,
            },
          ]}
        />
      </CardContent>
    </Card>
  );
}
