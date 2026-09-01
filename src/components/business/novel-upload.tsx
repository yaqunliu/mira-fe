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
import { Upload, X, CheckCircle, Loader2, Info } from "lucide-react";
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
  const tNovel = useTranslations('novel');
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
        // 优先使用 novel_uuid，如果没有则从 resource.novel.uuid 获取
        const novelUuid = query.state.data?.data?.novel_uuid || 
                         query.state.data?.data?.resource?.novel_uuid ||
                         query.state.data?.data?.resource?.novel?.uuid;
        if (novelUuid) {
          setNovelId(novelUuid);
          onComplete(novelUuid as string);
        }
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
      toast.error(t("onlyTxt"));
      return;
    }

    // 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      toast.error(tNovel('fileTooLargeMax', { size: formatFileSize(MAX_FILE_SIZE) }));
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
      toast.error(t("selectNovelFirst"));
      return;
    }

    try {
      setIsUploading(true);
      toast.info(t("uploading"));

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
        toast.success(t("uploadStarted"), {
          description: t("uploadNote"),
          duration: 5000,
        });
        setTaskId(uploadTaskId); // 设置 taskId 后会自动开始轮询
        setIsUploading(false); // 文件上传完成，但任务在后台处理
      } else {
        toast.error(t("uploadNoTaskId"));
        setIsUploading(false);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("uploadFailed"));
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
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${isUploading
            ? "cursor-not-allowed opacity-60 border-blue-200 bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)]"
            : selectedFile
            ? "border-#22C55E bg-gradient-to-br from-green-50 to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] cursor-pointer"
            : "border-blue-200 bg-gradient-to-br from-white to-blue-50 hover:border-#22C55E/50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] cursor-pointer"
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
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-#22C55E"></div>
                </div>
              ) : (
                <CheckCircle className="h-10 w-10 mx-auto text-#22C55E" />
              )}
              <div className="space-y-2">
                <p className="text-md font-medium text-gray-800">{selectedFile.name}</p>
                <p className="text-sm text-gray-600">
                  {formatFileSize(selectedFile.size)}
                </p>
                {isUploading && (
                  <p className="text-sm text-#22C55E font-medium">
                    {tNovel("uploading")}
                  </p>
                )}
              </div>
              {!isUploading && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile();
                  }}
                  className="rounded-xl bg-gradient-to-br from-white to-red-50 border border-red-200 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200"
                >
                  <X className="h-4 w-4 text-red-500 mr-1" />
                  {tNovel("remove")}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="h-10 w-10 mx-auto text-#22C55E" />
              <div>
                <div className="text-base font-medium text-gray-800">{tNovel("dragOrClickUpload")}</div>
                <div className="text-xs text-gray-600 mt-2">
                  {tNovel('maxTxtFileSize', { size: formatFileSize(MAX_FILE_SIZE) })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 后台处理提示 */}
      {taskId && task && task.status !== TaskStatus.SUCCESS && task.status !== TaskStatus.FAILURE && (
        <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-white shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] border border-blue-100">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-blue-900 mb-2">
                {tNovel("processing")}
              </p>
              <p className="text-sm text-blue-700 mb-3">
                {tNovel("leavePageNote")}
              </p>
              {task.progress && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-blue-600 mb-1">
                    <span>{tNovel("processingProgress")}</span>
                    <span>{task.progress.percent || 0}%</span>
                  </div>
                  <Progress 
                    value={task.progress.percent || 0} 
                    className="h-2 bg-blue-100 rounded-full"
                  />
                  {task.progress.status && (
                    <p className="text-xs text-blue-600 mt-1">
                      {task.progress.status}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 任务完成或失败提示 */}
      {task && !isLoading && (
        <div
          className={`p-5 rounded-2xl shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] ${task.status === TaskStatus.SUCCESS
            ? "bg-gradient-to-br from-green-50 to-white border border-green-100"
            : task.status === TaskStatus.FAILURE
            ? "bg-gradient-to-br from-red-50 to-white border border-red-100"
            : ""
          }`}
        >
          <div className="flex items-center gap-2">
            {task.status === TaskStatus.SUCCESS ? (
              <>
                <CheckCircle className="h-5 w-5 text-#22C55E" />
                <span className="font-medium text-green-900">
                  {tNovel("uploadParsed")}
                </span>
              </>
            ) : task.status === TaskStatus.FAILURE ? (
              <>
                <X className="h-5 w-5 text-red-500" />
                <span className="font-medium text-red-900">
                  {tNovel("parseFailed")}
                </span>
              </>
            ) : null}
          </div>
          {task.message && (
            <p className="text-sm mt-2 text-gray-600">{task.message}</p>
          )}
        </div>
      )}

      {!uploadCompleted && !taskId ? (
        <div className="flex justify-center w-full mt-8">
          <Button
            variant="default"
            onClick={handleUpload}
            disabled={isUploading || !selectedFile}
            className="rounded-xl bg-gradient-to-br from-#22C55E to-#16A34A shadow-[4px_4px_12px_rgba(0,0,0,0.1),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200 tracking-wide w-[140px]"
          >
            {isUploading ? tNovel('uploading') : tNovel('uploadParse')}
          </Button>
        </div>
      ) : uploadCompleted ? (
        <div className="flex justify-center w-full mt-8">
          <Button
            variant="outline"
            onClick={() => novelId && onComplete(novelId as string)}
            className="rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200 tracking-wide w-[140px]"
          >
            {tNovel("back")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
