"use client";

import { useState, useCallback } from "react";
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
import { AIGeneratedImage, SceneGroup } from "@/types";
import { StoryboardEditBottomSheet } from "@/components/modals/storyboard-edit-bottom-sheet";
import { NarrationEditBottomSheet } from "@/components/modals/narration-edit-bottom-sheet";

interface StoryboardImagesProps {
  data: SceneGroup[];
  onRegenerateImage?: (imageId: string, newPrompt: string) => Promise<void>;
  onUpdateNarration?: (imageId: string, newNarration: string) => Promise<void>;
  className?: string;
  onComplete: () => void;
}

export function StoryboardImages({
  data,
  onRegenerateImage,
  onUpdateNarration,
  onComplete,
  className,
}: StoryboardImagesProps) {
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

  console.log(data, "data");
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
    (imageId: string, newNarration: string) => {
      if (onUpdateNarration) {
        onUpdateNarration(imageId, newNarration);
      }
      setIsNarrationEditModalOpen(false);
      setCurrentNarrationImage(null);
    },
    [onUpdateNarration]
  );

  // 关闭旁白编辑弹窗
  const handleCloseNarrationEdit = useCallback(() => {
    setIsNarrationEditModalOpen(false);
    setCurrentNarrationImage(null);
  }, []);

  // 重新生成图片
  const handleRegenerateImage = useCallback(
    async (imageId: string, newPrompt: string) => {
      if (onRegenerateImage) {
        setRegeneratingIds((prev) => new Set(prev).add(imageId));
        try {
          await onRegenerateImage(imageId, newPrompt);
        } finally {
          setRegeneratingIds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(imageId);
            return newSet;
          });
        }
      }
    },
    [onRegenerateImage]
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

  // 计算整体生成进度
  const totalImages = allImages.length;
  const completedImages = allImages.filter(
    (img) => img.status === "completed"
  ).length;
  const generatingImages = allImages.filter(
    (img) => img.status === "generating"
  ).length;
  const overallProgress =
    totalImages > 0 ? (completedImages / totalImages) * 100 : 0;

  return (
    <div className={cn("space-y-4 h-[calc(100vh-136px)]", className)}>
      <div className="space-y-4 h-full overflow-y-auto pb-22 px-6">
        <h3 className="text-base font-semib100">{`分镜图列表`}</h3>
        {/* 整体进度条 */}
        {generatingImages > 0 && (
          <Card className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    正在生成图片 ({completedImages}/{totalImages})
                  </span>
                </div>
                <Badge
                  variant="secondary"
                  className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                >
                  {generatingImages} 张生成中
                </Badge>
              </div>
              <Progress value={overallProgress} className="h-2" />
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

                  return (
                    <div key={image.image_id} className="space-y-4">
                      <div className="flex items-center gap-1">
                        {/* 分镜编号 */}
                        <div className="flex items-center justify-between">
                          <Badge
                            variant="secondary"
                            className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                          >
                            分镜 {imageIndex + 1}
                          </Badge>
                          {isRegenerating && (
                            <div className="flex items-center gap-1 text-orange-500">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span className="text-xs">重新生成中...</span>
                            </div>
                          )}
                        </div>
                        {/* 图片标题 */}
                        <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {image.title}
                        </h5>
                      </div>
                      {/* 图片容器 */}
                      <div className="relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden group">
                        {isGenerating ? (
                          // 生成中状态
                          <div className="flex flex-col items-center justify-center h-full space-y-4">
                            <div className="relative">
                              <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
                              <ImageIcon className="absolute inset-0 m-auto w-6 h-6 text-orange-500" />
                            </div>
                            <div className="text-center space-y-2">
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                生成中...
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
                          <div className="flex flex-col items-center justify-center h-full space-y-4 text-red-500">
                            <X className="w-12 h-12" />
                            <p className="text-sm font-medium">生成失败</p>
                          </div>
                        ) : (
                          // 正常图片显示
                          <>
                            <img
                              src={image.image_url}
                              alt={`${image.title} - 分镜图片 ${
                                imageIndex + 1
                              }`}
                              className="w-full object-cover cursor-pointer transition-transform group-hover:scale-1"
                              onClick={() => handlePreviewImage(image.image_id)}
                            />

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
                        {image.narration && (
                          <div className="flex items-start gap-2 text-white">
                            <Mic className="w-4 h-4 mt-1 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm leading-relaxed line-clamp-2">
                                {image.narration}
                                <button
                                  onClick={() =>
                                    handleStartEditNarration(image)
                                  }
                                  className="flex-shrink-0 p-1 hover:bg-white/20 rounded transition-colors inline p-0"
                                  title="编辑旁白"
                                >
                                  <PenLine className="w-3 h-3 text-zinc-400 dark:text-gray-500" />
                                </button>
                              </p>
                            </div>
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
                        {image.status === "completed" && !isEditing && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={() => handleStartEdit(image)}
                            disabled={isRegenerating}
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            重新生成
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
              className="bg-orange-400/80 hover:bg-orange-600 text-white px-6 disabled:opacity-50 disabled:cursor-not-allowed w-[120px]"
            >
              下一步
              <ArrowRight className="w-4 h-4 mr-1" />
            </Button>
          </div>
        </div>
      </div>
      {/* 图片预览模态框 */}
      {previewImage && (
        <ImagePreview
          open={!!previewImageId}
          onOpenChange={(open) => !open && setPreviewImageId(null)}
          src={previewImage.image_url}
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
        image={currentNarrationImage}
        onSave={handleSaveNarration}
      />
    </div>
  );
}
