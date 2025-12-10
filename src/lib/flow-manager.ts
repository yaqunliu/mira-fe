/**
 * 创作流程状态管理器
 *
 * 这个文件负责管理创作流程的所有状态跳转逻辑
 * 确保在不同状态和任务情况下，能够正确跳转到对应的步骤
 */

import { CreationStatus } from "@/types/creation";
import { TaskType, TaskStatus } from "@/types";

/**
 * 流程步骤枚举
 */
export enum FlowStep {
  STORY = 0,      // 故事设置（选择小说章节）
  CHARACTER = 1,  // 角色设置（查看和生成角色）
  SCRIPT = 2,     // 脚本设置（编辑分镜脚本）
  STORYBOARD = 3, // 分镜图片（查看和生成分镜图片）
  VIDEO = 4,      // 视频生成（选择音色、生成视频）
}

/**
 * 创作数据接口（只包含必要字段）
 */
export interface CreationFlowData {
  status: CreationStatus;
  current_task_id?: string | null;
  characters?: any[];
  scenes?: any[];
}

/**
 * 任务数据接口
 */
export interface TaskFlowData {
  taskType: TaskType;
  status: TaskStatus;
}

/**
 * 流程决策结果
 */
export interface FlowDecision {
  step: FlowStep;
  isLoading: boolean;  // 是否处于加载状态（有任务在执行）
  reason: string;      // 跳转原因（用于调试）
}

/**
 * 流程状态管理器
 */
export class FlowManager {
  /**
   * 根据创作状态和任务状态决定应该跳转到哪个步骤
   *
   * @param creation 创作数据
   * @param task 任务数据（如果有 current_task_id）
   * @returns 流程决策结果
   */
  static determineFlow(
    creation: CreationFlowData,
    task?: TaskFlowData | null
  ): FlowDecision {
    const { status, current_task_id, characters, scenes } = creation;

    // 1. 如果有 current_task_id 且有 task 数据，根据任务类型判断
    if (current_task_id && task) {
      return this.determineFlowByTask(creation, task);
    }

    // 2. 如果有 current_task_id 但 task 数据还未加载，显示 loading 状态
    //    这种情况通常发生在任务刚创建，task 查询还没返回时
    if (current_task_id && !task) {
      // 根据状态猜测应该在哪个页面显示 loading
      const decision = this.determineFlowByStatus(creation);
      return {
        ...decision,
        isLoading: true,
        reason: `有任务ID但任务数据未加载，显示loading状态。${decision.reason}`
      };
    }

    // 3. 如果没有任务，根据 status 判断
    return this.determineFlowByStatus(creation);
  }

