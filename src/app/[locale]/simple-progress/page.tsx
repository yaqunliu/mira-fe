"use client";

import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { ProgressWrapper, type ProgressStep } from "@/components/business/progress-wrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SimpleProgressPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale as string;

  // 简单的步骤数据
  const steps: ProgressStep[] = [
    {
      id: "step-1",
      title: "基本信息",
      description: "填写您的基本信息",
      status: "current",
      content: (
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
            <CardDescription>请填写您的基本信息</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              基本信息表单内容
            </div>
          </CardContent>
        </Card>
      ),
    },
    {
      id: "step-2",
      title: "详细信息",
      description: "填写详细信息",
      status: "upcoming",
      content: (
        <Card>
          <CardHeader>
            <CardTitle>详细信息</CardTitle>
            <CardDescription>请填写详细信息</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              详细信息表单内容
            </div>
          </CardContent>
        </Card>
      ),
    },
    {
      id: "step-3",
      title: "确认提交",
      description: "确认并提交信息",
      status: "upcoming",
      content: (
        <Card>
          <CardHeader>
            <CardTitle>确认提交</CardTitle>
            <CardDescription>请确认您的信息并提交</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              确认提交内容
            </div>
          </CardContent>
        </Card>
      ),
    },
  ];

  const handleStepChange = (stepIndex: number, step: ProgressStep) => {
    console.log(`切换到步骤 ${stepIndex}:`, step.title);
  };

  const handleComplete = () => {
    console.log("流程完成！");
    // 可以在这里添加完成后的逻辑
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-1 mb-6" onClick={() => router.push(`/${locale}`)}>
        <ChevronLeft className="w-4 h-4 text-orange-500 dark:text-orange-400" />
        <h1 className="text-lg text-gradient-primary">简单进度条示例</h1>
      </div>

      <ProgressWrapper
        steps={steps}
        orientation="horizontal"
        variant="default"
        size="md"
        onStepChange={handleStepChange}
        onComplete={handleComplete}
        showNavigation={true}
        showStepContent={true}
      />
    </div>
  );
}
