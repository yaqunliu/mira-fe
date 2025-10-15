"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Stepper, createSteps, updateStepStatus, type Step } from "@/components/ui/stepper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function StepperDemoPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale as string;

  // 示例步骤数据
  const [currentStep, setCurrentStep] = useState(1);
  
  const steps: Step[] = [
    {
      id: "step-1",
      title: "选择剧本",
      description: "上传或选择您想要制作视频的小说剧本",
      status: "completed",
    },
    {
      id: "step-2", 
      title: "素材设置",
      description: "配置角色、场景和动画参数",
      status: "current",
    },
    {
      id: "step-3",
      title: "视频生成",
      description: "AI自动生成您的动画视频",
      status: "upcoming",
    },
    {
      id: "step-4",
      title: "预览下载",
      description: "预览并下载最终视频文件",
      status: "upcoming",
    },
  ];

  const handleStepClick = (step: Step, index: number) => {
    if (index <= currentStep) {
      setCurrentStep(index);
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const resetSteps = () => {
    setCurrentStep(0);
  };

  const updatedSteps = updateStepStatus(steps, currentStep);

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-1 mb-6" onClick={() => router.push(`/${locale}`)}>
        <ChevronLeft className="w-4 h-4 text-orange-500 dark:text-orange-400" />
        <h1 className="text-lg text-gradient-primary">步骤条组件演示</h1>
      </div>

      <Tabs defaultValue="horizontal" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="horizontal">水平布局</TabsTrigger>
          <TabsTrigger value="vertical">垂直布局</TabsTrigger>
          <TabsTrigger value="minimal">简约样式</TabsTrigger>
          <TabsTrigger value="circular">圆形样式</TabsTrigger>
        </TabsList>

        <TabsContent value="horizontal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>水平步骤条 - 默认样式</CardTitle>
              <CardDescription>
                适用于页面顶部的进度指示，支持点击切换步骤
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Stepper
                steps={updatedSteps}
                orientation="horizontal"
                variant="default"
                size="md"
                onStepClick={handleStepClick}
                className="mb-6"
              />
              
              <div className="flex gap-2">
                <Button onClick={prevStep} disabled={currentStep === 0}>
                  上一步
                </Button>
                <Button onClick={nextStep} disabled={currentStep === steps.length - 1}>
                  下一步
                </Button>
                <Button variant="outline" onClick={resetSteps}>
                  重置
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vertical" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>垂直步骤条</CardTitle>
              <CardDescription>
                适用于侧边栏或表单中的步骤指示
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-md">
                <Stepper
                  steps={updatedSteps}
                  orientation="vertical"
                  variant="default"
                  size="md"
                  onStepClick={handleStepClick}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="minimal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>简约步骤条</CardTitle>
              <CardDescription>
                简洁的点状指示器，适合空间有限的场景
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Stepper
                steps={updatedSteps}
                orientation="horizontal"
                variant="minimal"
                size="md"
                onStepClick={handleStepClick}
                className="mb-6"
              />
              
              <div className="max-w-md">
                <Stepper
                  steps={updatedSteps}
                  orientation="vertical"
                  variant="minimal"
                  size="md"
                  onStepClick={handleStepClick}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="circular" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>圆形步骤条</CardTitle>
              <CardDescription>
                大尺寸圆形指示器，视觉冲击力强
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Stepper
                steps={updatedSteps}
                orientation="horizontal"
                variant="circular"
                size="lg"
                onStepClick={handleStepClick}
                className="mb-6"
              />
              
              <div className="max-w-md">
                <Stepper
                  steps={updatedSteps}
                  orientation="vertical"
                  variant="circular"
                  size="lg"
                  onStepClick={handleStepClick}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>使用说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">组件特性：</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>支持水平、垂直两种布局方向</li>
              <li>提供默认、简约、圆形三种视觉样式</li>
              <li>支持小、中、大三种尺寸</li>
              <li>可点击切换步骤（可选）</li>
              <li>完全响应式设计</li>
              <li>支持暗色模式</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">步骤状态：</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li><span className="text-primary">已完成</span> - 步骤已完成，显示勾选图标</li>
              <li><span className="text-primary">当前步骤</span> - 正在进行的步骤，高亮显示</li>
              <li><span className="text-muted-foreground">待完成</span> - 尚未开始的步骤</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}