  /**
   * 根据任务类型决定流程步骤（有 current_task_id 时）
   */
  private static determineFlowByTask(
    creation: CreationFlowData,
    task: TaskFlowData
  ): FlowDecision {
    const { status, characters } = creation;
    const { taskType, status: taskStatus } = task;

    // 判断任务是否还在执行中
    const isTaskRunning =
      taskStatus !== TaskStatus.SUCCESS &&
      taskStatus !== TaskStatus.FAILURE;

    // 根据任务类型决定步骤
    switch (taskType) {
      case TaskType.NOVEL_UPLOAD:
        // 小说上传任务
        return {
          step: FlowStep.STORY,
          isLoading: isTaskRunning,
          reason: `任务: ${taskType}, 状态: ${taskStatus}, 小说上传中`
        };

      case TaskType.CREATION_INIT:
      case TaskType.CHARACTER_ANALYSIS:
        // 创作初始化/角色分析任务
        return {
          step: FlowStep.CHARACTER,
          isLoading: isTaskRunning,
          reason: `任务: ${taskType}, 状态: ${taskStatus}, 角色分析中，跳转到角色设置页面`
        };

      case TaskType.SCENE_DESCRIPTION_GENERATION:
        // 分镜描述生成任务（分镜拆分）
        if (status === CreationStatus.CHARACTER_ANALYZED) {
          // 刚完成角色分析，正在进行分镜拆分，停留在角色设置页面
          return {
            step: FlowStep.CHARACTER,
            isLoading: isTaskRunning,
            reason: `任务: ${taskType}, 状态: ${status}, 分镜拆分中，停留在角色页面`
          };
        } else {
          // 其他状态下的分镜拆分任务，跳转到脚本页面
          return {
            step: FlowStep.SCRIPT,
            isLoading: isTaskRunning,
            reason: `任务: ${taskType}, 状态: ${status}, 分镜拆分中，跳转到脚本页面`
          };
        }

      case TaskType.CHARACTER_IMAGE_GENERATION:
        // 角色图片生成任务
        // 如果状态是 CHARACTER_GENERATED 或之后的状态，说明是重新生成角色图片
        // 应该停留在当前流程页面（脚本页面或更后面），而不是跳回角色设置页面
        if (status === CreationStatus.CHARACTER_GENERATED ||
            status === CreationStatus.PLAYBOOK_GENERATED ||
            status === CreationStatus.SCENE_GENERATED ||
            status === CreationStatus.VOICE_SELECTED ||
            status === CreationStatus.AUDIO_GENERATED ||
            status === CreationStatus.VIDEO_GENERATED ||
            status === CreationStatus.COMPLETED) {
          // 根据状态决定应该在哪个页面显示 loading
          const baseDecision = this.determineFlowByStatus(creation);
          return {
            ...baseDecision,
            isLoading: isTaskRunning,
            reason: `任务: ${taskType}, 状态: ${status}, 重新生成角色图片，停留在${baseDecision.step === FlowStep.SCRIPT ? '脚本' : '当前'}页面`
          };
        } else {
          // 状态是 CREATED 或 CHARACTER_ANALYZED，说明是首次生成
          // 应该在角色设置页面显示 loading
          return {
            step: FlowStep.CHARACTER,
            isLoading: isTaskRunning,
            reason: `任务: ${taskType}, 状态: ${status}, 首次生成角色图片`
          };
        }

      case TaskType.SHOT_IMAGE_GENERATION:
      case TaskType.BATCH_SHOT_IMAGE_GENERATION:
        // 分镜图片生成任务（单个或批量）
        return {
          step: FlowStep.STORYBOARD,
          isLoading: isTaskRunning,
          reason: `任务: ${taskType}, 状态: ${taskStatus}, 分镜图片生成中`
        };

      case TaskType.VIDEO_MERGE:
        // 视频合并任务（视频+音频+字幕）
        return {
          step: FlowStep.VIDEO,
          isLoading: isTaskRunning,
          reason: `任务: ${taskType}, 状态: ${taskStatus}, 视频合并中`
        };

      default:
        // 未知任务类型，根据状态判断
        console.warn(`未知任务类型: ${taskType}，将根据状态判断`);
        return this.determineFlowByStatus(creation);
    }
  }

  /**
   * 根据创作状态决定流程步骤（没有 current_task_id 时）
   */
  private static determineFlowByStatus(
    creation: CreationFlowData
  ): FlowDecision {
    const { status, characters, scenes, current_task_id } = creation;

    switch (status) {
      case CreationStatus.CREATED:
        // 创建状态
        if (scenes && scenes.length > 0) {
          // 有分镜数据，跳转到脚本设置
          return {
            step: FlowStep.SCRIPT,
            isLoading: false,
            reason: `状态: ${status}, 有分镜数据，跳转到脚本设置`
          };
        } else if (characters && characters.length > 0) {
          // 有角色数据但没有分镜，跳转到角色设置
          return {
            step: FlowStep.CHARACTER,
            isLoading: false,
            reason: `状态: ${status}, 有角色数据无分镜，跳转到角色设置`
          };
        } else if (current_task_id) {
          // 有 current_task_id 说明正在执行任务（可能是初始分析任务）
          // 跳转到角色设置页面等待分析完成
          return {
            step: FlowStep.CHARACTER,
            isLoading: true,
            reason: `状态: ${status}, 有任务在执行，跳转到角色设置等待分析`
          };
        } else {
          // 没有角色也没有分镜也没有任务，停留在故事设置
          return {
            step: FlowStep.STORY,
            isLoading: false,
            reason: `状态: ${status}, 无角色无分镜无任务，停留在故事设置`
          };
        }

      case CreationStatus.CHARACTER_ANALYZED:
        // 角色分析完成，跳转到角色设置让用户查看
        return {
          step: FlowStep.CHARACTER,
          isLoading: false,
          reason: `状态: ${status}, 角色分析完成，跳转到角色设置`
        };

      case CreationStatus.PLAYBOOK_GENERATED:
        // 分镜拆分完成，跳转到脚本设置
        return {
          step: FlowStep.SCRIPT,
          isLoading: false,
          reason: `状态: ${status}, 分镜拆分完成，跳转到脚本设置`
        };

      case CreationStatus.CHARACTER_GENERATED:
        // 角色图片生成完成，跳转到脚本设置
        return {
          step: FlowStep.SCRIPT,
          isLoading: false,
          reason: `状态: ${status}, 角色图片生成完成，跳转到脚本设置`
        };

      case CreationStatus.SCENE_GENERATED:
        // 分镜图片生成完成，跳转到分镜页面
        return {
          step: FlowStep.STORYBOARD,
          isLoading: false,
          reason: `状态: ${status}, 分镜图片生成完成，跳转到分镜页面`
        };

      case CreationStatus.VOICE_SELECTED:
      case CreationStatus.AUDIO_GENERATED:
      case CreationStatus.VIDEO_GENERATED:
      case CreationStatus.COMPLETED:
        // 音色选择及之后的状态，跳转到视频页面
        return {
          step: FlowStep.VIDEO,
          isLoading: false,
          reason: `状态: ${status}, 跳转到视频页面`
        };

      case CreationStatus.FAILED:
        // 失败状态，根据数据判断应该停留在哪里
        if (scenes && scenes.length > 0) {
          return {
            step: FlowStep.SCRIPT,
            isLoading: false,
            reason: `状态: ${status}, 有分镜数据，跳转到脚本设置`
          };
        } else if (characters && characters.length > 0) {
          return {
            step: FlowStep.CHARACTER,
            isLoading: false,
            reason: `状态: ${status}, 有角色数据，跳转到角色设置`
          };
        } else {
          return {
            step: FlowStep.STORY,
            isLoading: false,
            reason: `状态: ${status}, 失败状态且无数据，停留在故事设置`
          };
        }

      default:
        // 未知状态，默认跳转到故事设置
        console.warn(`未知创作状态: ${status}`);
        return {
          step: FlowStep.STORY,
          isLoading: false,
          reason: `未知状态: ${status}, 默认跳转到故事设置`
        };
    }
  }

