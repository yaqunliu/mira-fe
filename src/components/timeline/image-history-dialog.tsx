"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Download,
  Eye,
  Clock,
  Image as ImageIcon,
  HardDrive,
  CheckCircle2,
  XCircle,
  Maximize2,
  X,
  History,
  User,
  MapPin,
  Film
} from "lucide-react";
import creationApi from "@/lib/api/creation";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface ImageHistoryDialogProps {
  creationId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageHistoryDialog({ creationId, isOpen, onClose }: ImageHistoryDialogProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  const { data: imageHistory, isLoading } = useQuery({
    queryKey: ["image-history", creationId],
    queryFn: async () => {
      const response = await creationApi.getImageHistory(creationId);
      return response.data;
    },
    enabled: isOpen,
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

  const handleDownload = (url: string) => {
    window.open(url, "_blank");
    toast.success("开始下载图片");
  };

  const handlePreview = (url: string) => {
    setPreviewUrl(url);
  };

  const closePreview = () => {
    setPreviewUrl(null);
  };

  const handleSelectAsFinalVersion = async (imageType: 'character' | 'scene' | 'shot', itemId: number, historyIndex: number) => {
    setIsUpdating(true);
    try {
      await creationApi.updateImageVersion(creationId, imageType, itemId, historyIndex);
      toast.success('已成功设置为最终版本');
      // 刷新页面以显示最新状态
      router.refresh();
      onClose();
    } catch (error: any) {
      toast.error(error.message || '设置版本失败');
    } finally {
      setIsUpdating(false);
    }
  };

  const renderImageList = (images: any[], type: 'character' | 'scene' | 'shot', icon: React.ReactNode) => {
    if (!images || images.length === 0) {
      return (
        <div className="py-12 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 border border-gray-200">
              {icon}
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">暂无{type === 'character' ? '角色' : type === 'scene' ? '场景' : '分镜'}图片记录</h3>
          <p className="text-xs text-gray-400">生成图片后将显示历史记录</p>
        </div>
      );
    }

    return (
      <div className="space-y-3 pb-2">
        {images.map((image, index) => (
          <Card
            key={index}
            className="overflow-hidden border-0 transition-all hover:shadow-lg bg-white"
          >
            <CardContent className="p-0">
              <div className="flex items-start gap-3 p-3">
                <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-100">
                  {image.image_url ? (
                    <img
                      src={image.image_url}
                      alt={image.character_name || image.scene_title || image.shot_title}
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
                          {formatDate(image.generated_at)}
                        </span>
                      </div>
                      {image.success ? (
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
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-[10px] text-gray-500">
                    {image.file_size && (
                      <div className="flex items-center gap-0.5">
                        <HardDrive className="h-3 w-3" />
                        <span>{formatFileSize(image.file_size)}</span>
                      </div>
                    )}
                    {image.duration_sec !== undefined && (
                      <div className="flex items-center gap-0.5">
                        <Clock className="h-3 w-3" />
                        <span>{formatDuration(image.duration_sec)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-0.5">
                      <ImageIcon className="h-3 w-3" />
                      <span>{image.model_name || "默认模型"}</span>
                    </div>
                  </div>

                  {image.image_url && (
                    <div className="flex gap-1.5 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePreview(image.image_url!)}
                        className="h-6 text-[10px] px-2 border-gray-200 hover:bg-gray-50"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        预览
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(image.image_url!)}
                        className="h-6 text-[10px] px-2 border-gray-200 hover:bg-gray-50"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        下载
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleSelectAsFinalVersion(type, image.character_id || image.scene_id || image.shot_id, index)}
                        disabled={isUpdating}
                        className="h-6 text-[10px] px-2 bg-green-500 hover:bg-green-600 text-white"
                      >
                        设为最终版
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const totalCount = (imageHistory?.characters?.length || 0) + 
                    (imageHistory?.scenes?.length || 0) + 
                    (imageHistory?.shots?.length || 0);

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-blue-400 to-blue-500 shadow-lg">
                <History className="h-5 w-5 text-white" />
              </div>
              图片生成历史
            </DialogTitle>
          </DialogHeader>
          <div className="py-16 text-center">
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
        <DialogContent className="sm:max-w-[700px] max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-blue-400 to-blue-500 shadow-lg">
                <History className="h-5 w-5 text-white" />
              </div>
              图片生成历史
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-3">
              <TabsTrigger value="all" className="text-xs">
                全部 ({totalCount})
              </TabsTrigger>
              <TabsTrigger value="character" className="text-xs">
                <User className="h-3 w-3 mr-1" />
                角色 ({imageHistory?.characters?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="scene" className="text-xs">
                <MapPin className="h-3 w-3 mr-1" />
                场景 ({imageHistory?.scenes?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="shot" className="text-xs">
                <Film className="h-3 w-3 mr-1" />
                分镜 ({imageHistory?.shots?.length || 0})
              </TabsTrigger>
            </TabsList>

            <div className="overflow-y-auto max-h-[calc(85vh-140px)] pr-1">
              <TabsContent value="all" className="mt-0">
                {renderImageList(imageHistory?.characters || [], 'character', <User className="h-6 w-6 text-blue-500" />)}
                {renderImageList(imageHistory?.scenes || [], 'scene', <MapPin className="h-6 w-6 text-green-500" />)}
                {renderImageList(imageHistory?.shots || [], 'shot', <Film className="h-6 w-6 text-purple-500" />)}
                {totalCount === 0 && (
                  <div className="py-12 text-center">
                    <div className="flex items-center justify-center mb-4">
                      <div className="flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 border border-gray-200">
                        <ImageIcon className="h-10 w-10 text-gray-300" />
                      </div>
                    </div>
                    <h3 className="text-lg font-medium text-gray-800 mb-2">暂无图片生成记录</h3>
                    <p className="text-sm text-gray-500">生成角色、场景或分镜图片后将显示历史记录</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="character" className="mt-0">
                {renderImageList(imageHistory?.characters || [], 'character', <User className="h-6 w-6 text-blue-500" />)}
              </TabsContent>

              <TabsContent value="scene" className="mt-0">
                {renderImageList(imageHistory?.scenes || [], 'scene', <MapPin className="h-6 w-6 text-green-500" />)}
              </TabsContent>

              <TabsContent value="shot" className="mt-0">
                {renderImageList(imageHistory?.shots || [], 'shot', <Film className="h-6 w-6 text-purple-500" />)}
              </TabsContent>
            </div>
          </Tabs>

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
