"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { useTranslations } from "next-intl";
import { CustomTabs } from "@/components/ui/custom-tabs";
import { NovelSelect } from "../novel-select";
import { Novel, Chapter } from "@/types";
import { ArrowRight, X, Check, FileText, Settings } from "lucide-react";
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
  const t = useTranslations("");
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
  const [narrationMode, setNarrationMode] = useState<"original" | "rewrite">("original");
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  
  // 获取模型配置列表
  const { data: modelConfigsData } = useQuery({
    queryKey: ["modelConfigs"],
    queryFn: () => modelConfigApi.getAllModels(),
  });
  
  const modelConfigs = modelConfigsData?.data || {
    llm: [],
    text_to_image: [],
    image_to_image: [],
  };
  
  // 初始化默认模型
  useEffect(() => {
    if (modelConfigs.llm.length > 0 && !llmModel) {
      const defaultLlm = modelConfigs.llm.find((m) => m.is_default) || modelConfigs.llm[0];
      setLlmModel(defaultLlm.model_name);
    }
    if (modelConfigs.text_to_image.length > 0 && !textToImageModel) {
      const defaultTextToImage = modelConfigs.text_to_image.find((m) => m.is_default) || modelConfigs.text_to_image[0];
      setTextToImageModel(defaultTextToImage.model_name);
    }
    if (modelConfigs.image_to_image.length > 0 && !imageToImageModel) {
      const defaultImageToImage = modelConfigs.image_to_image.find((m) => m.is_default) || modelConfigs.image_to_image[0];
      setImageToImageModel(defaultImageToImage.model_name);
    }
  }, [modelConfigs, llmModel, textToImageModel, imageToImageModel]);
  const {data: creation, isLoading} = useQuery({
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
                title: chapterData.title || "未知章节",
                chapter_number: chapterData.chapter_number || chapterData.chapterNumber || 0,
              };
              setSelectedChapters([fullChapter]);
            } else {
              console.error("获取章节详情失败：返回数据为空");
              toast.error("获取章节详情失败");
            }
            setIsLoadingFromUrl(false);
          })
          .catch((error) => {
            console.error("获取章节详情失败:", error);
            toast.error("获取章节详情失败，请重试");
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
        toast.success(t("creation.characterAnalysisStart") || "开始分析章节内容...");
        // 跳转到创作页面，显示分析进度
        router.replace(`/${locale}/create?creationId=${creationIdToUse}`);
      } else {
        throw new Error(t("creation.taskIdNotFound") || "未获取到创作ID");
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
        // 如果已有创作，直接跳转到该创作
        const creationUuid = (existingCreation.data as any).uuid || existingCreation.data.creation_id;
        router.replace(`/${locale}/create?creationId=${creationUuid}`);
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
      throw new Error('积分不足')
    }

    // 构建 extra_data
    const extraData = {
      llm_model: llmModel,
      text_to_image_model: textToImageModel,
      image_to_image_model: imageToImageModel,
      narration_mode: narrationMode,
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
  }, [selectedNovel, selectedChapters, t, createCreationMutation, router, locale]);

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
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 flex-1 min-w-0">
        <div className="w-4 h-4 rounded bg-orange-500 flex items-center justify-center flex-shrink-0">
          <Check className="w-2.5 h-2.5 text-white" />
        </div>
        <Badge
          variant="secondary"
          className="text-[10px] px-1 py-0 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 h-4 flex-shrink-0"
        >
          {t("novelDetail.chapterNumber", { number: selectedChapter.chapter_number || "" })}
        </Badge>
        <span className="text-xs font-medium text-orange-800 dark:text-orange-300 truncate min-w-0 flex-1">
          {selectedChapter.title}
        </span>
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col h-[calc(100vh-200px)]">
      <Card className="w-full border-none p-0 gap-3 flex flex-col flex-1 min-h-0">
        <CardContent className="space-y-4 flex flex-col flex-1 min-h-0 overflow-hidden">
          {/** 添加Tabs切换，有两个选项"从小说列表中选择"和"上传小说" */}
          <div className="text-base font-bold text-gray-700 dark:text-gray-300 flex-shrink-0">{t("createVideo.selectScript")}</div>
          
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
              tabsTriggerClassName="rounded-b-none"
              tabsContentClassName="bg-white dark:data-[state=active]:bg-zinc-800 dark:bg-gray-700/30 mt-0 px-3 py-4 mt-[-1px] rounded-b-lg flex-1 min-h-0 overflow-hidden flex flex-col"
              onValueChange={(value) => {}}
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
                              className="text-secondary text-xs"
                            >
                              <X className="w-3 h-3" />
                              {t("createVideo.reset")}
                            </Button>
                          }
                        />
                      </div>
                      {selectedChapters.length > 0 && (
                        <div className="flex items-center gap-3 pt-4 pb-2 flex-shrink-0 border-t border-gray-200 dark:border-gray-700 px-2">
                          {renderSelectedChapterInfo()}
                          
                          {/* 配置按钮 */}
                          <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="lg"
                                className="flex-shrink-0"
                              >
                                <Settings className="w-4 h-4 mr-2" />
                                {t("creation.config") || "配置"}
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle className="text-xl font-semibold">
                                  {t("creation.modelConfig") || "创作配置"}
                                </DialogTitle>
                                <DialogDescription>
                                  {t("creation.modelConfigDescription") || "选择用于生成创作的模型和模式"}
                                </DialogDescription>
                              </DialogHeader>
                              
                              <div className="space-y-6 py-4">
                                {/* LLM 模型选择 */}
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t("creation.llmModel") || "文生文模型"}
                                  </Label>
                                  <Select value={llmModel} onValueChange={setLlmModel}>
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder={t("creation.selectModel") || "选择模型"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {modelConfigs.llm.map((model) => (
                                        <SelectItem key={model.model_name} value={model.model_name}>
                                          {model.display_name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {llmModel && (() => {
                                    const selectedModel = modelConfigs.llm.find(m => m.model_name === llmModel);
                                    return selectedModel && (
                                      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                                        {selectedModel.description && (
                                          <p>{selectedModel.description}</p>
                                        )}
                                        <p>
                                          {t("creation.maxTokens") || "最大Token数"}: {selectedModel.config?.max_tokens || "-"}
                                        </p>
                                        <p>
                                          {t("creation.supportedLanguages") || "支持语言"}: {Array.isArray(selectedModel.config?.languages) ? selectedModel.config.languages.join(", ") : "-"}
                                        </p>
                                      </div>
                                    );
                                  })()}
                                </div>
                                
                                {/* 文生图模型选择 */}
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t("creation.textToImageModel") || "文生图模型"}
                                  </Label>
                                  <Select value={textToImageModel} onValueChange={setTextToImageModel}>
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder={t("creation.selectModel") || "选择模型"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {modelConfigs.text_to_image.map((model) => (
                                        <SelectItem key={model.model_name} value={model.model_name}>
                                          {model.display_name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {textToImageModel && (() => {
                                    const selectedModel = modelConfigs.text_to_image.find(m => m.model_name === textToImageModel);
                                    return selectedModel && (
                                      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                                        {selectedModel.description && (
                                          <p>{selectedModel.description}</p>
                                        )}
                                        <p>
                                          {t("creation.aspectRatio") || "宽高比"}: {selectedModel.config?.aspect_ratio || "-"}
                                        </p>
                                        <p>
                                          {t("creation.supportedLanguages") || "支持语言"}: {Array.isArray(selectedModel.config?.languages) ? selectedModel.config.languages.join(", ") : "-"}
                                        </p>
                                      </div>
                                    );
                                  })()}
                                </div>
                                
                                {/* 图生图模型选择 */}
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t("creation.imageToImageModel") || "图生图模型"}
                                  </Label>
                                  <Select value={imageToImageModel} onValueChange={setImageToImageModel}>
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder={t("creation.selectModel") || "选择模型"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {modelConfigs.image_to_image.map((model) => (
                                        <SelectItem key={model.model_name} value={model.model_name}>
                                          {model.display_name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {imageToImageModel && (() => {
                                    const selectedModel = modelConfigs.image_to_image.find(m => m.model_name === imageToImageModel);
                                    return selectedModel && (
                                      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                                        {selectedModel.description && (
                                          <p>{selectedModel.description}</p>
                                        )}
                                        <p>
                                          {t("creation.aspectRatio") || "宽高比"}: {selectedModel.config?.aspect_ratio || "-"}
                                        </p>
                                        <p>
                                          {t("creation.supportedLanguages") || "支持语言"}: {Array.isArray(selectedModel.config?.languages) ? selectedModel.config.languages.join(", ") : "-"}
                                        </p>
                                      </div>
                                    );
                                  })()}
                                </div>
                                
                                {/* 解说词模式选择 */}
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t("creation.narrationMode") || "解说词模式"}
                                  </Label>
                                  <Select value={narrationMode} onValueChange={(value) => setNarrationMode(value as "original" | "rewrite")}>
                                    <SelectTrigger className="w-full">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="original">
                                        {t("creation.originalMode") || "原文模式"}
                                      </SelectItem>
                                      <SelectItem value="rewrite">
                                        {t("creation.rewriteMode") || "爽文模式"}
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                                    {narrationMode === "original" ? (
                                      <p>{t("creation.originalModeDesc") || "保持原文内容，仅进行场景分解"}</p>
                                    ) : (
                                      <p>{t("creation.rewriteModeDesc") || "改写缩短文本，使用快节奏的解说方式"}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          
                          {/* 下一步按钮 */}
                          <Button
                            variant="default"
                            size="lg"
                            onClick={() => analyseContent()}
                            disabled={createCreationMutation.isPending || isLoading || isSubmittingAnalysis}
                            className="bg-primary flex-shrink-0"
                          >
                            {createCreationMutation.isPending || isLoading || isSubmittingAnalysis ? t("createVideo.analyzingContent") : t("createVideo.analyzeCharacters")}
                            <ArrowRight className="w-4 h-4 ml-1" />
                          </Button>
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
