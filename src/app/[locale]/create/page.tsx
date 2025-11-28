"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useParams, useSearchParams } from "next/navigation";
import {
  ProgressWrapper,
  useProgressSteps,
  type ProgressStep,
} from "@/components/business/progress-wrapper";
import { NovelUpload } from "@/components/business/novel-upload";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { StorySetting } from "@/components/business/create-settings/story-setting";
import { ScriptSetting } from "@/components/business/create-settings/script-setting";
import { CharacterSetting } from "@/components/business/create-settings/character-setting";
import { StoryboardImages } from "@/components/business/create-settings/storyboard-images";
import { VideoGenerator } from "@/components/business/create-settings/video-generator";
import { mockVideos } from "@/lib/mock-video-data";
import creationApi from "@/lib/api/creation";
import taskApi from "@/lib/api/task";
import { useQuery } from "@tanstack/react-query";
import { ICreation, CreationStatus } from "@/types/creation";
import { ICharacter } from "@/types/character";
import ModuleLoading from "@/components/ui/module-loading";
import { toast } from "sonner";
import { TaskStatus, TaskType, SceneGroup, ShotsTaskResponse } from "@/types";
import { IScene } from "@/types/scene";

// 将轮询任务返回的分镜数据转换为 StoryboardImages 组件需要的格式
function transformShotsToSceneGroups(shotsData: ShotsTaskResponse): SceneGroup[] {
  return shotsData.scenes.map((scene) => ({
    scene_id: String(scene.scene_id),
    scene_title: scene.title,
    images: scene.shots.map((shot) => ({
      image_id: String(shot.shot_id),
      title: shot.title,
      image_url: shot.image_url || "",
      prompt: shot.image_prompt || shot.prompt || "", // 优先使用 image_prompt
      narration: shot.narration || "",
      status: shot.status === "completed" ? "completed" 
            : shot.status === "failed" ? "failed" 
            : shot.status === "generating" ? "generating" 
            : "generating",
    })),
  }));
}

// 将 Creation 中的 scenes 数据转换为 StoryboardImages 组件需要的格式
function transformCreationScenesToSceneGroups(scenes: IScene[]): SceneGroup[] {
  return scenes.map((scene) => ({
    scene_id: String(scene.scene_id),
    scene_title: scene.title,
    images: scene.shots.map((shot) => ({
      image_id: String(shot.shot_id),
      title: shot.title,
      image_url: shot.image_url || "",
      prompt: shot.image_prompt || "", // 注意：IShot 中字段名是 image_prompt
      narration: shot.narration || "",
      status: (shot.image_url ? "completed" : "pending") as "pending" | "generating" | "completed" | "failed",
    })),
  }));
}

