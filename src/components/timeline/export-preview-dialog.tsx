"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
        <DialogContent className="sm:max-w-[800px] max-h-[85vh] shadow-[8px_8px_16px_rgba(173,221,230,0.3),-4px_-4px_12px_rgba(255,255,255,0.7)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#FDBCB4] to-[#F9A899] shadow-lg shadow-[#FDBCB4]/30">
                <History className="h-5 w-5 text-white" />
              </div>
              导出历史
            </DialogTitle>
          </DialogHeader>
          <div className="py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-[#22C55E]"></div>
            <p className="text-sm text-gray-500 mt-4">加载中...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[800px] max-h-[85vh] shadow-[8px_8px_16px_rgba(173,221,230,0.3),-4px_-4px_12px_rgba(255,255,255,0.7)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#FDBCB4] to-[#F9A899] shadow-lg shadow-[#FDBCB4]/30">
                <History className="h-5 w-5 text-white" />
              </div>
              导出历史
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(85vh-120px)] pr-2">
            {!exportHistory || exportHistory.total === 0 ? (
              <div className="py-16 text-center">
                <div className="flex items-center justify-center mb-4">
                  <div className="flex items-center justify-center w-20 h-20 rounded-full bg-[#ADD8E6]/20 border border-[#ADD8E6]/30 shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]">
                    <FileVideo className="h-10 w-10 text-[#ADD8E6]" />
                  </div>
                </div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">暂无导出记录</h3>
                <p className="text-sm text-gray-500">
                  导出视频后将在此处显示历史记录
                </p>
              </div>
            ) : (
              <div className="space-y-3 pb-4">
                {exportHistory.outputs.map((output, index) => (
                  <Card
                    key={index}
                    className={`overflow-hidden border-0 transition-all hover:shadow-lg ${
                      output.status === "completed"
                        ? "shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)] hover:shadow-[6px_6px_12px_rgba(173,221,230,0.3),-4px_-4px_8px_rgba(255,255,255,0.8)] hover:-translate-y-0.5"
                        : "shadow-[4px_4px_8px_rgba(253,188,180,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]"
                    }`}
                  >
                    <CardContent className="p-0">
                      <div className="flex items-start gap-4 p-4">
                        {/* 状态图标 */}
                        <div className="flex-shrink-0">
                          {output.status === "completed" ? (
                            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-[#22C55E]/20 to-[#16A34A]/20 border border-[#22C55E]/30 shadow-[2px_2px_4px_rgba(34,197,94,0.2),-1px_-1px_2px_rgba(255,255,255,0.7)]">
                              <CheckCircle2 className="h-6 w-6 text-[#22C55E]" />
                            </div>
                          ) : (
                            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-[#FDBCB4]/20 to-[#F9A899]/20 border border-[#FDBCB4]/30 shadow-[2px_2px_4px_rgba(253,188,180,0.2),-1px_-1px_2px_rgba(255,255,255,0.7)]">
                              <XCircle className="h-6 w-6 text-[#FDBCB4]" />
                            </div>
                          )}
                        </div>

                        {/* 内容信息 */}
                        <div className="flex-1 min-w-0 space-y-3">
                          {/* 顶部：时间和状态 */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5 text-gray-500" />
                                <span className="text-sm text-gray-500">
                                  {formatDate(output.export_at)}
                                </span>
                              </div>
                              {output.status === "completed" && (
                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#22C55E]/10 border border-[#22C55E]/20 shadow-[1px_1px_2px_rgba(34,197,94,0.1),-0.5px_-0.5px_1px_rgba(255,255,255,0.7)]">
                                  <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E]"></div>
                                  <span className="text-xs text-[#22C55E] font-medium">导出成功</span>
                                </div>
                              )}
                              {output.status === "failed" && (
                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#FDBCB4]/10 border border-[#FDBCB4]/20 shadow-[1px_1px_2px_rgba(253,188,180,0.1),-0.5px_-0.5px_1px_rgba(255,255,255,0.7)]">
                                  <div className="w-1.5 h-1.5 rounded-full bg-[#FDBCB4]"></div>
                                  <span className="text-xs text-[#FDBCB4] font-medium">导出失败</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 文件信息 */}
                          {output.status === "completed" && (
                            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
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
                            <div className="text-xs text-[#FDBCB4] bg-[#FDBCB4]/10 border border-[#FDBCB4]/20 rounded-lg p-2 shadow-[1px_1px_2px_rgba(253,188,180,0.1),-0.5px_-0.5px_1px_rgba(255,255,255,0.7)]">
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
                                className="flex-1 border-[#22C55E]/30 hover:bg-[#22C55E]/10 hover:border-[#22C55E]/50 text-[#22C55E]"
                              >
                                <Play className="h-3.5 w-3.5 mr-1.5" />
                                预览
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownload(output.video_url!)}
                                className="flex-1 border-[#ADD8E6]/30 hover:bg-[#ADD8E6]/10 hover:border-[#ADD8E6]/50 text-[#ADD8E6]"
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
            <div className="text-center pt-2 pb-1 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                共 {exportHistory.total} 条导出记录
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-gray-300 hover:bg-gray-100"
          >
            关闭
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* 视频预览弹窗 */}
    {previewUrl && (
      <Dialog open={!!previewUrl} onOpenChange={closePreview}>
        <DialogContent className="sm:max-w-[90vw] max-h-[90vh] shadow-[8px_8px_16px_rgba(173,221,230,0.3),-4px_-4px_12px_rgba(255,255,255,0.7)] bg-black p-0 overflow-hidden">
          <DialogTitle className="sr-only">视频预览</DialogTitle>
          <DialogDescription className="sr-only">导出结果视频预览播放器</DialogDescription>
          <div className="relative w-full h-full">
            {/* 关闭按钮 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={closePreview}
              className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/70 border border-gray-700 rounded-full w-10 h-10"
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
