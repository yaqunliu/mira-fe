"use client";

import React, { useState, useCallback } from "react";
import { Stepper, updateStepStatus, type Step } from "@/components/ui/stepper";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ProgressStep extends Step {
  content?: React.ReactNode;
}

export interface ProgressWrapperProps {
  steps: ProgressStep[];
  orientation?: "horizontal" | "vertical";
  variant?: "default" | "minimal" | "circular";
  size?: "sm" | "md" | "lg";
  className?: string;
  showNavigation?: boolean;
  showStepContent?: boolean;
  onStepChange?: (currentStep: number, step: ProgressStep) => void;
  onComplete?: () => void;
  children?: (props: {
    currentStep: number;
    currentStepData: ProgressStep;
    nextStep: () => void;
    prevStep: () => void;
    goToStep: (step: number) => void;
    isFirstStep: boolean;
    isLastStep: boolean;
  }) => React.ReactNode;
}

export const ProgressWrapper = React.forwardRef<HTMLDivElement, ProgressWrapperProps>(
  ({
    steps,
    orientation = "horizontal",
    variant = "default",
    size = "md",
    className,
    showNavigation = true,
    showStepContent = true,
    onStepChange,
    onComplete,
    children,
    ...props
  }, ref) => {
    const [currentStep, setCurrentStep] = useState(0);

    const currentStepData = steps[currentStep];
    const isFirstStep = currentStep === 0;
    const isLastStep = currentStep === steps.length - 1;

    const goToStep = useCallback((step: number) => {
      if (step >= 0 && step < steps.length) {
        setCurrentStep(step);
        onStepChange?.(step, steps[step]);
      }
    }, [steps, onStepChange]);

    const nextStep = useCallback(() => {
      if (!isLastStep) {
        const newStep = currentStep + 1;
        setCurrentStep(newStep);
        onStepChange?.(newStep, steps[newStep]);
      } else {
        onComplete?.();
      }
    }, [currentStep, isLastStep, steps, onStepChange, onComplete]);

    const prevStep = useCallback(() => {
      if (!isFirstStep) {
        const newStep = currentStep - 1;
        setCurrentStep(newStep);
        onStepChange?.(newStep, steps[newStep]);
      }
    }, [currentStep, isFirstStep, onStepChange]);

    const handleStepClick = useCallback((step: Step, index: number) => {
      if (index <= currentStep) {
        goToStep(index);
      }
    }, [currentStep, goToStep]);

    const updatedSteps = updateStepStatus(steps, currentStep);

    // 如果提供了 children 函数，使用 render props 模式
    if (children) {
      return (
        <div ref={ref} className={cn("space-y-6", className)} {...props}>
          <Stepper
            steps={updatedSteps}
            orientation={orientation}
            variant={variant}
            size={size}
            onStepClick={handleStepClick}
            className="mb-6"
          />
          
          {showStepContent && currentStepData?.content && (
            <div className="step-content">
              {currentStepData.content}
            </div>
          )}

          {children({
            currentStep,
            currentStepData,
            nextStep,
            prevStep,
            goToStep,
            isFirstStep,
            isLastStep,
          })}
        </div>
      );
    }

    // 默认渲染模式
    return (
      <div ref={ref} className={cn("space-y-6", className)} {...props}>
        <Stepper
          steps={updatedSteps}
          orientation={orientation}
          variant={variant}
          size={size}
          onStepClick={handleStepClick}
          className="mb-6"
        />

        {showStepContent && currentStepData?.content && (
          <div className="step-content">
            {currentStepData.content}
          </div>
        )}

        {showNavigation && (
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={isFirstStep}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              上一步
            </Button>
            
            <Button
              onClick={nextStep}
              disabled={isLastStep}
              className="flex items-center gap-2"
            >
              {isLastStep ? "完成" : "下一步"}
              {!isLastStep && <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>
        )}
      </div>
    );
  }
);

ProgressWrapper.displayName = "ProgressWrapper";

// 自定义 Hook 用于管理步骤状态
export const useProgressSteps = (initialSteps: ProgressStep[]) => {
  const [steps, setSteps] = useState<ProgressStep[]>(initialSteps);
  const [currentStep, setCurrentStep] = useState(0);

  const updateStep = useCallback((stepIndex: number, updates: Partial<ProgressStep>) => {
    setSteps(prev => prev.map((step, index) => 
      index === stepIndex ? { ...step, ...updates } : step
    ));
  }, []);

  const addStep = useCallback((step: ProgressStep, index?: number) => {
    setSteps(prev => {
      const newSteps = [...prev];
      if (index !== undefined) {
        newSteps.splice(index, 0, step);
      } else {
        newSteps.push(step);
      }
      return newSteps;
    });
  }, []);

  const removeStep = useCallback((stepIndex: number) => {
    setSteps(prev => prev.filter((_, index) => index !== stepIndex));
    if (currentStep >= stepIndex) {
      setCurrentStep(Math.max(0, currentStep - 1));
    }
  }, [currentStep]);

  const goToStep = useCallback((stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < steps.length) {
      setCurrentStep(stepIndex);
    }
  }, [steps.length]);

  const nextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, steps.length]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  return {
    steps,
    currentStep,
    currentStepData: steps[currentStep],
    isFirstStep: currentStep === 0,
    isLastStep: currentStep === steps.length - 1,
    updateStep,
    addStep,
    removeStep,
    goToStep,
    nextStep,
    prevStep,
    setCurrentStep,
  };
};
