"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Eye, CheckCircle, XCircle, Clock } from "lucide-react";
import creationApi from "@/lib/api/creation";
import { formatFileSize } from "@/lib/utils";

interface ExportHistoryProps {
  creationId: string;
}

export function ExportHistory({ creationId }: ExportHistoryProps) {
  const { data: exportHistory, isLoading } = useQuery({
    queryKey: ["export-history", creationId],
    queryFn: async () => {
      const response = await creationApi.getExportHistory(creationId);
      return response.data;
    },
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handlePreview = (videoUrl: string) => {
    window.open(videoUrl, "_blank");
  };

  const handleDownload = (videoUrl: string) => {
    const link = document.createElement("a");
    link.href = videoUrl;
    link.download = "";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (!exportHistory || exportHistory.total === 0) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground text-center py-8">暂无导出记录</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      <div className="space-y-3">
        {exportHistory.outputs.map((output, index) => (
          <Card key={index} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {output.status === "completed" && (
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                    )}
                    {output.status === "failed" && (
                      <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                    )}
                    {output.status !== "completed" && output.status !== "failed" && (
                      <Clock className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                    )}
                    <span className="text-sm font-medium">
                      {output.status === "completed" && "导出成功"}
                      {output.status === "failed" && "导出失败"}
                      {output.status !== "completed" && output.status !== "failed" && "处理中"}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      {formatDate(output.export_at)}
                    </p>

                    {output.status === "completed" && (
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {output.resolution && <span>{output.resolution}</span>}
                        {output.file_size && <span>·</span>}
                        {output.file_size && <span>{formatFileSize(output.file_size)}</span>}
                        {output.duration && <span>·</span>}
                        {output.duration && <span>{output.duration.toFixed(1)}秒</span>}
                      </div>
                    )}

                    {output.status === "failed" && output.error && (
                      <p className="text-xs text-red-600 mt-1">
                        错误: {output.error}
                      </p>
                    )}
                  </div>
                </div>

                {output.status === "completed" && output.video_url && (
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreview(output.video_url!)}
                      className="h-8"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      预览
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(output.video_url!)}
                      className="h-8"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      下载
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {exportHistory.total > 0 && (
        <p className="text-xs text-center text-muted-foreground">
          共 {exportHistory.total} 条导出记录
        </p>
      )}
    </div>
  );
}
