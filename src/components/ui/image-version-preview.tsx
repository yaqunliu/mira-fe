"use client";

import { useState } from "react";
import { Loader2, Download, RefreshCw, Save, ChevronDown, ZoomIn } from "lucide-react";
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
import { useTranslations } from "next-intl";

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
  onImageClick?: (imageUrl: string) => void; // 点击图片放大回调
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
  onImageClick,
  isRegenerating = false,
  entityType,
  entityName,
  frameType = "start",
  className,
}: ImageVersionPreviewProps) {
  const t = useTranslations("Editor");
  const tCommon = useTranslations("common");
  const [selectedVersionIndex, setSelectedVersionIndex] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState(false);

  const versions: ImageVersion[] = [
    ...(currentImageUrl
      ? [
        {
          image_url: currentImageUrl,
          created_at: new Date().toISOString(),
          version_name: entityType === "shot"
            ? (frameType === "start" ? t("startFrameCurrent") : t("endFrameCurrent"))
            : t("currentVersion"),
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
    ? (frameType === "start" ? t("startFrame") : t("endFrame"))
    : tCommon("image");

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
      toast.success(t("downloadSuccess", { frame: frameLabel }));
    } catch (error) {
      console.error("Download failed:", error);
      toast.error(t("downloadFailed"));
    } finally {
      setIsDownloading(false);
    }
  };

  const handleApplyVersion = () => {
    if (currentVersion && !isCurrentVersionSelected) {
      onApplyVersion(currentVersion);
    } else {
      toast.info(t("alreadyMainVersion"));
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {entityType === "shot" && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 bg-blue-100 px-2 py-1 rounded">
            {t("framePreview", { frame: frameLabel })}
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
            <SelectValue placeholder={t("selectVersion")} />
          </SelectTrigger>
          <SelectContent>
            {versions.map((version, index) => (
              <SelectItem key={index} value={String(index)}>
                {version.version_name ||
                  (entityType === "shot"
                    ? t("frameHistory", { frame: frameType === "start" ? t("startFrame") : t("endFrame"), index })
                    : t("historyVersion", { index }))}
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
          {t("regenerate")}
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
          {t("applyThisVersion")}
        </Button>
      </div>

      {/* 预览区域 */}
      {currentVersion?.image_url ? (
        <div
          className={cn(
            "relative rounded-xl overflow-hidden bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] group",
            "aspect-video"
          )}
          onClick={() => onImageClick?.(currentVersion.image_url)}
        >
          <img
            src={currentVersion.image_url}
            alt={`${entityType} ${frameLabel} preview`}
            className={cn(
              "w-full h-full object-contain",
              onImageClick ? "cursor-pointer" : ""
            )}
          />
          {onImageClick && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center pointer-events-none">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/50 rounded-full p-3">
                <ZoomIn className="w-6 h-6 text-white" />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          className={cn(
            "rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] flex items-center justify-center",
            "aspect-video"
          )}
        >
          <div className="text-center text-gray-500">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {t("noImageYet", {
                target: [
                  entityType === "character" ? t("character") : entityType === "scene" ? t("scene") : "",
                  frameLabel,
                ].filter(Boolean).join(" "),
              })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
