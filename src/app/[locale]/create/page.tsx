"use client";

import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { ProgressWrapper, useProgressSteps, type ProgressStep } from "@/components/business/progress-wrapper";
import { NovelUpload } from "@/components/business/novel-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function createVideo() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale as string;

  // 创建步骤数据
  const initialSteps: ProgressStep[] = [
    {
      id: "script",
      title: t("createVideo.选择剧本"),
      status: "current"
    },
    {
      id: "material",
      title: t("createVideo.生成素材"),
      status: "upcoming",
    },
    {
      id: "video",
      title: t("createVideo.合成视频"),
      status: "upcoming",
    },
  ];

  const {
    steps,
    currentStep,
    nextStep
  } = useProgressSteps(initialSteps);

  const handleStepChange = (stepIndex: number, step: ProgressStep) => {
    console.log(`切换到步骤 ${stepIndex}:`, step.title);
  };

  const handleComplete = () => {
    console.log("所有步骤完成！");
    // 这里可以添加完成后的逻辑，比如跳转到结果页面
  };

  return (
    <div className="container mx-auto">
      <div className="flex items-center gap-1 m-3" onClick={() => router.push(`/${locale}`)}>
        <ChevronLeft className="w-4 h-4 text-orange-500 dark:text-orange-400" />
        <h1 className="text-lg text-gradient-primary">{t("createVideo.制作动画")}</h1>
      </div>
      <div className="h-[1px] w-full divider-primary mb-4" />

      <ProgressWrapper
        steps={steps}
        orientation="horizontal"
        variant="default"
        size="md"
        showNavigation={false}
        onStepChange={handleStepChange}
        onComplete={handleComplete}
        className="px-6"
      />
      <div className="bg-gray-100 dark:bg-gray-700/30 py-6">
        {currentStep === 0 && <NovelUpload onUpload={() => nextStep()} />}
      </div>
    </div>
  );
}
