"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import { useParams, useSearchParams, usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ProgressWrapper,
  useProgressSteps,
  type ProgressStep,
} from "@/components/business/progress-wrapper";
import { useRouter } from "next/navigation";
import { StorySetting } from "@/components/business/create-settings/story-setting";
import { ScriptSetting } from "@/components/business/create-settings/script-setting";
import { CharacterSetting } from "@/components/business/create-settings/character-setting";
import { StoryboardImages } from "@/components/business/create-settings/storyboard-images";
import { VideoGenerator } from "@/components/business/create-settings/video-generator";
import creationApi from "@/lib/api/creation";
import taskApi from "@/lib/api/task";
import { useQuery } from "@tanstack/react-query";
import { ICreation, CreationStatus } from "@/types/creation";
import { ICharacter } from "@/types/character";
import ModuleLoading from "@/components/ui/module-loading";
import { toast } from "sonner";
import { TaskStatus, TaskType, SceneGroup, ShotsTaskResponse, Task } from "@/types";
import { IScene } from "@/types/scene";
import { useTaskSubmission } from "@/hooks/use-task-submission";
import { useFlowNavigation } from "@/hooks/use-flow-navigation";
import { FlowStep } from "@/lib/flow-manager";

// 将轮询任务返回的分镜数据转换为 StoryboardImages 组件需要的格式
function transformShotsToSceneGroups(shotsData: ShotsTaskResponse): SceneGroup[] {
  return shotsData.scenes.map((scene) => ({
    scene_id: String(scene.scene_id),
    scene_title: scene.title,
    images: scene.shots.map((shot) => {
      // 优先使用 uuid 字段，如果不存在则使用 shot_id
      const shotAny = shot as any; // shotsTaskData 中的 shot 可能缺少某些字段
      const shotUuid = shotAny.uuid;
      const imageId = shotUuid || String(shot.shot_id);
      return {
        image_id: imageId, // 优先使用UUID，如果没有则使用shot_id
        uuid: shotUuid, // 单独保存uuid字段（可能为undefined）
        title: shot.title,
        image_url: shot.image_url || "",
        prompt: shot.image_prompt || shot.prompt || "", // 优先使用 image_prompt
        narration: shot.narration || "",
        characters: shotAny.characters || [], // 保留角色关联数据（shotsTaskData 中可能没有此字段）
        status: shot.status === "completed" ? "completed"
              : shot.status === "failed" ? "failed"
              : shot.status === "generating" ? "generating"
              : "generating",
      };
    }),
  }));
}

// 合并更新 storyboardData，只更新 status 和 image_url，保留 uuid 和 characters 等字段
function mergeStoryboardData(
  existingData: SceneGroup[],
  newData: SceneGroup[]
): SceneGroup[] {
  return newData.map((newScene) => {
    // 查找对应的现有场景
    const existingScene = existingData.find(
      (s) => s.scene_id === newScene.scene_id
    );

    if (!existingScene) {
      // 如果没有现有场景，直接返回新场景数据
      return newScene;
    }

    // 合并场景中的图片数据
    const mergedImages = newScene.images.map((newImage) => {
      // 根据多种方式匹配现有的图片

      const existingImage = existingScene.images.find((img) => {
        // 1. 优先使用 uuid 匹配（最可靠）
        if (newImage.uuid && img.uuid) {
          return img.uuid === newImage.uuid;
        }
        // 2. 如果新数据有 uuid，匹配现有数据的 image_id（因为 image_id 可能是 uuid）
        if (newImage.uuid && !img.uuid) {
          return img.image_id === newImage.uuid;
        }
        // 3. 如果现有数据有 uuid，匹配新数据的 image_id（因为新数据的 image_id 可能是 uuid）
        if (img.uuid && !newImage.uuid) {
          return img.uuid === newImage.image_id;
        }
        // 4. 使用 image_id 直接匹配
        if (img.image_id === newImage.image_id) {
          return true;
        }
        // 5. 如果都是数字字符串（可能是 shot_id），也匹配
        const imgIdNum = parseInt(img.image_id, 10);
        const newIdNum = parseInt(newImage.image_id, 10);
        if (!isNaN(imgIdNum) && !isNaN(newIdNum) && imgIdNum === newIdNum) {
          return true;
        }
        return false;
      });
      if (!existingImage) {
        // 如果没有现有图片，直接返回新图片数据
        return newImage;
      }

      // 合并数据：只更新 status 和 image_url，保留其他字段（特别是 uuid 和 characters）
      return {
        ...existingImage, // 保留所有现有字段（包括 uuid 和 characters）
        status: newImage.status, // 更新状态
        image_url: newImage.image_url || existingImage.image_url, // 更新图片URL（如果有新值）
      };
    });

    return {
      ...existingScene,
      images: mergedImages,
    };
  });
}

