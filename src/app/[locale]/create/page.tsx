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
import { TaskStatus, SceneGroup, ShotsTaskResponse } from "@/types";
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
      title: t("createVideo.故事"),
    },
    {
      id: "character",
      title: t("createVideo.角色"),
    },
    {
      id: "script",
      title: t("createVideo.脚本"),
    },
    {
      id: "material",
      title: t("createVideo.分镜"),
    },
    {
      id: "video",
      title: t("createVideo.视频"),
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
        toast.error("查询任务状态失败，请刷新页面重试");
        refetchCreation(); // 刷新创作数据
        return false;
      }
      
      const taskStatus = query.state.data?.data?.status;
      if (taskStatus === TaskStatus.SUCCESS || taskStatus === TaskStatus.FAILURE) {
        setIsGeneratingShots(false);
        if (taskStatus === TaskStatus.SUCCESS) {
          toast.success("分镜图片生成完成！");
        } else {
          toast.error("分镜图片生成失败，请重试");
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
      toast.error("创作ID不存在");
      return;
    }

    try {
      setIsGeneratingShots(true);
      toast.info("开始生成分镜图片...");
      
      const response = await creationApi.generateShots(creationId);
      const taskId = response?.data?.task_id;
      
      if (taskId) {
        setShotsTaskId(taskId);
        nextStep(); // 先跳转到分镜页面
      } else {
        toast.error("未能获取任务ID");
        setIsGeneratingShots(false);
      }
    } catch (error) {
      console.error("Generate shots error:", error);
      toast.error(error instanceof Error ? error.message : "分镜生成失败，请重试");
      setIsGeneratingShots(false);
    }
  };

  useEffect(() => {
    switch (curCreation?.status) {
      case CreationStatus.CREATED:
        setCurrentStep(1);
        break;
      case CreationStatus.PLAYBOOK_GENERATED:
        setCurrentStep(1);
        break;
      case CreationStatus.CHARACTER_GENERATED:
        setCurrentStep(2);
        break;
      case CreationStatus.SCENE_GENERATED:
        setCurrentStep(3);
        break;
      case CreationStatus.AUDIO_GENERATED:
        setCurrentStep(4);
        break;
      case CreationStatus.VIDEO_GENERATED:
        setCurrentStep(4);
        break;
      case CreationStatus.COMPLETED:
        setCurrentStep(4);
        break;
      default:
        setCurrentStep(0);
        break;
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
          {t("createVideo.制作动画")}
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
