"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  novelUploadSchema,
  type NovelUploadFormData,
} from "@/lib/validations/novel";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, X, CheckCircle, Loader2 } from "lucide-react";
import { formatFileSize } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { novelApi } from "@/lib/api/novel";
import { TaskStatus } from "@/types";
import { useQuery } from "@tanstack/react-query";
import taskApi from "@/lib/api/task";

// 文件上传配置
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 100MB max file size

export function NovelUpload({
  onComplete,
}: {
  onComplete: (novelId: string) => void;
}) {
  const t = useTranslations("createVideo");
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [uploadCompleted, setUploadCompleted] = useState(false);
  const [novelId, setNovelId] = useState<string | null>(null);
  const timer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, []);

  const {data: task, isLoading} = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => taskApi.queryTaskStatus(taskId as string),
    enabled: !!taskId,
    refetchInterval: (query) => {
      const taskStatus = query.state.data?.data?.status;
      if ([TaskStatus.SUCCESS, TaskStatus.FAILURE].includes(taskStatus)) {
        setIsUploading(false);
        setUploadCompleted(true);
        setNovelId(query.state.data?.data?.novel_id);
        onComplete(query.state.data?.data?.novel_id as string);
        return false;
      }
      return 2000;
    },
  });

  const form = useForm<NovelUploadFormData>({
    resolver: zodResolver(novelUploadSchema),
    defaultValues: {
      title: "",
      author: "",
      description: "",
    },
  });

  // 文件选择处理
  const handleFileSelect = (file: File) => {
    // 验证文件类型
    if (!file.name.endsWith(".txt")) {
      toast.error("请选择 .txt 文件");
      return;
    }

    // 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`文件大小不能超过 ${formatFileSize(MAX_FILE_SIZE)}`);
      return;
    }

    setSelectedFile(file);

    // 尝试从文件名提取标题
    const fileName = file.name.replace(".txt", "");
    if (fileName && !form.getValues("title")) {
      form.setValue("title", fileName);
    }
  };

  // 拖拽处理
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // 文件输入处理
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // 移除文件
  const removeFile = () => {
    setSelectedFile(null);
    // 重置文件输入框，允许重新选择同一个文件
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("请选择要上传的小说");
      return;
    }

    try {
      setIsUploading(true);
      toast.info("正在上传文件...");

      // 上传小说文件
      const response = await novelApi.uploadNovel(selectedFile, {
        title: form.getValues("title"),
        author: form.getValues("author"),
        description: form.getValues("description"),
      });

      // 后端返回的数据中包含 taskId
      // @ts-ignore - 后端可能返回不同的数据结构
      const uploadTaskId = response?.data?.task_id;

      if (uploadTaskId) {
        toast.success("文件上传成功，开始解析...");
        setTaskId(uploadTaskId); // 设置 taskId 后会自动开始轮询
      } else {
        toast.error("上传成功但未返回任务ID");
        setIsUploading(false);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "上传失败，请重试");
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 文件上传区域 */}
      {!uploadCompleted && (
        <div
          onDrop={isUploading ? undefined : handleDrop}
          onDragOver={isUploading ? undefined : handleDragOver}
          className={`border-1 border-dashed border-orange-400/40 rounded-lg p-6 text-center transition-colors ${
            isUploading
              ? "cursor-not-allowed opacity-60 border-muted-foreground/25"
              : selectedFile
              ? "border-green-500 bg-green-50 dark:bg-green-950/30 dark:border-green-400/30 cursor-pointer"
              : "border-muted-foreground/25 hover:border-primary/50 cursor-pointer"
          }`}
          onClick={
            isUploading ? undefined : () => fileInputRef.current?.click()
          }
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt"
            onChange={handleFileInputChange}
            className="hidden"
            disabled={isUploading}
          />

          {selectedFile ? (
            <div className="space-y-4">
              {isUploading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                </div>
              ) : (
                <CheckCircle className="h-8 w-8 mx-auto text-green-600" />
              )}
              <div className="space-y-1">
                <p className="text-md font-medium">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                </p>
                {isUploading && (
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                    正在上传中，请稍候...
                  </p>
                )}
              </div>
              {!isUploading && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile();
                  }}
                  className="text-gray-400 underline"
                >
                  <X className="h-4 w-4 text-red-700" />
                  移除文件
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="h-8 w-8 mx-auto text-orange-500" />
              <div>
                <div className="text-base font-medium">拖拽或点击上传小说</div>
                <div className="text-xs text-muted-foreground mt-2 text-gray-500">
                  支持最大 {formatFileSize(MAX_FILE_SIZE)} 的.txt文件
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 任务完成或失败提示 */}
      {task && !isLoading && (
        <div
          className={`p-4 border rounded-lg ${
            task.status === TaskStatus.SUCCESS
              ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
              : task.status === TaskStatus.FAILURE
              ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
              : ""
          }`}
        >
          <div className="flex items-center gap-2">
            {task.status === TaskStatus.SUCCESS ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-900 dark:text-green-100">
                  上传小说解析完成！
                </span>
              </>
            ) : task.status === TaskStatus.FAILURE ? (
              <>
                <X className="h-5 w-5 text-red-600" />
                <span className="font-medium text-red-900 dark:text-red-100">
                  解析失败
                </span>
              </>
            ) : null}
          </div>
          {task.message && (
            <p className="text-sm mt-2 text-muted-foreground">{task.message}</p>
          )}
        </div>
      )}

      {!uploadCompleted ? (
        <div className="flex justify-center w-full mt-8">
          <Button
            variant="secondary"
            onClick={handleUpload}
            disabled={isUploading || !selectedFile}
            className="text-primary tracking-wide w-[120px]"
          >
            {isUploading ? "上传中..." : "上传解析"}
          </Button>
        </div>
      ) : (
        <div className="flex justify-center w-full mt-8">
          <Button
            variant="secondary"
            onClick={() => novelId &&onComplete(novelId as string)}
            className="text-primary tracking-wide w-[120px]"
          >
            返回
          </Button>
        </div>
      )}
    </div>
  );
}
