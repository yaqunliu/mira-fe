"use client";

import { useState, useEffect } from "react";
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
      toast.success("创作初始化成功，正在进行内容分析！");
      console.log("ICreation response:", response);
      setCreationId(response?.data?.creation_id || response);
    },
    onError: (error: Error) => {
      toast.error(error.message || "创建失败，请重试");
      console.error("ICreation error:", error);
    },
  });

  const analyseContent = () => {
    // 验证是否选择了小说和章节
    if (!selectedNovel) {
      toast.error("请先选择小说");
      return;
    }

    if (selectedChapters.length === 0) {
      toast.error("请至少选择一个章节");
      return;
    }

    // 调用创建接口
    createCreationMutation.mutate({
      novelId: selectedNovel.novel_id,
      chapterIds: selectedChapters.map((chapter) => chapter.chapter_id),
    });
  };

  const handleResetNovel = () => {
    setSelectedNovel(null);
    setSelectedChapters([]);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto border-none p-0 gap-3">
      <CardContent className="space-y-4">
        {/** 添加Tabs切换，有两个选项"从小说列表中选择"和"上传小说" */}
        <div className="text-base font-bold text-gray-300">选择剧本</div>
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
              label: "小说改编",
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
                        重置
                      </Button>
                    }
                  />
                  {selectedChapters.length > 0 && (
                    <div className="flex justify-center">
                      <Button
                        variant="default"
                        size="lg"
                        onClick={analyseContent}
                        disabled={createCreationMutation.isPending || isLoading}
                        className="bg-primary"
                      >
                        {createCreationMutation.isPending || isLoading ? "内容分析中..." : "下一步"}
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  )}
                </div>
              ),
            },
            {
              value: "list",
              label: "智能生成",
              content: <div>规划中...</div>,
            },
          ]}
        />
      </CardContent>
    </Card>
  );
}
