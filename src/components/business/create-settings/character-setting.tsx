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
  Mic,
  Volume2,
  Image as ImageIcon,
  Plus,
  X,
  Check
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { novelApi } from "@/lib/api/novel";
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

  // 添加角色弹窗状态
  const [isAddCharacterModalOpen, setIsAddCharacterModalOpen] = useState(false);
  const [novelCharacters, setNovelCharacters] = useState<ICharacter[]>([]);
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<Set<string>>(new Set());
  const [isLoadingNovelCharacters, setIsLoadingNovelCharacters] = useState(false);
  const [isSavingCharacters, setIsSavingCharacters] = useState(false);
  
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
          toast.error(query.state.data?.message || tCreation("playbookGenerationFailed") || t("splitFailed", { default: "Shot split failed" }));
        } else {
          // 分镜拆分成功，跳转到脚本页面
          toast.success(tCreation("playbookGenerationSuccess") || t("splitCompleted", { default: "Shot split completed" }));
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
      throw new Error(t("creationIdRequired") || tCreation("missingId"));
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
      throw new Error(tCreation('insufficientPoints'))
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
      throw new Error(t("creationIdRequired") || tCreation("missingId"));
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
      throw new Error(tCreation('insufficientPoints'))
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

  // 打开添加角色弹窗
  const handleOpenAddCharacterModal = async () => {
    if (!creation?.novel_id) {
      toast.error(tCreation("cannotFetchNovel"));
      return;
    }

    setIsAddCharacterModalOpen(true);
    setIsLoadingNovelCharacters(true);

    try {
      // 获取小说详情，包含所有角色
      const response = await novelApi.getNovel(String(creation.novel_id));
      const novelData = response.data as any;

      if (novelData?.characters) {
        setNovelCharacters(novelData.characters);

        // 初始化已选中的角色（当前 creation 已有的角色）
        const currentCharacterIds = new Set(
          characters.map(c => c.uuid || String(c.character_id)).filter(Boolean)
        );
        setSelectedCharacterIds(currentCharacterIds);
      }
    } catch (error) {
      console.error("获取小说角色失败:", error);
      toast.error(t("fetchFailed"));
    } finally {
      setIsLoadingNovelCharacters(false);
    }
  };

  // 切换角色选择状态
  const toggleCharacterSelection = (characterId: string) => {
    setSelectedCharacterIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(characterId)) {
        newSet.delete(characterId);
      } else {
        newSet.add(characterId);
      }
      return newSet;
    });
  };

  // 保存角色选择
  const handleSaveCharacterSelection = async () => {
    if (!creationId) {
      toast.error(tCreation("missingId"));
      return;
    }

    setIsSavingCharacters(true);

    try {
      // 将选中的角色ID转换为数组（转换为数字ID）
      const characterIdsArray = Array.from(selectedCharacterIds)
        .map(id => {
          const num = parseInt(id, 10);
          return isNaN(num) ? 0 : num;
        })
        .filter(id => id > 0);

      // 调用API更新creation的character_ids
      const updateData: any = {
        character_ids: characterIdsArray
      };
      await creationApi.updateCreation(creationId, updateData);

      toast.success(t("characterUpdated"));
      setIsAddCharacterModalOpen(false);

      // 刷新角色列表
      handleUpdate();
    } catch (error) {
      console.error("保存角色失败:", error);
      toast.error(t("saveFailed"));
    } finally {
      setIsSavingCharacters(false);
    }
  };

  // 单个角色重新生成图片
  const handleRegenerateSingleCharacter = useCallback(async (character: ICharacter) => {
    if (!creationId) {
      toast.error(t("creationIdRequired") || tCreation("missingId"));
      return;
    }

    const characterUuid = character.uuid || (character.character_id ? String(character.character_id) : '');
    if (!characterUuid) {
      toast.error(t("missingCharacterId"));
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
          newMap.set(characterUuid, response.data!.task_id);
          return newMap;
        });
        toast.success(t("regeneratingImage"));
      }
    } catch (error: any) {
      toast.error(error.message || t("regeneratingFailed"));
    }
  }, [creationId, selectedStyle, t, creation?.extra_data]); // Added creation?.extra_data dependency

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
              // 刷新数据
              handleUpdate();
              toast.success(t("regeneratingSuccess"));
            } else if (rawTask.status === TaskStatus.FAILURE) {
              // 生成失败
              setRegeneratingCharacters(prev => {
                const newMap = new Map(prev);
                newMap.delete(characterUuid);
                return newMap;
              });
              toast.error(rawTask.message || t("imageGenerationFailed"));
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
  }, [regeneratingCharacters, handleUpdate]);

  // 计算是否应该显示 loading
  const shouldShowLoading = isGenerating || isGeneratingPlaybook ||
                           (characters?.length === 0 && !!currentTaskId) ||
                           isResubmitting;

  // 根据状态确定 loading 文本
  const getLoadingText = () => {
    if (isGeneratingPlaybook) {
      return tCreation("playbookGenerationStarted") || t("generatingShots");
    }
    if (isGenerating) {
      return t("generating") || t("generating");
    }
    if (characters?.length === 0 && !!currentTaskId) {
      return t("analyzing") || t("analyzing");
    }
    if (isResubmitting) {
      return tCreation("resubmitting") || t("resubmitting");
    }
    return t("loading", { default: "Loading..." });
  };

  // 区分出镜角色和声音角色
  // 出镜角色: 有 body 描述 (或不为null)
  // 声音角色: body 为 null (或 basic_info 为 "声音角色")
  const appearanceCharacters = useMemo(() => characters.filter(c => c.body !== null), [characters]);
  const voiceCharacters = useMemo(() => characters.filter(c => c.body === null), [characters]);

  return (
    <div className="h-[calc(100vh-136px)] relative">
      {/* 装饰性背景 */}
      <div className="absolute -top-20 -left-20 w-60 h-60 bg-[#FDBCB4]/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute -top-20 -right-20 w-60 h-60 bg-[#ADD8E6]/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <ModuleLoading
        loading={shouldShowLoading}
        coverFlowContainer={true}
        text={getLoadingText()}
      >
        <div className="space-y-6 px-6 h-full overflow-y-auto pb-20 relative z-10 scrollbar-hide">
          <div className="flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur-md z-20 py-4 -mx-6 px-6 border-b border-[#ADD8E6]/30">
            <h3 className="text-lg font-bold bg-gradient-to-r from-[#22C55E] to-[#ADD8E6] bg-clip-text text-transparent flex items-center gap-2">
              <Users className="w-5 h-5 text-[#22C55E]" />
              {t("characterSettings")} ({characters.length})
            </h3>
            
            <div className="flex items-center gap-4">
                 {/* 风格选择 - 移到顶部 */}
                 <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{t("visualStyle")}:</span>
                    <Select value={selectedStyle} onValueChange={setSelectedStyle}>
                        <SelectTrigger className="w-[140px] h-8 text-xs rounded-lg claymorphism-sm bg-white">
                        <SelectValue placeholder={t("styleSelection")} />
                        </SelectTrigger>
                        <SelectContent>
                        {getStyleOptions(t).map((option) => (
                            <SelectItem key={option.value} value={option.value} className="text-xs">
                            {option.label}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                 </div>

                {/* 生成按钮 - 仅对出镜角色生成 */}
                <Button
                onClick={() => gengerateCharacterImages(appearanceCharacters)}
                disabled={isGenerating || isSubmittingCharacters || appearanceCharacters.length === 0}
                className="h-8 px-4 text-xs bg-[#22C55E] hover:bg-[#22C55E]/90 text-white shadow-lg shadow-[#22C55E]/20 rounded-lg transition-all border border-black/10 hover:translate-y-0.5"
                size="sm"
                >
                <WandSparkles className="w-3 h-3 mr-2" />
                {isGenerating || isSubmittingCharacters ? t("generating") : t("generateAllImages")}
                </Button>

                {/* 添加角色按钮 */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-4 text-xs border-[#22C55E] text-[#22C55E] hover:bg-[#22C55E] hover:text-white transition-colors"
                  onClick={handleOpenAddCharacterModal}
                >
                  <Plus className="w-3 h-3 mr-2" />
                  {t("addCharacter")}
                </Button>
            </div>
          </div>
          
          {/* 生成进度 */}
          {(isGenerating || isGeneratingPlaybook) && (
            <div className="flex justify-between items-center text-sm gap-2 px-1">
              <Progress 
                value={isGeneratingPlaybook ? (playbookTask?.data?.progress?.percent || 0) : generationProgress} 
                className="w-full h-1.5" 
              />
              {isGeneratingPlaybook && playbookTask?.data?.progress?.status && (
                <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                  {playbookTask.data.progress.status}
                </span>
              )}
            </div>
          )}
          
          {/* 出镜角色展示 */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-2 uppercase tracking-wider">
              <Users className="w-4 h-4" />
              出镜角色
            </h3>
            {appearanceCharacters.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {appearanceCharacters.map((character) => {
                     // 找到该角色在原始数组中的索引，以便正确触发编辑
                     const originalIndex = characters.findIndex(c => c.character_id === character.character_id || c.uuid === character.uuid);
                     return (
                    <Card
                      key={originalIndex}
                      className="group claymorphism bg-white hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col"
                    >
                        <div className="flex flex-col">
                            {/* 顶部：图片 (16:9 横版，高度自适应) */}
                            <div className="w-full h-auto shrink-0 rounded-t-lg overflow-hidden bg-[#ADD8E6]/10 border-b border-[#ADD8E6]/30 relative group-hover:border-[#ADD8E6]/50 transition-colors">
                                {regeneratingCharacters.has(character.uuid || String(character.character_id)) ? (
                                    <div className="w-full aspect-[16/9] flex items-center justify-center">
                                        <div className="w-8 h-8 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                ) : character.image_url ? (
                                    <div className="relative w-full h-auto">
                                        <img 
                                            src={character.image_url} 
                                            alt={character.name} 
                                            className="w-full h-auto object-contain bg-white/50 cursor-pointer hover:scale-110 transition-transform duration-500 block"
                                            onClick={() => handleImageClick(character.image_url!)}
                                        />
                                        {/* 悬浮操作层 */}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                            <button 
                                                onClick={() => handleImageClick(character.image_url!)}
                                                className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-sm transition-colors"
                                                title={t("preview", { default: "Preview" })}
                                            >
                                                <Maximize2 size={18} />
                                            </button>
                                            <button 
                                                onClick={() => handleEditCharacter(originalIndex)}
                                                className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-sm transition-colors"
                                                title={t("edit", { default: "Edit" })}
                                            >
                                                <PenLine size={18} />
                                            </button>
                                            <button 
                                                onClick={() => handleRegenerateSingleCharacter(character)}
                                                className="p-2 bg-[#22C55E]/30 hover:bg-[#22C55E]/50 rounded-full text-white backdrop-blur-sm transition-colors"
                                                title={t("regenerate")}
                                            >
                                                <RotateCcw size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#ADD8E6]/10 to-[#FDBCB4]/10 text-gray-500">
                                        <div className="w-10 h-10 mb-2 rounded-full bg-white/50 flex items-center justify-center border border-[#ADD8E6]/30">
                                            <ImageIcon size={20} className="opacity-50 text-[#ADD8E6]" />
                                        </div>
                                        <span className="text-xs font-medium opacity-70">{t("waitingToGenerate")}</span>
                                    </div>
                                )}
                            </div>

                            {/* 下部：信息与操作 */}
                            <div className="p-4 flex-1 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-base font-semibold text-gray-900 truncate pr-4">{character.name}</h4>
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-[#ADD8E6]/30 text-[#22C55E] shrink-0">
                                            出镜角色
                                        </Badge>
                                    </div>
                                    <div className="space-y-2">
                                        {character.appearance && (
                                            <div className="text-xs text-gray-600 leading-relaxed max-h-[60px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-300">
                                                <span className="text-[#ADD8E6] mr-1">{t("appearanceLabel")}</span>
                                                {character.appearance}
                                            </div>
                                        )}
                                        {!character.appearance && (
                                            <p className="text-xs text-gray-500 italic">{t("noFeatureDesc")}</p>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-2 mt-4">
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-8 px-3 text-xs border-[#ADD8E6]/30 text-[#22C55E] hover:text-[#22C55E] hover:bg-[#ADD8E6]/10"
                                        onClick={() => handleEditCharacter(originalIndex)}
                                    >
                                        <PenLine size={12} className="mr-1" />
                                        {t("edit", { default: "Edit" })}
                                    </Button>
                                    <Button 
                                        variant="secondary" 
                                        size="sm" 
                                        className="h-8 px-3 text-xs bg-[#22C55E]/10 text-[#22C55E] hover:bg-[#22C55E]/20 border border-[#22C55E]/20 ml-auto"
                                        onClick={() => handleRegenerateSingleCharacter(character)}
                                    >
                                        <RotateCcw size={12} className="mr-1" />
                                        {character.image_url ? t("regenerate") : t("generateRefImage")}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </Card>
                     );
                  })}
              </div>
            )}
            {appearanceCharacters.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">
                暂无出镜角色，点击t("addCharacter")按钮添加
              </div>
            )}
          </div>

          {/* 声音角色展示 */}
          {voiceCharacters.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-[#ADD8E6]/30">
              <h3 className="text-sm font-semibold text-[#22C55E] flex items-center gap-2 uppercase tracking-wider">
                <Mic className="w-4 h-4 text-[#ADD8E6]" />
                声音角色
              </h3>
              <div className="flex flex-col gap-4">
                  {voiceCharacters.map((character) => {
                     const originalIndex = characters.findIndex(c => c.character_id === character.character_id || c.uuid === character.uuid);
                     return (
                    <Card
                      key={originalIndex}
                      className="w-full claymorphism bg-white hover:shadow-lg transition-all duration-300"
                    >
                         <div className="flex p-3 gap-3 items-center">
                            {/* 左侧：图标 */}
                            <div className="w-12 h-12 shrink-0 rounded-full bg-[#FDBCB4]/10 flex items-center justify-center text-[#FDBCB4] border border-[#FDBCB4]/20">
                                <Volume2 size={20} />
                            </div>

                            {/* 中间：信息 */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-medium text-gray-900 truncate">{character.name}</h4>
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-[#FDBCB4]/10 text-[#FDBCB4] hover:bg-[#FDBCB4]/20">
                                        {t("voiceShort")}
                                    </Badge>
                                </div>
                                <div className="text-xs text-gray-600 max-h-[40px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-300">
                                    {character.voice_description || t("noVoiceDesc")}
                                </div>
                            </div>

                            {/* 右侧：操作 */}
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-gray-500 hover:text-[#22C55E] hover:bg-[#ADD8E6]/10 rounded-full"
                                onClick={() => handleEditCharacter(originalIndex)}
                            >
                                <PenLine size={14} />
                            </Button>
                         </div>
                    </Card>
                  );})}
              </div>
            </div>
          )}
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
        alt={t("imagePreviewTitle")}
        closeButtonPosition="top-right"
      />

      {/* 底部操作浮层 */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-white via-[#ADD8E6]/10 to-white border-t-2 border-[#ADD8E6]/30 shadow-2xl backdrop-blur-sm">
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
                    toast.error(tCreation("creationIdRequired") || tCreation("missingId"));
                    return;
                  }
                  
                  try {
                    setIsGeneratingPlaybook(true);
                    // 调用分镜拆分API（使用默认的 original 模式，可以从 extra_data 中获取）
                    const response = await creationApi.generatePlaybook(creationId, "original");
                    if (response?.data?.task_id) {
                      setPlaybookTaskId(response.data.task_id);
                      toast.success(tCreation("playbookGenerationStarted") || t("shotSplitStarted"));
                      // 启动任务后，立即跳转到脚本页面
                      handleUpdate(); // 刷新创作数据
                      setTimeout(() => {
                        onComplete(); // 跳转到脚本页面
                      }, 300);
                    } else {
                      throw new Error(t("taskIdNotFound") || t("missingTaskId"));
                    }
                  } catch (error: any) {
                    setIsGeneratingPlaybook(false);
                    toast.error(error?.message || tCreation("playbookGenerationFailed") || t("shotSplitFailed"));
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
                "bg-[#22C55E] hover:bg-[#22C55E]/90 text-white px-6 shadow-lg shadow-[#22C55E]/20 hover:shadow-[#22C55E]/30 transition-all duration-200 hover:translate-y-0.5 rounded-xl border border-black/10",
                isGeneratingPlaybook ? "w-auto min-w-[120px]" : "w-[120px]",
                (characters.length > 0 && characters.some((character) => !character.image_url)) &&
                "opacity-50 cursor-not-allowed hover:translate-y-0"
              )}
            >
              {isGeneratingPlaybook
                ? (tCreation("playbookGenerationStarted") || t("generatingShots"))
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

      {/* 添加角色弹窗 */}
      <Dialog open={isAddCharacterModalOpen} onOpenChange={setIsAddCharacterModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{t("addCharacter")}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsAddCharacterModalOpen(false)}
              >
                <X size={18} />
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4">
            {isLoadingNovelCharacters ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : novelCharacters.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                {t("noCharactersLabel")}
              </div>
            ) : (
              <div className="space-y-2">
                {novelCharacters.map((character) => {
                  const characterId = character.uuid || String(character.character_id);
                  const isSelected = selectedCharacterIds.has(characterId);
                  const isVoiceCharacter = !character.body;

                  return (
                    <div
                      key={characterId}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? "border-[#22C55E] bg-[#22C55E]/5"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => toggleCharacterSelection(characterId)}
                    >
                      {/* 选择框 */}
                      <div
                        className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                          isSelected
                            ? "bg-[#22C55E] border-[#22C55E]"
                            : "border-gray-300"
                        }`}
                      >
                        {isSelected && <Check size={14} className="text-white" />}
                      </div>

                      {/* 角色图片 */}
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {character.image_url ? (
                          <img
                            src={character.image_url}
                            alt={character.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            {isVoiceCharacter ? <Volume2 size={20} /> : <Users size={20} />}
                          </div>
                        )}
                      </div>

                      {/* 角色信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 truncate">
                            {character.name}
                          </span>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] px-1.5 py-0 h-4 ${
                              isVoiceCharacter
                                ? "bg-[#FDBCB4]/10 text-[#FDBCB4]"
                                : "bg-[#22C55E]/10 text-[#22C55E]"
                            }`}
                          >
                            {isVoiceCharacter ? t("voiceShort") : t("cameraShort")}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {character.appearance || character.basic_info || t("noDescription")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 底部按钮 */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsAddCharacterModalOpen(false)}
            >
              {t("cancel", { default: "Cancel" })}
            </Button>
            <Button
              onClick={handleSaveCharacterSelection}
              disabled={isSavingCharacters}
              className="bg-[#22C55E] hover:bg-[#22C55E]/90 text-white"
            >
              {isSavingCharacters ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  {t("saving", { default: "Saving..." })}
                </>
              ) : (
                <>
                  <Check size={16} className="mr-2" />
                  保存 ({selectedCharacterIds.size})
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
