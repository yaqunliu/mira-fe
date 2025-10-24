"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, Loader2 } from "lucide-react";

// 配音风格选项
const voiceStyles = [
  { id: "male-deep", name: "诙谐男声", description: "诙谐幽默的男性声音" },
  { id: "male-youth", name: "沉稳男声", description: "沉稳冷静的男性声音" },
  { id: "female-gentle", name: "甜美女声", description: "甜美可爱的女性声音" },
  {
    id: "female-powerful",
    name: "强势女声",
    description: "自信有力的女性声音",
  },
  { id: "child-innocent", name: "童声", description: "纯真可爱的儿童声音" },
  { id: "elder-wise", name: "长者", description: "智慧慈祥的长者声音" },
];

interface VideoGeneratorProps {
  onVideoGenerated?: (videoUrl: string) => void;
}

export function VideoGenerator({ onVideoGenerated }: VideoGeneratorProps) {
  const [selectedVoiceStyle, setSelectedVoiceStyle] =
    useState<string>("male-deep");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string>("");

  const handleGenerateVideo = async () => {
    if (!selectedVoiceStyle) {
      return;
    }

    setIsGenerating(true);
    setIsVideoReady(false);

    try {
      // 模拟视频生成过程
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const mockVideoUrl = "https://zhuluoji.cn-sh2.ufileos.com/images-frontend/test/video.mp4";
      setVideoUrl(mockVideoUrl);
      setIsVideoReady(true);
      onVideoGenerated?.(mockVideoUrl);
    } catch (error) {
      console.error("视频生成失败:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleVideoEnded = () => {
    console.log("视频播放结束");
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {!isVideoReady && !videoUrl && !isGenerating && (
        <Card className="border-none p-0">
          <CardContent className="space-y-6">
            {/* 配音风格选择 */}
            <div className="space-y-3">
              <div className="text-sm font-medium">请先选择配音风格</div>
              <Select
                value={selectedVoiceStyle}
                onValueChange={setSelectedVoiceStyle}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="请选择配音风格" />
                </SelectTrigger>
                <SelectContent>
                  {voiceStyles.map((style) => (
                    <SelectItem key={style.id} value={style.id}>
                      {style.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 生成按钮 */}
            <div className="flex justify-center">
              <Button
                onClick={handleGenerateVideo}
                disabled={!selectedVoiceStyle || isGenerating}
                className="min-w-[120px]"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    生成中...
                  </>
                ) : (
                  "确定生成"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {/* 视频播放区域 */}
      {isVideoReady && videoUrl && (
        <div className="space-y-3 p-6">
          <div className="relative w-full bg-black rounded-lg overflow-hidden aspect-video">
            <video
              src={videoUrl}
              controls
              className="w-full h-auto aspect-video"
              onEnded={handleVideoEnded}
              autoPlay
            >
              您的浏览器不支持视频播放。
            </video>
          </div>
        </div>
      )}

      {/* Loading状态显示 */}
      {isGenerating && (
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <div className="text-center space-y-2">
            <p className="text-sm font-medium">正在生成视频...</p>
            <p className="text-xs text-muted-foreground">
              配音风格:{" "}
              {voiceStyles.find((s) => s.id === selectedVoiceStyle)?.name}
            </p>
            <p className="text-xs text-muted-foreground">
              预计需要 3-5 分钟，请耐心等待
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
