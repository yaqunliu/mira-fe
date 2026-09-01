// i18n-ignore-file：本文件残留的中文全部是数据契约——narration item 的
// `角色` / `内容` 字段名（读写后端 JSON，非界面文案）。界面文案已全部抽成 key。
// 契约需等后端改为 role / content 后再同步。见 en-plan.md Phase 0 白名单。
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ImagePreview } from "@/components/ui/image-preview";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  Edit3,
  Check,
  X,
  Eye,
  Loader2,
  Image as ImageIcon,
  Mic,
  ArrowRight,
  Maximize,
  Maximize2,
  PenLine,
  Film,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AIGeneratedImage, SceneGroup, ShotGenerationProgress, TaskStatus, NarrationItem } from "@/types";
import { StoryboardEditBottomSheet } from "@/components/modals/storyboard-edit-bottom-sheet";
import { NarrationEditBottomSheet } from "@/components/modals/narration-edit-bottom-sheet";
import shotApi from "@/lib/api/shot";
import taskApi from "@/lib/api/task";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface StoryboardImagesProps {
  data: SceneGroup[];
  onUpdateNarration?: (imageId: string, newNarration: NarrationItem[]) => Promise<void>;
  onImageUpdated?: (imageId: string, newImageUrl: string) => void;
  className?: string;
  onComplete: () => void;
  isGenerating?: boolean;
  progress?: ShotGenerationProgress;
  availableCharacters?: import("@/types/character").ICharacter[];
  imageModelName?: string;
  aspectRatio?: "16:9" | "9:16";
}

// 轮询间隔
const POLL_INTERVAL = 2000;

