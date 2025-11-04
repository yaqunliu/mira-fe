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
import { NovelUpload } from "../novel-upload";
import { NovelSelect } from "../novel-select";
import { Novel, Chapter } from "@/types";
import scene from "@/mock/scene.json";
import { ArrowRight, X } from "lucide-react";

export function StorySetting({
  onComplete = () => {},
}: {
  onComplete: (scenes: any[]) => void;
}) {
  const t = useTranslations("createVideo");
  const [selectedNovel, setSelectedNovel] = useState<Novel | null>(null);
  const [selectedChapters, setSelectedChapters] = useState<Chapter[]>([]);
  const [uploadState, setUploadState] = useState<"pending" | "completed">(
    "pending"
  );

  const form = useForm<NovelUploadFormData>({
    resolver: zodResolver(novelUploadSchema),
    defaultValues: {
      title: "",
      author: "",
      description: "",
    },
  });

  const handleUpload = (file: File[]) => {
    setUploadState("completed");
    // 创建上传的小说对象
    const uploadedNovel: Novel = {
      novelId: "uploaded-" + Date.now(),
      title: file?.[0]?.name.replace(/\.[^/.]+$/, ""), // 移除文件扩展名
      author: "未知作者",
      uploadTime: new Date().toISOString(),
      chapterList: [
        {
          chapterId: "chapter1",
          title: "咸阳原血战",
          order: 1,
        },
        {
          chapterId: "chapter2",
          title: "黑龙突袭",
          order: 2,
        },
        {
          chapterId: "chapter3",
          title: "不死帝王与神秘剑客",
          order: 3,
        },
      ],
      relatedCreations: [],
      characterLibrary: [],
    };
    setSelectedNovel(uploadedNovel);
    // Note: chapterList contains ChapterListItem, not full Chapter objects
    // This may need adjustment based on how selectedChapters is used
    setSelectedChapters([]);
  };

  const handleNovelChange = (novel: Novel | null) => {
    setSelectedNovel(novel);
    setSelectedChapters([]); // 清空章节选择
  };

  const handleChaptersChange = (chapters: Chapter[]) => {
    setSelectedChapters(chapters);
  };

  const handleResetUpload = () => {
    setUploadState("pending");
    setSelectedNovel(null);
    setSelectedChapters([]);
  };

  const generateScenes = () => {
    onComplete(scene.data);
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
                        onClick={generateScenes}
                        className="bg-primary"
                      >
                        下一步
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
