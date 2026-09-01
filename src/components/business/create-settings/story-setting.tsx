"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { useTranslations } from "next-intl";
import { CustomTabs } from "@/components/ui/custom-tabs";
import { NovelSelect } from "../novel-select";
import { Novel, Chapter } from "@/types";
import { ArrowRight, X, Check, FileText, Settings, Bot, Wrench } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import creationApi from "@/lib/api/creation";
import { toast } from "sonner";
import { CreationStatus } from "@/types/creation";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useTaskSubmission } from "@/hooks/use-task-submission";
import { novelApi } from "@/lib/api/novel";
import LoadingIcon from "@/components/ui/loading-icon";
import modelConfigApi, { IModelConfig } from "@/lib/api/model-config";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function StorySetting() {
  const t = useTranslations()
  const tSB = useTranslations("storyboard");
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params?.locale as string;
  const novelIdFromUrl = searchParams?.get("novel") || "";
  const chapterIdFromUrl = searchParams?.get("chapter") || "";
  const [selectedNovel, setSelectedNovel] = useState<Novel | null>(null);
  const [selectedChapters, setSelectedChapters] = useState<Chapter[]>([]);
  const [creationId, setCreationId] = useState<string | null>(null);
  const [isLoadingFromUrl, setIsLoadingFromUrl] = useState(false);

  // 模型配置状态
  const [llmModel, setLlmModel] = useState<string>("");
  const [textToImageModel, setTextToImageModel] = useState<string>("");
  const [imageToImageModel, setImageToImageModel] = useState<string>("");
  const [videoModel, setVideoModel] = useState<string>("");
  const [narrationMode, setNarrationMode] = useState<"original" | "rewrite">("original");
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16">("16:9");
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [creationMode, setCreationMode] = useState<"professional" | "agent">("professional");

  // 获取模型配置列表
  const { data: modelConfigsData } = useQuery({
    queryKey: ["modelConfigs"],
    queryFn: () => modelConfigApi.getAllModels(),
  });

  const modelConfigs = modelConfigsData?.data || {
    llm: [],
    text_to_image: [],
    image_to_image: [],
    video: [],
  };

  const llmModels = modelConfigs?.llm || [];
  const textToImageModels = modelConfigs?.text_to_image || [];
  const imageToImageModels = modelConfigs?.image_to_image || [];
  const videoModels = modelConfigs?.video || [];

  // 初始化默认模型
  useEffect(() => {
    if (llmModels.length > 0 && !llmModel) {
      const defaultLlm = llmModels.find((m) => m.is_default) || llmModels[0];
      setLlmModel(defaultLlm.model_name);
    }
    if (textToImageModels.length > 0 && !textToImageModel) {
      const defaultTextToImage = textToImageModels.find((m) => m.is_default) || textToImageModels[0];
      setTextToImageModel(defaultTextToImage.model_name);
    }
    if (imageToImageModels.length > 0 && !imageToImageModel) {
      const defaultImageToImage = imageToImageModels.find((m) => m.is_default) || imageToImageModels[0];
      setImageToImageModel(defaultImageToImage.model_name);
    }
    if (videoModels.length > 0 && !videoModel) {
      const defaultVideo = videoModels.find((m) => m.is_default) || videoModels[0];
      setVideoModel(defaultVideo.model_name);
    }
  }, [llmModels, textToImageModels, imageToImageModels, videoModels, llmModel, textToImageModel, imageToImageModel, videoModel]);
  const { data: creation, isLoading } = useQuery({
    queryKey: ["creation", creationId],
    queryFn: () => creationApi.queryCreationById(creationId as string),
    enabled: !!creationId,
    refetchInterval: (query) => {
      if (query.state.data?.data?.status === CreationStatus.CREATED) {
        return false;
      }
      return 2000;
    },
  });

  // 从URL参数加载小说和章节
  const { data: novelFromUrl } = useQuery({
    queryKey: ["novel", novelIdFromUrl],
    queryFn: () => novelApi.getNovel(novelIdFromUrl),
    enabled: !!novelIdFromUrl && !selectedNovel,
  });

  // 当从URL加载到小说数据时，自动选中
  useEffect(() => {
    if (novelIdFromUrl && novelFromUrl && !selectedNovel) {
      const novelData = (novelFromUrl as any)?.data?.data || (novelFromUrl as any)?.data;
      if (novelData) {
        setSelectedNovel(novelData as Novel);
        setIsLoadingFromUrl(true);
      }
    }
  }, [novelIdFromUrl, novelFromUrl, selectedNovel]);

  // 当小说选中后，自动选中章节
  useEffect(() => {
    if (selectedNovel && chapterIdFromUrl && selectedChapters.length === 0) {
      setIsLoadingFromUrl(true);

      const chapters = (selectedNovel as any)?.chapters || [];
      const targetChapter = chapters.find((chapter: Chapter) => {
        // 同时匹配uuid和chapter_id，以支持新旧数据
        const uuid = String((chapter as any).uuid || "");
        const id = String((chapter as any).chapter_id || chapter.chapter_id || "");
        return uuid === String(chapterIdFromUrl) || id === String(chapterIdFromUrl);
      });

      if (targetChapter) {
        // 如果小说数据中有章节，直接使用
        setSelectedChapters([targetChapter]);
        setIsLoadingFromUrl(false);
      } else {
        // 直接通过章节UUID获取单个章节详情
        novelApi.getChapter((selectedNovel.uuid || selectedNovel.novel_id) as string, chapterIdFromUrl)
          .then((response: any) => {
            const chapterData = response?.data?.data || response?.data;
            if (chapterData) {
              // 确保章节数据完整
              const fullChapter: Chapter = {
                ...chapterData,
                uuid: chapterData.uuid || chapterData.chapter_id || chapterData.chapterId || chapterIdFromUrl,
                chapter_id: chapterData.chapter_id || chapterData.chapterId || chapterIdFromUrl,
                title: chapterData.title || tSB("unknownChapter"),
                chapter_number: chapterData.chapter_number || chapterData.chapterNumber || 0,
              };
              setSelectedChapters([fullChapter]);
            } else {
              console.error("获取章节详情失败：返回数据为空");
              toast.error(tSB("fetchChapterFailed"));
            }
            setIsLoadingFromUrl(false);
          })
          .catch((error) => {
            console.error("获取章节详情失败:", error);
            toast.error(tSB("fetchChapterError"));
            setIsLoadingFromUrl(false);
          });
      }
    } else if (!chapterIdFromUrl) {
      setIsLoadingFromUrl(false);
    }
  }, [selectedNovel, chapterIdFromUrl, selectedChapters.length]);

  // 注意：创建创作后的跳转已经在 createCreationMutation.onSuccess 中处理了
  // 这里不再需要 useEffect 监听，避免重复跳转

  const handleNovelChange = (novel: Novel | null) => {
    setSelectedNovel(novel);
    setSelectedChapters([]); // 清空章节选择
  };

  const handleChaptersChange = (chapters: Chapter[]) => {
    setSelectedChapters(chapters);
  };

  // 创建视频创作的 mutation
  const createCreationMutation = useMutation({
    mutationFn: ({ novelId, chapterIds, extraData }: { novelId: string; chapterIds: string[]; extraData?: any }) =>
      creationApi.createCreation({ novelId, chapterId: chapterIds[0], extraData }),
    onSuccess: (response: any) => {
      // 优先使用UUID，如果没有则使用creation_id
      const newCreationUuid = response?.data?.uuid || response?.data?.data?.uuid;
      const newCreationId = response?.data?.creation_id || response?.data?.data?.creation_id || response?.data || response;
      const creationIdToUse = newCreationUuid || String(newCreationId);

      if (creationIdToUse) {
        setCreationId(creationIdToUse);
        toast.success(t("creation.characterAnalysisStart") || tSB("analyzing"));
        // 根据创作模式跳转到不同页面
        if (creationMode === "agent") {
          router.replace(`/create-agent?creationId=${creationIdToUse}`);
        } else {
          router.replace(`/dynamic-comic-editor?taskId=${creationIdToUse}`);
        }
      } else {
        throw new Error(t("creation.taskIdNotFound") || tSB("missingCreationId"));
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || t("errors.generationFailed"));
      console.error("ICreation error:", error);
    },
  });

  // 分析内容的内部函数
  const analyseContentInternal = useCallback(async () => {
    // 验证是否选择了小说和章节
    if (!selectedNovel) {
      toast.error(t("novel.noNovels"));
      throw new Error(t("novel.noNovels"));
    }

    if (selectedChapters.length === 0) {
      toast.error(t("novel.chapters"));
      throw new Error(t("novel.chapters"));
    }

    const chapterUuid = (selectedChapters[0] as any).uuid || selectedChapters[0].chapter_id;

    // 先检查该章节是否已有创作
    try {
      const existingCreation = await creationApi.queryCreationByChapterId(chapterUuid);
      if (existingCreation?.data) {
        // 如果已有创作，根据选择的模式跳转
        const creationUuid = (existingCreation.data as any).uuid || existingCreation.data.creation_id;
        if (creationMode === "agent") {
          router.replace(`/create-agent?creationId=${creationUuid}`);
        } else {
          router.replace(`/dynamic-comic-editor?taskId=${creationUuid}`);
        }
        return; // 直接返回，不创建新创作
      }
    } catch (error) {
      // 查询失败不影响创建流程，继续创建新创作
      // 静默处理，不输出错误日志
    }

    // 检查LLM调用积分（创建创作会触发LLM调用生成剧本）
    const { checkAndNotifyPoints } = await import('@/lib/utils/points-check')
    const pointsAvailable = await checkAndNotifyPoints(
      {
        operation_type: 'llm_call',
        model_name: 'Qwen/Qwen-Plus',
        estimated_prompt_tokens: 5000,
        estimated_completion_tokens: 10000,
      },
      t
    )

    if (!pointsAvailable) {
      throw new Error(tSB('missingCreationId'))
    }

    // 构建 extra_data
    const extraData = {
      llm_model: llmModel,
      text_to_image_model: textToImageModel,
      image_to_image_model: imageToImageModel,
      video_model: videoModel,
      narration_mode: narrationMode,
      aspect_ratio: aspectRatio,
    };

    // 调用创建接口
    return new Promise<void>((resolve, reject) => {
      createCreationMutation.mutate(
        {
          // 确保使用 UUID 而不是 ID
          novelId: selectedNovel.uuid as string,
          chapterIds: selectedChapters.map((chapter) => (chapter as any).uuid || chapter.chapter_id) as string[],
          extraData,
        },
        {
          onSuccess: () => resolve(),
          onError: (error) => reject(error),
        }
      );
    });
  }, [selectedNovel, selectedChapters, t, createCreationMutation, router, locale, llmModel, textToImageModel, imageToImageModel, videoModel, narrationMode, aspectRatio, creationMode]);

  // 使用任务提交 hook 包装分析函数
  const { submit: analyseContent, isSubmitting: isSubmittingAnalysis } = useTaskSubmission(
    analyseContentInternal,
    {
      debounceDelay: 500,
      enableDebounce: true,
      onError: (error) => {
        console.error('积分检查失败:', error);
        // 错误已经在 analyseContentInternal 中处理了
      },
    }
  );

  const handleResetNovel = () => {
    setSelectedNovel(null);
    setSelectedChapters([]);
  };

  // 渲染选中的章节信息（小尺寸，放在按钮左边）
  const renderSelectedChapterInfo = () => {
    if (selectedChapters.length === 0) {
      return null;
    }

    const selectedChapter = selectedChapters[0];

    return (
      <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] flex-1 min-w-0">
        <div className="w-5 h-5 rounded-xl bg-gradient-to-r from-[#FDBCB4] to-[#ADD8E6] flex items-center justify-center flex-shrink-0 shadow-[2px_2px_8px_rgba(0,0,0,0.1),-1px_-1px_4px_rgba(255,255,255,0.8)]">
          <Check className="w-3 h-3 text-white" />
        </div>
        <Badge
          variant="secondary"
          className="text-[10px] px-2 py-1 rounded-full bg-gradient-to-r from-[#FDBCB4]/20 to-[#ADD8E6]/20 text-gray-700 h-5 flex-shrink-0 shadow-[2px_2px_8px_rgba(0,0,0,0.1),-1px_-1px_4px_rgba(255,255,255,0.8)]"
        >
          {t("novelDetail.chapterNumber", { number: selectedChapter.chapter_number || "" })}
        </Badge>
        <span className="text-xs font-medium text-gray-800 truncate min-w-0 flex-1">
          {selectedChapter.title}
        </span>
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col h-[calc(100vh-200px)] relative">
      {/* 装饰性背景 */}
      <div className="absolute -top-20 -left-20 w-60 h-60 bg-blue-400/10 dark:bg-blue-400/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute -top-20 -right-20 w-60 h-60 bg-purple-400/10 dark:bg-purple-400/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <Card className="relative z-10 w-full border-0 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:shadow-[6px_6px_16px_rgba(0,0,0,0.1),-6px_-6px_16px_rgba(255,255,255,0.9)] transition-all duration-300 rounded-2xl bg-gradient-to-br from-white to-blue-50 p-0 gap-3 flex flex-col flex-1 min-h-0">
        <CardContent className="space-y-4 flex flex-col flex-1 min-h-0 overflow-hidden p-6">
          {/** 添加Tabs切换，有两个选项"从小说列表中选择"和"上传小说" */}
          <div className="text-lg font-bold bg-gradient-to-r from-[#FDBCB4] to-[#ADD8E6] bg-clip-text text-transparent flex-shrink-0 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#ADD8E6]" />
            {t("createVideo.selectScript")}
          </div>

          {/* 显示加载状态 */}
          {isLoadingFromUrl && (
            <div className="flex items-center justify-center gap-2 py-4 flex-shrink-0">
              <LoadingIcon />
              <span className="text-sm text-secondary">{t("common.loading")}</span>
            </div>
          )}

          <div className="flex flex-col flex-1 min-h-0">
            <CustomTabs
              variant="grid"
              size="md"
              defaultValue="novel"
              className="gap-0 flex flex-col flex-1 min-h-0"
              tabsListClassName="p-0 rounded-b-none flex-shrink-0"
              tabsTriggerClassName="rounded-b-none hover:scale-105 transition-all duration-200"
              tabsContentClassName="bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] mt-0 px-3 py-4 mt-[-1px] rounded-b-xl flex-1 min-h-0 overflow-hidden flex flex-col"
              onValueChange={(value) => { }}
              items={[
                {
                  value: "novel",
                  label: t("createVideo.novelAdaptation"),
                  content: (
                    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                        <NovelSelect
                          selectedNovel={selectedNovel}
                          selectedChapters={selectedChapters}
                          onNovelChange={handleNovelChange}
                          onChaptersChange={handleChaptersChange}
                          novelFixedClassName="border-none bg-gray-100 dark:bg-stone-700/60"
                          chapterClassName="border-none p-0"
                          fixedAction={
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={handleResetNovel}
                              className="text-gray-700 text-xs bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:shadow-lg transition-all duration-200 hover:scale-105 rounded-xl"
                            >
                              <X className="w-3 h-3 text-[#FDBCB4]" />
                              {t("createVideo.reset")}
                            </Button>
                          }
                        />
                      </div>
                      {selectedChapters.length > 0 && (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 pt-4 pb-2 flex-shrink-0 border-t-2 border-blue-200/30 dark:border-blue-700/30 px-2">
                          <div className="w-full sm:flex-1 sm:min-w-0">
                            {renderSelectedChapterInfo()}
                          </div>

                          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 w-full sm:w-auto">
                            {/* 模式选择 */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <div className="flex rounded-xl overflow-hidden border border-gray-200 shadow-[2px_2px_8px_rgba(0,0,0,0.08),-2px_-2px_8px_rgba(255,255,255,0.8)]">
                                <button
                                  type="button"
                                  onClick={() => setCreationMode("professional")}
                                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all ${
                                    creationMode === "professional"
                                      ? "bg-gradient-to-r from-[#FDBCB4] to-[#ADD8E6] text-white"
                                      : "bg-white text-gray-600 hover:bg-gray-50"
                                  }`}
                                >
                                  <Wrench className="w-3.5 h-3.5" />
                                  {tSB("proMode")}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setCreationMode("agent")}
                                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all ${
                                    creationMode === "agent"
                                      ? "bg-gradient-to-r from-[#22C55E] to-[#ADD8E6] text-white"
                                      : "bg-white text-gray-600 hover:bg-gray-50"
                                  }`}
                                >
                                  <Bot className="w-3.5 h-3.5" />
                                  Agent
                                </button>
                              </div>
                            </div>

                            {/* 配置按钮 */}
                            <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="lg"
                                  className="flex-1 sm:flex-initial rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 hover:border-[#ADD8E6]/50 transition-all duration-200 hover:scale-105 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)]"
                                >
                                  <Settings className="w-4 h-4 mr-2 text-[#ADD8E6]" />
                                  {t("creation.config") || tSB("config")}
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[600px] max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col p-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-white/10">
                                <div className="overflow-y-auto flex-1 px-6 py-5">
                                  <DialogHeader className="mb-6">
                                    <div className="flex items-center gap-3 mb-2">
                                      <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
                                        <Settings className="w-5 h-5 text-amber-400" />
                                      </div>
                                      <DialogTitle className="text-2xl font-bold text-white">
                                        {t("creation.modelConfig") || tSB("creationConfig")}
                                      </DialogTitle>
                                    </div>
                                    <DialogDescription className="text-slate-400 text-sm">
                                      {t("creation.modelConfigDescription") || tSB("creationConfigDesc")}
                                    </DialogDescription>
                                  </DialogHeader>

                                  <div className="space-y-5">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                      {/* 创作比例选择 */}
                                      <div className="space-y-3 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                                        <Label className="text-sm font-semibold text-white flex items-center gap-2">
                                          <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
                                          {t("creation.aspectRatio") || tSB("aspectRatioConfig")}
                                        </Label>
                                        <Select value={aspectRatio} onValueChange={(value: "16:9" | "9:16") => setAspectRatio(value)}>
                                          <SelectTrigger className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10">
                                            <SelectValue placeholder={t("creation.selectAspectRatio") || tSB("selectRatio")} />
                                          </SelectTrigger>
                                          <SelectContent className="bg-slate-800 border-white/10">
                                            <SelectItem value="16:9" className="text-white hover:bg-white/10">
                                              {t("creation.landscape") || tSB("landscape")}
                                            </SelectItem>
                                            <SelectItem value="9:16" className="text-white hover:bg-white/10">
                                              {t("creation.portrait") || tSB("portrait")}
                                            </SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <div className="text-xs text-slate-400 pt-1">
                                          <p className="text-slate-300">
                                            {aspectRatio === "16:9" 
                                              ? (t("creation.landscapeDesc") || tSB("landscapeDesc")) 
                                              : (t("creation.portraitDesc") || tSB("portraitDesc"))}
                                          </p>
                                        </div>
                                      </div>

                                      {/* LLM 模型选择 */}
                                      <div className="space-y-3 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                                        <Label className="text-sm font-semibold text-white flex items-center gap-2">
                                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                                          {t("creation.llmModel") || tSB("textToTextModel")}
                                        </Label>
                                        <Select value={llmModel} onValueChange={setLlmModel}>
                                          <SelectTrigger className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10">
                                            <SelectValue placeholder={t("creation.selectModel") || tSB("selectModel")} />
                                          </SelectTrigger>
                                          <SelectContent className="bg-slate-800 border-white/10">
                                            {llmModels.map((model) => (
                                              <SelectItem key={model.model_name} value={model.model_name} className="text-white hover:bg-white/10">
                                                {model.display_name}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        {llmModel && (() => {
                                          const selectedModel = llmModels.find(m => m.model_name === llmModel);
                                          return selectedModel && (
                                            <div className="text-xs text-slate-400 space-y-1.5 pt-2 border-t border-white/10">
                                              {selectedModel.description && (
                                                <p className="text-slate-300 line-clamp-1">{selectedModel.description}</p>
                                              )}
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <span className="whitespace-nowrap">
                                                  {t("creation.maxTokens") || tSB("maxToken")}: <span className="text-white font-medium">{selectedModel.config?.max_tokens || "-"}</span>
                                                </span>
                                              </div>
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    </div>

                                    {/* 文生图模型选择 */}
                                    <div className="space-y-3 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                                      <Label className="text-sm font-semibold text-white flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div>
                                        {t("creation.textToImageModel") || tSB("textToImageModel")}
                                      </Label>
                                      <Select value={textToImageModel} onValueChange={setTextToImageModel}>
                                        <SelectTrigger className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10">
                                          <SelectValue placeholder={t("creation.selectModel") || tSB("selectModel")} />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-800 border-white/10">
                                          {textToImageModels.map((model) => (
                                            <SelectItem key={model.model_name} value={model.model_name} className="text-white hover:bg-white/10">
                                              {model.display_name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      {textToImageModel && (() => {
                                        const selectedModel = textToImageModels.find(m => m.model_name === textToImageModel);
                                        return selectedModel && (
                                          <div className="text-xs text-slate-400 space-y-1.5 pt-2 border-t border-white/10">
                                            {selectedModel.description && (
                                              <p className="text-slate-300">{selectedModel.description}</p>
                                            )}
                                            <div className="flex items-center gap-4 flex-wrap">
                                              <span>
                                                {t("creation.aspectRatio") || tSB("aspectRatioShort")}: <span className="text-white font-medium">{selectedModel.config?.aspect_ratio || "-"}</span>
                                              </span>
                                              <span>
                                                {t("creation.supportedLanguages") || tSB("supportedLanguages")}: <span className="text-white font-medium">{Array.isArray(selectedModel.config?.languages) ? selectedModel.config.languages.join(", ") : "-"}</span>
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      })()}
                                    </div>

                                    {/* 图生图模型选择 */}
                                    <div className="space-y-3 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                                      <Label className="text-sm font-semibold text-white flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-pink-400"></div>
                                        {t("creation.imageToImageModel") || tSB("imageToImageModel")}
                                      </Label>
                                      <Select value={imageToImageModel} onValueChange={setImageToImageModel}>
                                        <SelectTrigger className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10">
                                          <SelectValue placeholder={t("creation.selectModel") || tSB("selectModel")} />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-800 border-white/10">
                                          {imageToImageModels.map((model) => (
                                            <SelectItem key={model.model_name} value={model.model_name} className="text-white hover:bg-white/10">
                                              {model.display_name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      {imageToImageModel && (() => {
                                        const selectedModel = imageToImageModels.find(m => m.model_name === imageToImageModel);
                                        return selectedModel && (
                                          <div className="text-xs text-slate-400 space-y-1.5 pt-2 border-t border-white/10">
                                            {selectedModel.description && (
                                              <p className="text-slate-300">{selectedModel.description}</p>
                                            )}
                                            <div className="flex items-center gap-4 flex-wrap">
                                              <span>
                                                {t("creation.aspectRatio") || tSB("aspectRatioShort")}: <span className="text-white font-medium">{selectedModel.config?.aspect_ratio || "-"}</span>
                                              </span>
                                              <span>
                                                {t("creation.supportedLanguages") || tSB("supportedLanguages")}: <span className="text-white font-medium">{Array.isArray(selectedModel.config?.languages) ? selectedModel.config.languages.join(", ") : "-"}</span>
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      })()}
                                    </div>

                                    {/* 视频模型选择 */}
                                    <div className="space-y-3 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                                      <Label className="text-sm font-semibold text-white flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400"></div>
                                        {t("creation.videoModel") || tSB("videoModel")}
                                      </Label>
                                      <Select value={videoModel} onValueChange={setVideoModel}>
                                        <SelectTrigger className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10">
                                          <SelectValue placeholder={t("creation.selectModel") || tSB("selectModel")} />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-800 border-white/10">
                                          {videoModels.map((model) => (
                                            <SelectItem key={model.model_name} value={model.model_name} className="text-white hover:bg-white/10">
                                              {model.display_name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      {videoModel && (() => {
                                        const selectedModel = videoModels.find(m => m.model_name === videoModel);
                                        return selectedModel && (
                                          <div className="text-xs text-slate-400 space-y-1.5 pt-2 border-t border-white/10">
                                            {selectedModel.description && (
                                              <p className="text-slate-300">{selectedModel.description}</p>
                                            )}
                                            <div className="flex items-center gap-4 flex-wrap">
                                              <span>
                                                {t("creation.videoDuration") || tSB("videoDuration")}: <span className="text-white font-medium">{selectedModel.config?.durations?.[0] || "-"}s</span>
                                              </span>
                                              <span>
                                                {t("creation.aspectRatio") || tSB("aspectRatioShort")}: <span className="text-white font-medium">{selectedModel.config?.aspect_ratio || "-"}</span>
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      })()}
                                    </div>

                                    {/* 解说词模式选择 */}
                                    <div className="space-y-3 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                                      <Label className="text-sm font-semibold text-white flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
                                        {t("creation.narrationMode") || tSB("narrationMode")}
                                      </Label>
                                      <Select value={narrationMode} onValueChange={(value) => setNarrationMode(value as "original" | "rewrite")}>
                                        <SelectTrigger className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-800 border-white/10">
                                          <SelectItem value="original" className="text-white hover:bg-white/10">
                                            {t("creation.originalMode") || tSB("originalMode")}
                                          </SelectItem>
                                          <SelectItem value="rewrite" className="text-white hover:bg-white/10">
                                            {t("creation.rewriteMode") || tSB("fastPacedMode")}
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <div className="text-xs text-slate-400 pt-2 border-t border-white/10">
                                        {narrationMode === "original" ? (
                                          <p className="text-slate-300">{t("creation.originalModeDesc") || tSB("originalModeDesc")}</p>
                                        ) : (
                                          <p className="text-slate-300">{t("creation.rewriteModeDesc") || tSB("fastPacedModeDesc")}</p>
                                        )}
                                      </div>
                                    </div>

                                    {/* 创作比例选择 */}
                                    <div className="space-y-3 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                                      <Label className="text-sm font-semibold text-white flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                                        {t("createVideo.aspectRatio") || tSB("aspectRatioConfig")}
                                      </Label>
                                      <Select value={aspectRatio} onValueChange={(value) => setAspectRatio(value as "16:9" | "9:16")}>
                                        <SelectTrigger className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-800 border-white/10">
                                          <SelectItem value="16:9" className="text-white hover:bg-white/10">
                                            {t("createVideo.landscape") || tSB("landscape")}
                                          </SelectItem>
                                          <SelectItem value="9:16" className="text-white hover:bg-white/10">
                                            {t("createVideo.portrait") || tSB("portrait")}
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <div className="text-xs text-slate-400 pt-2 border-t border-white/10">
                                        {aspectRatio === "16:9" ? (
                                          <p className="text-slate-300">{t("createVideo.landscapeDesc") || tSB("landscapeCompat")}</p>
                                        ) : (
                                          <p className="text-slate-300">{t("createVideo.portraitDesc") || tSB("portraitCompat")}</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex-shrink-0 px-6 py-4 border-t border-white/10 bg-slate-900/50">
                                  <Button
                                    onClick={() => setIsConfigDialogOpen(false)}
                                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium"
                                  >
                                    {t("common.confirm") || tSB("confirm")}
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>

                            {/* 下一步按钮 */}
                            <Button
                              variant="default"
                              size="lg"
                              onClick={() => analyseContent()}
                              disabled={createCreationMutation.isPending || isLoading || isSubmittingAnalysis}
                              className="bg-gradient-to-r from-[#FDBCB4] to-[#ADD8E6] hover:from-[#F9A899] hover:to-[#93C5FD] text-gray-800 shadow-[4px_4px_12px_rgba(0,0,0,0.1),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:shadow-[6px_6px_16px_rgba(0,0,0,0.15),-6px_-6px_16px_rgba(255,255,255,0.9)] transition-all duration-200 hover:scale-105 rounded-xl flex-shrink-0"
                            >
                              {createCreationMutation.isPending || isLoading || isSubmittingAnalysis ? t("createVideo.analyzingContent") : t("createVideo.analyzeCharacters")}
                              <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ),
                },
                {
                  value: "list",
                  label: t("createVideo.aiGeneration"),
                  content: <div>{t("createVideo.planning")}</div>,
                },
              ]}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
