"use client";

import { useCallback } from 'react';
import { useAgentStore } from '@/stores/agent-store';
import { useQueryClient } from '@tanstack/react-query';
import type { BoardAction } from '@/types/agent';

/**
 * 看板操作管理 Hook
 *
 * 处理从 SSE 收到的看板操作指令
 */
export function useAgentBoard(creationUuid: string) {
  const queryClient = useQueryClient();
  const { setBoardView, highlightElement } = useAgentStore();

  /**
   * 执行看板操作
   */
  const executeBoardActions = useCallback(
    (actions: BoardAction[]) => {
      for (const action of actions) {
        switch (action.action) {
          case 'switch_view':
            // 切换视图
            setBoardView(action.target as any);
            break;

          case 'highlight':
            // 高亮元素
            highlightElement(action.target, action.data?.duration || 3000);

            // DOM 操作：添加高亮效果
            setTimeout(() => {
              const element = document.getElementById(action.target);
              if (element) {
                element.classList.add('ring-2', 'ring-green-500', 'animate-pulse');
                setTimeout(() => {
                  element.classList.remove('ring-2', 'ring-green-500', 'animate-pulse');
                }, action.data?.duration || 3000);
              }
            }, 100);
            break;

          case 'scroll':
            // 滚动到指定元素
            setTimeout(() => {
              const element = document.getElementById(action.target);
              if (element) {
                element.scrollIntoView({
                  behavior: action.data?.behavior || 'smooth',
                  block: 'center',
                });
              }
            }, 100);
            break;

          case 'update':
            // 刷新 creation 数据
            queryClient.invalidateQueries({ queryKey: ['creation', creationUuid] });
            break;

          case 'add':
            // 处理添加操作（可选）
            if (action.data?.type === 'character') {
              // 刷新角色数据
              queryClient.invalidateQueries({ queryKey: ['creation', creationUuid] });
              // 切换到角色视图
              setBoardView('characters');
            } else if (action.data?.type === 'scene') {
              queryClient.invalidateQueries({ queryKey: ['creation', creationUuid] });
              setBoardView('scenes');
            } else if (action.data?.type === 'shot') {
              queryClient.invalidateQueries({ queryKey: ['creation', creationUuid] });
              setBoardView('storyboard');
            }
            break;

          case 'remove':
            // 处理删除操作
            queryClient.invalidateQueries({ queryKey: ['creation', creationUuid] });
            break;

          default:
            console.warn('Unknown board action:', action.action);
        }
      }
    },
    [setBoardView, highlightElement, queryClient, creationUuid]
  );

  /**
   * 从看板操作发送到对话
   *
   * 当用户在看板上进行操作时（如重新生成分镜、锁定角色等），
   * 将这些操作同步到对话中
   */
  const sendBoardOperation = useCallback(
    (operation: {
      type: string;
      target: string;
      data?: any;
    }) => {
      const { addMessage } = useAgentStore.getState();

      // 在对话中添加操作记录
      addMessage({
        id: `board-op-${Date.now()}`,
        role: 'user',
        content: formatOperationMessage(operation),
        timestamp: new Date().toISOString(),
        status: 'completed',
      });

      return operation;
    },
    []
  );

  return {
    executeBoardActions,
    sendBoardOperation,
  };
}

/**
 * 格式化操作消息
 */
function formatOperationMessage(operation: {
  type: string;
  target: string;
  data?: any;
}): string {
  const messages: Record<string, string> = {
    regenerate_character: `重新生成角色：${operation.target}`,
    lock_character: `锁定角色：${operation.target}`,
    regenerate_shot: `重新生成分镜 #${operation.target}`,
    delete_shot: `删除分镜 #${operation.target}`,
    reorder_shots: `调整分镜顺序`,
    update_scene: `更新场景 #${operation.target}`,
  };

  return messages[operation.type] || `[用户操作] ${operation.type}`;
}