// 将 Creation 中的 scenes 数据转换为 StoryboardImages 组件需要的格式
function transformCreationScenesToSceneGroups(scenes: IScene[]): SceneGroup[] {
  return scenes.map((scene) => ({
    scene_id: String(scene.scene_id),
    scene_title: scene.title,
    images: scene.shots.map((shot) => {
      // 优先使用 uuid 字段，如果不存在则使用 shot_id
      const shotUuid = shot.uuid;
      const imageId = shotUuid || String(shot.shot_id);
      return {
        image_id: imageId, // 优先使用UUID，如果没有则使用shot_id
        uuid: shotUuid, // 单独保存uuid字段（可能为undefined）
        title: shot.title,
        image_url: shot.image_url || "",
        prompt: shot.image_prompt || "", // 注意：IShot 中字段名是 image_prompt
        narration: shot.narration || "",
        characters: shot.characters || [],
        status: (shot.image_url ? "completed" : "pending") as "pending" | "generating" | "completed" | "failed",
      };
    }),
  }));
}

export default function CreateCreation() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale as string;
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const creationIdFromUrl = searchParams?.get("creationId") || "";
  const [creationId, setCreationId] = useState<string>(creationIdFromUrl);
  const prevPathnameRef = useRef<string | null>(null);
  const prevCreationIdRef = useRef<string | null>(null);
  const hasInitializedRef = useRef<boolean>(false);
  const lastQueryTimeRef = useRef<number>(0);
  const queryExecutionCountRef = useRef<Map<string, number>>(new Map());

  // 分镜生成任务相关状态
  const [shotsTaskId, setShotsTaskId] = useState<string | null>(null);
  const [isGeneratingShots, setIsGeneratingShots] = useState(false);
  const [storyboardData, setStoryboardData] = useState<SceneGroup[]>([]);

  // 防止重复提交任务的标志
  const [isResubmitting, setIsResubmitting] = useState(false);

  // 同步 URL 参数到 state
  useEffect(() => {
    if (creationIdFromUrl && creationIdFromUrl !== creationId) {
      setCreationId(creationIdFromUrl);
      setIsResubmitting(false);
    }
  }, [creationIdFromUrl, creationId]);

  // 当 creationId 变化时，重置重新提交标志
  useEffect(() => {
    setIsResubmitting(false);
  }, [creationId]);

  // 创建步骤数据
  const initialSteps = [
    {
      id: "story",
      title: t("createVideo.story"),
    },
    {
      id: "character",
      title: t("createVideo.character"),
    },
    {
      id: "script",
      title: t("createVideo.script"),
    },
    {
      id: "material",
      title: t("createVideo.storyboard"),
    },
    {
      id: "video",
      title: t("createVideo.video"),
    },
  ];

  // 使用 useMemo 来稳定 queryKey
  const queryKey = useMemo(() => ["creation", creationId] as const, [creationId]);

  // 查询创作数据
  const { data: curCreationResponse, isLoading, refetch: refetchCreation } = useQuery({
    queryKey,
    queryFn: () => {
      const now = Date.now();
      const count = queryExecutionCountRef.current.get(creationId) || 0;
      queryExecutionCountRef.current.set(creationId, count + 1);

      lastQueryTimeRef.current = now;
      return creationApi.queryCreationById(creationId);
    },
    enabled: !!creationId,
    staleTime: 0,
    refetchOnMount: true, // 每次挂载时都强制刷新，确保获取最新数据
    refetchOnWindowFocus: true, // 返回页面自动刷新，避免流程切换后状态丢失
    refetchInterval: false, // 不再轮询创作详情，改为通过任务完成后刷新
    gcTime: 0,
    retry: 1,
    retryDelay: 0,
  });
  const curCreation = useMemo(() => curCreationResponse?.data as ICreation, [curCreationResponse]);

  // 创作数据变化时，用最新分镜刷新 storyboardData，避免返回流程时显示旧图
  useEffect(() => {
    if (curCreation?.scenes) {
      setStoryboardData(transformCreationScenesToSceneGroups(curCreation.scenes));
    }
  }, [curCreation?.scenes]);

  // 查询任务状态（如果有 current_task_id）
  const { data: taskResponse } = useQuery({
    queryKey: ["task", curCreation?.current_task_id],
    queryFn: () => taskApi.queryTaskStatus(curCreation!.current_task_id!),
    enabled: !!curCreation?.current_task_id,
    staleTime: 0,
    retry: 1,
    refetchInterval: (query) => {
      const taskData = query.state.data?.data;
      // 如果任务已完成（成功或失败），停止轮询
      if (taskData?.status === TaskStatus.SUCCESS || taskData?.status === TaskStatus.FAILURE) {
        // 任务完成后，刷新创作数据
        refetchCreation();
        return false;
      }
      // 否则每2秒轮询一次
      return 2000;
    },
  });
  const currentTask = useMemo(() => {
    if (!taskResponse?.data) {
      return undefined;
    }

    // taskResponse 是 useQuery 返回的结果
    // taskResponse.data 是 apiClient.get() 的返回值
    // 可能的结构：
    // 1. {data: {...}, message: string} - 标准 API 响应
    // 2. {task_id, task_type, status, message, ...} - 直接返回 Task 对象
    const apiResponse = taskResponse.data as any;

    // 尝试两种可能的结构
    let rawTask = apiResponse.data; // 结构1: {data: {...}, message}
    if (!rawTask && apiResponse.task_id) {
      // 结构2: apiResponse 本身就是 Task 对象
      rawTask = apiResponse;
    }

    if (!rawTask) {
      return undefined;
    }

    // 后端返回 snake_case，需要转换为 camelCase
    const task: Task = {
      taskId: rawTask.task_id,
      taskType: rawTask.task_type,
      status: rawTask.status,
      message: rawTask.message,
      progress: rawTask.progress,
      resource: rawTask.resource,
    };

    return task;
  }, [taskResponse]);


  // 使用流程导航 Hook 来管理步骤跳转
  const {
    currentStep,
    isLoading: isFlowLoading,
    maxAccessibleStep,
    navigateTo,
    reason,
  } = useFlowNavigation({
    creation: curCreation ? {
      status: curCreation.status,
      current_task_id: curCreation.current_task_id,
      characters: curCreation.characters,
      scenes: curCreation.scenes,
    } : undefined,
    task: currentTask ? {
      taskType: currentTask.taskType,
      status: currentTask.status,
    } : undefined,
    enableAutoNavigation: true,
    debug: process.env.NODE_ENV === 'development',
  });


  // 监听路由变化，刷新创作数据
  useEffect(() => {
    const createPath = `/${locale}/create`;
    const isCreatePage = pathname === createPath;

    if (!isCreatePage) {
      prevPathnameRef.current = pathname;
      return;
    }

    if (!creationId) {
      prevPathnameRef.current = pathname;
      prevCreationIdRef.current = null;
      return;
    }

    const wasNotCreatePage = prevPathnameRef.current && prevPathnameRef.current !== createPath;
    const isFirstLoad = prevPathnameRef.current === null;

    // 首次加载时初始化
    if (isFirstLoad) {
      if (!hasInitializedRef.current) {
        hasInitializedRef.current = true;
      }
    }
    // 从其他页面返回创作页面时，强制刷新创作详情
    else if (wasNotCreatePage) {
      queryClient.invalidateQueries({
        queryKey: ["creation", creationId],
        refetchType: 'active'
      });
    }

    prevPathnameRef.current = pathname;
    prevCreationIdRef.current = creationId;
  }, [pathname, locale, creationId, queryClient]);

  // 监听页面可见性变化
  useEffect(() => {
    if (!creationId) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && pathname === `/${locale}/create`) {
        queryClient.invalidateQueries({ queryKey: ["creation", creationId] });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [pathname, locale, creationId, queryClient]);

  // 轮询分镜生成任务状态
  const { data: shotsTaskData } = useQuery({
    queryKey: ["shotsTask", shotsTaskId],
    queryFn: () => taskApi.queryShotsTask(shotsTaskId as string),
    enabled: !!shotsTaskId && isGeneratingShots,
    retry: 2, // 失败时最多重试2次
    refetchInterval: (query) => {
      // 如果查询出错，停止轮询
      if (query.state.error) {
        setIsGeneratingShots(false);
        setShotsTaskId(null);
        toast.error(t("creation.queryTaskFailed"));
        refetchCreation(); // 刷新创作数据
        return false;
      }
      
      const taskStatus = query.state.data?.data?.status;
        if (taskStatus === TaskStatus.SUCCESS || taskStatus === TaskStatus.FAILURE) {
          setIsGeneratingShots(false);
          if (taskStatus === TaskStatus.SUCCESS) {
            toast.success(t("creation.shotsGenerationSuccess"));
            // 成功后立即刷新创作数据并清理任务ID，确保分镜图重新加载
            refetchCreation();
            setShotsTaskId(null);
          } else {
            toast.error(t("creation.shotsGenerationFailed"));
            setShotsTaskId(null);
          }
          return false;
        }
      return 2000; // 每2秒轮询一次
    },
  });

  // 当分镜任务数据更新时，合并更新 storyboardData（只更新 status 和 image_url，保留 uuid 和 characters）
  useEffect(() => {
    if (shotsTaskData?.data?.scenes) {
      setStoryboardData((prevData) => {
        const transformedData = transformShotsToSceneGroups(shotsTaskData.data);
        // 如果之前没有数据，直接使用新数据；否则合并更新
        if (prevData.length === 0) {
          return transformedData;
        }
        return mergeStoryboardData(prevData, transformedData);
      });
    }
  }, [shotsTaskData]);

  // 当 curCreation 加载完成且进入分镜步骤时，从 scenes 初始化 storyboardData
  useEffect(() => {
    if (
      storyboardData.length === 0 &&
      !isGeneratingShots &&
      curCreation?.scenes &&
      curCreation.scenes.length > 0 &&
      curCreation.scenes.some(scene => scene.shots && scene.shots.length > 0)
    ) {
      const transformedData = transformCreationScenesToSceneGroups(curCreation.scenes);
      setStoryboardData(transformedData);
    }
  }, [curCreation?.scenes, storyboardData.length, isGeneratingShots]);

  // 检查所有分镜是否都有图片
  const checkAllShotsHaveImages = useCallback(() => {
    if (!curCreation?.scenes || curCreation.scenes.length === 0) {
      return false;
    }
    return curCreation.scenes.every(scene =>
      scene.shots && scene.shots.length > 0 &&
      scene.shots.every(shot => shot.image_url && shot.image_url.trim() !== "")
    );
  }, [curCreation?.scenes]);

  // 同步分镜生成任务状态（从 FlowManager 的判断结果）
  useEffect(() => {
    if (!curCreation?.current_task_id || !currentTask) {
      // 如果没有任务，重置状态
      if (!curCreation?.current_task_id) {
        setShotsTaskId(null);
        setIsGeneratingShots(false);
      }
      return;
    }

    // 如果是分镜图片生成任务（单个或批量），同步任务状态
    if (currentTask.taskType === TaskType.SHOT_IMAGE_GENERATION ||
        currentTask.taskType === TaskType.BATCH_SHOT_IMAGE_GENERATION) {
      const isRunning = currentTask.status !== TaskStatus.SUCCESS &&
                       currentTask.status !== TaskStatus.FAILURE;
      setShotsTaskId(curCreation.current_task_id);
      setIsGeneratingShots(isRunning);
    } else {
      // 如果是其他任务，清除分镜任务状态
      setShotsTaskId(null);
      setIsGeneratingShots(false);
    }
  }, [curCreation?.current_task_id, currentTask]);

  // 处理 CREATED 状态且没有分镜的情况（重新提交任务）
  useEffect(() => {
    if (
      (curCreation?.status === CreationStatus.CREATED ||
        curCreation?.status === CreationStatus.PLAYBOOK_GENERATED) &&
      (!curCreation?.scenes || curCreation.scenes.length === 0) &&
      !curCreation?.current_task_id &&
      creationId &&
      !isResubmitting
    ) {
      setIsResubmitting(true);

      // 立即跳转到角色设置页面
      navigateTo(FlowStep.CHARACTER);

      const novelUuid = (curCreation as any).novel_uuid || curCreation.novel_id;
      const chapterUuid = (curCreation as any).chapter_uuid || curCreation.chapter_id;
      creationApi.createCreation({
        novelId: novelUuid,
        chapterId: chapterUuid,
        creationId: creationId,
      }).then((response) => {
        const newCreationId = response?.data?.creation_id || response?.data;
        if (newCreationId) {
          toast.success(t("creation.characterAnalysisStart") || "角色分析已开始");
          // 刷新创作数据以获取最新的任务ID
          refetchCreation();
        } else {
          throw new Error(t("creation.taskIdNotFound") || "未获取到创作ID");
        }
        setIsResubmitting(false);
      }).catch((error) => {
        console.error("重新提交创建任务失败:", error);
        toast.error(error.message || t("errors.generationFailed"));
        setIsResubmitting(false);
        // 失败时返回到故事设置页面
        navigateTo(FlowStep.STORY);
      });
    }
  }, [curCreation, creationId, isResubmitting, t, refetchCreation, navigateTo]);

  // 计算综合的 loading 状态（包括所有可能的 loading 情况）
  const isAnyLoading = isFlowLoading || isResubmitting || isGeneratingShots;


  const { steps, nextStep } = useProgressSteps(initialSteps, {
    currentStep,
    onStepChange: (step) => navigateTo(step as FlowStep),
  });

  // 触发分镜生成的内部函数
  const generateShotsInternal = useCallback(async () => {
    if (!creationId) {
      toast.error(t("creation.creationIdNotFound"));
      return;
    }

    // 计算分镜数量（每个分镜需要一个图片，所以图片数量等于分镜数量）
    const shotCount = curCreation?.scenes?.reduce((total, scene) => {
      return total + (scene.shots?.length || 0)
    }, 0) || 0

    // 检查积分是否充足
    const { checkAndNotifyPoints } = await import('@/lib/utils/points-check')
    const pointsAvailable = await checkAndNotifyPoints(
      {
        operation_type: 'generate_image',
        image_count: shotCount,
      },
      t
    )

    if (!pointsAvailable) {
      throw new Error('积分不足')
    }

    setIsGeneratingShots(true);
    toast.info(t("creation.shotsGenerationStart"));
    
    // 传递 image_count 参数，图片数量等于分镜数量
    const response = await creationApi.generateShots(creationId, shotCount);
    const taskId = response?.data?.task_id;
    
    if (taskId) {
      setShotsTaskId(taskId);
      nextStep(); // 先跳转到分镜页面
    } else {
      throw new Error(t("creation.taskIdNotFound"));
    }
  }, [creationId, nextStep, t, curCreation?.scenes]);

  // 使用任务提交 hook 包装分镜生成函数
  const { submit: handleGenerateShots, isSubmitting: isSubmittingShots } = useTaskSubmission(
    generateShotsInternal,
    {
      debounceDelay: 500,
      enableDebounce: true,
      onError: (error) => {
        console.error("Generate shots error:", error);
        toast.error(error.message || t("creation.shotsGenerationError"));
        setIsGeneratingShots(false);
      },
    }
  );

  // 同步 isSubmittingShots 到 isGeneratingShots（用于向后兼容）
  useEffect(() => {
    if (!isSubmittingShots && isGeneratingShots) {
      // 如果提交完成但 isGeneratingShots 仍为 true，说明任务已启动，保持状态
      // 这里不需要重置，因为任务已经在进行中
    }
  }, [isSubmittingShots, isGeneratingShots]);

  // 处理脚本步骤完成（点击下一步）
  const handleScriptComplete = useCallback(() => {
    // 检查所有分镜是否都有图片
    if (checkAllShotsHaveImages()) {
      // 如果所有分镜都有图片，直接进入下一步，不提交生成请求
      nextStep();
    } else {
      // 如果有分镜没有图片，提交生成分镜图请求
      handleGenerateShots();
    }
  }, [checkAllShotsHaveImages, handleGenerateShots, nextStep]);

  const handleStepChange = (stepIndex: number) => {
    // 使用 navigateTo 进行导航，会自动检查是否可以切换
    navigateTo(stepIndex as FlowStep);
    // 步骤切换时刷新创作数据，确保图片/状态最新
    if (refetchCreation) {
      refetchCreation();
    }
  };

  const handleComplete = () => {
    // 完成逻辑
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <StorySetting />;
      case 1:
        return (
          <CharacterSetting
            characters={curCreation?.characters as ICharacter[] || []}
            currentTaskId={curCreation?.current_task_id}
            creationStatus={curCreation?.status}
            creationId={creationId}
            creation={curCreation as any}
            isResubmitting={isResubmitting}
            onComplete={() => {
              nextStep();
            }}
            handleUpdate={refetchCreation}
          />
        );

      case 2:
        return (
          <ScriptSetting
            data={curCreation?.scenes || []}
            onComplete={handleScriptComplete}
            isLoading={isFlowLoading || isGeneratingShots}
            creationId={creationId}
            characters={curCreation?.characters || []}
            onDataUpdate={() => {
              // 刷新创作数据
              refetchCreation();
            }}
            onGenerateShots={handleGenerateShots}
          />
        );
      case 3:
        return (
          <StoryboardImages
            data={storyboardData}
            isGenerating={isGeneratingShots}
            progress={shotsTaskData?.data?.progress}
            onComplete={() => {
              nextStep();
            }}
            availableCharacters={curCreation?.characters || []}
            imageModelName={
              (curCreation as any)?.extra_data?.image_to_image_model ||
              (curCreation as any)?.extra_data?.text_to_image_model
            }
          />
        );
      case 4:
        return (
          <VideoGenerator
            creationId={creationId}
            creationStatus={curCreation?.status}
            initialAudioUrl={curCreation?.audio_url}
            initialVideoUrl={curCreation?.video_url}
            currentTaskId={curCreation?.current_task_id}
            onVideoGenerated={() => {
              // 视频生成完成，刷新创作数据以获取最新状态
              // 预览界面会在组件内部自动显示
              refetchCreation();
            }}
          />
        );
    }
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 flex items-center gap-1 px-4 py-3 lg:px-6 lg:py-4">
        <h1 className="text-lg lg:text-xl font-semibold text-gradient-primary">
          {t("createVideo.createAnimation")}
        </h1>
      </div>
      <div className="h-[1px] w-full divider-primary flex-shrink-0" />
      <div className="flex-1 overflow-y-auto overflow-x-hidden" id="creation-flow-container">
        <div className="container mx-auto max-w-7xl px-4 py-4 lg:px-6 lg:py-6">
          <ProgressWrapper
            steps={steps}
            currentStep={currentStep}
            maxAccessibleStep={isAnyLoading ? currentStep : maxAccessibleStep}
            orientation="horizontal"
            variant="default"
            size="sm"
            showNavigation={false}
            onStepChange={handleStepChange}
            onComplete={handleComplete}
            className="mb-6"
          />
          <div className="min-h-0">{renderStepContent()}</div>
        </div>
      </div>
    </div>
  );
}
