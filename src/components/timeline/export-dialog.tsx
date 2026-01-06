"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, CheckCircle, XCircle, Loader2, History } from "lucide-react";
import creationApi from "@/lib/api/creation";
import { toast } from "sonner";
import { ExportHistory } from "@/components/creation/export-history";

interface ExportDialogProps {
  creationId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ExportDialog({ creationId, isOpen, onClose }: ExportDialogProps) {
  const [exportedVideoUrl, setExportedVideoUrl] = useState<string | null>(null);
  const [isExportStarted, setIsExportStarted] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // 重置状态当对话框打开时
  useEffect(() => {
    if (isOpen) {
      setIsExportStarted(false);
      setExportedVideoUrl(null);
      setShowHistory(false);
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
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>导出视频</DialogTitle>
              <DialogDescription>
                将时间轴编辑结果导出为最终视频文件
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="text-xs"
            >
              <History className="h-4 w-4 mr-1" />
              {showHistory ? "返回导出" : "导出历史"}
            </Button>
          </div>
        </DialogHeader>

        {showHistory ? (
          <div className="py-4">
            <ExportHistory creationId={creationId} />
          </div>
        ) : (
          <>
            <div className="space-y-4 py-4">
              {!isExporting && !isCompleted && !isFailed && (
                <div className="text-center space-y-4">
                  <p className="text-sm text-muted-foreground">
                    点击下方按钮开始导出视频
                  </p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>导出将包含:</p>
                    <ul className="list-disc list-inside text-left max-w-xs mx-auto">
                      <li>所有视频轨道（含剪辑和透明度）</li>
                      <li>所有音频轨道（含音量和混音）</li>
                      <li>所有字幕轨道（烧录到视频）</li>
                    </ul>
                  </div>
                </div>
              )}

              {isExporting && !isCompleted && !isFailed && (
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{getStatusText()}</span>
                      <span className="font-medium">{getProgress()}%</span>
                    </div>
                    <Progress value={getProgress()} className="h-2" />
                  </div>
                  <p className="text-xs text-center text-muted-foreground">
                    导出可能需要几分钟，请耐心等待...
                  </p>
                </div>
              )}

              {isCompleted && exportedVideoUrl && (
                <div className="space-y-4 text-center">
                  <div className="flex items-center justify-center">
                    <CheckCircle className="h-12 w-12 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-lg mb-2">导出成功！</p>
                    <p className="text-sm text-muted-foreground">
                      视频已保存到云端存储
                    </p>
                  </div>
                </div>
              )}

              {isFailed && (
                <div className="space-y-4 text-center">
                  <div className="flex items-center justify-center">
                    <XCircle className="h-12 w-12 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium text-lg mb-2">导出失败</p>
                    <p className="text-sm text-muted-foreground">
                      {exportStep?.error || "未知错误"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              {!isExporting && !isCompleted && !isFailed && (
                <>
                  <Button variant="outline" onClick={handleClose}>
                    取消
                  </Button>
                  <Button onClick={handleExport}>
                    <Download className="h-4 w-4 mr-2" />
                    开始导出
                  </Button>
                </>
              )}

              {isExporting && !isCompleted && !isFailed && (
                <Button variant="outline" disabled>
                  导出中...
                </Button>
              )}

              {isCompleted && exportedVideoUrl && (
                <>
                  <Button variant="outline" onClick={handleClose}>
                    关闭
                  </Button>
                  <Button onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    下载视频
                  </Button>
                </>
              )}

              {isFailed && (
                <>
                  <Button variant="outline" onClick={handleClose}>
                    关闭
                  </Button>
                  <Button onClick={handleExport}>
                    重试
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
