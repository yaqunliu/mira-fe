"use client";

import { useTranslations } from 'next-intl'
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, CheckCircle, XCircle, Loader2, Sparkles, Video, Music, Type } from "lucide-react";
import creationApi from "@/lib/api/creation";
import { toast } from "sonner";

interface ExportTriggerDialogProps {
  creationId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ExportTriggerDialog({
  creationId, isOpen, onClose }: ExportTriggerDialogProps) {
  const t = useTranslations('Editor');
  const [exportedVideoUrl, setExportedVideoUrl] = useState<string | null>(null);
  const [isExportStarted, setIsExportStarted] = useState(false);

  // 重置状态当对话框打开时
  useEffect(() => {
    if (isOpen) {
      setIsExportStarted(false);
      setExportedVideoUrl(null);
    }
  }, [isOpen]);

  // 轮询 creation 数据获取导出进度
  const { data: creation, refetch } = useQuery({
    queryKey: ["creation-export", creationId],
    queryFn: async () => {
      const response = await creationApi.queryCreationById(creationId, true);
      return response.data;
    },
    enabled: isOpen && isExportStarted,
    refetchInterval: (query) => {
      const exportStep = query.state.data?.extra_data?.steps?.videoExport;

      if (!exportStep) return false;

      // 如果导出完成或失败，停止轮询
      if (exportStep.status === "success") {
        if (exportStep.result?.video_url) {
          setExportedVideoUrl(exportStep.result.video_url);
          toast.success(t("exportSuccess"));
        }
        return false;
      } else if (exportStep.status === "failed") {
        toast.error(exportStep.error || t("exportFailed"));
        return false;
      }

      // 如果正在处理，每2秒轮询一次
      if (exportStep.status === "processing") {
        return 2000;
      }

      return false;
    },
  });

  const exportStep = isExportStarted ? creation?.extra_data?.steps?.videoExport : null;

  const handleExport = async () => {
    try {
      setExportedVideoUrl(null);

      const response = await creationApi.exportVideo(creationId);

      toast.info(t("exportStarted"));

      // 设置标志开始显示进度
      setIsExportStarted(true);

      // 开始轮询
      refetch();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || error?.message || t("exportStartFailed"));
    }
  };

  const handleDownload = () => {
    if (exportedVideoUrl) {
      window.open(exportedVideoUrl, "_blank");
    }
  };

  const handleClose = () => {
    const isProcessing = exportStep?.status === "processing";
    if (!isProcessing) {
      setExportedVideoUrl(null);
      setIsExportStarted(false);
      onClose();
    }
  };

  const getProgress = () => {
    if (!exportStep?.progress) return 0;
    return exportStep.progress.percent || 0;
  };

  const getStatusText = () => {
    if (!exportStep?.progress) return t("preparing");
    return exportStep.progress.status || t("processingStatus");
  };

