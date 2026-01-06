"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Download,
  Eye,
  Clock,
  FileVideo,
  HardDrive,
  CheckCircle2,
  XCircle,
  Play,
  X,
  History
} from "lucide-react";
import creationApi from "@/lib/api/creation";
import { toast } from "sonner";

interface ExportPreviewDialogProps {
  creationId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ExportPreviewDialog({ creationId, isOpen, onClose }: ExportPreviewDialogProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // 获取导出历史
  const { data: exportHistory, isLoading } = useQuery({
    queryKey: ["export-history", creationId],
    queryFn: async () => {
      const response = await creationApi.getExportHistory(creationId);
      return response.data;
    },
    enabled: isOpen,
  });

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "未知大小";
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb.toFixed(2)} MB`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "刚刚";
    if (diffMins < 60) return `${diffMins} 分钟前`;
    if (diffHours < 24) return `${diffHours} 小时前`;
    if (diffDays < 7) return `${diffDays} 天前`;

    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDownload = (url: string) => {
    window.open(url, "_blank");
    toast.success("开始下载视频");
  };

  const handlePreview = (url: string) => {
    setPreviewUrl(url);
  };

  const closePreview = () => {
    setPreviewUrl(null);
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[800px] max-h-[85vh] border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg shadow-purple-500/20">
                <History className="h-5 w-5 text-white" />
              </div>
              导出历史
            </DialogTitle>
          </DialogHeader>
          <div className="py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-700 border-t-purple-500"></div>
            <p className="text-sm text-slate-400 mt-4">加载中...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[800px] max-h-[85vh] border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg shadow-purple-500/20">
                <History className="h-5 w-5 text-white" />
              </div>
              导出历史
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(85vh-120px)] pr-2">
            {!exportHistory || exportHistory.total === 0 ? (
              <div className="py-16 text-center">
                <div className="flex items-center justify-center mb-4">
                  <div className="flex items-center justify-center w-20 h-20 rounded-full bg-slate-800/50 border border-slate-700">
                    <FileVideo className="h-10 w-10 text-slate-600" />
                  </div>
                </div>
                <h3 className="text-lg font-medium text-slate-300 mb-2">暂无导出记录</h3>
                <p className="text-sm text-slate-500">
                  导出视频后将在此处显示历史记录
                </p>
              </div>
            ) : (
              <div className="space-y-3 pb-4">
                {exportHistory.outputs.map((output, index) => (
                  <Card
                    key={index}
                    className={`overflow-hidden border transition-all hover:shadow-lg ${
                      output.status === "completed"
                        ? "border-slate-700 bg-slate-900/50 hover:border-purple-500/30 hover:shadow-purple-500/10"
                        : "border-red-900/30 bg-red-950/20"
                    }`}
                  >
                    <CardContent className="p-0">
                      <div className="flex items-start gap-4 p-4">
                        {/* 状态图标 */}
                        <div className="flex-shrink-0">
                          {output.status === "completed" ? (
                            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30">
                              <CheckCircle2 className="h-6 w-6 text-green-400" />
                            </div>
                          ) : (
                            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-red-500/20 to-rose-500/20 border border-red-500/30">
                              <XCircle className="h-6 w-6 text-red-400" />
                            </div>
                          )}
                        </div>

                        {/* 内容信息 */}
                        <div className="flex-1 min-w-0 space-y-3">
                          {/* 顶部：时间和状态 */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5 text-slate-500" />
                                <span className="text-sm text-slate-400">
                                  {formatDate(output.export_at)}
                                </span>
                              </div>
                              {output.status === "completed" && (
                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-green-500/10 border border-green-500/20">
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                                  <span className="text-xs text-green-400 font-medium">导出成功</span>
                                </div>
                              )}
                              {output.status === "failed" && (
                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/20">
                                  <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
                                  <span className="text-xs text-red-400 font-medium">导出失败</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 文件信息 */}
                          {output.status === "completed" && (
                            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                              {output.resolution && (
                                <div className="flex items-center gap-1.5">
                                  <FileVideo className="h-3.5 w-3.5" />
                                  <span>{output.resolution}</span>
                                </div>
                              )}
                              {output.duration && (
                                <div className="flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5" />
                                  <span>{output.duration.toFixed(1)}s</span>
                                </div>
                              )}
                              {output.file_size && (
                                <div className="flex items-center gap-1.5">
                                  <HardDrive className="h-3.5 w-3.5" />
                                  <span>{formatFileSize(output.file_size)}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* 错误信息 */}
                          {output.status === "failed" && output.error && (
                            <div className="text-xs text-red-400 bg-red-950/30 border border-red-900/30 rounded-lg p-2">
                              {output.error}
                            </div>
                          )}

                          {/* 操作按钮 */}
                          {output.status === "completed" && output.video_url && (
                            <div className="flex gap-2 pt-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePreview(output.video_url!)}
                                className="flex-1 border-purple-500/30 hover:bg-purple-500/10 hover:border-purple-500/50 text-purple-400"
                              >
                                <Play className="h-3.5 w-3.5 mr-1.5" />
                                预览
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownload(output.video_url!)}
                                className="flex-1 border-blue-500/30 hover:bg-blue-500/10 hover:border-blue-500/50 text-blue-400"
                              >
                                <Download className="h-3.5 w-3.5 mr-1.5" />
                                下载
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {exportHistory && exportHistory.total > 0 && (
              <div className="text-center pt-2 pb-1 border-t border-slate-800">
                <p className="text-xs text-slate-500">
                  共 {exportHistory.total} 条导出记录
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-800">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-slate-700 hover:bg-slate-800"
            >
              关闭
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 视频预览弹窗 */}
      {previewUrl && (
        <Dialog open={!!previewUrl} onOpenChange={closePreview}>
          <DialogContent className="sm:max-w-[90vw] max-h-[90vh] border-slate-800 bg-black p-0 overflow-hidden">
            <div className="relative w-full h-full">
              {/* 关闭按钮 */}
              <Button
                variant="ghost"
                size="icon"
                onClick={closePreview}
                className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/70 border border-slate-700 rounded-full w-10 h-10"
              >
                <X className="h-5 w-5 text-white" />
              </Button>

              {/* 视频播放器 */}
              <div className="flex items-center justify-center w-full min-h-[60vh]">
                <video
                  src={previewUrl}
                  controls
                  autoPlay
                  className="w-full h-full max-h-[85vh] object-contain"
                  style={{ backgroundColor: "#000" }}
                >
                  您的浏览器不支持视频播放
                </video>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
