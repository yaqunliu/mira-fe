"use client";

import { useTranslations } from 'next-intl'
import type { PendingInteraction } from '@/types/agent';
import { ConfigCard } from './config-card';

interface ChatInteractionCardProps {
    interaction: PendingInteraction;
    onResponse: (text: string) => void;
}

/**
 * Supervisor 交互卡片组件
 * 
 * 用于展示 approve_reject、select_options 和 config_card 类型的交互请求
 */
export function ChatInteractionCard({
    interaction,
    onResponse,
}: ChatInteractionCardProps) {
  const t = useTranslations('agent')
    const { type, message, options, title, description, fields, submitText, params } = interaction;

    // 处理确认生成 - 需要发送特殊的 action_response
    const handleConfirmGeneration = async () => {
        // 构建 action_response，包含 confirm_generation 类型和参数
        const actionResponse = {
            action: 'confirm_generation',
            params: params || {},
        };
        // 直接调用 onResponse 并传递 action_response
        // i18n-ignore: 下面两处字符串是发给后端 agent 的协议响应值，不是界面文案
        onResponse('确认生成视频', actionResponse);
    };

    // 处理确认/拒绝
    const handleApproveReject = (approved: boolean) => {
        // i18n-ignore: 发给后端 agent 的协议响应值
        onResponse(approved ? '确认' : '拒绝');
    };

    // 处理选项选择
    const handleSelectOption = (option: { id: string; label: string; value?: string }) => {
        onResponse(option.value || option.label);
    };

    // 处理配置卡片提交
    const handleConfigSubmit = (values: Record<string, any>) => {
        // 生成用户友好的确认消息
        const parts: string[] = [];
        
        if (fields) {
            fields.forEach((field) => {
                const value = values[field.name];
                if (value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) {
                    return;
                }
                
                // 获取显示值
                let displayValue: string;
                if (Array.isArray(value)) {
                    displayValue = value.join(", ");
                } else if (field.options) {
                    const option = field.options.find((opt) => opt.value === value);
                    displayValue = option ? option.label.replace(/[🍼📖🎓👩👨🎲🔁]/g, "").trim() : String(value);
                } else {
                    displayValue = String(value);
                }
                
                const fieldLabel = field.label.replace(/[📝📚🔁🎙️]/g, "").trim();
                parts.push(`${fieldLabel}: ${displayValue}`);
            });
        }
        
        const configText = parts.join("，");
        onResponse(configText);
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
                            <span>{t("confirm")}</span>
                        </button>
                        <button
                            onClick={() => handleApproveReject(false)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gray-400 to-gray-500 text-white rounded-lg font-medium hover:from-gray-500 hover:to-gray-600 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                        >
                            <span>✗</span>
                            <span>{t("reject")}</span>
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

                {type === 'config_card' && fields && fields.length > 0 && (
                    <ConfigCard
                        title={title || t('configParamsTitle')}
                        description={description}
                        fields={fields}
                        submitText={submitText || t('confirm')}
                        onSubmit={handleConfigSubmit}
                    />
                )}

                {type === 'retry_actions' && (
                    <div className="flex flex-col gap-3">
                        <p className="text-sm text-gray-600">{message}</p>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {options?.map((option) => (
                                <button
                                    key={option.id}
                                    onClick={() => handleSelectOption(option)}
                                    className={`px-4 py-2 rounded-lg font-medium transition-all shadow-sm hover:shadow-md transform hover:-translate-y-0.5 ${
                                        option.id === 'retry_image'
                                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700'
                                            : option.id === 'retry_video'
                                            ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700'
                                            : option.id === 'continue'
                                            ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600'
                                            : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {type === 'confirm_generation' && (
                    <div className="flex flex-col gap-3">
                        <div className="text-sm text-gray-600">
                            {params && params.words && (
                                <p>{t('wordsLabel')} {Array.isArray(params.words) ? params.words.join(', ') : params.words}</p>
                            )}
                            {params && params.sentence_level && (
                                <p>{t('difficultyLabel')} {params.sentence_level}</p>
                            )}
                        </div>
                        <button
                            onClick={handleConfirmGeneration}
                            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-medium hover:from-green-600 hover:to-emerald-600 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                        >
                            <span>🎬</span>
                            <span>{t('confirmGenerateVideoTitle')}</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