  const isCompleted = exportStep?.status === "success";
  const isFailed = exportStep?.status === "failed";
  const isExporting = exportStep?.status === "processing";

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[560px] shadow-[8px_8px_16px_rgba(173,221,230,0.3),-4px_-4px_12px_rgba(255,255,255,0.7)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#ADD8E6] to-[#93C5FD] shadow-lg shadow-[#ADD8E6]/30">
              <Download className="h-5 w-5 text-white" />
            </div>
            {t("exportVideoTitle")}
          </DialogTitle>
          <DialogDescription className="text-gray-500">
            {t("exportVideoDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 初始状态：准备导出 */}
          {!isExporting && !isCompleted && !isFailed && (
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#ADD8E6] to-[#22C55E] rounded-full blur-xl opacity-30 animate-pulse"></div>
                    <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#ADD8E6]/20 to-[#22C55E]/20 border border-[#ADD8E6]/30 shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]">
                      <Sparkles className="h-10 w-10 text-[#ADD8E6]" />
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">{t("prepareExport")}</h3>
                  <p className="text-sm text-gray-500">
                    {t("clickToRender")}
                  </p>
                </div>
              </div>

              {/* 导出内容说明 */}
              <div className="bg-[#ADD8E6]/10 rounded-xl p-4 border border-[#ADD8E6]/30 shadow-[2px_2px_4px_rgba(173,221,230,0.1),-1px_-1px_2px_rgba(255,255,255,0.7)]">
                <p className="text-xs font-medium text-gray-700 mb-3">{t("exportWillInclude")}</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#ADD8E6]/20 border border-[#ADD8E6]/30 shadow-[2px_2px_4px_rgba(173,221,230,0.1),-1px_-1px_2px_rgba(255,255,255,0.7)]">
                      <Video className="h-4 w-4 text-[#ADD8E6]" />
                    </div>
                    <span>{t("exportIncludeVideo")}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#22C55E]/20 border border-[#22C55E]/30 shadow-[2px_2px_4px_rgba(34,197,94,0.1),-1px_-1px_2px_rgba(255,255,255,0.7)]">
                      <Music className="h-4 w-4 text-[#22C55E]" />
                    </div>
                    <span>{t("exportIncludeAudio")}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#FDBCB4]/20 border border-[#FDBCB4]/30 shadow-[2px_2px_4px_rgba(253,188,180,0.1),-1px_-1px_2px_rgba(255,255,255,0.7)]">
                      <Type className="h-4 w-4 text-[#FDBCB4]" />
                    </div>
                    <span>{t("exportIncludeSubtitle")}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 导出中状态 */}
          {isExporting && !isCompleted && !isFailed && (
            <div className="space-y-6">
              <div className="flex items-center justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-[#ADD8E6] to-[#22C55E] rounded-full blur-xl opacity-40 animate-pulse"></div>
                  <div className="relative">
                    <Loader2 className="h-16 w-16 animate-spin text-[#ADD8E6]" />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 font-medium">{getStatusText()}</span>
                  <span className="text-[#22C55E] font-bold text-lg">{getProgress()}%</span>
                </div>
                <div className="relative">
                  <Progress value={getProgress()} className="h-3 bg-gray-200" />
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-[#ADD8E6] to-[#22C55E] opacity-20 blur-sm rounded-full"
                    style={{ width: `${getProgress()}%` }}
                  ></div>
                </div>
              </div>

              <div className="text-center">
                <p className="text-xs text-gray-500">
                  {t("renderingHint")}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {t("doNotCloseWindow")}
                </p>
              </div>
            </div>
          )}

          {/* 导出成功状态 */}
          {isCompleted && exportedVideoUrl && (
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-[#22C55E] rounded-full blur-xl opacity-30"></div>
                    <div className="relative">
                      <CheckCircle className="h-20 w-20 text-[#22C55E]" />
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{t("exportSucceededTitle")}</h3>
                  <p className="text-sm text-gray-500">
                    {t("exportSavedToCloud")}
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-[#22C55E]/10 to-[#16A34A]/10 rounded-xl p-4 border border-[#22C55E]/30 shadow-[2px_2px_4px_rgba(34,197,94,0.1),-1px_-1px_2px_rgba(255,255,255,0.7)]">
                <p className="text-xs text-[#22C55E] text-center">
                  {t("videoReadyHint")}
                </p>
              </div>
            </div>
          )}

          {/* 导出失败状态 */}
          {isFailed && (
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-[#FDBCB4] rounded-full blur-xl opacity-30"></div>
                    <div className="relative">
                      <XCircle className="h-20 w-20 text-[#FDBCB4]" />
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{t("exportFailedTitle")}</h3>
                  <p className="text-sm text-gray-500">
                    {exportStep?.error || t("unknownErrorRetry")}
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-[#FDBCB4]/10 to-[#F9A899]/10 rounded-xl p-4 border border-[#FDBCB4]/30 shadow-[2px_2px_4px_rgba(253,188,180,0.1),-1px_-1px_2px_rgba(255,255,255,0.7)]">
                <p className="text-xs text-[#FDBCB4] text-center">
                  {t("contactSupportHint")}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
          {!isExporting && !isCompleted && !isFailed && (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
                className="border-gray-300 hover:bg-gray-100"
              >
                {t("cancel")}
              </Button>
              <Button
                onClick={handleExport}
                className="bg-gradient-to-r from-[#22C55E] to-[#16A34A] hover:from-[#16A34A] hover:to-[#15803D] shadow-[3px_3px_6px_rgba(34,197,94,0.2),-1px_-1px_3px_rgba(255,255,255,0.7)]"
              >
                <Download className="h-4 w-4 mr-2" />
                {t("startExport")}
              </Button>
            </>
          )}

          {isExporting && !isCompleted && !isFailed && (
            <Button
              variant="outline"
              disabled
              className="border-gray-300"
            >
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t("exportingEllipsis")}
            </Button>
          )}

          {isCompleted && exportedVideoUrl && (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
                className="border-gray-300 hover:bg-gray-100"
              >
                {t("close")}
              </Button>
              <Button
                onClick={handleDownload}
                className="bg-gradient-to-r from-[#22C55E] to-[#16A34A] hover:from-[#16A34A] hover:to-[#15803D] shadow-[3px_3px_6px_rgba(34,197,94,0.2),-1px_-1px_3px_rgba(255,255,255,0.7)]"
              >
                <Download className="h-4 w-4 mr-2" />
                {t("downloadVideo")}
              </Button>
            </>
          )}

          {isFailed && (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
                className="border-gray-300 hover:bg-gray-100"
              >
                {t("close")}
              </Button>
              <Button
                onClick={handleExport}
                className="bg-gradient-to-r from-[#ADD8E6] to-[#93C5FD] hover:from-[#93C5FD] hover:to-[#60A5FA] shadow-[3px_3px_6px_rgba(173,221,230,0.2),-1px_-1px_3px_rgba(255,255,255,0.7)]"
              >
                {t("retry")}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
