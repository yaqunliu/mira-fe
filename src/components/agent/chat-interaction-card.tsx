"use client";

import type { PendingInteraction } from '@/types/agent';

interface ChatInteractionCardProps {
    interaction: PendingInteraction;
    onResponse: (text: string) => void;
}

/**
 * Supervisor 交互卡片组件
 * 
 * 用于展示 approve_reject 和 select_options 类型的交互请求
 */
export function ChatInteractionCard({
    interaction,
    onResponse,
}: ChatInteractionCardProps) {
    const { type, message, options } = interaction;

    // 处理确认/拒绝
    const handleApproveReject = (approved: boolean) => {
        onResponse(approved ? '确认' : '拒绝');
    };

    // 处理选项选择
    const handleSelectOption = (option: { id: string; label: string; value?: string }) => {
        onResponse(option.value || option.label);
    };

    return (
        <div className="bg-gradient-to-br from-white/80 to-white/60 backdrop-blur-sm rounded-xl border border-white/40 shadow-lg overflow-hidden">
            {/* 消息内容 */}
            <div className="p-4 border-b border-gray-100">
                <div className="flex items-start gap-2">
                    <span className="text-lg">🤖</span>
                    <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                        {message}
                    </p>
                </div>
            </div>

            {/* 交互区域 */}
            <div className="p-4 bg-gradient-to-br from-gray-50/50 to-white/50">
                {type === 'approve_reject' && (
                    <div className="flex items-center justify-center gap-3">
                        <button
                            onClick={() => handleApproveReject(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-medium hover:from-green-600 hover:to-emerald-600 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                        >
                            <span>✓</span>
                            <span>确认</span>
                        </button>
                        <button
                            onClick={() => handleApproveReject(false)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gray-400 to-gray-500 text-white rounded-lg font-medium hover:from-gray-500 hover:to-gray-600 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                        >
                            <span>✗</span>
                            <span>拒绝</span>
                        </button>
                    </div>
                )}

                {type === 'select_options' && options && options.length > 0 && (
                    <div className="flex flex-wrap gap-2 justify-center">
                        {options.map((option, index) => (
                            <button
                                key={option.id || index}
                                onClick={() => handleSelectOption(option)}
                                className="px-4 py-2 bg-white text-gray-700 rounded-lg border border-gray-200 font-medium hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 hover:border-green-300 hover:text-green-700 transition-all shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
