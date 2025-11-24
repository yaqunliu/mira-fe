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
import sceneImages from "@/mock/scene_images.json";
import { VideoGenerator } from "@/components/business/create-settings/video-generator";
import { mockVideos } from "@/lib/mock-video-data";
import creationApi from "@/lib/api/creation";
import { useQuery } from "@tanstack/react-query";
import { ICreation, CreationStatus } from "@/types/creation";
import { ICharacter } from "@/types/character";
import ModuleLoading from "@/components/ui/module-loading";

export default function CreateCreation() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale as string;
  const searchParams = useSearchParams();
  const creationIdFromUrl = searchParams?.get("creationId") || "";
  const [creationId, setCreationId] = useState<string>(creationIdFromUrl);

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
            onComplete={() => {
              nextStep();
            }}
          />
        );
      case 3:
        return (
          <StoryboardImages
            data={sceneImages.data}
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
