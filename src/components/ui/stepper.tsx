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
    completed: "text-primary bg-primary/10 border-primary",
    current: "text-primary-foreground bg-primary border-primary",
    upcoming: "text-muted-foreground bg-muted border-muted-foreground/20",
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
  variant = "default" 
}: { 
  step: Step; 
  index: number; 
  size?: "sm" | "md" | "lg";
  variant?: "default" | "minimal" | "circular";
}) => {
  console.log(step);
  const baseClasses = cn(
    "flex items-center justify-center rounded-full font-medium transition-all duration-200",
    stepVariants.size[size],
    stepVariants.status[step.status],
    step.disabled && "opacity-50 cursor-not-allowed",
    "bg-gray-200/20"
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
      <div className={cn(
        "w-2 h-2 rounded-full transition-all duration-200",
        step.status === "completed" && "bg-primary",
        step.status === "current" && "bg-primary scale-125",
        step.status === "upcoming" && "bg-muted-foreground/30"
      )} />
    );
  }

  return (
    <div className={cn(baseClasses, step.status === "current" && "border-[1px] border-orange-400/50")}>
      {step.status === "completed" ? (
        <Check className="w-4 h-4" />
      ) : (
        <span className={cn(step.status === "current" && "text-orange-400", 'text-sm font-semibold')}>{index + 1}</span>
      )}
    </div>
  );
};

const StepContent = ({ 
  step, 
  size = "md",
  variant = "default" 
}: { 
  step: Step; 
  size?: "sm" | "md" | "lg";
  variant?: "default" | "minimal" | "circular";
}) => {
  if (variant === "minimal") {
    return (
      <div className="flex-1">
        <div className={cn(
          "transition-colors font-semibold",
          stepperVariants.size[size],
          step.status === "current" && "text-orange-400",
        )}>
          {step.title}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1">
      <h3 className={cn(
        "transition-colors",
        step.status === "current" && "text-default",
        step.status === "upcoming" && "dark:text-gray-500 text-gray-600",
        stepperVariants.size[size],
      )}>
        {step.title}
      </h3>
      {step.description && (
        <p className={cn(
          "text-sm text-muted-foreground mt-1",
          step.status === "current" && "text-primary/70"
        )}>
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
  size = "md"
}: { 
  isLast: boolean; 
  orientation?: "horizontal" | "vertical";
  variant?: "default" | "minimal" | "circular";
  size?: "sm" | "md" | "lg";
}) => {
  if (isLast) return null;

  if (orientation === "vertical") {
    return (
      <div className={cn(
        "w-px h-6 ml-4",
        "border-l border-dashed border-orange-300/30 border-[1px]",
        variant === "minimal" && "ml-2"
      )} 
      />
    );
  }

  return (
    <div className={cn(
      "flex items-center flex-1 mx-3",
      stepVariants.indicator[size]
    )}>
      <div className={cn(
        "h-px flex-1",
        "border-t border-dashed border-orange-300/30 border-[1px]",
        variant === "minimal" && "mx-2"
      )} 
      />
    </div>
  );
};

export const Stepper = React.forwardRef<HTMLDivElement, StepperProps>(
  ({ 
    steps, 
    orientation = "horizontal", 
    variant = "default",
    size = "md",
    className,
    onStepClick,
    ...props 
  }, ref) => {
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
export const createSteps = (titles: string[], descriptions?: string[]): Step[] => {
  return titles.map((title, index) => ({
    id: `step-${index}`,
    title,
    description: descriptions?.[index],
    status: index === 0 ? "current" : "upcoming",
  }));
};

export const updateStepStatus = (steps: Step[], currentIndex: number): Step[] => {
  return steps.map((step, index) => ({
    ...step,
    status: index < currentIndex ? "completed" : index === currentIndex ? "current" : "upcoming",
  }));
};
