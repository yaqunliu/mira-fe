"use client";

import { useMemo, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  PenLine,
  RotateCcw,
  WandSparkles,
  ArrowRight,
  Maximize2,
} from "lucide-react";
import { CharacterEditModal } from "@/components/modals/character-edit-modal";
import { ImagePreview } from "@/components/ui/image-preview";
import { cn } from "@/lib/utils";
import { ICharacter } from "@/types/character";
import ModuleLoading from "@/components/ui/module-loading";
import characterApi from "@/lib/api/character";
import taskApi from "@/lib/api/task";
import { TaskStatus } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { useTaskSubmission } from "@/hooks/use-task-submission";

const getStyleOptions = (t: any) => [
  { value: "anime", label: t("animeStyle") },
  { value: "realistic", label: t("realisticStyle") },
  { value: "watercolor", label: t("watercolorStyle") },
  { value: "oil_painting", label: t("oilPaintingStyle") },
];

export function CharacterSetting({
  characters,
  currentTaskId,
  onComplete,
  handleUpdate,
}: {
  characters: ICharacter[];
  currentTaskId?: string;
  onComplete: () => void;
  handleUpdate: () => void;
}) {
  const t = useTranslations("character");
  const [selectedStyle, setSelectedStyle] = useState<string>("anime");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [editingCharacterIndex, setEditingCharacterIndex] = useState<
    number | null
  >(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const { data: task,  } = useQuery({
    queryKey: ["task", taskId as string],
    queryFn: () => taskApi.queryTaskStatus(taskId as string),
    enabled: !!taskId,
    refetchInterval: (query) => {
      console.log("task query", query);
      if (query.state.data?.data?.status === TaskStatus.SUCCESS || query.state.data?.data?.status === TaskStatus.FAILURE) {
        console.log('here')
        setIsGenerating(false);
        handleUpdate();
        if (query.state.data?.data?.status === TaskStatus.FAILURE) {
          toast.error(query.state.data?.message);
        }
        return false;
      }
      return 2000;
    },
  });
  // 生成角色图片的内部函数
  const generateCharacterImagesInternal = useCallback(async (characters: ICharacter[]) => {
    // 检查积分是否充足
    const { checkAndNotifyPoints } = await import('@/lib/utils/points-check')
    const pointsAvailable = await checkAndNotifyPoints(
      {
        operation_type: 'generate_image',
        image_count: characters.length,
      },
      t
    )

    if (!pointsAvailable) {
      throw new Error('积分不足')
    }

    setIsGenerating(true);

    const characterIds = characters.map((character) => character.character_id);
    const response = await characterApi.generateCharacterImages(
      characterIds,
      getStyleOptions(t).find((option) => option.value === selectedStyle)?.label ||
        t("animeStyle")
    );
    if (response.data && response.data.task_id) {
      setTaskId(response.data.task_id);
    } else {
      throw new Error(t("taskIdNotFound"));
    }
  }, [selectedStyle, t]);

  // 使用任务提交 hook 包装生成函数
  const { submit: gengerateCharacterImages, isSubmitting: isSubmittingCharacters } = useTaskSubmission(
    generateCharacterImagesInternal,
    {
      debounceDelay: 500,
      enableDebounce: true,
      onError: (error) => {
        console.log(error);
        toast.error(error.message || t("generationFailed"));
        setIsGenerating(false);
      },
    }
  );

  const handleEditCharacter = (index: number) => {
    setEditingCharacterIndex(index);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingCharacterIndex(null);
  };

  const handleImageClick = (imageUrl: string) => {
    setPreviewImage(imageUrl);
    setIsImagePreviewOpen(true);
  };

  console.log(isGenerating, "isGenerating");

  // 只有在有任务在进行或者正在生成时才显示loading
  // 如果characters为空但没有任务在进行，说明数据已经加载完成，只是没有角色数据，不应该显示loading
  const shouldShowLoading = isGenerating || (characters?.length === 0 && !!currentTaskId);

  return (
    <div className="h-[calc(100vh-136px)]">
      <ModuleLoading loading={shouldShowLoading} className="h-full" text={characters?.length === 0 ? t("analyzingCharacterInfo") : t("generatingCharacterImage")}>
        <div className="space-y-4 px-6 h-full overflow-y-auto pb-20">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-semibold">{t("characterSettings")} ({characters.length})</h3>
            {/* 生成按钮 */}
            <Button
              onClick={() => gengerateCharacterImages(characters)}
              disabled={isGenerating || isSubmittingCharacters}
              className="px-4 py-4 text-sm text-primary"
              variant="secondary"
            >
              <WandSparkles className="w-3 h-3" />
              {isGenerating || isSubmittingCharacters ? t("generating") : t("generateCharacterImage")}
            </Button>
          </div>
          {/* 生成进度 */}
          {isGenerating && (
            <div className="flex justify-between items-center text-sm gap-2">
              <Progress value={generationProgress} className="w-full" />
              {/* <span>{generationProgress}%</span> */}
            </div>
          )}
          {/* 风格选择 */}
          <div className="space-y-3">
            <h3 className="text-base text-gray-900 dark:text-gray-400">
              {t("visualStyle")}
            </h3>
            <div className="flex items-center space-x-4">
              {/* <label className="text-sm font-medium">{t("风格选择")}:</label> */}
              <Select value={selectedStyle} onValueChange={setSelectedStyle}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder={t("styleSelection")} />
                </SelectTrigger>
                <SelectContent>
                  {getStyleOptions(t).map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* 角色信息展示 */}
          <div className="space-y-3">
            <h3 className="text-base text-gray-900 dark:text-gray-400">
              {t("characterSettings")}
            </h3>
            <div className="w-full overflow-x-auto">
              <div className="flex space-x-3 pb-4">
                {characters.map((character, index) => (
                  <div
                    className="flex flex-col w-[65vw] md:w-[240px] lg:w-[300px] flex-shrink-0"
                    key={index}
                  >
                    <div className="w-fit text-sm text-nowrap py-2 px-4 bg-gradient-to-b from-orange-400/50 to-gray-600/30 rounded-t tracking-wider font-bold flex items-center gap-1">
                      <span>{character.name}</span>
                      <PenLine
                        className="inline-block w-3 h-3 text-stone-400 cursor-pointer hover:text-primary transition-colors"
                        onClick={() => handleEditCharacter(index)}
                      />
                    </div>
                    <Card
                      key={index}
                      className="w-full bg-gray-600/30 rounded-tl-none border-none p-y-3"
                    >
                      <CardContent className="space-y-2 px-3">
                        <div className="flex gap-2">
                          <div className="w-[66px] flex justify-end">
                            <Badge variant="outline" className="mb-2 w-[66px]">
                              {t("basicInfo")}
                            </Badge>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <p className="text-sm text-muted-foreground line-clamp-2 cursor-pointer hover:text-primary transition-colors">
                                {character.basic_info}
                              </p>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-[300px] max-h-[300px] overflow-auto">
                              <DropdownMenuItem className="whitespace-pre-line">
                                {character.basic_info}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="flex gap-2 items-start">
                          <div className="w-[66px] flex justify-end">
                            <Badge variant="outline" className="mb-2">
                              {t("appearanceFeatures")}
                            </Badge>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <p className="text-sm text-muted-foreground line-clamp-2 cursor-pointer hover:text-primary transition-colors">
                                {character.appearance}
                              </p>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-[300px] max-h-[300px] overflow-auto">
                              <DropdownMenuItem className="whitespace-pre-line">
                                {character.appearance}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="flex gap-2">
                          <div className="w-[66px] flex justify-end">
                            <Badge variant="outline" className="mb-2">
                              {t("bodyFeatures")}
                            </Badge>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <p className="text-sm text-muted-foreground line-clamp-2 cursor-pointer hover:text-primary transition-colors">
                                {character.body}
                              </p>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-[300px] max-h-[300px] overflow-auto">
                              <DropdownMenuItem className="whitespace-pre-line">
                                {character.body}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="flex gap-2">
                          <div className="w-[66px] flex justify-end">
                            <Badge variant="outline" className="mb-2">
                              {t("hair")}
                            </Badge>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <p className="text-sm text-muted-foreground line-clamp-2 cursor-pointer hover:text-primary transition-colors">
                                {character.hair}
                              </p>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-[300px] max-h-[300px] overflow-auto">
                              <DropdownMenuItem className="whitespace-pre-line">
                                {character.hair}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="flex gap-2">
                          <div className="w-[66px] flex justify-end">
                            <Badge variant="outline" className="mb-2">
                              {t("clothing")}
                            </Badge>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <p className="text-sm text-muted-foreground line-clamp-2 cursor-pointer hover:text-primary transition-colors">
                                {character.clothing}
                              </p>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-[300px] max-h-[300px] overflow-auto">
                              <DropdownMenuItem className="whitespace-pre-line">
                                {character.clothing}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="flex gap-2">
                          <div className="w-[66px] flex justify-end">
                            <Badge variant="outline" className="mb-2">
                              {t("featureTags")}
                            </Badge>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <p className="text-sm text-muted-foreground line-clamp-2 cursor-pointer hover:text-primary transition-colors">
                                {character.tags.join(", ")}
                              </p>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-[300px] max-h-[300px] overflow-auto">
                              <DropdownMenuItem className="whitespace-pre-line">
                                {character.tags.join(", ")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        {character.image_url && (
                          <div className="flex flex-col gap-1 items-center">
                            <div className="h-[1px] bg-zinc-700 w-full mb-2" />
                            <div className="relative">
                              <img
                                src={character.image_url}
                                alt={character.name}
                                className="w-42 object-cover rounded cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() =>
                                  handleImageClick(character.image_url)
                                }
                              />
                              {/* 重新生成按钮 */}
                              <div className="absolute bottom-2 flex justify-between w-full px-2">
                                <div
                                  className={cn(
                                    "py-1 px-2 bg-black/40 hover:bg-black/50 text-white border-0 shadow-lg rounded-full",
                                    "flex items-center justify-center"
                                  )}
                                  onClick={() =>
                                    handleImageClick(character.image_url)
                                  }
                                >
                                  <Maximize2 className="w-3 h-3" />
                                </div>
                                <div
                                  className={cn(
                                    "py-1 px-2 bg-black/40 hover:bg-black/50 text-white border-0 shadow-lg rounded-md",
                                    "flex items-center gap-1"
                                  )}
                                  onClick={() =>
                                    gengerateCharacterImages([character])
                                  }
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span className="text-xs">
                                    {t("regenerate")}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </ModuleLoading>

      {/* 角色编辑模态框 */}
      {editingCharacterIndex !== null && (
        <CharacterEditModal
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          character={characters[editingCharacterIndex]}
          onSuccess={handleUpdate}
        />
      )}

      {/* 图片预览弹窗 */}
      <ImagePreview
        open={isImagePreviewOpen}
        onOpenChange={setIsImagePreviewOpen}
        src={previewImage || undefined}
        alt="角色图片预览"
        closeButtonPosition="top-right"
      />

      {/* 底部操作浮层 */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-700 shadow-lg">
        <div className="px-6 py-4">
          <div className="flex items-center justify-center">
            {/* 右侧操作按钮 */}

            <Button
              onClick={() => {
                // 检查是否所有角色都有角色图
                const charactersWithoutImage = characters.filter(
                  (character) => !character.image_url
                );
                
                if (charactersWithoutImage.length > 0) {
                  // 如果有角色没有生成图片，显示提示
                  const characterNames = charactersWithoutImage
                    .map((c) => c.name)
                    .join("、");
                  toast.error(
                    t("pleaseGenerateAllCharacterImages", {
                      characters: characterNames,
                    })
                  );
                  return;
                }
                
                // 所有角色都有图片，执行下一步操作
                onComplete();
              }}
              className={cn(
                "bg-orange-400/80 hover:bg-orange-600 text-white px-6 w-[120px]",
                characters.some((character) => !character.image_url) && 
                "opacity-50 cursor-not-allowed"
              )}
            >
              {t("next")}
              <ArrowRight className="w-4 h-4 mr-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