export function StoryboardImages({
  data,
  onUpdateNarration,
  onImageUpdated,
  onComplete,
  className,
  isGenerating = false,
  progress,
  availableCharacters = [],
  imageModelName,
  aspectRatio = "16:9",
}: StoryboardImagesProps) {
  const t = useTranslations();
  const [editingNarration, setEditingNarration] = useState<NarrationItem[]>([]);
  const [previewImageId, setPreviewImageId] = useState<string | null>(null);
  const [regeneratingIds, setRegeneratingIds] = useState<Set<string>>(
    new Set()
  );
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentEditingImage, setCurrentEditingImage] =
    useState<AIGeneratedImage | null>(null);
  const [isNarrationEditModalOpen, setIsNarrationEditModalOpen] =
    useState(false);
  const [currentNarrationImage, setCurrentNarrationImage] =
    useState<AIGeneratedImage | null>(null);
  
  // 本地图片数据状态（用于更新重新生成的图片）
  const [localImageUpdates, setLocalImageUpdates] = useState<Record<string, string>>({});
  
  // 本地旁白数据状态（用于更新旁白）
  const [localNarrationUpdates, setLocalNarrationUpdates] = useState<Record<string, NarrationItem[]>>({});
  
  // 轮询定时器引用
  const pollTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
  
  // 清理轮询定时器
  useEffect(() => {
    return () => {
      Object.values(pollTimersRef.current).forEach(timer => clearTimeout(timer));
    };
  }, []);

  // 获取所有图片的扁平数组
  const allImages = data.flatMap((scene) => scene.images);

  // 开始编辑分镜图
  const handleStartEdit = useCallback((image: AIGeneratedImage) => {
    setCurrentEditingImage(image);
    setIsEditModalOpen(true);
  }, []);

  // 开始编辑旁白
  const handleStartEditNarration = useCallback((image: AIGeneratedImage) => {
    setCurrentNarrationImage(image);
    setIsNarrationEditModalOpen(true);
  }, []);

  // 保存旁白编辑
  const handleSaveNarration = useCallback(
    async (imageId: string, newNarration: NarrationItem[]) => {
      try {
        // 调用 API 更新旁白
        await shotApi.updateNarration(imageId, newNarration as any);
        
        // 更新本地状态
        setLocalNarrationUpdates(prev => ({
          ...prev,
          [imageId]: newNarration,
        }));
        
        // 通知父组件（如果有回调）
        if (onUpdateNarration) {
          onUpdateNarration(imageId, newNarration);
        }
        
        setIsNarrationEditModalOpen(false);
        setCurrentNarrationImage(null);
      } catch (error) {
        console.error("更新旁白失败:", error);
        throw error; // 重新抛出错误让弹窗处理
      }
    },
    [onUpdateNarration]
  );

  // 关闭旁白编辑弹窗
  const handleCloseNarrationEdit = useCallback(() => {
    setIsNarrationEditModalOpen(false);
    setCurrentNarrationImage(null);
  }, []);

  // 轮询任务状态
  const pollTaskStatus = useCallback(async (taskId: string, imageId: string) => {
    try {
      const response = await taskApi.queryTaskStatus(taskId);
      // response 本身就是 {data: {...}, message: string}
      // response.data 是后端返回的任务对象（包含 snake_case 字段）
      const taskData = response?.data;

      if (!taskData) {
        throw new Error(t("cannotFetchStatus"));
      }

      const status = taskData.status;
      
      if (status === TaskStatus.SUCCESS) {
        // 从 resource.shot.image_url 获取新图片
        const newImageUrl = taskData.resource?.shot?.image_url;
        
        if (newImageUrl) {
          // 更新本地图片
          setLocalImageUpdates(prev => ({
            ...prev,
            [imageId]: newImageUrl,
          }));
          
          // 通知父组件（单张重新生成成功后，不触发自动跳转）
          // 注意：这里只更新图片，不会调用 onComplete，确保不会自动跳转到下一步
          if (onImageUpdated) {
            onImageUpdated(imageId, newImageUrl);
          }

          // 尝试刷新创作详情，保证父级数据同步
          try {
            const { useQueryClient } = await import("@tanstack/react-query");
            const qc = useQueryClient();
            qc.invalidateQueries({ queryKey: ["creation"] });
          } catch (e) {
            // 静默失败
          }
          
          toast.success(t("storyboard.regenerateImageSuccess"));
        } else {
          toast.error(t("storyboard.imageUrlNotFound"));
        }
        
        // 停止加载状态
        setRegeneratingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(imageId);
          return newSet;
        });
        
        // 清除定时器
        if (pollTimersRef.current[imageId]) {
          clearTimeout(pollTimersRef.current[imageId]);
          delete pollTimersRef.current[imageId];
        }
        
        // 注意：单张重新生成成功后，不调用 onComplete，避免自动跳转到下一步
        // 只有用户手动点击"下一步"按钮时才会调用 onComplete
      } else if (status === TaskStatus.FAILURE) {
        // 生成失败
        toast.error(t("storyboard.regenerateImageFailed"));
        
        setRegeneratingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(imageId);
          return newSet;
        });
        
        // 清除定时器
        if (pollTimersRef.current[imageId]) {
          clearTimeout(pollTimersRef.current[imageId]);
          delete pollTimersRef.current[imageId];
        }
      } else {
        // 继续轮询
        pollTimersRef.current[imageId] = setTimeout(() => {
          pollTaskStatus(taskId, imageId);
        }, POLL_INTERVAL);
      }
    } catch (error) {
      console.error("轮询任务状态失败:", error);
      toast.error(t("queryStatusFailed"));
      
      setRegeneratingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(imageId);
        return newSet;
      });
      
      // 清除定时器
      if (pollTimersRef.current[imageId]) {
        clearTimeout(pollTimersRef.current[imageId]);
        delete pollTimersRef.current[imageId];
      }
    }
  }, [onImageUpdated]);

  // 正在提交的图片 ID 集合（用于防抖）
  const submittingIdsRef = useRef<Set<string>>(new Set());
  const debounceTimersRef = useRef<Record<string, NodeJS.Timeout>>({});

  // 重新生成图片
  const handleRegenerateImage = useCallback(
    async (imageId: string, selectedCharacters?: number[]) => {
      // 如果已经在生成中或正在提交，直接返回
      if (regeneratingIds.has(imageId) || submittingIdsRef.current.has(imageId)) {
        return;
      }

      // 清除之前的防抖定时器
      if (debounceTimersRef.current[imageId]) {
        clearTimeout(debounceTimersRef.current[imageId]);
      }

      // 设置防抖
      debounceTimersRef.current[imageId] = setTimeout(async () => {
        // 标记为正在提交
        submittingIdsRef.current.add(imageId);

        try {
          // 从 allImages 中查找对应的图片，获取 uuid
          const targetImage = allImages.find(img => img.image_id === imageId);
          
          if (!targetImage) {
            console.error("未找到对应的分镜图片:", imageId);
            toast.error(t("shotImageNotFound"));
            return;
          }
          
          // 优先使用 uuid 字段，如果没有则使用 image_id（兼容后端返回数字ID的情况）
          let shotUuid: string | undefined = targetImage.uuid;

          // 如果 uuid 不存在，使用 image_id 作为后备
          if (!shotUuid) {
            shotUuid = String(imageId);
            console.warn("分镜缺少UUID字段，使用image_id作为后备:", imageId);
          }

          // 检查积分是否充足（重新生成单张图片）
          const { checkAndNotifyPoints } = await import('@/lib/utils/points-check')
          const pointsAvailable = await checkAndNotifyPoints(
            {
              operation_type: 'generate_image',
              image_count: 1,
              image_model_name: imageModelName,
            },
            t
          )

          if (!pointsAvailable) {
            throw new Error(t('insufficientPoints'))
          }

          // 添加到正在生成的列表
          setRegeneratingIds(prev => new Set(prev).add(imageId));
          
          // 调用 API 开始生成（使用UUID），不传递 prompt，让后端重新生成
          const response = await shotApi.regenerateShotImage(shotUuid);
          const taskId = response?.data?.task_id;
          
          if (!taskId) {
            throw new Error(t("storyboard.taskIdNotFound"));
          }
          
          toast.info(t("storyboard.regenerateImageStart"));
          
          // 开始轮询任务状态
          pollTimersRef.current[imageId] = setTimeout(() => {
            pollTaskStatus(taskId, imageId);
          }, POLL_INTERVAL);
        } catch (error) {
          console.error("重新生成图片失败:", error);
          toast.error(error instanceof Error ? error.message : t("storyboard.regenerateImageError"));
          
          // 移除加载状态
          setRegeneratingIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(imageId);
            return newSet;
          });
        } finally {
          // 移除提交标记
          submittingIdsRef.current.delete(imageId);
          delete debounceTimersRef.current[imageId];
        }
      }, 500); // 500ms 防抖延迟
    },
    [pollTaskStatus, regeneratingIds, t, allImages]
  );

  // 关闭编辑弹窗
  const handleCloseEdit = useCallback(() => {
    setIsEditModalOpen(false);
    setCurrentEditingImage(null);
  }, []);

  // 预览图片
  const handlePreviewImage = useCallback((imageId: string) => {
    setPreviewImageId(imageId);
  }, []);

  // 获取当前预览的图片
  const previewImage = allImages.find((img) => img.image_id === previewImageId);

  // 计算整体生成进度（优先使用 API 返回的进度数据）
  // 如果 progress 存在且 total 有值，优先使用 progress 中的数据；否则从 allImages 计算
  const totalImages = (progress && typeof progress.total === 'number') ? progress.total : allImages.length;
  const completedImages = (progress && typeof progress.completed === 'number') 
    ? progress.completed 
    : allImages.filter((img) => img.status === "completed").length;
  
  // 如果 progress 存在，使用 progress 计算生成中的数量
  // generatingImages = total - completed - failed
  const generatingImages = (progress && typeof progress.total === 'number')
    ? Math.max(0, progress.total - completedImages - (progress.failed_count || 0))
    : (isGenerating 
      ? Math.max(0, totalImages - completedImages) 
      : allImages.filter((img) => img.status === "generating").length);
  
  const overallProgress =
    totalImages > 0 ? (completedImages / totalImages) * 100 : 0;
  const successCount = (progress && typeof progress.success_count === 'number') 
    ? progress.success_count 
    : completedImages;
  const failedCount = (progress && typeof progress.failed_count === 'number') 
    ? progress.failed_count 
    : 0;

  return (
    <div className={cn("space-y-4 h-[calc(100vh-136px)] relative", className)}>
      {/* 装饰性背景 */}
      <div className="absolute -top-20 -left-20 w-60 h-60 bg-blue-400/10 dark:bg-blue-400/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute -top-20 -right-20 w-60 h-60 bg-purple-400/10 dark:bg-purple-400/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="space-y-4 h-full overflow-y-auto pb-22 px-6 relative z-10">
        <h3 className="text-lg font-bold bg-gradient-to-r from-[#FDBCB4] to-[#ADD8E6] bg-clip-text text-transparent flex items-center gap-2">
          <Film className="w-5 h-5 text-[#ADD8E6]" />
          {t("storyboard.storyboardList")}
        </h3>
        {/* 整体进度条 */}
        {(isGenerating || generatingImages > 0) && (
          <Card className="p-4 bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] rounded-2xl border-0">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-[#FDBCB4]" />
                  <span className="text-sm font-medium text-gray-700">
                    {t("storyboard.generatingShots", { completed: completedImages, total: totalImages })}
                  </span>
                </div>
                <div className="flex gap-2">
                  {successCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="bg-[#22C55E]/20 text-[#22C55E] rounded-full shadow-[2px_2px_4px_rgba(34,197,94,0.2),-1px_-1px_2px_rgba(255,255,255,0.7)]"
                    >
                      {successCount} {t("common.success")}
                    </Badge>
                  )}
                  {failedCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="bg-[#FDBCB4]/20 text-[#F9A899] rounded-full shadow-[2px_2px_4px_rgba(253,188,180,0.2),-1px_-1px_2px_rgba(255,255,255,0.7)]"
                    >
                      {failedCount} {t("common.failed")}
                    </Badge>
                  )}
                  <Badge
                    variant="secondary"
                    className="bg-[#ADD8E6]/20 text-[#ADD8E6] rounded-full shadow-[2px_2px_4px_rgba(173,221,230,0.2),-1px_-1px_2px_rgba(255,255,255,0.7)]"
                  >
                    {t("storyboard.generatingCountShots", { count: generatingImages })}
                  </Badge>
                </div>
              </div>
              <Progress value={overallProgress} className="h-2 bg-gradient-to-r from-[#FDBCB4]/20 to-[#ADD8E6]/20 rounded-full" />
            </div>
          </Card>
        )}

        {/* 初始加载状态 */}
        {isGenerating && data.length === 0 && (
          <Card className="p-8 bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] rounded-2xl border-0">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-[#ADD8E6]/30 border-t-[#FDBCB4] rounded-full animate-spin"></div>
                <ImageIcon className="absolute inset-0 m-auto w-6 h-6 text-[#ADD8E6]" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-lg font-semibold bg-gradient-to-r from-[#FDBCB4] to-[#ADD8E6] bg-clip-text text-transparent">
                  {t("storyboard.generatingShotsTitle")}
                </p>
                <p className="text-sm text-gray-500">
                  {t("common.loading")}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* 所有分镜扁平化展示 */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-r from-[#FDBCB4] to-[#ADD8E6] flex items-center justify-center text-white text-sm font-bold shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]">
              <Film className="w-4 h-4" />
            </div>
            <h4 className="text-lg font-bold bg-gradient-to-r from-[#FDBCB4] to-[#ADD8E6] bg-clip-text text-transparent">
              {t("storyboard.allShots")}
            </h4>
          </div>

          {/* 分镜图片网格 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allImages.map((image, imageIndex) => {
              const isRegenerating = regeneratingIds.has(image.image_id);
              const isGenerating = image.status === "generating";
              const isPending = image.status === "pending";

              return (
                <div key={image.image_id} className="space-y-4">
                  <div className="flex items-center gap-1">
                    {/* 分镜编号 */}
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="secondary"
                        className="bg-gradient-to-r from-[#FDBCB4]/20 to-[#ADD8E6]/20 text-gray-700 rounded-full shadow-[2px_2px_4px_rgba(173,221,230,0.2),-1px_-1px_2px_rgba(255,255,255,0.7)]"
                      >
                        {t("storyboard.shotNumber", { number: imageIndex + 1 })}
                      </Badge>
                      {isRegenerating && (
                        <div className="flex items-center gap-1 text-orange-500">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-xs">{t("storyboard.regenerating")}</span>
                        </div>
                      )}
                    </div>
                    {/* 图片标题 */}
                    <h5 className="text-sm font-medium text-gray-800 dark:text-gray-100">
                      {image.title}
                    </h5>
                  </div>
                  {/* 图片容器 */}
                  <div className={cn(
                    "relative bg-gradient-to-br from-white to-blue-50 rounded-2xl overflow-hidden group shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:shadow-[6px_6px_16px_rgba(0,0,0,0.1),-6px_-6px_16px_rgba(255,255,255,0.9)] transition-all duration-300 border-0",
                    aspectRatio === "9:16" ? "aspect-[9/16]" : "aspect-video"
                  )}>
                    {isPending ? (
                      // 待生成状态
                      <div className="flex flex-col items-center justify-center h-full min-h-[120px] space-y-3 py-6 relative">
                        <ImageIcon className="w-10 h-10 text-gray-400" />
                        <p className="text-sm text-gray-500">{t("storyboard.pending")}</p>
                        {/* 待生成也允许手动重新生成/提交 */}
                        <div className="absolute top-2 right-2">
                          <Button
                              size="sm"
                              variant="secondary"
                              className="h-8 w-8 p-0 bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[2px_2px_8px_rgba(0,0,0,0.1),-1px_-1px_4px_rgba(255,255,255,0.8)] rounded-xl"
                              onClick={() => handleStartEdit(image)}
                              title={t("storyboard.regenerateImage")}
                            >
                              <RefreshCw className="w-4 h-4 text-[#FDBCB4]" />
                            </Button>
                        </div>
                      </div>
                    ) : isGenerating ? (
                      // 生成中状态
                      <div className="flex flex-col items-center justify-center h-full min-h-[120px] space-y-4 py-6">
                        <div className="relative">
                          <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
                          <ImageIcon className="absolute inset-0 m-auto w-6 h-6 text-orange-500" />
                        </div>
                        <div className="text-center space-y-2">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t("storyboard.generating")}
                          </p>
                          {image.progress !== undefined && (
                            <div className="w-32">
                              <Progress
                                value={image.progress}
                                className="h-1"
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                {Math.round(image.progress)}%
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : image.status === "failed" ? (
                      // 生成失败状态
                      <div className="flex flex-col items-center justify-center h-full min-h-[120px] space-y-4 text-red-500 py-6 relative">
                        <X className="w-12 h-12" />
                        <p className="text-sm font-medium">{t("storyboard.generationFailed")}</p>
                        {/* 重新生成按钮 */}
                        <div className="absolute top-2 right-2">
                          <Button
                              size="sm"
                              variant="secondary"
                              className="h-8 w-8 p-0 bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[2px_2px_8px_rgba(0,0,0,0.1),-1px_-1px_4px_rgba(255,255,255,0.8)] rounded-xl"
                              onClick={() => handleStartEdit(image)}
                              title={t("storyboard.regenerateImage")}
                            >
                              <RefreshCw className="w-4 h-4 text-[#FDBCB4]" />
                            </Button>
                        </div>
                      </div>
                    ) : (
                      // 正常图片显示
                      <>
                        <img
                          src={localImageUpdates[image.image_id] || image.image_url}
                          alt={t("shotImageTitle", { title: image.title, index: imageIndex + 1 })}
                          className={cn(
                            "w-full object-cover cursor-pointer",
                            isRegenerating && "opacity-50"
                          )}
                          onClick={() => handlePreviewImage(image.image_id)}
                        />
                        {/* 重新生成中的遮罩 */}
                        {isRegenerating && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <div className="flex flex-col items-center gap-2">
                              <Loader2 className="w-8 h-8 animate-spin text-white" />
                              <span className="text-white text-sm">{t("storyboard.regenerating")}</span>
                            </div>
                          </div>
                        )}

                        {/* 操作按钮 */}
                        <div className="absolute top-2 right-2">
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-8 w-8 p-0 bg-gradient-to-br from-white to-blue-50 border border-blue-100 hover:border-[#ADD8E6]/50 backdrop-blur-sm shadow-[4px_4px_12px_rgba(0,0,0,0.1),-4px_-4px_12px_rgba(255,255,255,0.8)] transition-all duration-200 hover:scale-110 rounded-xl"
                              onClick={() => handleStartEdit(image)}
                            >
                              <PenLine className="w-4 h-4 text-[#ADD8E6]" />
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* 旁白展示区域 */}
                  <div className="bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] rounded-xl p-3 border-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 text-[#ADD8E6]">
                        <Mic className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium uppercase tracking-wider">{t("storyboard.narration")}</span>
                      </div>
                      <button 
                        onClick={() => handleStartEditNarration(image)}
                        className="flex-shrink-0 p-1 hover:bg-[#ADD8E6]/10 rounded-xl shadow-[2px_2px_4px_rgba(173,221,230,0.2),-1px_-1px_2px_rgba(255,255,255,0.7)] transition-colors"
                        title={t("storyboard.editNarration")}
                      >
                        <PenLine className="w-3.5 h-3.5 text-[#FDBCB4]" />
                      </button>
                    </div>
                    
                    <div className="space-y-1.5">
                      {(localNarrationUpdates[image.image_id] || image.narration || []).length > 0 ? (
                        (localNarrationUpdates[image.image_id] || image.narration || []).map((n, idx) => (
                          <div key={idx} className="text-sm leading-relaxed text-gray-700">
                            <span className="font-semibold text-[#FDBCB4] mr-1">{n.角色}:</span>
                            {n.内容}
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-gray-400 italic">{t("storyboard.noNarration")}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* 底部操作浮层 */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-white to-blue-50/80 shadow-[0px_-4px_12px_rgba(0,0,0,0.08),0px_2px_4px_rgba(255,255,255,0.8)] border-t-0 backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-center">
            {/* 右侧操作按钮 */}

            <Button
              onClick={() => {
                // 下一步操作
                onComplete();
              }}
              disabled={isGenerating || data.length === 0}
              className="bg-gradient-to-r from-[#FDBCB4] to-[#ADD8E6] hover:from-[#F9A899] hover:to-[#93C5FD] text-gray-800 px-6 shadow-[4px_4px_12px_rgba(0,0,0,0.1),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:shadow-[6px_6px_16px_rgba(0,0,0,0.15),-6px_-6px_16px_rgba(255,255,255,0.9)] transition-all duration-200 hover:scale-105 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 w-[140px]"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  {t("storyboard.generating")}
                </>
              ) : (
                <>
                  {t("storyboard.generateVideo")}
                  <ArrowRight className="w-4 h-4 mr-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
      {/* 图片预览模态框 */}
      {previewImage && (
        <ImagePreview
          open={!!previewImageId}
          onOpenChange={(open) => !open && setPreviewImageId(null)}
          src={localImageUpdates[previewImage.image_id] || previewImage.image_url}
          alt={t('Timeline.shotImagePreview')}
        />
      )}

      {/* 编辑分镜图底部弹窗 */}
      <StoryboardEditBottomSheet
        isOpen={isEditModalOpen}
        onClose={handleCloseEdit}
        image={currentEditingImage}
        onRegenerate={handleRegenerateImage}
        availableCharacters={availableCharacters}
      />

      {/* 编辑旁白底部弹窗 */}
      <NarrationEditBottomSheet
        isOpen={isNarrationEditModalOpen}
        onClose={handleCloseNarrationEdit}
        image={currentNarrationImage ? {
          ...currentNarrationImage,
          narration: localNarrationUpdates[currentNarrationImage.image_id] || currentNarrationImage.narration,
        } : null}
        onSave={handleSaveNarration}
      />
    </div>
  );
}
