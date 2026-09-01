"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Send, Bot, User, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { agentApi, IntentResponse } from "@/lib/api/agent";
import { DynamicForm } from "@/components/agent/dynamic-form";
import { getFormConfig, paramsToFormValues } from "@/lib/agent/form-configs";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  intentResult?: IntentResponse;
  showForm?: boolean;
  isRedirect?: boolean;
}

export default function AgentCreatorPage() {
  const t = useTranslations();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: t("agentCreator.welcome"),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentIntent, setCurrentIntent] = useState<IntentResponse | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // 调用意图识别 API
      const result = await agentApi.recognizeIntent({
        message: userMessage.content,
        chat_history: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      setCurrentIntent(result);

      if (result.redirect_to_legacy) {
         // 需要跳转到旧页面
         const assistantMessage: Message = {
           id: (Date.now() + 1).toString(),
           role: "assistant",
           content: t("agentCreator.redirectToLegacy", { intent: result.details.user_intent || t("agentCreator.defaultIntent") }),
           intentResult: result,
           showForm: true,
           isRedirect: true,
         };
         setMessages((prev) => [...prev, assistantMessage]);
      } else if (result.can_proceed) {
        // 参数齐全，显示确认消息
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: t("agentCreator.intentRecognized", { intent: result.details.user_intent || t("agentCreator.defaultIntent"), params: formatParams(result.extracted_params) }),
          intentResult: result,
          showForm: true,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        // 缺少参数，提示用户补充
        const missingFields = result.missing_required.join(t("agentCreator.fieldSeparator"));
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: t("agentCreator.missingFields", { intent: result.details.user_intent || t("agentCreator.defaultIntent"), fields: missingFields }),
          intentResult: result,
          showForm: true,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      toast.error(t("agentCreator.intentFailed"));
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = async (params: Record<string, any>) => {
    if (!currentIntent) return;

    setIsLoading(true);

    try {
      const result = await agentApi.createTask({
        intent: currentIntent.intent,
        params,
      });

      toast.success(t("agentCreator.taskCreated"));

      // 添加成功消息
      const successMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: t("agentCreator.taskCreatedMessage", { message: result.message }),
      };
      setMessages((prev) => [...prev, successMessage]);

      // 延迟跳转
      setTimeout(() => {
        router.push(result.redirect_url);
      }, 1500);
    } catch (error) {
      toast.error(t("agentCreator.taskCreateFailed"));
      console.error(error);
      setIsLoading(false);
    }
  };

  const formatParams = (params: Record<string, any>) => {
    const lines = [];
    if (params.words) {
      lines.push(t("agentCreator.paramWords", { value: Array.isArray(params.words) ? params.words.join(", ") : params.words }));
    }
    if (params.difficulty) {
      const difficultyMap: Record<string, string> = {
        easy: t("agentCreator.difficultyEasy"),
        medium: t("agentCreator.difficultyMedium"),
        hard: t("agentCreator.difficultyHard"),
      };
      lines.push(t("agentCreator.paramDifficulty", { value: difficultyMap[params.difficulty] || params.difficulty }));
    }
    if (params.sentence_level) {
      const levelMap: Record<string, string> = {
        simple: t("agentCreator.sentenceSimple"),
        complex: t("agentCreator.sentenceComplex"),
      };
      lines.push(t("agentCreator.paramSentence", { value: levelMap[params.sentence_level] || params.sentence_level }));
    }
    if (params.repetitions) {
      lines.push(t("agentCreator.paramRepetitions", { value: params.repetitions }));
    }
    if (params.style) {
      const styleMap: Record<string, string> = {
        anime: t("agentCreator.styleAnime"),
        realism: t("agentCreator.styleRealism"),
        disney: t("agentCreator.styleDisney"),
      };
      lines.push(t("agentCreator.paramStyle", { value: styleMap[params.style] || params.style }));
    }
    return lines.join("\n");
  };

  const getFormInitialValues = (intentResult: IntentResponse) => {
    const config = getFormConfig(intentResult.intent);
    if (!config) return {};
    return paramsToFormValues(config, intentResult.extracted_params);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDBCB4]/20 via-[#ADD8E6]/20 to-white">
      {/* 装饰性渐变球 */}
      <div className="pointer-events-none absolute -left-10 -top-10 h-64 w-64 rounded-full bg-[#FDBCB4]/20 blur-3xl" />
      <div className="pointer-events-none absolute right-10 top-24 h-72 w-72 rounded-full bg-[#ADD8E6]/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-[#22C55E]/20 blur-3xl" />

      <div className="relative z-10 container mx-auto max-w-4xl px-4 py-8">
        {/* 标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#22C55E] to-[#ADD8E6] bg-clip-text text-transparent flex items-center justify-center gap-3">
            <Sparkles className="w-8 h-8 text-[#22C55E]" />
            {t("agentCreator.title")}
          </h1>
          <p className="text-gray-600 mt-2">{t("agentCreator.subtitle")}</p>
        </div>

        {/* 聊天区域 */}
        <Card className="claymorphism mb-4">
          <CardContent className="p-0">
            <ScrollArea className="h-[500px] px-6 py-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-3",
                      message.role === "user" ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    {/* 头像 */}
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                        message.role === "user"
                          ? "bg-gradient-to-r from-[#FDBCB4] to-[#F9A899]"
                          : "bg-gradient-to-r from-[#22C55E] to-[#ADD8E6]"
                      )}
                    >
                      {message.role === "user" ? (
                        <User className="w-5 h-5 text-white" />
                      ) : (
                        <Bot className="w-5 h-5 text-white" />
                      )}
                    </div>

                    {/* 消息内容 */}
                    <div
                      className={cn(
                        "max-w-[80%] space-y-3",
                        message.role === "user" ? "items-end" : "items-start"
                      )}
                    >
                      <div
                        className={cn(
                          "rounded-2xl px-4 py-3 whitespace-pre-wrap",
                          message.role === "user"
                            ? "bg-gradient-to-r from-[#FDBCB4] to-[#F9A899] text-white"
                            : "bg-white shadow-md"
                        )}
                      >
                        {message.content}
                      </div>

                      {/* 动态表单或跳转按钮 */}
                      {message.showForm && message.intentResult && (
                        <div className="w-full max-w-md">
                          {message.isRedirect ? (
                            <Card className="p-4">
                              <Button
                                onClick={() => router.push(message.intentResult?.legacy_url || "/create-dynamic-comic")}
                                className="w-full bg-gradient-to-r from-[#22C55E] to-[#ADD8E6] hover:from-[#16A34A] hover:to-[#87CEEB]"
                              >
                                {t("agentCreator.goToCreationPage")}
                                <ArrowRight className="ml-2 w-4 h-4" />
                              </Button>
                            </Card>
                          ) : (
                            (() => {
                              const config = getFormConfig(message.intentResult.intent);
                              if (!config) return null;
                              return (
                                <DynamicForm
                                  config={config}
                                  initialValues={getFormInitialValues(message.intentResult)}
                                  onSubmit={handleFormSubmit}
                                  isLoading={isLoading}
                                />
                              );
                            })()
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* 加载中指示器 */}
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#22C55E] to-[#ADD8E6] flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="bg-white shadow-md rounded-2xl px-4 py-3">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* 输入区域 */}
        <Card className="claymorphism">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Input
                placeholder={t("agentCreator.inputPlaceholder")}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isLoading}
                className="flex-1 h-12 bg-white/80 border-0 shadow-inner"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="h-12 px-6 bg-gradient-to-r from-[#22C55E] to-[#ADD8E6] hover:from-[#16A34A] hover:to-[#87CEEB]"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
