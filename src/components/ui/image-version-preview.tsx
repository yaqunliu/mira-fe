"use client";

import { useState } from "react";
import { Loader2, Download, RefreshCw, Save, ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ImageVersion {
  image_url: string;
  created_at: string;
  task_id?: string;
  version_name?: string;
}

interface ImageVersionPreviewProps {
  currentImageUrl?: string;
  imageHistory?: ImageVersion[];
  onRegenerate: () => void;
  onApplyVersion: (version: ImageVersion) => void;
  onVersionChange?: (version: ImageVersion) => void; // 切换版本时的回调
  isRegenerating?: boolean;
  entityType: "character" | "scene" | "shot";
  entityName?: string;
  frameType?: "start" | "end";
  className?: string;
}

export function ImageVersionPreview({
  currentImageUrl,
  imageHistory = [],
  onRegenerate,
  onApplyVersion,
  onVersionChange,
  isRegenerating = false,
  entityType,
  entityName,
  frameType = "start",
  className,
}: ImageVersionPreviewProps) {
  const [selectedVersionIndex, setSelectedVersionIndex] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState(false);

  // 根据实体类型确定版本名称前缀
  const getVersionNamePrefix = () => {
    if (entityType === "shot") {
      return frameType === "start" ? "首帧" : "尾帧";
    }
    return "当前版本";
  };

  const versions: ImageVersion[] = [
    ...(currentImageUrl
      ? [
          {
            image_url: currentImageUrl,
            created_at: new Date().toISOString(),
            version_name: entityType === "shot" 
              ? (frameType === "start" ? "首帧-当前版本" : "尾帧-当前版本")
              : "当前版本",
          },
        ]
      : []),
    ...imageHistory.reverse(),
  ];

  const currentVersion = versions[selectedVersionIndex] || versions[0];
  const isCurrentVersionSelected =
    selectedVersionIndex === 0 ||
    (selectedVersionIndex === 0 && imageHistory.length === 0);

  const frameLabel = entityType === "shot" 
    ? (frameType === "start" ? "首帧" : "尾帧")
    : "图片";

  const handleDownload = async () => {
    if (!currentVersion?.image_url) return;

    try {
      setIsDownloading(true);
      const response = await fetch(currentVersion.image_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${entityType}-${entityName || "image"}-${frameLabel}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(`${frameLabel}图片下载成功`);
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("图片下载失败");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleApplyVersion = () => {
    if (currentVersion && !isCurrentVersionSelected) {
      onApplyVersion(currentVersion);
    } else {
      toast.info("当前已是主版本，无需应用");
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {entityType === "shot" && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 bg-blue-100 px-2 py-1 rounded">
            {frameLabel}预览
          </span>
        </div>
      )}

      {/* 控制栏 */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* 版本选择 */}
        <Select
          value={String(selectedVersionIndex)}
          onValueChange={(value) => {
            const index = Number(value);
            setSelectedVersionIndex(index);
            // 通知父组件版本已切换
            if (onVersionChange && versions[index]) {
              onVersionChange(versions[index]);
            }
          }}
        >
          <SelectTrigger className="w-[160px] h-9 bg-white border-blue-200 focus:ring-blue-400">
            <SelectValue placeholder="选择版本" />
          </SelectTrigger>
          <SelectContent>
            {versions.map((version, index) => (
              <SelectItem key={index} value={String(index)}>
                {version.version_name ||
                  (entityType === "shot"
                    ? `${frameType === "start" ? "首帧" : "尾帧"}历史${index}`
                    : `历史版本${index}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 重新生成按钮 */}
        <Button
          onClick={onRegenerate}
          disabled={isRegenerating}
          variant="outline"
          size="sm"
          className="h-9 bg-white border-blue-200 hover:bg-blue-50"
        >
          {isRegenerating ? (
            <Loader2 className="w-4 h-4 animate-spin mr-1" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-1" />
          )}
          重新生成
        </Button>

        {/* 下载按钮 */}
        <Button
          onClick={handleDownload}
          disabled={!currentVersion?.image_url || isDownloading}
          variant="outline"
          size="sm"
          className="h-9 bg-white border-blue-200 hover:bg-blue-50"
        >
          {isDownloading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
        </Button>

        {/* 应用版本按钮 */}
        <Button
          onClick={handleApplyVersion}
          disabled={!currentVersion || isCurrentVersionSelected}
          variant="default"
          size="sm"
          className={cn(
            "h-9",
            isCurrentVersionSelected
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
          )}
        >
          <Save className="w-4 h-4 mr-1" />
          应用此版本
        </Button>
      </div>

      {/* 预览区域 */}
      {currentVersion?.image_url ? (
        <div
          className={cn(
            "relative rounded-xl overflow-hidden bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)]",
            entityType === "shot" ? "aspect-video" : "aspect-square"
          )}
        >
          <img
            src={currentVersion.image_url}
            alt={`${entityType} ${frameLabel} preview`}
            className="w-full h-full object-contain cursor-pointer"
          />
        </div>
      ) : (
        <div
          className={cn(
            "rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] flex items-center justify-center",
            entityType === "shot" ? "aspect-video" : "aspect-square"
          )}
        >
          <div className="text-center text-gray-500">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">暂无{entityType === "character" ? "角色" : entityType === "scene" ? "场景" : ""}{frameLabel}，点击重新生成</p>
          </div>
        </div>
      )}
    </div>
  );
}
