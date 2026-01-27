"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Eye,
  Clock,
  Image as ImageIcon,
  HardDrive,
  CheckCircle2,
  XCircle,
  Download,
  History,
  X
} from "lucide-react";
import characterApi from "@/lib/api/character";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface CharacterImageHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  characterUuid: string;
  onSuccess: () => void;
}

interface ImageHistoryItem {
  version_id: string;
  image_url: string;
  image_prompt: string;
  model_name: string;
  visual_style: string;
  generated_at: string;
  success: boolean;
  file_size?: number;
  duration_sec?: number;
  is_current?: boolean;
}

export function CharacterImageHistoryDialog({
  isOpen,
  onClose,
  characterUuid,
  onSuccess
}: CharacterImageHistoryDialogProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  const { data: imageHistoryData, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["character-image-history", characterUuid],
    queryFn: async () => {
      const response = await characterApi.getImageHistory(characterUuid);
      return response.data;
    },
    enabled: isOpen,
  });

  const applyImageVersionMutation = useMutation({
    mutationFn: async (params: {
      characterUuid: string;
      versionId: string;
      imageUrl: string;
      imagePrompt?: string;
    }) => {
      return await characterApi.applyImageVersion(
        params.characterUuid,
        params.versionId,
        params.imageUrl,
        params.imagePrompt
      );
    },
    onSuccess: () => {
      toast.success("已成功应用历史版本");
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || "应用版本失败");
    },
  });

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "未知大小";
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb.toFixed(2)} MB`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "刚刚";
    if (diffMins < 60) return `${diffMins} 分钟前`;
    if (diffHours < 24) return `${diffHours} 小时前`;
    if (diffDays < 7) return `${diffDays} 天前`;

    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "-";
    return `${seconds.toFixed(2)}s`;
  };

  const handlePreview = (url: string) => {
    setPreviewUrl(url);
  };

  const handleDownload = (url: string) => {
    window.open(url, "_blank");
    toast.success("开始下载图片");
  };

  const handleApplyVersion = (item: ImageHistoryItem) => {
    setIsUpdating(true);
    applyImageVersionMutation.mutate({
      characterUuid,
      versionId: item.version_id,
      imageUrl: item.image_url,
      imagePrompt: item.image_prompt,
    });
  };

  const closePreview = () => {
    setPreviewUrl(null);
  };

  const imageHistory = imageHistoryData?.image_history || [];

  if (isLoadingHistory) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-500">
                <History className="h-4 w-4 text-white" />
              </div>
              角色图片历史
            </DialogTitle>
          </DialogHeader>
          <div className="py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-gray-200 border-t-blue-500"></div>
            <p className="text-sm text-gray-500 mt-4">加载中...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-500">
                <History className="h-4 w-4 text-white" />
              </div>
              角色图片历史
            </DialogTitle>
            <DialogDescription>
              查看角色图片的生成历史并选择版本应用为最终效果
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[50vh]">
            <div className="px-1 py-2 space-y-3">
              {imageHistory.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="flex items-center justify-center mb-4">
                    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 border border-gray-200">
                      <ImageIcon className="h-8 w-8 text-gray-300" />
                    </div>
                  </div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">暂无图片历史记录</h3>
                  <p className="text-xs text-gray-400">生成图片后将显示历史记录</p>
                </div>
              ) : (
                imageHistory.map((item: ImageHistoryItem, index: number) => (
                  <Card
                    key={item.version_id || index}
                    className="overflow-hidden border-0 transition-all hover:shadow-lg bg-white"
                  >
                    <CardContent className="p-0">
                      <div className="flex items-start gap-3 p-3">
                        <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-gray-100">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={`版本 ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <ImageIcon size={24} />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3 w-3 text-gray-400" />
                                <span className="text-xs text-gray-500">
                                  {formatDate(item.generated_at)}
                                </span>
                              </div>
                              {item.success ? (
                                <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-green-50 border border-green-100">
                                  <div className="w-1 h-1 rounded-full bg-green-500"></div>
                                  <span className="text-[10px] text-green-600 font-medium">成功</span>
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-50 border border-red-100">
                                  <div className="w-1 h-1 rounded-full bg-red-500"></div>
                                  <span className="text-[10px] text-red-600 font-medium">失败</span>
                                </div>
                              )}
                              {item.is_current && (
                                <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 border border-blue-100">
                                  <CheckCircle2 className="h-3 w-3 text-blue-500" />
                                  <span className="text-[10px] text-blue-600 font-medium">当前版本</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-[10px] text-gray-500">
                            {item.file_size && (
                              <div className="flex items-center gap-0.5">
                                <HardDrive className="h-3 w-3" />
                                <span>{formatFileSize(item.file_size)}</span>
                              </div>
                            )}
                            {item.duration_sec && (
                              <div className="flex items-center gap-0.5">
                                <Clock className="h-3 w-3" />
                                <span>{formatDuration(item.duration_sec)}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-0.5">
                              <ImageIcon className="h-3 w-3" />
                              <span>{item.model_name || "默认模型"}</span>
                            </div>
                          </div>

                          {item.image_url && (
                            <div className="flex gap-1.5 pt-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePreview(item.image_url!)}
                                className="h-6 text-[10px] px-2 border-gray-200 hover:bg-gray-50"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                预览
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownload(item.image_url!)}
                                className="h-6 text-[10px] px-2 border-gray-200 hover:bg-gray-50"
                              >
                                <Download className="h-3 w-3 mr-1" />
                                下载
                              </Button>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleApplyVersion(item)}
                                disabled={isUpdating || item.is_current}
                                className="h-6 text-[10px] px-2 bg-green-500 hover:bg-green-600 text-white"
                              >
                                {item.is_current ? "当前版本" : "应用版本"}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>

          <div className="flex justify-end pt-2 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-gray-200 hover:bg-gray-50 text-sm"
            >
              关闭
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {previewUrl && (
        <Dialog open={!!previewUrl} onOpenChange={closePreview}>
          <DialogContent className="sm:max-w-[90vw] max-h-[90vh] p-0 overflow-hidden bg-black">
            <DialogTitle className="sr-only">图片预览</DialogTitle>
            <DialogDescription className="sr-only">图片预览查看器</DialogDescription>
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={closePreview}
                className="absolute top-3 right-3 z-50 bg-black/40 hover:bg-black/60 border border-white/20 rounded-full w-9 h-9"
              >
                <X className="h-4 w-4 text-white" />
              </Button>
              <div className="flex items-center justify-center min-h-[50vh] max-h-[85vh]">
                <img
                  src={previewUrl}
                  alt="预览"
                  className="max-w-full max-h-[85vh] object-contain"
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
