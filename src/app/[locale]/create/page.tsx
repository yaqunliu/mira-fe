"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import {
  ProgressWrapper,
  useProgressSteps,
  type ProgressStep,
} from "@/components/business/progress-wrapper";
import { NovelUpload } from "@/components/business/novel-upload";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { StorySetting } from "@/components/business/story-setting";
import { ScriptSetting } from "@/components/business/script-setting";
import { CharacterSetting } from "@/components/business/character-setting";
import { StoryboardImages } from "@/components/business/storyboard-images";
import sceneImages from "@/mock/scene_images.json";
import { VideoGenerator } from "@/components/business/video-generator";

export default function createVideo() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale as string;
  const [scenes, setScenes] = useState<any[]>([]);

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

  const { steps, nextStep } = useProgressSteps(initialSteps, {
    currentStep,
    onStepChange: setCurrentStep,
  });

  const handleStepChange = (stepIndex: number, step: ProgressStep) => {
    console.log(`切换到步骤 ${stepIndex}:`, step.title);
  };

  const handleComplete = () => {
    console.log("所有步骤完成！");
    // 这里可以添加完成后的逻辑，比如跳转到结果页面
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <StorySetting
            onComplete={(_scenes: any[]) => {
              setScenes(_scenes);
              nextStep();
            }}
          />
        );
      case 1:
        return (
          <CharacterSetting
            onComplete={() => {
              nextStep();
            }}
          />
        );

      case 2:
        return (
          <ScriptSetting
            data={scenes}
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
      <div>
        {renderStepContent()}
      </div>
    </div>
  );
}
