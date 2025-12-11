"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
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
  Users,
} from "lucide-react";
import { CharacterEditModal } from "@/components/modals/character-edit-modal";
import { ImagePreview } from "@/components/ui/image-preview";
import { cn } from "@/lib/utils";
import { ICharacter } from "@/types/character";
import ModuleLoading from "@/components/ui/module-loading";
import characterApi from "@/lib/api/character";
import taskApi from "@/lib/api/task";
import creationApi from "@/lib/api/creation";
import { TaskStatus, TaskType } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { useTaskSubmission } from "@/hooks/use-task-submission";
import { CreationStatus } from "@/types/creation";

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
  creationStatus,
  creationId,
  isResubmitting = false,
  creation,
}: {
  characters: ICharacter[];
  currentTaskId?: string;
  onComplete: () => void;
  handleUpdate: () => void;
  creationStatus?: string;
  creationId?: string;
  isResubmitting?: boolean;
  creation?: any;
}) {
  const t = useTranslations("character");
  const tCreation = useTranslations("creation");
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
  const [playbookTaskId, setPlaybookTaskId] = useState<string | null>(null);
  const [isGeneratingPlaybook, setIsGeneratingPlaybook] = useState(false);

  // 单个角色重新生成状态管理：Map<characterUuid, taskId>
  const [regeneratingCharacters, setRegeneratingCharacters] = useState<Map<string, string>>(new Map());
  
  // 角色图片生成任务轮询
  const { data: task } = useQuery({
    queryKey: ["task", taskId as string],
    queryFn: () => taskApi.queryTaskStatus(taskId as string),
    enabled: !!taskId,
    refetchInterval: (query) => {
      if (query.state.data?.data?.status === TaskStatus.SUCCESS || query.state.data?.data?.status === TaskStatus.FAILURE) {
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

  // 分镜拆分任务轮询
  const { data: playbookTask } = useQuery({
    queryKey: ["task", playbookTaskId as string],
    queryFn: () => taskApi.queryTaskStatus(playbookTaskId as string),
    enabled: !!playbookTaskId,
    refetchInterval: (query) => {
      if (query.state.data?.data?.status === TaskStatus.SUCCESS || query.state.data?.data?.status === TaskStatus.FAILURE) {
        setIsGeneratingPlaybook(false);
        handleUpdate(); // 刷新创作数据以获取最新状态
        if (query.state.data?.data?.status === TaskStatus.FAILURE) {
          toast.error(query.state.data?.message || tCreation("playbookGenerationFailed") || "分镜拆分失败");
        } else {
          // 分镜拆分成功，跳转到脚本页面
          toast.success(tCreation("playbookGenerationSuccess") || "分镜拆分完成");
          setTimeout(() => {
            onComplete();
          }, 500);
        }
        return false;
      }
      return 2000;
    },
  });

  // 监听创作状态和 currentTaskId，如果状态是 CHARACTER_ANALYZED 且有 currentTaskId，自动开始轮询分镜拆分任务
  useEffect(() => {
    if (creationStatus === CreationStatus.CHARACTER_ANALYZED && currentTaskId && !playbookTaskId) {
      // 检查任务类型，如果是分镜拆分任务，开始轮询
      taskApi.queryTaskStatus(currentTaskId).then((response) => {
        // response 本身就是 {data: {...}, message: string}
        // response.data 可能的结构:
        // 1. {data: {...}, message: string} - 标准 API 响应
        // 2. {task_id, task_type, status, message, ...} - 直接返回 Task 对象
        const apiResponse = response?.data as any;

        // 尝试两种可能的结构
        let rawTask = apiResponse?.data; // 结构1
        if (!rawTask && apiResponse?.task_id) {
          // 结构2: apiResponse 本身就是 Task 对象
          rawTask = apiResponse;
        }

        if (rawTask && rawTask.task_type === TaskType.SCENE_DESCRIPTION_GENERATION) {
          // 是分镜拆分任务，开始轮询
          setPlaybookTaskId(currentTaskId);
          setIsGeneratingPlaybook(true);
        }
      }).catch((error) => {
        console.error("查询任务状态失败:", error);
      });
    }
  }, [creationStatus, currentTaskId, playbookTaskId]);

  // 监听角色图片生成任务完成，只在任务刚完成时自动跳转
  const prevTaskIdRef = useRef<string | null>(null);
  useEffect(() => {
    // 只有在任务ID从有到无的时候才触发（说明任务刚完成）
    if (prevTaskIdRef.current && !currentTaskId && creationStatus === "character_generated") {
      const allHaveImages = characters.every((char) => char.image_url);
      if (allHaveImages && characters.length > 0) {
        // 延迟一下，确保UI已更新
        setTimeout(() => {
          onComplete();
        }, 500);
      }
    }
    prevTaskIdRef.current = currentTaskId || null;
  }, [creationStatus, characters, onComplete, currentTaskId]);
  // 生成角色图片的内部函数
  const generateCharacterImagesInternal = useCallback(async (characters: ICharacter[]) => {
    if (!creationId) {
      throw new Error(t("creationIdRequired") || "创作ID不存在");
    }

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

    const characterIds = characters.map((character) =>
      character.uuid || (character.character_id ? String(character.character_id) : '')
    ).filter(id => id); // 过滤掉空值
    const response = await characterApi.generateCharacterImages(
      characterIds,
      getStyleOptions(t).find((option) => option.value === selectedStyle)?.label ||
        t("animeStyle"),
      creationId,
      false  // force_regenerate=false，跳过已有图片的角色
    );
    if (response.data && response.data.task_id) {
      setTaskId(response.data.task_id);
    } else {
      throw new Error(t("taskIdNotFound"));
    }
  }, [selectedStyle, t, creationId]);

  // 使用任务提交 hook 包装生成函数
  const { submit: gengerateCharacterImages, isSubmitting: isSubmittingCharacters } = useTaskSubmission(
    generateCharacterImagesInternal,
    {
      debounceDelay: 500,
      enableDebounce: true,
      onError: (error) => {
        toast.error(error.message || t("generationFailed"));
        setIsGenerating(false);
      },
    }
  );

  // 重新生成角色图片的内部函数（force_regenerate=true）
  const regenerateCharacterImagesInternal = useCallback(async (characters: ICharacter[]) => {
    if (!creationId) {
      throw new Error(t("creationIdRequired") || "创作ID不存在");
    }

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

    const characterIds = characters.map((character) =>
      character.uuid || (character.character_id ? String(character.character_id) : '')
    ).filter(id => id); // 过滤掉空值
    const response = await characterApi.generateCharacterImages(
      characterIds,
      getStyleOptions(t).find((option) => option.value === selectedStyle)?.label ||
        t("animeStyle"),
      creationId,
      true  // force_regenerate=true，强制重新生成
    );
    if (response.data && response.data.task_id) {
      setTaskId(response.data.task_id);
    } else {
      throw new Error(t("taskIdNotFound"));
    }
  }, [selectedStyle, t, creationId]);

  // 使用任务提交 hook 包装重新生成函数
  const { submit: regenerateCharacterImages, isSubmitting: isRegeneratingCharacters } = useTaskSubmission(
    regenerateCharacterImagesInternal,
    {
      debounceDelay: 500,
      enableDebounce: true,
      onError: (error) => {
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

  // 单个角色重新生成图片
  const handleRegenerateSingleCharacter = useCallback(async (character: ICharacter) => {
    if (!creationId) {
      toast.error(t("creationIdRequired") || "创作ID不存在");
      return;
    }

    const characterUuid = character.uuid || (character.character_id ? String(character.character_id) : '');
    if (!characterUuid) {
      toast.error("角色ID不存在");
      return;
    }

    try {
      // 检查积分
      const { checkAndNotifyPoints } = await import('@/lib/utils/points-check');
      const pointsAvailable = await checkAndNotifyPoints(
        {
          operation_type: 'generate_image',
          image_count: 1,
          image_model_name:
            creation?.extra_data?.text_to_image_model ||
            creation?.extra_data?.image_to_image_model,
        },
        t
      );

      if (!pointsAvailable) {
        return;
      }

      // 调用单个角色重新生成API
      const response = await characterApi.regenerateCharacterImage(
        characterUuid,
        getStyleOptions(t).find((option) => option.value === selectedStyle)?.label ||
          t("animeStyle"),
        creationId
      );

      if (response.data && response.data.task_id) {
        // 记录该角色正在重新生成
        setRegeneratingCharacters(prev => {
          const newMap = new Map(prev);
          newMap.set(characterUuid, response.data.task_id);
          return newMap;
        });
        toast.success("角色图片重新生成中...");
      }
    } catch (error: any) {
      toast.error(error.message || "重新生成失败");
    }
  }, [creationId, selectedStyle, t]);

  // 刷新单个角色数据（不触发页面跳转，不调用handleUpdate）
  const refreshCharacterData = useCallback(async (characterUuid: string) => {
    try {
      // 获取单个角色的最新数据
      const response = await characterApi.getCharacter(characterUuid);
      if (response.data) {
        // 只更新本地 state 中该角色的 image_url，不调用 handleUpdate
        setCharacters(prevCharacters => {
          return prevCharacters.map(char => {
            const charId = char.uuid || String(char.character_id);
            if (charId === characterUuid) {
              // 更新该角色的数据
              return {
                ...char,
                image_url: response.data.image_url,
              };
            }
            return char;
          });
        });
      }
    } catch (error) {
      console.error("刷新角色数据失败:", error);
    }
  }, []);

  // 轮询单个角色重新生成的任务状态
  useEffect(() => {
    if (regeneratingCharacters.size === 0) return;

    const intervals: NodeJS.Timeout[] = [];

    regeneratingCharacters.forEach((taskId, characterUuid) => {
      const interval = setInterval(async () => {
        try {
          const response = await taskApi.queryTaskStatus(taskId);
          const apiResponse = response?.data as any;

          // 尝试两种可能的结构
          let rawTask = apiResponse?.data;
          if (!rawTask && apiResponse?.task_id) {
            rawTask = apiResponse;
          }

          if (rawTask) {
            if (rawTask.status === TaskStatus.SUCCESS) {
              // 生成成功，移除该角色的loading状态
              setRegeneratingCharacters(prev => {
                const newMap = new Map(prev);
                newMap.delete(characterUuid);
                return newMap;
              });
              // 刷新角色数据以获取新图片（不会触发页面跳转）
              await refreshCharacterData(characterUuid);
              toast.success("角色图片重新生成成功");
            } else if (rawTask.status === TaskStatus.FAILURE) {
              // 生成失败
              setRegeneratingCharacters(prev => {
                const newMap = new Map(prev);
                newMap.delete(characterUuid);
                return newMap;
              });
              toast.error(rawTask.message || "角色图片生成失败");
            }
          }
        } catch (error) {
          console.error("轮询任务状态失败:", error);
        }
      }, 2000);

      intervals.push(interval);
    });

    return () => {
      intervals.forEach(interval => clearInterval(interval));
    };
  }, [regeneratingCharacters, refreshCharacterData]);

  // 计算是否应该显示 loading
  const shouldShowLoading = isGenerating || isGeneratingPlaybook ||
                           (characters?.length === 0 && !!currentTaskId) ||
                           isResubmitting;

  // 根据状态确定 loading 文本
  const getLoadingText = () => {
    if (isGeneratingPlaybook) {
      return tCreation("playbookGenerationStarted") || "正在生成分镜...";
    }
    if (isGenerating) {
      return t("generating") || "生成中...";
    }
    if (characters?.length === 0 && !!currentTaskId) {
      return t("analyzing") || "分析中...";
    }
    if (isResubmitting) {
      return tCreation("resubmitting") || "重新提交中...";
    }
    return "加载中...";
  };

  return (
    <div className="h-[calc(100vh-136px)] relative">
      {/* 装饰性背景 */}
      <div className="absolute -top-20 -left-20 w-60 h-60 bg-orange-400/10 dark:bg-orange-400/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute -top-20 -right-20 w-60 h-60 bg-purple-400/10 dark:bg-purple-400/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <ModuleLoading
        loading={shouldShowLoading}
        coverFlowContainer={true}
        text={getLoadingText()}
      >
        <div className="space-y-4 px-6 h-full overflow-y-auto pb-20 relative z-10">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold bg-gradient-to-r from-orange-600 to-purple-600 dark:from-orange-400 dark:to-purple-400 bg-clip-text text-transparent flex items-center gap-2">
              <Users className="w-5 h-5 text-orange-500" />
              {t("characterSettings")} ({characters.length})
            </h3>
            {/* 生成按钮 */}
            <Button
              onClick={() => gengerateCharacterImages(characters)}
              disabled={isGenerating || isSubmittingCharacters}
              className="px-4 py-4 text-sm bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white shadow-lg shadow-orange-500/30 hover:shadow-orange-500/40 transition-all duration-200 hover:scale-105 rounded-xl"
              variant="secondary"
            >
              <WandSparkles className="w-3 h-3" />
              {isGenerating || isSubmittingCharacters ? t("generating") : t("generateCharacterImage")}
            </Button>
          </div>
          {/* 生成进度 */}
          {(isGenerating || isGeneratingPlaybook) && (
            <div className="flex justify-between items-center text-sm gap-2">
              <Progress 
                value={isGeneratingPlaybook ? (playbookTask?.data?.progress?.percent || 0) : generationProgress} 
                className="w-full" 
              />
              {isGeneratingPlaybook && playbookTask?.data?.progress?.status && (
                <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                  {playbookTask.data.progress.status}
                </span>
              )}
            </div>
          )}
          {/* 风格选择 */}
          <div className="space-y-3 p-4 rounded-xl bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800/50 dark:to-gray-900/30 border-2 border-gray-200/50 dark:border-gray-700/50 shadow-md hover:shadow-lg transition-shadow duration-300">
            <h3 className="text-base font-semibold bg-gradient-to-r from-orange-600 to-pink-600 dark:from-orange-400 dark:to-pink-400 bg-clip-text text-transparent">
              {t("visualStyle")}
            </h3>
            <div className="flex items-center space-x-4">
              {/* <label className="text-sm font-medium">{t("风格选择")}:</label> */}
              <Select value={selectedStyle} onValueChange={setSelectedStyle}>
                <SelectTrigger className="w-[200px] rounded-xl border-2 hover:border-orange-400 transition-colors">
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
            <h3 className="text-base font-semibold bg-gradient-to-r from-orange-600 to-pink-600 dark:from-orange-400 dark:to-pink-400 bg-clip-text text-transparent">
              {t("characterSettings")}
            </h3>
            <div className="w-full overflow-x-auto">
              <div className="flex space-x-3 pb-4">
                {characters.map((character, index) => (
                  <div
                    className="flex flex-col w-[65vw] md:w-[240px] lg:w-[300px] flex-shrink-0"
                    key={index}
                  >
                    <div className="w-fit text-sm text-nowrap py-2 px-4 bg-gradient-to-r from-orange-500 to-pink-500 dark:from-orange-500/80 dark:to-pink-500/80 text-white rounded-t-xl tracking-wider font-bold flex items-center gap-1 shadow-md">
                      <span>{character.name}</span>
                      <PenLine
                        className="inline-block w-3 h-3 text-white/80 cursor-pointer hover:text-white hover:scale-110 transition-all"
                        onClick={() => handleEditCharacter(index)}
                      />
                    </div>
                    <Card
                      key={index}
                      className="w-full bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900/50 rounded-tl-none border-2 border-gray-200/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300 rounded-tr-xl rounded-b-xl p-y-3"
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
                              {(Array.isArray(character.tags) ? character.tags : (character.tags ? [character.tags] : [])).join(", ")}
                            </p>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-[300px] max-h-[300px] overflow-auto">
                            <DropdownMenuItem className="whitespace-pre-line">
                              {(Array.isArray(character.tags) ? character.tags : (character.tags ? [character.tags] : [])).join(", ")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        {character.image_url && (
                          <div className="flex flex-col gap-1 items-center">
                            <div className="h-[1px] bg-gray-300 dark:bg-zinc-700 w-full mb-2" />
                            <div className="relative">
                              {/* 判断该角色是否正在重新生成 */}
                              {regeneratingCharacters.has(character.uuid || String(character.character_id)) ? (
                                <div className="w-42 h-42 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 rounded">
                                  <div className="flex flex-col items-center gap-2">
                                    <div className="w-8 h-8 border-3 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
                                    <span className="text-xs text-muted-foreground">重新生成中...</span>
                                  </div>
                                </div>
                              ) : (
                                <>
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
                                        "py-1 px-2 bg-gradient-to-r from-blue-500/80 to-purple-500/80 hover:from-blue-600/90 hover:to-purple-600/90 text-white border-0 shadow-lg rounded-full backdrop-blur-sm",
                                        "flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110"
                                      )}
                                      onClick={() =>
                                        handleImageClick(character.image_url)
                                      }
                                    >
                                      <Maximize2 className="w-3 h-3" />
                                    </div>
                                    <div
                                      className={cn(
                                        "py-1 px-2 bg-gradient-to-r from-orange-500/80 to-pink-500/80 hover:from-orange-600/90 hover:to-pink-600/90 text-white border-0 shadow-lg rounded-xl backdrop-blur-sm",
                                        "flex items-center gap-1 cursor-pointer transition-all duration-200 hover:scale-105"
                                      )}
                                      onClick={() =>
                                        handleRegenerateSingleCharacter(character)
                                      }
                                    >
                                      <RotateCcw className="w-3 h-3" />
                                      <span className="text-xs">
                                        {t("regenerate")}
                                      </span>
                                    </div>
                                  </div>
                                </>
                              )}
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
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 border-t-2 border-orange-200/50 dark:border-orange-700/50 shadow-2xl backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-center">
            {/* 右侧操作按钮 */}

            <Button
              onClick={async () => {
                // 如果状态是 CHARACTER_ANALYZED，需要先启动分镜拆分任务
                if (creationStatus === CreationStatus.CHARACTER_ANALYZED) {
                  // 先检查是否所有角色都有角色图
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
                  
                  if (!creationId) {
                    toast.error(tCreation("creationIdRequired") || "创作ID不存在");
                    return;
                  }
                  
                  try {
                    setIsGeneratingPlaybook(true);
                    // 调用分镜拆分API（使用默认的 original 模式，可以从 extra_data 中获取）
                    const response = await creationApi.generatePlaybook(creationId, "original");
                    if (response?.data?.task_id) {
                      setPlaybookTaskId(response.data.task_id);
                      toast.success(tCreation("playbookGenerationStarted") || "分镜拆分任务已启动");
                      // 启动任务后，立即跳转到脚本页面
                      handleUpdate(); // 刷新创作数据
                      setTimeout(() => {
                        onComplete(); // 跳转到脚本页面
                      }, 300);
                    } else {
                      throw new Error(t("taskIdNotFound") || "未获取到任务ID");
                    }
                  } catch (error: any) {
                    setIsGeneratingPlaybook(false);
                    toast.error(error?.message || tCreation("playbookGenerationFailed") || "启动分镜拆分任务失败");
                    console.error("启动分镜拆分任务失败:", error);
                  }
                  return;
                }
                
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
              disabled={isGeneratingPlaybook || (characters.length > 0 && characters.some((character) => !character.image_url))}
              className={cn(
                "bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white px-6 shadow-lg shadow-orange-500/30 hover:shadow-orange-500/40 transition-all duration-200 hover:scale-105 rounded-xl",
                isGeneratingPlaybook ? "w-auto min-w-[120px]" : "w-[120px]",
                (characters.length > 0 && characters.some((character) => !character.image_url)) &&
                "opacity-50 cursor-not-allowed hover:scale-100"
              )}
            >
              {isGeneratingPlaybook
                ? (tCreation("playbookGenerationStarted") || "正在生成分镜...")
                : (creationStatus === CreationStatus.CHARACTER_ANALYZED
                    ? t("analyzePlaybook")
                    : t("next"))
              }
              <ArrowRight className="w-4 h-4 mr-1" />
            </Button>
          </div>
        </div>
      </div>
      </ModuleLoading>
    </div>
  );
}
