"use client";

import { useState } from 'react';
import { useAgentStore } from '@/stores/agent-store';
import { useAgentContext } from './agent-provider';
import { ChatMessageList } from './chat-message-list';
import { ChatInput } from './chat-input';
import { VocabConfigCard } from './vocab-config-card';
import { CreationTypeCard } from './creation-type-card';
import { ICreation } from '@/types/creation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';

interface AgentChatPanelProps {
  creationUuid?: string; // 可选，因为现在从 Provider 获取
  creationType?: string; // 创作类型
  creation?: ICreation; // 创作数据，用于获取 video_url
}

/**
 * Agent 对话面板组件
 *
 * 右侧对话区，包含：
 * - 消息列表
 * - 思考过程展示
 * - 工具调用展示
 * - 操作请求按钮
 * - 输入框
 */
export function AgentChatPanel({ creationType, creation }: AgentChatPanelProps) {
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  
  // 获取 video_url
  const videoUrl = creation?.video_url || (creation?.extra_data as any)?.video_url;
  const hasVideo = !!videoUrl;
  
  
  const currentStatus = (creation?.status || '') as string;
  const extraData = creation?.extra_data as any;
  const progress = extraData?.progress || 0;
  const currentStep = extraData?.current_step || '';
  
  // 是否在生成中
  const isGenerating = currentStatus === 'generating' || currentStatus === 'processing' || currentStatus === 'exporting' || currentStatus === 'pending';
  
  const {
    messages,
    isConnected,
    isStreaming,
    isProcessing,
    isThinking,
    thinkingContent,
    currentToolCall,
    pendingActionRequest,
    pendingInteraction,
    connectionError,
    setPendingInteraction,
  } = useAgentStore();

  const {
    sendMessage,
    reconnect,
    interrupt,
    reset,
    isPollingMode,
    isInterrupting,
    isResetting,
  } = useAgentContext();

  // 处理操作请求响应
  const handleActionResponse = async (actionId: string) => {
    if (!pendingActionRequest) return;

    await sendMessage('', {
      request_id: pendingActionRequest.requestId,
      action_id: actionId,
    });
  };

  // 处理 Supervisor 交互响应
  const handleInteractionResponse = async (text: string, actionResponse?: any) => {
    // 清除待处理的交互请求
    setPendingInteraction(null);
    // 将用户选择的文本作为新消息发送，附带 action_response
    await sendMessage(text, actionResponse);
  };

  // 处理用户直接从输入框发送消息
  const handleSendMessage = async (message: string, actionResponse?: any) => {
    // 如果有待处理的交互请求，先清除它
    if (pendingInteraction) {
      setPendingInteraction(null);
    }
    await sendMessage(message, actionResponse);
  };

  // 处理中断
  const handleInterrupt = async () => {
    await interrupt();
  };

  // 处理重置
  const handleReset = async () => {
    if (window.confirm('确定要重置会话吗？这将清除所有对话记录。')) {
      await reset(true);
    }
  };

  // 判断是否有历史消息（用于区分初始状态和断连状态）
  const hasMessages = messages.length > 0;
  // 初始状态（没有消息且未连接）时允许发送，断连状态（有消息但未连接）时显示重连
  const isInitialState = !hasMessages && !isConnected && !connectionError;

  // DEBUG: 检查状态值
  console.log('[ChatPanel] State check:', { isStreaming, isProcessing, showIndicator: isStreaming || isProcessing });

  return (
    <div className={`h-full border-l border-white/20 bg-white/5 backdrop-blur-sm flex flex-col ${creationType === 'chat' ? 'w-full' : 'w-[400px]'}`}>
      {/* 头部 */}
      <div className="px-6 py-4 border-b border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🤖</span>
            <span className="font-semibold text-gray-800">AI导演助手</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full transition-colors ${isConnected
                ? 'bg-green-500'
                : isInitialState
                  ? 'bg-blue-400'
                  : 'bg-gray-400'
                }`}
            />
            <span className="text-xs text-gray-500">
              {isConnected
                ? isPollingMode
                  ? '轮询模式'
                  : '已连接'
                : isInitialState
                  ? '待命'
                  : '未连接'}
            </span>
            {!isConnected && connectionError && (
              <button
                onClick={reconnect}
                className="text-xs text-blue-500 hover:text-blue-600 ml-2"
              >
                重连
              </button>
            )}
            {/* 重置按钮 */}
            <button
              onClick={handleReset}
              disabled={isResetting}
              className="text-xs text-gray-500 hover:text-gray-700 ml-2 disabled:opacity-50"
              title="重置会话"
            >
              {isResetting ? '重置中...' : '重置'}
            </button>
            {/* 生成结果按钮 */}
            {hasVideo && (
              <button
                onClick={() => setShowVideoPreview(true)}
                className="text-xs bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded ml-2 font-medium"
                title="查看生成结果"
              >
                生成结果
              </button>
            )}
          </div>
        </div>
        {connectionError && (
          <div className="mt-2 text-xs text-red-500">
            连接错误: {connectionError}
          </div>
        )}
      </div>

      {/* 消息区域 */}
      <div className="flex-1 overflow-auto p-4">
        {/* Chat 类型且没有消息时显示类型选择卡片 */}
        {creationType === "chat" && messages.length === 0 && !isStreaming && !isProcessing ? (
          <div className="h-full flex flex-col">
            <div className="flex-1 flex items-center justify-center">
              <div className="w-full max-w-sm">
                <CreationTypeCard
                  onSelect={(type) => {
                    const typeNames: Record<string, string> = {
                      vocab_video: "英文单词视频",
                      gaoxiao_video: "搞笑短视频",
                      story_video: "故事动画视频",
                    };
                    const message = `我要创作${typeNames[type]}`;
                    handleSendMessage(message);
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          <ChatMessageList
            messages={messages}
            isThinking={isThinking}
            thinkingContent={thinkingContent}
            currentToolCall={currentToolCall}
            pendingActionRequest={pendingActionRequest}
            pendingInteraction={pendingInteraction}
            onActionResponse={handleActionResponse}
            onInteractionResponse={handleInteractionResponse}
            creationType={creationType}
          />
        )}
      </div>

      {/* 生成进度浮窗卡片 - 固定在页面左侧 */}
      {isGenerating && (
        <div className="fixed top-1/3 left-4 w-64 bg-black rounded-xl shadow-2xl border border-gray-600 p-4 z-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-sm font-medium text-white">生成中</span>
            </div>
            <span className="text-xs text-gray-300 uppercase">{currentStatus}</span>
          </div>
          
          {/* 进度条 */}
          <div className="w-full bg-gray-600 rounded-full h-2 mb-3">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-300">{currentStep}</span>
            <span className="text-blue-400 font-medium">{progress}%</span>
          </div>
        </div>
      )}

      {/* 输入区域 */}
      <div className="p-4 border-t border-white/20 bg-white/10">
        <ChatInput
          onSend={handleSendMessage}
          disabled={isStreaming}
          placeholder="输入消息..."
        />
        {/* 状态指示器：流式回复中 or 后台处理中 */}
        {(isStreaming || isProcessing) && (
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              {isStreaming ? 'AI 正在回复中' : '后台处理中'}
              <span className="animate-pulse">...</span>
            </span>
            {isStreaming && (
              <button
                onClick={handleInterrupt}
                disabled={isInterrupting}
                className="text-xs text-red-500 hover:text-red-600 disabled:opacity-50"
              >
                {isInterrupting ? '中断中...' : '中断'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 视频预览弹窗 */}
      <Dialog open={showVideoPreview} onOpenChange={setShowVideoPreview}>
        <DialogContent className="max-w-4xl w-[90vw]">
          <DialogHeader>
            <DialogTitle>🎬 视频生成结果</DialogTitle>
            <DialogDescription>
              您的视频已生成完成，可以预览和下载
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* 视频播放器 */}
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video
                src={videoUrl}
                controls
                className="w-full h-full"
                autoPlay={false}
              >
                您的浏览器不支持视频播放
              </video>
            </div>
            {/* 下载按钮 */}
            <div className="flex justify-center gap-4">
              <a
                href={videoUrl}
                download
                className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                下载视频
              </a>
              <button
                onClick={() => setShowVideoPreview(false)}
                className="inline-flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
