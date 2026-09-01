"use client";

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useCreationV2Store } from '@/stores/creation-v2';
import { usePathname } from '@/i18n/navigation';

interface ModeSwitcherProps {
  creationId: string;
  currentMode: 'agent' | 'professional';
  className?: string;
}

/**
 * 模式切换组件
 *
 * 在 Agent 模式和专业模式之间切换
 */
export function ModeSwitcher({
  creationId, currentMode, className = '' }: ModeSwitcherProps) {
  const t = useTranslations('agent');
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { setMode } = useCreationV2Store();

  const handleSwitch = async (toAgentMode: boolean) => {

    // 目标路径 - 专业模式使用 dynamic-comic-editor，参数名为 taskId
    const targetPath = toAgentMode
      ? `/create-agent?creationId=${creationId}`
      : `/dynamic-comic-editor?taskId=${creationId}`;

    // 更新状态
    setMode(toAgentMode ? 'agent' : 'professional');

    // 刷新数据确保最新
    await queryClient.invalidateQueries({ queryKey: ['creation', creationId] });

    // 跳转
    router.push(targetPath);
  };

  const isAgentMode = currentMode === 'agent';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* 标签 */}
      <span className="text-sm text-gray-600">{t("creationMode")}</span>

      {/* 切换器 */}
      <div className="relative inline-flex items-center">
        {/* 背景轨道 */}
        <div className="w-32 h-8 bg-gray-200 rounded-full relative cursor-pointer" onClick={() => handleSwitch(!isAgentMode)}>
          {/* 滑块 */}
          <div
            className={`
              absolute top-0.5 h-7 w-16 bg-gradient-to-r from-[#22C55E] to-[#ADD8E6] rounded-full shadow-md
              transition-all duration-300 ease-in-out
              ${isAgentMode ? 'left-[calc(100%-4.125rem)]' : 'left-0.5'}
            `}
          />

          {/* 文字标签 */}
          <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
            <span
              className={`text-xs font-medium transition-colors duration-300 ${
                !isAgentMode ? 'text-white' : 'text-gray-600'
              }`}
            >
              {t("proMode")}
            </span>
            <span
              className={`text-xs font-medium transition-colors duration-300 ${
                isAgentMode ? 'text-white' : 'text-gray-600'
              }`}
            >
              Agent
            </span>
          </div>
        </div>
      </div>

      {/* 模式说明 */}
      <div className="text-xs text-gray-500">
        {isAgentMode ? t('modeAgentDesc') : t('modeManualDesc')}
      </div>
    </div>
  );
}

/**
 * 紧凑版模式切换组件
 */
export function CompactModeSwitcher({ creationId, currentMode }: Omit<ModeSwitcherProps, 'className'>) {
  const t = useTranslations('agent');
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { setMode } = useCreationV2Store();

  const handleSwitch = async () => {
    const toAgentMode = currentMode === 'professional';

    // 专业模式使用 dynamic-comic-editor，参数名为 taskId
    const targetPath = toAgentMode
      ? `/create-agent?creationId=${creationId}`
      : `/dynamic-comic-editor?taskId=${creationId}`;

    setMode(toAgentMode ? 'agent' : 'professional');
    await queryClient.invalidateQueries({ queryKey: ['creation', creationId] });
    router.push(targetPath);
  };

  const isAgentMode = currentMode === 'agent';

  return (
    <button
      onClick={handleSwitch}
      className="flex items-center gap-2 px-3 py-1.5 bg-white/50 hover:bg-white/80 border border-gray-200 rounded-lg transition-colors text-sm"
    >
      <span>{isAgentMode ? '🤖' : '⚙️'}</span>
      <span className="font-medium text-gray-700">
        {isAgentMode ? t('switchToProfessional') : t('switchToAgent')}
      </span>
    </button>
  );
}