export default function CreateCreation() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale as string;
  const searchParams = useSearchParams();
  const creationIdFromUrl = searchParams?.get("creationId") || "";
  const [creationId, setCreationId] = useState<string>(creationIdFromUrl);

  // 分镜生成任务相关状态
  const [shotsTaskId, setShotsTaskId] = useState<string | null>(null);
  const [isGeneratingShots, setIsGeneratingShots] = useState(false);
  const [storyboardData, setStoryboardData] = useState<SceneGroup[]>([]);

  // 同步 URL 参数到 state
  useEffect(() => {
    if (creationIdFromUrl && creationIdFromUrl !== creationId) {
      console.log(
        `[Create Page] URL creationId 变化: ${creationId} -> ${creationIdFromUrl}`
      );
      setCreationId(creationIdFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creationIdFromUrl]); // 只依赖 URL 参数，不依赖 creationId state

  // 创建步骤数据（不需要预定义status）
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

  const [currentStep, setCurrentStep] = useState(0);

  const { data: curCreationResponse, isLoading, refetch: refetchCreation } = useQuery({
    queryKey: ["creation", creationId],
    queryFn: () => creationApi.queryCreationById(creationId),
    enabled: !!creationId,
    refetchInterval: (query) => {
      if (query.state.data?.data?.current_task_id) {
        return 4000;
      }
      return false;
    },
  });
  const curCreation = useMemo(() => curCreationResponse?.data as ICreation, [curCreationResponse]);

  // 轮询分镜生成任务状态
  const { data: shotsTaskData } = useQuery({
    queryKey: ["shotsTask", shotsTaskId],
    queryFn: () => taskApi.queryShotsTask(shotsTaskId as string),
    enabled: !!shotsTaskId && isGeneratingShots,
    retry: 2, // 失败时最多重试2次
    refetchInterval: (query) => {
      // 如果查询出错，停止轮询
      if (query.state.error) {
        console.error("查询任务状态失败:", query.state.error);
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
          } else {
            toast.error(t("creation.shotsGenerationFailed"));
          }
          return false;
        }
      return 2000; // 每2秒轮询一次
    },
  });

  // 当分镜任务数据更新时，更新 storyboardData
  useEffect(() => {
    if (shotsTaskData?.data?.scenes) {
      const transformedData = transformShotsToSceneGroups(shotsTaskData.data);
      setStoryboardData(transformedData);
    }
  }, [shotsTaskData]);

  // 当 curCreation 加载完成且进入分镜步骤时，从 scenes 初始化 storyboardData
  useEffect(() => {
    // 只有在分镜数据为空，且 creation 有 scenes 数据，且不在生成中时才初始化
    if (
      storyboardData.length === 0 &&
      !isGeneratingShots &&
      curCreation?.scenes &&
      curCreation.scenes.length > 0 &&
      curCreation.scenes.some(scene => scene.shots && scene.shots.length > 0)
    ) {
      const transformedData = transformCreationScenesToSceneGroups(curCreation.scenes);
      setStoryboardData(transformedData);
      console.log("[Create Page] 从 curCreation.scenes 初始化分镜数据", transformedData);
    }
  }, [curCreation?.scenes, storyboardData.length, isGeneratingShots]);

  // 触发分镜生成
  const handleGenerateShots = async () => {
    if (!creationId) {
      toast.error(t("creation.creationIdNotFound"));
      return;
    }

    try {
      setIsGeneratingShots(true);
      toast.info(t("creation.shotsGenerationStart"));
      
      const response = await creationApi.generateShots(creationId);
      const taskId = response?.data?.task_id;
      
      if (taskId) {
        setShotsTaskId(taskId);
        nextStep(); // 先跳转到分镜页面
      } else {
        toast.error(t("creation.taskIdNotFound"));
        setIsGeneratingShots(false);
      }
    } catch (error) {
      console.error("Generate shots error:", error);
      toast.error(error instanceof Error ? error.message : t("creation.shotsGenerationError"));
      setIsGeneratingShots(false);
    }
  };

  // 根据 current_task_id 恢复任务状态
  useEffect(() => {
    const restoreTaskState = async () => {
      // 如果有正在执行的任务，查询任务类型并跳转到对应步骤
      if (curCreation?.current_task_id) {
        try {
          const taskResponse = await taskApi.queryTaskStatus(curCreation.current_task_id);
          const task = taskResponse?.data;
          
          if (task) {
            const taskType = task.taskType;
            const taskStatus = task.status;
            
            console.log(`[Create Page] 恢复任务状态: taskType=${taskType}, status=${taskStatus}`);
            
            // 如果任务还在进行中，根据任务类型跳转到对应步骤
            if (taskStatus !== TaskStatus.SUCCESS && taskStatus !== TaskStatus.FAILURE) {
              if (taskType === TaskType.SHOT_IMAGE_GENERATION) {
                // 分镜生成任务，跳转到分镜步骤并恢复轮询
                setShotsTaskId(curCreation.current_task_id);
                setIsGeneratingShots(true);
                setCurrentStep(3);
                return; // 有任务时直接返回，不走 status 逻辑
              } else if (taskType === TaskType.AUDIO_GENERATION || taskType === TaskType.VIDEO_SYNTHESIS) {
                // 音频/视频生成任务，跳转到视频步骤
                setCurrentStep(4);
                return;
              }
            }
          }
        } catch (error) {
          console.error("查询任务状态失败:", error);
        }
      }
      
      // 没有任务或任务已完成，根据 status 设置步骤
      switch (curCreation?.status) {
        case CreationStatus.CREATED:
        case CreationStatus.PLAYBOOK_GENERATED:
          setCurrentStep(1);
          break;
        case CreationStatus.CHARACTER_GENERATED:
          setCurrentStep(2);
          break;
        case CreationStatus.SCENE_GENERATED:
          setCurrentStep(3);
          break;
        // voice_selected 及之后的状态都跳转到视频步骤
        case CreationStatus.VOICE_SELECTED:
        case CreationStatus.AUDIO_GENERATED:
        case CreationStatus.VIDEO_GENERATED:
        case CreationStatus.COMPLETED:
          setCurrentStep(4);
          break;
        default:
          setCurrentStep(0);
          break;
      }
    };

    if (curCreation) {
      restoreTaskState();
    }
  }, [curCreation]);

  const { steps, nextStep } = useProgressSteps(initialSteps, {
    currentStep,
    onStepChange: setCurrentStep,
  });

  const handleStepChange = (stepIndex: number, step: ProgressStep) => {
    console.log(`切换到步骤 ${stepIndex}:`, step.title);
    setCurrentStep(stepIndex);
  };

  const handleComplete = () => {
    console.log("所有步骤完成！");
    // 这里可以添加完成后的逻辑，比如跳转到结果页面
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
            onComplete={handleGenerateShots}
            isLoading={isGeneratingShots}
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
              nextStep();
            }}
          />
        );
    }
  };

  return (
    <div className="container mx-auto overflow-y-hidden">
      <div
        className="flex items-center gap-1 m-3"
        onClick={() => router.push(`/${locale}`)}
      >
        <ChevronLeft className="w-4 h-4 text-primary" />
        <h1 className="text-lg text-gradient-primary">
          {t("createVideo.createAnimation")}
        </h1>
      </div>
      <div className="h-[1px] w-full divider-primary mb-4" />
      <ModuleLoading loading={isLoading}>
        <ProgressWrapper
          steps={steps}
          currentStep={currentStep}
          orientation="horizontal"
          variant="default"
          size="sm"
          showNavigation={false}
          onStepChange={handleStepChange}
          onComplete={handleComplete}
          className="px-6"
        />
        <div>{renderStepContent()}</div>
      </ModuleLoading>
    </div>
  );
}
