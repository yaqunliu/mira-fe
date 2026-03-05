"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BookOpen, Smile, BookText, Check } from "lucide-react";

interface CreationTypeCardProps {
  onSelect: (type: "vocab_video" | "gaoxiao_video" | "story_video") => void;
  suggestedTypes?: string[];
}

const creationTypes = [
  {
    id: "vocab_video" as const,
    title: "英文单词视频",
    description: "制作精美的单词教学视频，包含发音、例句和配图",
    icon: BookOpen,
    color: "from-[#22C55E] to-[#ADD8E6]",
    features: ["单词展示", "发音教学", "例句演示"],
  },
  {
    id: "gaoxiao_video" as const,
    title: "搞笑短视频",
    description: "创作有趣的搞笑短视频，轻松娱乐",
    icon: Smile,
    color: "from-[#F59E0B] to-[#EF4444]",
    features: ["段子创作", "搞笑配音", "趣味动画"],
  },
  {
    id: "story_video" as const,
    title: "故事动画视频",
    description: "将故事变成生动的动画视频",
    icon: BookText,
    color: "from-[#8B5CF6] to-[#EC4899]",
    features: ["绘本故事", "寓言动画", "儿童故事"],
  },
];

export function CreationTypeCard({ onSelect, suggestedTypes }: CreationTypeCardProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const handleConfirm = () => {
    if (selectedType) {
      onSelect(selectedType as "vocab_video" | "gaoxiao_video" | "story_video");
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-[4px_4px_16px_rgba(0,0,0,0.1),-4px_-4px_16px_rgba(255,255,255,0.95)] p-6 space-y-6 max-w-md mx-auto">
      {/* 标题 */}
      <div className="text-center space-y-2">
        <h3 className="text-xl font-bold text-gray-800">选择创作类型</h3>
        <p className="text-sm text-gray-500">
          {suggestedTypes && suggestedTypes.length > 0
            ? "根据你的描述，推荐以下创作类型："
            : "请选择你想要创作的视频类型："}
        </p>
      </div>

      {/* 类型选项 */}
      <div className="space-y-3">
        {creationTypes.map((type) => {
          const Icon = type.icon;
          const isSelected = selectedType === type.id;
          const isSuggested = suggestedTypes?.includes(type.id);

          return (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left relative ${
                isSelected
                  ? `border-transparent bg-gradient-to-r ${type.color} text-white`
                  : "border-gray-200 hover:border-gray-300 bg-white text-gray-700"
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isSelected ? "bg-white/20" : `bg-gradient-to-r ${type.color}`
                  }`}
                >
                  <Icon className={`w-6 h-6 ${isSelected ? "text-white" : "text-white"}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{type.title}</h4>
                    {isSuggested && !isSelected && (
                      <span className="px-2 py-0.5 bg-[#22C55E]/10 text-[#22C55E] text-xs rounded-full">
                        推荐
                      </span>
                    )}
                    {isSelected && <Check className="w-5 h-5" />}
                  </div>
                  <p className={`text-sm mt-1 ${isSelected ? "text-white/80" : "text-gray-500"}`}>
                    {type.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {type.features.map((feature) => (
                      <span
                        key={feature}
                        className={`text-xs px-2 py-1 rounded-full ${
                          isSelected ? "bg-white/20" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 确认按钮 */}
      <Button
        onClick={handleConfirm}
        disabled={!selectedType}
        className="w-full h-12 bg-gradient-to-r from-[#22C55E] to-[#ADD8E6] hover:from-[#16A34A] hover:to-[#87CEEB] text-white font-medium rounded-xl disabled:opacity-50"
      >
        {selectedType ? "确认选择" : "请选择创作类型"}
      </Button>

      {/* 提示 */}
      <p className="text-xs text-gray-400 text-center">
        💡 选择后类型将锁定，如需创作其他类型请新建项目
      </p>
    </div>
  );
}
