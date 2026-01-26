"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Check, ChevronRight } from "lucide-react";

export interface Step {
  id: string;
  title: string;
  description?: string;
  status: "completed" | "current" | "upcoming";
  disabled?: boolean;
}

export interface StepperProps {
  steps: Step[];
  orientation?: "horizontal" | "vertical";
  variant?: "default" | "minimal" | "circular";
  size?: "sm" | "md" | "lg";
  className?: string;
  onStepClick?: (step: Step, index: number) => void;
}

const stepperVariants = {
  orientation: {
    horizontal: "flex flex-row items-start",
    vertical: "flex flex-col space-y-4",
  },
  size: {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  },
};

const stepVariants = {
  status: {
    completed: "text-white bg-[#22C55E] border-0 shadow-md shadow-[#22C55E]/30",
    current: "text-white bg-[#ADD8E6] border-0 shadow-lg shadow-[#ADD8E6]/40 scale-110",
    upcoming: "text-gray-600 bg-[#FDBCB4]/10 border-2 border-[#FDBCB4]/30",
  },
  size: {
    sm: "w-6 h-6 text-xs",
    md: "w-8 h-8 text-xs",
    lg: "w-10 h-10 text-sm",
  },
  indicator: {
    sm: "h-6",
    md: "h-8",
    lg: "h-10",
  },
};

const StepIndicator = ({
  step,
  index,
  size = "md",
  variant = "default",
}: {
  step: Step;
  index: number;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "minimal" | "circular";
}) => {
  const baseClasses = cn(
    "flex items-center justify-center rounded-full font-medium transition-all duration-200",
    stepVariants.size[size],
    stepVariants.status[step.status],
    step.disabled && "opacity-50 cursor-not-allowed"
  );

  if (variant === "circular") {
    return (
      <div className={cn(baseClasses)}>
        {step.status === "completed" ? (
          <Check className="w-4 h-4" />
        ) : (
          <span>{index + 1}</span>
        )}
      </div>
    );
  }

  if (variant === "minimal") {
    return (
      <div
        className={cn(
          "w-2 h-2 rounded-full transition-all duration-200",
          step.status === "completed" && "bg-gradient-to-r from-green-500 to-emerald-500",
          step.status === "current" && "bg-gradient-to-r from-blue-500 to-purple-500 scale-125 shadow-md shadow-blue-500/40",
          step.status === "upcoming" && "bg-gray-400 dark:bg-gray-600"
        )}
      />
    );
  }

  return (
    <div className={cn(baseClasses)}>
      {step.status === "completed" ? (
        <Check className="w-4 h-4 text-white" />
      ) : (
        <span className="text-sm font-bold">
          {index + 1}
        </span>
      )}
    </div>
  );
};

const StepContent = ({
  step,
  size = "md",
  variant = "default",
}: {
  step: Step;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "minimal" | "circular";
}) => {
  if (variant === "minimal") {
    return (
      <div className="flex-1">
        <div
          className={cn(
            "transition-colors font-semibold",
            stepperVariants.size[size],
            step.status === "current" && "text-primary"
          )}
        >
          {step.title}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1">
        <h3
        className={cn(
          "transition-colors font-semibold",
          step.status === "current" && "text-[#22C55E]",
          step.status === "completed" && "text-[#22C55E]",
          step.status === "upcoming" && "text-gray-500",
          stepperVariants.size[size]
        )}
      >
        {step.title}
      </h3>
      {step.description && (
        <p
          className={cn(
            "text-sm text-muted-foreground mt-1",
            step.status === "current" && "text-[#ADD8E6]"
          )}
        >
          {step.description}
        </p>
      )}
    </div>
  );
};

const Connector = ({
  isLast,
  orientation = "horizontal",
  variant = "default",
  size = "md",
}: {
  isLast: boolean;
  orientation?: "horizontal" | "vertical";
  variant?: "default" | "minimal" | "circular";
  size?: "sm" | "md" | "lg";
}) => {
  if (isLast) return null;

  if (orientation === "vertical") {
    return (
      <div
        className={cn(
          "w-px h-6 ml-4",
          "border-l border-dashed border-[#ADD8E6] border-[1px]",
          variant === "minimal" && "ml-2"
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center flex-1 mx-3",
        stepVariants.indicator[size]
      )}
    >
      <div
        className={cn(
          "h-px flex-1",
          "border-t border-dashed border-[#ADD8E6] border-[1px]",
          variant === "minimal" && "mx-2"
        )}
      />
    </div>
  );
};

export const Stepper = React.forwardRef<HTMLDivElement, StepperProps>(
  (
    {
      steps,
      orientation = "horizontal",
      variant = "default",
      size = "md",
      className,
      onStepClick,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "w-full",
          stepperVariants.orientation[orientation],
          className
        )}
        {...props}
      >
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div
              className={cn(
                "flex items-center",
                orientation === "vertical" && "flex-row",
                orientation === "horizontal" && "flex-col text-center flex-1",
                onStepClick && !step.disabled && "cursor-pointer hover:opacity-80"
              )}
              onClick={() => onStepClick?.(step, index)}
          >
              <div className={cn(
                "flex items-center",
                orientation === "horizontal" && "flex-col",
                orientation === "vertical" && "flex-row"
              )}>
              <StepIndicator
                step={step}
                index={index}
                size={size}
                variant={variant}
              />
                <div className={cn(
                  orientation === "horizontal" && variant === "minimal" && "mt-2",
                  orientation === "horizontal" && variant !== "minimal" && "mt-2",
                  orientation === "vertical" && "ml-4"
                )}>
                  <StepContent 
                    step={step} 
                    size={size}
                    variant={variant}
                  />
                </div>
              </div>
            </div>
              <Connector
                isLast={index === steps.length - 1}
                orientation={orientation}
                variant={variant}
                size={size}
              />
          </React.Fragment>
        ))}
      </div>
    );
  }
);

Stepper.displayName = "Stepper";

// 导出一些常用的预设步骤
export const createSteps = (
  titles: string[],
  descriptions?: string[]
): Step[] => {
  return titles.map((title, index) => ({
    id: `step-${index}`,
    title,
    description: descriptions?.[index],
    status: index === 0 ? "current" : "upcoming",
  }));
};

export const updateStepStatus = (
  steps: Step[],
  currentIndex: number
): Step[] => {
  return steps.map((step, index) => ({
    ...step,
    status:
      index < currentIndex
        ? "completed"
        : index === currentIndex
        ? "current"
        : "upcoming",
  }));
};
