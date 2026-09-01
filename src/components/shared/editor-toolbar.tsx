"use client";

import { usePathname } from '@/i18n/navigation';
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  Settings,
  HelpCircle,
  Save,
  History,
  Image as ImageIcon,
  Monitor,
  Smartphone,
  Download,
  Loader2,
  Pencil,
  Bot,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ICreation } from "@/types/creation";
import creationApi from "@/lib/api/creation";
import modelConfigApi from "@/lib/api/model-config";
import { toast } from "sonner";

interface EditorToolbarProps {
  creation: ICreation | null;
  creationId: string;
  mode: "agent" | "professional";
  // 可选的回调
  onSave?: () => Promise<void>;
  onShowExportHistory?: () => void;
  onShowImageHistory?: () => void;
  onShowExportDialog?: () => void;
  onShowUsageGuide?: () => void;
  onShowTimeline?: () => void;
  showTimeline?: boolean;
  saveStatus?: "saved" | "saving" | "unsaved";
  exportProgress?: { percent: number; status: string } | null;
  // 简化模式 - 仅显示基本控件
  compact?: boolean;
}

export function EditorToolbar({
  creation,
  creationId,
  mode,
  onSave,
  onShowExportHistory,
  onShowImageHistory,
  onShowExportDialog,
  onShowUsageGuide,
  onShowTimeline,
  showTimeline = true,
  saveStatus = "saved",
  exportProgress,
  compact = false,
}: EditorToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const t = useTranslations("Editor");

  // 状态
  const [projectTitle, setProjectTitle] = useState(creation?.title || "新建项目");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16">("16:9");
  const [showModelSettings, setShowModelSettings] = useState(false);
  const [videoModel, setVideoModel] = useState<string>("");
  const [textToImageModel, setTextToImageModel] = useState<string>("");
  const [imageToImageModel, setImageToImageModel] = useState<string>("");

  // 获取模型配置
  const { data: modelConfigsData } = useQuery({
    queryKey: ["modelConfigs"],
    queryFn: () => modelConfigApi.getAllModels(),
  });

  const modelConfigs = modelConfigsData?.data || {
    video: [],
    text_to_image: [],
    image_to_image: [],
  };
  const videoModels = modelConfigs?.video || [];
  const textToImageModels = modelConfigs?.text_to_image || [];
  const imageToImageModels = modelConfigs?.image_to_image || [];

  // 初始化模型和设置
  useEffect(() => {
    if (creation) {
      setProjectTitle(creation.title || "新建项目");
      const extraData = creation.extra_data as any || {};
      if (extraData.aspect_ratio) {
        setAspectRatio(extraData.aspect_ratio as "16:9" | "9:16");
      }
      if (extraData.video_model && !videoModel) {
        setVideoModel(extraData.video_model);
      }
      if (extraData.text_to_image_model && !textToImageModel) {
        setTextToImageModel(extraData.text_to_image_model);
      }
      if (extraData.image_to_image_model && !imageToImageModel) {
        setImageToImageModel(extraData.image_to_image_model);
      }
    }
  }, [creation]);

  // 初始化默认模型
  useEffect(() => {
    if (videoModels.length > 0 && !videoModel) {
      const defaultVideo = videoModels.find((m: any) => m.is_default) || videoModels[0];
      setVideoModel(defaultVideo.model_name);
    }
    if (textToImageModels.length > 0 && !textToImageModel) {
      const defaultModel = textToImageModels.find((m: any) => m.is_default) || textToImageModels[0];
      setTextToImageModel(defaultModel.model_name);
    }
    if (imageToImageModels.length > 0 && !imageToImageModel) {
      const defaultModel = imageToImageModels.find((m: any) => m.is_default) || imageToImageModels[0];
      setImageToImageModel(defaultModel.model_name);
    }
  }, [videoModels, textToImageModels, imageToImageModels]);

  // 处理标题保存
  const handleTitleSave = async () => {
    setIsEditingTitle(false);
    if (creation?.uuid && projectTitle !== creation.title) {
      try {
        await creationApi.updateCreation(creation.uuid, { title: projectTitle });
        toast.success(t("titleUpdated") || "标题已更新");
        queryClient.invalidateQueries({ queryKey: ["creation", creationId] });
      } catch (error) {
        toast.error(t("updateFailed") || "更新失败");
        setProjectTitle(creation.title || "新建项目");
      }
    }
  };

  // 处理比例变更
  const handleAspectRatioChange = async (value: "16:9" | "9:16") => {
    setAspectRatio(value);
    if (creation?.uuid) {
      try {
        const updatedExtraData = {
          ...(creation.extra_data || {}),
          aspect_ratio: value,
        };
        await creationApi.updateCreation(creation.uuid, {
          extra_data: updatedExtraData as any,
        });
        queryClient.invalidateQueries({ queryKey: ["creation", creationId] });
      } catch (error) {
        console.error("Failed to update aspect ratio", error);
      }
    }
  };

  // 处理模型变更
  const handleModelChange = async (
    type: "video" | "text_to_image" | "image_to_image",
    newModel: string
  ) => {
    if (type === "video") setVideoModel(newModel);
    if (type === "text_to_image") setTextToImageModel(newModel);
    if (type === "image_to_image") setImageToImageModel(newModel);

    if (creation?.uuid) {
      try {
        const updatedExtraData = {
          ...(creation.extra_data || {}),
          [`${type}_model`]: newModel,
        };
        await creationApi.updateCreation(creation.uuid, {
          extra_data: updatedExtraData as any,
        });
        queryClient.invalidateQueries({ queryKey: ["creation", creationId] });
      } catch (error) {
        console.error("Failed to update model", error);
      }
    }
  };

  // 模式切换
  const handleModeSwitch = async () => {
    const targetPath =
      mode === "agent"
        ? `/dynamic-comic-editor?taskId=${creationId}`
        : `/create-agent?creationId=${creationId}`;

    await queryClient.invalidateQueries({ queryKey: ["creation", creationId] });
    router.push(targetPath);
  };

  return (
    <>
      <div className="h-14 bg-white shadow-[4px_4px_8px_rgba(173,221,230,0.3),-4px_-4px_8px_rgba(255,255,255,0.7)] px-4 pl-6 flex items-center justify-between shrink-0 z-20">
        {/* 左侧：返回按钮和标题 */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-[#ADD8E6]/30 rounded-full transition-colors text-gray-600"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <Input
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  className="h-7 text-sm bg-[#ADD8E6]/30 border-[#ADD8E6] text-gray-900 w-64"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleTitleSave();
                    if (e.key === "Escape") {
                      setProjectTitle(creation?.title || "新建项目");
                      setIsEditingTitle(false);
                    }
                  }}
                  autoFocus
                  onBlur={handleTitleSave}
                />
              </div>
            ) : (
              <div
                className="group flex items-center gap-2 cursor-pointer"
                onClick={() => setIsEditingTitle(true)}
              >
                <h1 className="text-sm font-bold text-gray-900 tracking-tight">
                  {projectTitle}
                </h1>
                <Pencil
                  size={12}
                  className="text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </div>
            )}
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">
              {mode === "agent" ? "Agent Mode" : "Dynamic Comic Editor"}
            </p>
          </div>
        </div>

        {/* 右侧：工具按钮 */}
        <div className="flex items-center gap-3">
          {/* 比例选择器 */}
          <div className="flex items-center bg-[#ADD8E6]/30 border border-[#ADD8E6] rounded-md px-1 h-8">
            <Select
              value={aspectRatio}
              onValueChange={(value) =>
                handleAspectRatioChange(value as "16:9" | "9:16")
              }
            >
              <SelectTrigger className="border-0 bg-transparent hover:bg-[#ADD8E6]/50 focus:ring-0 focus:ring-offset-0 text-gray-700 text-xs h-7 gap-2 px-2">
                <div className="flex items-center gap-1.5">
                  {aspectRatio === "16:9" ? (
                    <Monitor size={12} className="text-[#22C55E]" />
                  ) : (
                    <Smartphone size={12} className="text-[#22C55E]" />
                  )}
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-white border-[#ADD8E6] text-gray-900 min-w-[120px]">
                <SelectItem
                  value="16:9"
                  className="focus:bg-[#ADD8E6]/30 focus:text-gray-900 text-xs py-1.5 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Monitor size={12} className="text-gray-600" />
                    <span>{t("landscape") || "横版 (16:9)"}</span>
                  </div>
                </SelectItem>
                <SelectItem
                  value="9:16"
                  className="focus:bg-[#ADD8E6]/30 focus:text-gray-900 text-xs py-1.5 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Smartphone size={12} className="text-gray-600" />
                    <span>{t("portrait") || "竖版 (9:16)"}</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 模型设置按钮 */}
          <button
            className="h-9 px-4 rounded-xl bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] border border-blue-100 text-gray-700 font-medium hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2 text-sm"
            onClick={() => setShowModelSettings(true)}
          >
            <Settings size={14} className="text-[#22C55E]" />
            <span>{t("modelSettings") || "模型设置"}</span>
          </button>

          {/* 使用说明按钮 */}
          {onShowUsageGuide && (
            <button
              className="h-9 px-4 rounded-xl bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] border border-blue-100 text-gray-700 font-medium hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2 text-sm"
              onClick={onShowUsageGuide}
            >
              <HelpCircle size={14} className="text-[#22C55E]" />
              <span>{t("usageGuide") || "使用说明"}</span>
            </button>
          )}

          {/* 保存按钮 */}
          {onSave && (
            <button
              className={cn(
                "h-9 px-4 rounded-xl bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] border border-blue-100 text-gray-700 font-medium hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2 text-sm",
                saveStatus === "saving" && "text-[#22C55E] border-[#22C55E]/50",
                saveStatus === "unsaved" && "text-amber-500 border-amber-500/50"
              )}
              onClick={onSave}
              disabled={saveStatus === "saving"}
            >
              {saveStatus === "saving" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              <span>{saveStatus === "saving" ? "保存中..." : "保存"}</span>
            </button>
          )}

          {/* 导出历史按钮 */}
          {onShowExportHistory && (
            <button
              className="h-9 px-4 rounded-xl bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] border border-blue-100 text-gray-700 font-medium hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2 text-sm"
              onClick={onShowExportHistory}
            >
              <History size={14} />
              <span>导出历史</span>
            </button>
          )}

          {/* 图片历史按钮 */}
          {onShowImageHistory && (
            <button
              className="h-9 px-4 rounded-xl bg-gradient-to-br from-white to-purple-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] border border-purple-100 text-gray-700 font-medium hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2 text-sm"
              onClick={onShowImageHistory}
            >
              <ImageIcon size={14} className="text-purple-500" />
              <span>图片历史</span>
            </button>
          )}

          {/* 时间轴切换按钮 - 仅专业模式 */}
          {mode === "professional" && onShowTimeline && (
            <button
              className="h-9 px-4 rounded-xl bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] border border-blue-100 text-gray-700 font-medium hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2 text-sm"
              onClick={onShowTimeline}
            >
              <Monitor
                size={14}
                className={showTimeline ? "text-blue-500" : "text-gray-400"}
              />
              <span>{showTimeline ? "隐藏时间轴" : "显示时间轴"}</span>
            </button>
          )}

          {/* 导出视频按钮 - 仅专业模式 */}
          {mode === "professional" && onShowExportDialog && (
            <Button
              size="sm"
              className="text-white text-xs h-8 gap-2 bg-gradient-to-r from-[#22C55E] to-[#22C55E]/80 hover:from-[#22C55E]/90 hover:to-[#22C55E]/70"
              onClick={onShowExportDialog}
            >
              {exportProgress ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>导出中 {exportProgress.percent}%</span>
                </>
              ) : (
                <>
                  <Download size={14} />
                  导出视频
                </>
              )}
            </Button>
          )}

          {/* 模式切换按钮 */}
          <button
            onClick={handleModeSwitch}
            className={cn(
              "h-9 px-4 rounded-xl shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] font-medium hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2 text-sm",
              mode === "agent"
                ? "bg-gradient-to-br from-[#FDBCB4]/30 to-[#ADD8E6]/30 border border-[#FDBCB4]/50 text-gray-700"
                : "bg-gradient-to-br from-[#22C55E]/20 to-[#ADD8E6]/30 border border-[#22C55E]/50 text-gray-700"
            )}
          >
            {mode === "agent" ? (
              <>
                <Wrench size={14} className="text-[#FDBCB4]" />
                <span>切换到专业模式</span>
              </>
            ) : (
              <>
                <Bot size={14} className="text-[#22C55E]" />
                <span>切换到 Agent 模式</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 模型设置对话框 */}
      <Dialog open={showModelSettings} onOpenChange={setShowModelSettings}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-900">
              {t("modelSettings") || "模型设置"}
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              选择用于生成图片和视频的 AI 模型
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* 文生图模型 */}
            <div className="space-y-2">
              <Label className="text-gray-700">文生图模型</Label>
              <Select
                value={textToImageModel}
                onValueChange={(v) => handleModelChange("text_to_image", v)}
              >
                <SelectTrigger className="bg-white border-gray-200 text-gray-900">
                  <SelectValue placeholder="选择模型" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {textToImageModels.map((m: any) => (
                    <SelectItem key={m.model_name} value={m.model_name}>
                      {m.display_name || m.model_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 图生图模型 */}
            <div className="space-y-2">
              <Label className="text-gray-700">图生图模型</Label>
              <Select
                value={imageToImageModel}
                onValueChange={(v) => handleModelChange("image_to_image", v)}
              >
                <SelectTrigger className="bg-white border-gray-200 text-gray-900">
                  <SelectValue placeholder="选择模型" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {imageToImageModels.map((m: any) => (
                    <SelectItem key={m.model_name} value={m.model_name}>
                      {m.display_name || m.model_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 视频生成模型 */}
            <div className="space-y-2">
              <Label className="text-gray-700">视频生成模型</Label>
              <Select
                value={videoModel}
                onValueChange={(v) => handleModelChange("video", v)}
              >
                <SelectTrigger className="bg-white border-gray-200 text-gray-900">
                  <SelectValue placeholder="选择模型" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {videoModels.map((m: any) => (
                    <SelectItem key={m.model_name} value={m.model_name}>
                      {m.display_name || m.model_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
