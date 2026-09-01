"use client";

import { useTranslations } from 'next-intl'
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
  currentStep?: number;
  maxAccessibleStep?: number; // 最大可访问步骤，根据状态判断
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
    currentStep = 0,
    maxAccessibleStep,
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
    const t = useTranslations('common');
    const currentStepData = steps[currentStep];
    const isFirstStep = currentStep === 0;
    const isLastStep = currentStep === steps.length - 1;

    const goToStep = useCallback((step: number) => {
      if (step >= 0 && step < steps.length) {
        onStepChange?.(step, steps[step]);
      }
    }, [steps, onStepChange]);

    const nextStep = useCallback(() => {
      if (!isLastStep) {
        const newStep = currentStep + 1;
        onStepChange?.(newStep, steps[newStep]);
      } else {
        onComplete?.();
      }
    }, [currentStep, isLastStep, steps, onStepChange, onComplete]);

    const prevStep = useCallback(() => {
      if (!isFirstStep) {
        const newStep = currentStep - 1;
        onStepChange?.(newStep, steps[newStep]);
      }
    }, [currentStep, isFirstStep, onStepChange]);

    const handleStepClick = useCallback((step: Step, index: number) => {
      // 如果步骤被禁用，不允许点击
      if (step.disabled) {
        return;
      }
      
      // 如果提供了 maxAccessibleStep，根据状态判断可访问的步骤
      if (maxAccessibleStep !== undefined) {
        // 允许点击所有不超过 maxAccessibleStep 的步骤
        // 这样用户可以在已完成的步骤之间自由切换
        if (index <= maxAccessibleStep) {
          goToStep(index);
        }
      } else {
        // 如果没有提供 maxAccessibleStep，保持原有逻辑：只能点击当前步骤及之前的步骤
        if (index <= currentStep) {
          goToStep(index);
        }
      }
    }, [currentStep, maxAccessibleStep, goToStep]);

    // 更新步骤状态，并根据 maxAccessibleStep 设置 disabled 状态
    const updatedSteps = updateStepStatus(steps, currentStep).map((step, index) => ({
      ...step,
      disabled: maxAccessibleStep !== undefined ? index > maxAccessibleStep : step.disabled,
    }));

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
          <div className="step-content rounded-2xl bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] border border-blue-100 p-5">
            {currentStepData.content}
          </div>
        )}

        {showNavigation && (
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={isFirstStep}
              className="flex items-center gap-2 rounded-xl border-2 border-blue-200 bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:border-#22C55E/50 hover:shadow-[6px_6px_16px_rgba(0,0,0,0.1),-6px_-6px_16px_rgba(255,255,255,0.9)] transition-all duration-200 hover:scale-105 disabled:hover:scale-100 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />{t("prev")}</Button>

            <Button
              onClick={nextStep}
              disabled={isLastStep}
              className="flex items-center gap-2 bg-gradient-to-br from-#22C55E to-#16A34A text-white shadow-[4px_4px_12px_rgba(0,0,0,0.1),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:shadow-[6px_6px_16px_rgba(0,0,0,0.15),-6px_-6px_16px_rgba(255,255,255,0.9)] transition-all duration-200 hover:scale-105 rounded-xl disabled:opacity-50 disabled:hover:scale-100"
            >
              {isLastStep ? t('done') : t('next_step')}
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
export const useProgressSteps = (
  initialSteps: Omit<ProgressStep, 'status'>[],
  options?: {
    currentStep?: number;
    onStepChange?: (step: number) => void;
  }
) => {
  const [steps, setSteps] = useState<Omit<ProgressStep, 'status'>[]>(initialSteps);
  const [internalCurrentStep, setInternalCurrentStep] = useState(0);
  
  // 使用外部传入的 currentStep 或内部状态
  const currentStep = options?.currentStep ?? internalCurrentStep;
  const onStepChange = options?.onStepChange;

  const updateStep = useCallback((stepIndex: number, updates: Partial<Omit<ProgressStep, 'status'>>) => {
    setSteps(prev => prev.map((step, index) => 
      index === stepIndex ? { ...step, ...updates } : step
    ));
  }, []);

  const addStep = useCallback((step: Omit<ProgressStep, 'status'>, index?: number) => {
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
      const newStep = Math.max(0, currentStep - 1);
      if (onStepChange) {
        onStepChange(newStep);
      } else {
        setInternalCurrentStep(newStep);
      }
    }
  }, [currentStep, onStepChange]);

  const goToStep = useCallback((stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < steps.length) {
      if (onStepChange) {
        onStepChange(stepIndex);
      } else {
        setInternalCurrentStep(stepIndex);
      }
    }
  }, [steps.length, onStepChange]);

  const nextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      const newStep = currentStep + 1;
      if (onStepChange) {
        onStepChange(newStep);
      } else {
        setInternalCurrentStep(newStep);
      }
    }
  }, [currentStep, steps.length, onStepChange]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      const newStep = currentStep - 1;
      if (onStepChange) {
        onStepChange(newStep);
      } else {
        setInternalCurrentStep(newStep);
      }
    }
  }, [currentStep, onStepChange]);

  // 计算当前步骤状态更新后的steps
  const updatedSteps = updateStepStatus(steps as Step[], currentStep);

  return {
    steps: updatedSteps,
    currentStep,
    currentStepData: updatedSteps[currentStep],
    isFirstStep: currentStep === 0,
    isLastStep: currentStep === steps.length - 1,
    updateStep,
    addStep,
    removeStep,
    goToStep,
    nextStep,
    prevStep,
    setCurrentStep: onStepChange || setInternalCurrentStep,
  };
};