  /**
   * 计算最大可访问步骤（用于步骤导航的禁用状态）
   *
   * @param creation 创作数据
   * @param isLoading 是否处于加载状态
   * @returns 最大可访问步骤索引
   */
  static calculateMaxAccessibleStep(
    creation: CreationFlowData,
    isLoading: boolean
  ): number {
    // 如果处于加载状态，不允许切换到其他步骤
    if (isLoading) {
      // 返回当前步骤，实际上会通过其他逻辑禁用所有导航
      return this.determineFlow(creation).step;
    }

    const { status } = creation;

    switch (status) {
      case CreationStatus.CREATED:
      case CreationStatus.CHARACTER_ANALYZED:
        // 角色分析阶段，最多访问到角色设置
        return FlowStep.CHARACTER;

      case CreationStatus.PLAYBOOK_GENERATED:
      case CreationStatus.CHARACTER_GENERATED:
        // 分镜拆分/角色生成完成，最多访问到脚本设置
        return FlowStep.SCRIPT;

      case CreationStatus.SCENE_GENERATED:
        // 分镜图片生成完成，可以访问到视频页面
        // 用户可以直接跳转到视频页面，不需要强制点击"下一步"
        return FlowStep.VIDEO;

      case CreationStatus.VOICE_SELECTED:
      case CreationStatus.AUDIO_GENERATED:
      case CreationStatus.VIDEO_GENERATED:
      case CreationStatus.COMPLETED:
        // 音频/视频阶段，可以访问所有步骤
        return FlowStep.VIDEO;

      case CreationStatus.FAILED:
        // 失败状态，根据数据判断
        if (creation.scenes && creation.scenes.length > 0) {
          return FlowStep.SCRIPT;
        } else if (creation.characters && creation.characters.length > 0) {
          return FlowStep.CHARACTER;
        } else {
          return FlowStep.STORY;
        }

      default:
        // 未知状态，只能访问第一步
        return FlowStep.STORY;
    }
  }

  /**
   * 检查是否可以切换到指定步骤
   *
   * @param targetStep 目标步骤
   * @param creation 创作数据
   * @param isLoading 是否处于加载状态
   * @returns 是否可以切换
   */
  static canNavigateToStep(
    targetStep: FlowStep,
    creation: CreationFlowData,
    isLoading: boolean
  ): boolean {
    // 加载状态下不允许切换
    if (isLoading) {
      return false;
    }

    // 检查目标步骤是否在允许范围内
    const maxStep = this.calculateMaxAccessibleStep(creation, isLoading);
    return targetStep <= maxStep;
  }
}
