"use client";

import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Stepper, Step } from "@/components/ui/stepper";
import { useCreationV2Store } from "@/stores/creation-v2";
import { CharacterAnalysis } from "@/components/v2/character-analysis";
import { SceneBreakdown } from "@/components/v2/scene-breakdown";
import { VisualGeneration } from "@/components/v2/visual-generation";
import { VideoGeneration } from "@/components/v2/video-generation";
import creationApi from "@/lib/api/creation";
import { toast } from "sonner";
import { ICreation } from "@/types/creation";

export default function CreateV2Page() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const creationId = searchParams?.get("creationId");
  
  const { 
    setCreation, 
    setLoading, 
    setError,
    currentStep,
    steps,
    setStep,
    creation
  } = useCreationV2Store();

  // Load creation data
  useEffect(() => {
    if (!creationId) return;

    const loadCreation = async () => {
      try {
        setLoading(true);
        const response = await creationApi.queryCreationById(creationId);
        if (response.data) {
          setCreation(response.data as ICreation);
        }
      } catch (err) {
        console.error("Failed to load creation:", err);
        setError("Failed to load creation data");
        toast.error("加载创作数据失败");
      } finally {
        setLoading(false);
      }
    };

    loadCreation();
  }, [creationId, setCreation, setLoading, setError]);

  // Transform store steps to UI steps
  const uiSteps: Step[] = useMemo(() => {
    return steps.map((step, index) => ({
      id: step.id,
      title: step.label,
      status: index < currentStep ? "completed" : index === currentStep ? "current" : "upcoming",
      disabled: false // Can be adjusted based on logic
    }));
  }, [steps, currentStep]);

  // Render current step component
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <CharacterAnalysis />;
      case 1:
        return <SceneBreakdown />;
      case 2:
        return <VisualGeneration />;
      case 3:
        return <VideoGeneration />;
      default:
        return null;
    }
  };

  if (!creationId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">无效的创作ID</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8 bg-gradient-to-br from-[#FDBCB4]/20 via-[#ADD8E6]/20 to-white min-h-screen">
      <div className="flex flex-col space-y-4">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-[#22C55E] to-[#ADD8E6] bg-clip-text text-transparent">{creation?.title || "新建视频创作"}</h1>
        <Stepper 
          steps={uiSteps} 
          onStepClick={(_, index) => {
             // Optional: Allow clicking to navigate to previous steps
             if (index <= currentStep) {
               setStep(index);
             }
          }}
        />
      </div>

      <div className="min-h-[600px] claymorphism p-6 rounded-2xl">
        {renderStepContent()}
      </div>
    </div>
  );
}
