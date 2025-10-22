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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent
} from "@/components/ui/card";

import { useTranslations } from "next-intl";
import { CustomTabs } from "@/components/ui/custom-tabs";
import { NovelUpload } from "./novel-upload";
import { NovelSelect } from "./novel-select";
import { Novel, Chapter } from "@/types";
import scene from "@/mock/scene.json";
import { ArrowRight } from "lucide-react";

export function StorySetting({ onComplete = () => {} }: { onComplete: (scenes: any[]) => void }) {
  const t = useTranslations("createVideo");
  const [selectedNovel, setSelectedNovel] = useState<Novel | null>(null);
  const [selectedChapters, setSelectedChapters] = useState<Chapter[]>([]);
  const [uploadState, setUploadState] = useState<"pending" | "completed">(
    "pending"
  );

  // 模拟小说列表数据
  const mockNovels: Novel[] = [
    {
      id: "1",
      title: "不死之帝王",
      author: "作者A",
      description: "一个关于不死帝王的奇幻故事",
      status: "completed",
      chapters: [
        {
          id: "chapter1",
          novelId: "1",
          chapterId: "第一章",
          title: "咸阳原血战",
          content: "第一章内容...",
          order: 1,
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
        },
        {
          id: "chapter2",
          novelId: "1",
          chapterId: "第二章",
          title: "黑龙突袭",
          content: "第二章内容...",
          order: 2,
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
        },
        {
          id: "chapter3",
          novelId: "1",
          chapterId: "第三章",
          title: "不死帝王与神秘剑客",
          content: "第三章内容...",
          order: 3,
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
        },
      ],
      createdAt: "2024-01-01",
      updatedAt: "2024-01-01",
    },
    {
      id: "2",
      title: "修仙传",
      author: "作者B",
      description: "一个修仙者的成长历程",
      status: "completed",
      chapters: [
        {
          id: "chapter1",
          novelId: "2",
          chapterId: "第一章",
          title: "初入仙门",
          content: "第一章内容...",
          order: 1,
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
        },
        {
          id: "chapter2",
          novelId: "2",
          chapterId: "第二章",
          title: "修炼之路",
          content: "第二章内容...",
          order: 2,
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
        },
      ],
      createdAt: "2024-01-01",
      updatedAt: "2024-01-01",
    },
  ];

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
      id: "uploaded-" + Date.now(),
      title: file?.[0]?.name.replace(/\.[^/.]+$/, ""), // 移除文件扩展名
      author: "未知作者",
      description: "通过文件上传的小说",
      status: "completed",
      chapters: [
        {
          id: "chapter1",
          novelId: "uploaded-" + Date.now(),
          chapterId: "第一章",
          title: "咸阳原血战",
          content: "第一章内容...",
          order: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "chapter2",
          novelId: "uploaded-" + Date.now(),
          chapterId: "第二章",
          title: "黑龙突袭",
          content: "第二章内容...",
          order: 2,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "chapter3",
          novelId: "uploaded-" + Date.now(),
          chapterId: "第三章",
          title: "不死帝王与神秘剑客",
          content: "第三章内容...",
          order: 3,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSelectedNovel(uploadedNovel);
    setSelectedChapters(uploadedNovel.chapters.slice(0, 1));
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

  return (
    <Card className="w-full max-w-4xl mx-auto border-none p-0 gap-3">
      <CardContent className="space-y-4">
        {/** 添加Tabs切换，有两个选项"从小说列表中选择"和"上传小说" */}
        <div className="text-base font-bold text-gray-300">选择剧本</div>
        <CustomTabs
          variant="grid"
          size="md"
          defaultValue="upload"
          className="gap-0"
          tabsListClassName="p-0 rounded-b-none"
          tabsTriggerClassName="rounded-b-none"
          tabsContentClassName="dark:data-[state=active]:bg-zinc-800 dark:bg-gray-700/30 mt-0 px-3 py-4 mt-[-1px] rounde-b-lg"
          onValueChange={(value) => {}}
          items={[
            {
              value: "upload",
              label: "上传小说",
              content:
                uploadState === "pending" ? (
                  <NovelUpload
                    onUpload={(files: File[]) => handleUpload(files)}
                  />
                ) : (
                  <div className="space-y-3">
                    <NovelSelect
                      novels={[]}
                      fixedNovel={selectedNovel || undefined}
                      fixedAction={
                        <Button
                          variant="default"
                          size="sm"
                          onClick={handleResetUpload}
                          className="text-xs bg-secondary px-2 py-1"
                        >
                          重新上传
                        </Button>
                      }
                      selectedChapters={selectedChapters}
                      onChaptersChange={handleChaptersChange}
                      multiSelect={false}
                      showSearch={false}
                      showChapterCount={true}
                      novelClassName="border-orange-500/20 dark:border-orange-400/20 bg-orange-100/10 dark:bg-orange-900/10"
                      chapterClassName="border-none p-0"
                    />
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
                  </div>
                ),
            },
            {
              value: "list",
              label: "选择小说",
              content: (
                <NovelSelect
                  novels={mockNovels}
                  selectedNovel={selectedNovel}
                  selectedChapters={selectedChapters}
                  onNovelChange={handleNovelChange}
                  onChaptersChange={handleChaptersChange}
                  multiSelect={false}
                  showSearch={false}
                  showChapterCount={false}
                  novelClassName="border-orange-500/20 dark:border-orange-500/10 bg-orange-50/10 dark:bg-orange-900/10"
                  chapterClassName="border-none p-0"
                />
              ),
            },
          ]}
        />
      </CardContent>
    </Card>
  );
}
