"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import creationApi from "@/lib/api/creation";
import { ICreation } from "@/types/creation";
import { AgentChatPanel } from "@/components/agent/agent-chat-panel";
import { AgentCanvas } from "@/components/agent/agent-canvas";
import { AgentSidebar } from "@/components/agent/agent-sidebar";
import { AgentProvider } from "@/components/agent/agent-provider";
import { EditorToolbar } from "@/components/shared/editor-toolbar";

export default function CreateAgentPage() {
  const t = useTranslations("createAgent");
  const searchParams = useSearchParams();
  const creationId = searchParams?.get("creationId");

  const { data: creationResponse, isLoading } = useQuery({
    queryKey: ["creation", creationId],
    queryFn: () => creationApi.queryCreationById(creationId!),
    enabled: !!creationId,
  });

  const creation = creationResponse?.data as ICreation;

  if (!creationId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="text-6xl">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800">{t("invalidId")}</h2>
          <p className="text-gray-600">{t("invalidIdDesc")}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="text-6xl">⏳</div>
          <h2 className="text-xl font-bold text-gray-800">{t("loading")}</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden bg-gradient-to-b from-[#FDBCB4]/20 via-[#ADD8E6]/20 to-white">
      {/* 装饰性渐变球 */}
      <div className="pointer-events-none absolute -left-10 -top-10 h-64 w-64 rounded-full bg-[#FDBCB4]/20 blur-3xl animate-blob-slow" />
      <div className="pointer-events-none absolute right-10 top-24 h-72 w-72 rounded-full bg-[#ADD8E6]/20 blur-3xl animate-blob-slower" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-[#22C55E]/20 blur-3xl animate-blob-slow" />

      {/* 顶部工具栏 - 使用共享组件 - chat 类型不显示 */}
      {creation?.creation_type !== "chat" && (
        <div className="relative z-10 flex-shrink-0">
          <EditorToolbar
            creation={creation}
            creationId={creationId}
            mode="agent"
          />
        </div>
      )}

      {/* 三栏式布局 */}
      <div className={`relative z-10 flex-1 flex overflow-hidden ${creation?.creation_type !== "chat" ? "mx-4 mb-4" : ""}`}>
        <AgentProvider creationUuid={creationId}>
          {creation?.creation_type === "chat" ? (
            // Chat 类型：全屏显示聊天窗口，居中显示
            <div className="flex items-center justify-center w-full h-full p-6">
              <div className="w-full max-w-6xl h-full flex justify-center">
                <AgentChatPanel creation={creation} creationType={creation?.creation_type} />
              </div>
            </div>
          ) : (
            // 其他类型：三栏式布局
            <div className="claymorphism rounded-2xl overflow-hidden flex w-full">
              {/* 左侧：侧边栏 */}
              <AgentSidebar creation={creation} />

              {/* 中间：看板区 */}
              <AgentCanvas creation={creation} />

              {/* 右侧：对话区 */}
              <AgentChatPanel creation={creation} creationType={creation?.creation_type} />
            </div>
          )}
        </AgentProvider>
      </div>
    </div>
  );
}
