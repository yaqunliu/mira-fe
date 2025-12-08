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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AIGeneratedImage, SceneGroup, ShotGenerationProgress, TaskStatus } from "@/types";
import { StoryboardEditBottomSheet } from "@/components/modals/storyboard-edit-bottom-sheet";
import { NarrationEditBottomSheet } from "@/components/modals/narration-edit-bottom-sheet";
import shotApi from "@/lib/api/shot";
import taskApi from "@/lib/api/task";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useTaskSubmission } from "@/hooks/use-task-submission";

interface StoryboardImagesProps {
  data: SceneGroup[];
  onUpdateNarration?: (imageId: string, newNarration: string) => Promise<void>;
  onImageUpdated?: (imageId: string, newImageUrl: string) => void;
  className?: string;
  onComplete: () => void;
  isGenerating?: boolean;
  progress?: ShotGenerationProgress;
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
}: StoryboardImagesProps) {
  const t = useTranslations();
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<string>("");
  const [editingNarration, setEditingNarration] = useState<string>("");
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
  const [localNarrationUpdates, setLocalNarrationUpdates] = useState<Record<string, string>>({});
  
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
    async (imageId: string, newNarration: string) => {
      try {
        // 调用 API 更新旁白
        await shotApi.updateNarration(imageId, newNarration);
        
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
      const taskData = response?.data;
      
      if (!taskData) {
        throw new Error("无法获取任务状态");
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
      toast.error("查询任务状态失败");
      
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
    async (imageId: string, newPrompt: string) => {
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
          let shotUuid: string;
          
          if (targetImage?.uuid) {
            // 优先使用 uuid 字段
            shotUuid = targetImage.uuid;
          } else {
            // 如果没有 uuid 字段，使用 image_id
            shotUuid = String(imageId);
            // 检查是否是UUID格式（简单检查：长度和格式）
            if (shotUuid.length < 30 || /^\d+$/.test(shotUuid)) {
              console.error("分镜ID不是有效的UUID格式:", shotUuid);
              toast.error(`分镜ID格式错误：${shotUuid}，应该是UUID格式。请刷新页面重试。`);
              return;
            }
          }

          // 检查积分是否充足（重新生成单张图片）
          const { checkAndNotifyPoints } = await import('@/lib/utils/points-check')
          const pointsAvailable = await checkAndNotifyPoints(
            {
              operation_type: 'generate_image',
              image_count: 1,
            },
            t
          )

          if (!pointsAvailable) {
            throw new Error('积分不足')
          }

          // 添加到正在生成的列表
          setRegeneratingIds(prev => new Set(prev).add(imageId));
          
          // 调用 API 开始生成（使用UUID）
          const response = await shotApi.regenerateShot(shotUuid, newPrompt);
          const taskId = response?.data?.task_id;
          
          if (!taskId) {
            throw new Error("未能获取任务ID");
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
    <div className={cn("space-y-4 h-[calc(100vh-136px)]", className)}>
      <div className="space-y-4 h-full overflow-y-auto pb-22 px-6">
        <h3 className="text-base font-semibold">{t("storyboard.storyboardList")}</h3>
        {/* 整体进度条 */}
        {(isGenerating || generatingImages > 0) && (
          <Card className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("storyboard.generatingShots", { completed: completedImages, total: totalImages })}
                  </span>
                </div>
                <div className="flex gap-2">
                  {successCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                    >
                      {successCount} {t("common.success")}
                    </Badge>
                  )}
                  {failedCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                    >
                      {failedCount} {t("common.failed")}
                    </Badge>
                  )}
                  <Badge
                    variant="secondary"
                    className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                  >
                    {t("storyboard.generatingCountShots", { count: generatingImages })}
                  </Badge>
                </div>
              </div>
              <Progress value={overallProgress} className="h-2" />
            </div>
          </Card>
        )}

        {/* 初始加载状态 */}
        {isGenerating && data.length === 0 && (
          <Card className="p-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
                <ImageIcon className="absolute inset-0 m-auto w-6 h-6 text-orange-500" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                  {t("storyboard.generatingShotsTitle")}
                </p>
                <p className="text-sm text-gray-500">
                  {t("common.loading")}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* 场景分组展示 */}
        <div className="space-y-8">
          {data.map((scene, sceneIndex) => (
            <div key={scene.scene_id} className="space-y-4">
              {/* 场景标题 */}
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-full bg-orange-500/70 flex items-center justify-center text-white text-sm font-semibold">
                  {sceneIndex + 1}
                </div>
                <h4 className="text-lg font-semibold text-primary">
                  {scene.scene_title}
                </h4>
                {/* <Badge variant="outline" className="text-xs">
                  {scene.images.length} 张分镜
                </Badge> */}
              </div>

              {/* 分镜图片网格 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {scene.images.map((image, imageIndex) => {
                  const isEditing = editingImageId === image.image_id;
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
                            className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
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
                      <div className="relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden group min-h-[120px]">
                        {isPending ? (
                          // 待生成状态
                          <div className="flex flex-col items-center justify-center h-full min-h-[120px] space-y-3 py-6">
                            <ImageIcon className="w-10 h-10 text-gray-400" />
                            <p className="text-sm text-gray-500">{t("storyboard.pending")}</p>
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
                                className="h-8 w-8 p-0 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30"
                                onClick={() => handleStartEdit(image)}
                                title={t("storyboard.regenerateImage")}
                              >
                                <RefreshCw className="w-4 h-4 text-red-600 dark:text-red-400" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          // 正常图片显示
                          <>
                            <img
                              src={localImageUpdates[image.image_id] || image.image_url}
                              alt={`${image.title} - 分镜图片 ${
                                imageIndex + 1
                              }`}
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
                                {/* <Button
                                  size="sm"
                                  variant="secondary"
                                  className="h-8 w-8 p-0 bg-black/40 hover:bg-black/50"
                                  onClick={() =>
                                    handlePreviewImage(image.image_id)
                                  }
                                >
                                  <Maximize2 className="w-4 h-4" />
                                </Button> */}
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="h-8 w-8 p-0 bg-black/40 hover:bg-black/50"
                                  onClick={() => handleStartEdit(image)}
                                >
                                  <PenLine className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* 内容区域 */}
                      <div className="space-y-3">
                        {(localNarrationUpdates[image.image_id] || image.narration) && (
                          <div className="flex items-start gap-2 text-gray-800 dark:text-white">
                            <Mic className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <p className="text-sm leading-relaxed line-clamp-2 flex-1 min-w-0">
                              {localNarrationUpdates[image.image_id] || image.narration}
                            </p>
                            <button
                              onClick={() => handleStartEditNarration(image)}
                              className="flex-shrink-0 p-1 hover:bg-gray-200 dark:hover:bg-white/20 rounded transition-colors"
                              title={t("storyboard.editNarration")}
                            >
                              <PenLine className="w-3 h-3 text-gray-600 dark:text-gray-500" />
                            </button>
                          </div>
                        )}
                        {/* 提示词编辑 */}
                        {/* <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              提示词
                            </label>
                            {!isEditing && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-xs"
                                onClick={() => handleStartEdit(image)}
                              >
                                <Edit3 className="w-3 h-3 mr-1" />
                                编辑
                              </Button>
                            )}
                          </div>

                          {isEditing ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editingPrompt}
                                onChange={(e) =>
                                  setEditingPrompt(e.target.value)
                                }
                                placeholder="输入新的提示词..."
                                className="min-h-[60px] text-sm"
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={handleSaveEdit}
                                  disabled={isRegenerating}
                                  className="flex-1"
                                >
                                  <Check className="w-3 h-3 mr-1" />
                                  保存
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleCancelEdit}
                                  className="flex-1"
                                >
                                  <X className="w-3 h-3 mr-1" />
                                  取消
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3">
                              {image.prompt}
                            </p>
                          )}
                        </div> */}

                        {/* 旁白编辑 */}
                        {/* <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              旁白
                            </label>
                            {!isEditing && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-xs"
                                onClick={() => handleStartEditNarration(image)}
                              >
                                <Edit3 className="w-3 h-3 mr-1" />
                                编辑
                              </Button>
                            )}
                          </div>

                          {isEditing ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editingNarration}
                                onChange={(e) =>
                                  setEditingNarration(e.target.value)
                                }
                                placeholder="输入旁白内容..."
                                className="min-h-[60px] text-sm"
                              />
                            </div>
                          ) : (
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2">
                              {image.narration || "暂无旁白"}
                            </p>
                          )}
                        </div> */}

                        {/* 重新生成按钮 */}
                        {(image.status === "completed" || image.status === "failed") && !isEditing && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={() => handleStartEdit(image)}
                            disabled={isRegenerating}
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            {t("storyboard.regenerateImage")}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* 底部操作浮层 */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-700 shadow-lg">
        <div className="px-6 py-4">
          <div className="flex items-center justify-center">
            {/* 右侧操作按钮 */}

            <Button
              onClick={() => {
                // 下一步操作
                onComplete();
              }}
              disabled={isGenerating || data.length === 0}
              className="bg-orange-400/80 hover:bg-orange-600 text-white px-6 disabled:opacity-50 disabled:cursor-not-allowed w-[120px]"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  {t("storyboard.generating")}
                </>
              ) : (
                <>
                  {t("common.next")}
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
          alt={`分镜图片预览`}
        />
      )}

      {/* 编辑分镜图底部弹窗 */}
      <StoryboardEditBottomSheet
        isOpen={isEditModalOpen}
        onClose={handleCloseEdit}
        image={currentEditingImage}
        onRegenerate={handleRegenerateImage}
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
