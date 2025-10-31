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
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  Pause,
  Play,
  RotateCcw,
  CloudUpload,
} from "lucide-react";
import { formatFileSize } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

// 分片上传配置
const CHUNK_SIZE = 1024 * 1024; // 1MB per chunk
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB max file size
const MAX_RETRIES = 3;

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  status: "pending" | "uploading" | "paused" | "completed" | "error";
  error?: string;
}

interface ChunkUpload {
  chunk: Blob;
  index: number;
  totalChunks: number;
  uploadId: string;
  retryCount: number;
}

export function NovelUpload({
  onUpload
}: {
  onUpload: (files: File[]) => void;
}) {
  const t = useTranslations("createVideo");
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    loaded: 0,
    total: 0,
    percentage: 0,
    status: "pending",
  });
  const [isUploading, setIsUploading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [chunks, setChunks] = useState<ChunkUpload[]>([]);
  const [completedChunks, setCompletedChunks] = useState<Set<number>>(
    new Set()
  );
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(0);

  const form = useForm<NovelUploadFormData>({
    resolver: zodResolver(novelUploadSchema),
    defaultValues: {
      title: "",
      author: "",
      description: "",
    },
  });

  // 计算上传速度
  const calculateSpeed = useCallback((loaded: number, timeElapsed: number) => {
    if (timeElapsed === 0) return 0;
    return loaded / timeElapsed;
  }, []);

  // 计算剩余时间
  const calculateEstimatedTime = useCallback(
    (speed: number, remaining: number) => {
      if (speed === 0) return 0;
      return remaining / speed;
    },
    []
  );

  // 创建分片
  const createChunks = useCallback((file: File): ChunkUpload[] => {
    const chunks: ChunkUpload[] = [];
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const uploadId = `upload_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      chunks.push({
        chunk,
        index: i,
        totalChunks,
        uploadId,
        retryCount: 0,
      });
    }

    return chunks;
  }, []);

  // 上传单个分片
  const uploadChunk = async (chunkUpload: ChunkUpload): Promise<boolean> => {
    const formData = new FormData();
    formData.append("chunk", chunkUpload.chunk);
    formData.append("index", chunkUpload.index.toString());
    formData.append("totalChunks", chunkUpload.totalChunks.toString());
    formData.append("uploadId", chunkUpload.uploadId);
    formData.append("fileName", selectedFile!.name);

    try {
      const response = await fetch("/api/upload/chunk", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error(`Chunk ${chunkUpload.index} upload failed:`, error);
      return false;
    }
  };

  // 完成上传
  const completeUpload = async (
    metadata: NovelUploadFormData
  ): Promise<boolean> => {
    try {
      const response = await fetch("/api/upload/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uploadId,
          fileName: selectedFile!.name,
          metadata,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error("Complete upload failed:", error);
      return false;
    }
  };

  // 开始上传
  const startUpload = async (metadata: NovelUploadFormData) => {
    if (!selectedFile) {
      toast.error("请选择要上传的文件");
      return;
    }

    try {
      setIsUploading(true);
      setIsPaused(false);
      setUploadProgress({
        loaded: 0,
        total: selectedFile.size,
        percentage: 0,
        status: "uploading",
      });

      // 创建分片
      const fileChunks = createChunks(selectedFile);
      setChunks(fileChunks);
      setUploadId(fileChunks[0].uploadId);

      const startTime = Date.now();
      let completedSize = 0;

      // 上传分片
      for (let i = 0; i < fileChunks.length; i++) {
        if (isPaused) {
          setUploadProgress((prev) => ({ ...prev, status: "paused" }));
          return;
        }

        const chunkUpload = fileChunks[i];
        let success = false;
        let retryCount = 0;

        // 重试机制
        while (!success && retryCount < MAX_RETRIES) {
          success = await uploadChunk(chunkUpload);
          if (!success) {
            retryCount++;
            await new Promise((resolve) =>
              setTimeout(resolve, 1000 * retryCount)
            );
          }
        }

        if (!success) {
          setUploadProgress((prev) => ({
            ...prev,
            status: "error",
            error: `分片 ${i + 1} 上传失败`,
          }));
          return;
        }

        completedSize += chunkUpload.chunk.size;
        setCompletedChunks((prev) => new Set([...prev, i]));

        // 更新进度
        const timeElapsed = (Date.now() - startTime) / 1000;
        const speed = calculateSpeed(completedSize, timeElapsed);
        const remaining = selectedFile.size - completedSize;
        const eta = calculateEstimatedTime(speed, remaining);

        setUploadSpeed(speed);
        setEstimatedTime(eta);
        setUploadProgress({
          loaded: completedSize,
          total: selectedFile.size,
          percentage: Math.round((completedSize / selectedFile.size) * 100),
          status: "uploading",
        });
      }

      // 完成上传
      const uploadSuccess = await completeUpload(metadata);
      if (uploadSuccess) {
        setUploadProgress((prev) => ({ ...prev, status: "completed" }));
        toast.success("小说上传成功！");
        // 重置表单
        form.reset();
        setSelectedFile(null);
        setUploadProgress({
          loaded: 0,
          total: 0,
          percentage: 0,
          status: "pending",
        });
        setCompletedChunks(new Set());
        setChunks([]);
        setUploadId(null);
      } else {
        setUploadProgress((prev) => ({
          ...prev,
          status: "error",
          error: "上传完成失败",
        }));
        toast.error("上传完成失败");
      }
    } catch (error) {
      console.error("Upload error:", error);
      setUploadProgress((prev) => ({
        ...prev,
        status: "error",
        error: "上传失败，请重试",
      }));
      toast.error("上传失败，请重试");
    } finally {
      setIsUploading(false);
    }
  };

  // 暂停上传
  const pauseUpload = () => {
    setIsPaused(true);
    setUploadProgress((prev) => ({ ...prev, status: "paused" }));
  };

  // 恢复上传
  const resumeUpload = () => {
    setIsPaused(false);
    setUploadProgress((prev) => ({ ...prev, status: "uploading" }));
    // 继续上传剩余的分片
    if (selectedFile && form.formState.isValid) {
      startUpload(form.getValues());
    }
  };

  // 取消上传
  const cancelUpload = () => {
    setIsUploading(false);
    setIsPaused(false);
    setUploadProgress({
      loaded: 0,
      total: 0,
      percentage: 0,
      status: "pending",
    });
    setCompletedChunks(new Set());
    setChunks([]);
    setUploadId(null);
  };

  // 重新开始上传
  const restartUpload = () => {
    cancelUpload();
    if (selectedFile && form.formState.isValid) {
      startUpload(form.getValues());
    }
  };

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
    console.log(files);
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // 移除文件
  const removeFile = () => {
    setSelectedFile(null);
    setUploadProgress({
      loaded: 0,
      total: 0,
      percentage: 0,
      status: "pending",
    });
    setCompletedChunks(new Set());
    setChunks([]);
    setUploadId(null);
    // 重置文件输入框，允许重新选择同一个文件
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      toast.error("请选择要上传的小说");
      return;
    }
    // startUpload(form.getValues());
    onUpload([selectedFile]);
  };

  return (
    <div className="space-y-6">
      {/* 文件上传区域 */}
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
        onClick={isUploading ? undefined : () => fileInputRef.current?.click()}
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

      {/* 上传进度 */}
      {isUploading && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CloudUpload className="h-4 w-4" />
              <span className="text-sm font-medium">
                {uploadProgress.status === "uploading" && "上传中..."}
                {uploadProgress.status === "paused" && "已暂停"}
                {uploadProgress.status === "completed" && "上传完成"}
                {uploadProgress.status === "error" && "上传失败"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {uploadProgress.percentage}%
              </span>
              {uploadProgress.status === "uploading" && (
                <Button size="sm" variant="outline" onClick={pauseUpload}>
                  <Pause className="h-4 w-4" />
                </Button>
              )}
              {uploadProgress.status === "paused" && (
                <Button size="sm" variant="outline" onClick={resumeUpload}>
                  <Play className="h-4 w-4" />
                </Button>
              )}
              {(uploadProgress.status === "paused" ||
                uploadProgress.status === "error") && (
                <Button size="sm" variant="outline" onClick={restartUpload}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <Progress value={uploadProgress.percentage} className="w-full" />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">已上传：</span>
              <span>
                {formatFileSize(uploadProgress.loaded)} /{" "}
                {formatFileSize(uploadProgress.total)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">上传速度：</span>
              <span>{formatFileSize(uploadSpeed)}/s</span>
            </div>
            <div>
              <span className="text-muted-foreground">已完成分片：</span>
              <span>
                {completedChunks.size} / {chunks.length}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">预计剩余：</span>
              <span>
                {estimatedTime > 0
                  ? `${Math.ceil(estimatedTime)}s`
                  : "计算中..."}
              </span>
            </div>
          </div>

          {uploadProgress.error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-600">
                {uploadProgress.error}
              </span>
            </div>
          )}
        </div>
      )}

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
    </div>
  );
}
