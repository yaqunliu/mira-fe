/**
 * 流程导航 Hook
 *
 * 这个 Hook 封装了创作流程的导航逻辑
 * 自动处理状态变化时的步骤跳转
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { FlowManager, FlowStep, CreationFlowData, TaskFlowData } from "@/lib/flow-manager";

export interface UseFlowNavigationOptions {
  creation?: CreationFlowData | null;
  task?: TaskFlowData | null;
  enableAutoNavigation?: boolean; // 是否启用自动导航（默认 true）
  onStepChange?: (step: FlowStep) => void; // 步骤变化回调
  debug?: boolean; // 是否输出调试信息
}

export interface UseFlowNavigationResult {
  currentStep: FlowStep;
  isLoading: boolean;
  maxAccessibleStep: number;
  canNavigateTo: (step: FlowStep) => boolean;
  navigateTo: (step: FlowStep) => void;
  reason: string; // 当前步骤的跳转原因
}

/**
 * 流程导航 Hook
 */
export function useFlowNavigation(
  options: UseFlowNavigationOptions
): UseFlowNavigationResult {
  const {
    creation,
    task,
    enableAutoNavigation = true,
    onStepChange,
    debug = false,
  } = options;

  const [currentStep, setCurrentStep] = useState<FlowStep>(FlowStep.STORY);
  const [isLoading, setIsLoading] = useState(false);
  const [reason, setReason] = useState("");

  // 用于防止用户手动切换后被自动导航覆盖
  const userNavigationTimeRef = useRef<number>(0);
  const AUTO_NAVIGATION_DELAY = 500; // 用户操作后的保护期（毫秒）

  // 记录上一次的 creation 和 task，用于检测变化
  // 初始值设置为 null，确保首次加载时能触发自动导航
  const prevCreationRef = useRef<CreationFlowData | null | undefined>(null);
  const prevTaskRef = useRef<TaskFlowData | null | undefined>(null);

  /**
   * 手动导航到指定步骤
   */
  const navigateTo = useCallback((step: FlowStep) => {
    if (!creation) return;

    const canNavigate = FlowManager.canNavigateToStep(step, creation, isLoading);

    if (!canNavigate) {
      if (debug) {
        console.warn(`[FlowNavigation] 无法导航到步骤 ${step}，当前状态不允许`);
      }
      return;
    }

    // 记录用户手动导航的时间
    userNavigationTimeRef.current = Date.now();

    setCurrentStep(step);
    onStepChange?.(step);

    if (debug) {
      console.log(`[FlowNavigation] 手动导航到步骤 ${step}`);
    }
  }, [creation, isLoading, onStepChange, debug]);

  /**
   * 自动导航逻辑（当状态变化时）
   */
  useEffect(() => {
    if (!enableAutoNavigation || !creation) return;

    // 检查是否应该执行自动导航
    const shouldAutoNavigate = () => {
      // 如果用户最近手动切换了步骤，延迟自动导航
      const timeSinceUserNavigation = Date.now() - userNavigationTimeRef.current;
      if (timeSinceUserNavigation < AUTO_NAVIGATION_DELAY) {
        return false;
      }

      // 检测 creation 或 task 是否发生了变化
      const creationChanged =
        JSON.stringify(prevCreationRef.current) !== JSON.stringify(creation);
      const taskChanged =
        JSON.stringify(prevTaskRef.current) !== JSON.stringify(task);

      return creationChanged || taskChanged;
    };

    if (!shouldAutoNavigate()) {
      return;
    }

    // 更新引用
    prevCreationRef.current = creation;
    prevTaskRef.current = task;

    // 使用 FlowManager 决定应该跳转的步骤
    const decision = FlowManager.determineFlow(creation, task);

    if (debug) {
      console.log(`[FlowNavigation] 自动导航决策:`, decision);
    }

    // 更新状态
    setCurrentStep(decision.step);
    setIsLoading(decision.isLoading);
    setReason(decision.reason);

    // 触发回调
    onStepChange?.(decision.step);
  }, [creation, task, enableAutoNavigation, onStepChange, debug]);

  /**
   * 计算最大可访问步骤
   */
  const maxAccessibleStep = creation
    ? FlowManager.calculateMaxAccessibleStep(creation, isLoading)
    : FlowStep.STORY;

  /**
   * 检查是否可以导航到指定步骤
   */
  const canNavigateTo = useCallback(
    (step: FlowStep) => {
      if (!creation) return false;
      return FlowManager.canNavigateToStep(step, creation, isLoading);
    },
    [creation, isLoading]
  );

  return {
    currentStep,
    isLoading,
    maxAccessibleStep,
    canNavigateTo,
    navigateTo,
    reason,
  };
}
