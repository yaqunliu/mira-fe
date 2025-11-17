"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  novelUploadSchema,
  type NovelUploadFormData,
} from "@/lib/validations/novel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { useTranslations } from "next-intl";
import { CustomTabs } from "@/components/ui/custom-tabs";
import { NovelSelect } from "../novel-select";
import { Novel, Chapter } from "@/types";
import { ArrowRight, X } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import creationApi from "@/lib/api/creation";
import { toast } from "sonner";
import { useCreationPolling } from "@/hooks/use-creation-polling";

export function StorySetting({
  onComplete = () => {},
}: {
  onComplete: (creationId: string) => void;
}) {
  const t = useTranslations("createVideo");
  const [selectedNovel, setSelectedNovel] = useState<Novel | null>(null);
  const [selectedChapters, setSelectedChapters] = useState<Chapter[]>([]);
  const [uploadState, setUploadState] = useState<"pending" | "completed">(
    "pending"
  );
  const [creationId, setCreationId] = useState<string | null>(null);
  const { isPolling } = useCreationPolling(creationId, {
    onSuccess: (creation) => {
      onComplete(creation.creation_id);
    },
  })

  const form = useForm<NovelUploadFormData>({
    resolver: zodResolver(novelUploadSchema),
    defaultValues: {
      title: "",
      author: "",
      description: "",
    },
  });

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
      console.log("Creation response:", response);
      setCreationId(response?.creation_id || response);
    },
    onError: (error: Error) => {
      toast.error(error.message || "创建失败，请重试");
      console.error("Creation error:", error);
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
                        disabled={createCreationMutation.isPending || isPolling}
                        className="bg-primary"
                      >
                        {createCreationMutation.isPending || isPolling ? "内容分析中..." : "下一步"}
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
