"use client";

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

export function ExportTriggerDialog({ creationId, isOpen, onClose }: ExportTriggerDialogProps) {
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
          toast.success("视频导出成功");
        }
        return false;
      } else if (exportStep.status === "failed") {
        toast.error(exportStep.error || "视频导出失败");
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

      toast.info("视频导出任务已启动");

      // 设置标志开始显示进度
      setIsExportStarted(true);

      // 开始轮询
      refetch();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || error?.message || "启动导出任务失败");
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
    if (!exportStep?.progress) return "准备中...";
    return exportStep.progress.status || "处理中...";
  };

  const isCompleted = exportStep?.status === "success";
  const isFailed = exportStep?.status === "failed";
  const isExporting = exportStep?.status === "processing";

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[560px] border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/20">
              <Download className="h-5 w-5 text-white" />
            </div>
            导出视频
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            将时间轴编辑结果导出为最终视频文件
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 初始状态：准备导出 */}
          {!isExporting && !isCompleted && !isFailed && (
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur-xl opacity-30 animate-pulse"></div>
                    <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-600/20 border border-blue-500/30">
                      <Sparkles className="h-10 w-10 text-blue-400" />
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">准备导出您的作品</h3>
                  <p className="text-sm text-slate-400">
                    点击下方按钮开始渲染最终视频
                  </p>
                </div>
              </div>

              {/* 导出内容说明 */}
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <p className="text-xs font-medium text-slate-300 mb-3">导出将包含:</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-sm text-slate-400">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <Video className="h-4 w-4 text-blue-400" />
                    </div>
                    <span>所有视频轨道（含剪辑和透明度）</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-400">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <Music className="h-4 w-4 text-purple-400" />
                    </div>
                    <span>所有音频轨道（含音量和混音）</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-400">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20">
                      <Type className="h-4 w-4 text-green-400" />
                    </div>
                    <span>所有字幕轨道（烧录到视频）</span>
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
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur-xl opacity-40 animate-pulse"></div>
                  <div className="relative">
                    <Loader2 className="h-16 w-16 animate-spin text-blue-400" />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-300 font-medium">{getStatusText()}</span>
                  <span className="text-blue-400 font-bold text-lg">{getProgress()}%</span>
                </div>
                <div className="relative">
                  <Progress value={getProgress()} className="h-3 bg-slate-800" />
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 opacity-20 blur-sm rounded-full"
                    style={{ width: `${getProgress()}%` }}
                  ></div>
                </div>
              </div>

              <div className="text-center">
                <p className="text-xs text-slate-400">
                  视频渲染中，可能需要几分钟时间...
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  请不要关闭此窗口
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
                    <div className="absolute inset-0 bg-green-500 rounded-full blur-xl opacity-30"></div>
                    <div className="relative">
                      <CheckCircle className="h-20 w-20 text-green-500" />
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">导出成功！</h3>
                  <p className="text-sm text-slate-400">
                    您的视频已成功保存到云端存储
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl p-4 border border-green-500/20">
                <p className="text-xs text-green-400 text-center">
                  视频已准备就绪，您可以下载或在导出历史中查看
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
                    <div className="absolute inset-0 bg-red-500 rounded-full blur-xl opacity-30"></div>
                    <div className="relative">
                      <XCircle className="h-20 w-20 text-red-500" />
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">导出失败</h3>
                  <p className="text-sm text-slate-400">
                    {exportStep?.error || "未知错误，请重试"}
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-red-500/10 to-rose-500/10 rounded-xl p-4 border border-red-500/20">
                <p className="text-xs text-red-400 text-center">
                  如果问题持续存在，请联系技术支持
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
          {!isExporting && !isCompleted && !isFailed && (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
                className="border-slate-700 hover:bg-slate-800"
              >
                取消
              </Button>
              <Button
                onClick={handleExport}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg shadow-blue-500/20"
              >
                <Download className="h-4 w-4 mr-2" />
                开始导出
              </Button>
            </>
          )}

          {isExporting && !isCompleted && !isFailed && (
            <Button
              variant="outline"
              disabled
              className="border-slate-700"
            >
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              导出中...
            </Button>
          )}

          {isCompleted && exportedVideoUrl && (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
                className="border-slate-700 hover:bg-slate-800"
              >
                关闭
              </Button>
              <Button
                onClick={handleDownload}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/20"
              >
                <Download className="h-4 w-4 mr-2" />
                下载视频
              </Button>
            </>
          )}

          {isFailed && (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
                className="border-slate-700 hover:bg-slate-800"
              >
                关闭
              </Button>
              <Button
                onClick={handleExport}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                重试
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
