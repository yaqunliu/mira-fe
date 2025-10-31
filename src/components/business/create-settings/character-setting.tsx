"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import characters from "@/mock/characters.json";
import {
  ImageUpscale,
  PenLine,
  RotateCcw,
  WandSparkles,
  X,
  Eye,
  ArrowRight,
  Maximize,
  Maximize2,
} from "lucide-react";
import { CharacterEditModal } from "@/components/modals/character-edit-modal";
import { ImagePreview } from "@/components/ui/image-preview";
import { cn } from "@/lib/utils";

interface CharacterInfo {
  姓名: string;
  基础信息: string;
  容貌特征: string;
  身材特征: string;
  头发: string;
  服装: string;
  特征标签: string;
  图片链接: string;
}

const STYLE_OPTIONS = [
  { value: "anime", label: "动漫风格" },
  { value: "realistic", label: "写实风格" },
  { value: "watercolor", label: "水彩风格" },
  { value: "oil_painting", label: "油画风格" },
];

export function CharacterSetting({ onComplete }: { onComplete: () => void }) {
  const t = useTranslations("character");
  const [selectedStyle, setSelectedStyle] = useState<string>("anime");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedImages, setGeneratedImages] = useState<{
    [key: string]: string;
  }>({});
  const [charactersData, setCharactersData] = useState<CharacterInfo[]>(
    characters.data
  );
  const [editingCharacterIndex, setEditingCharacterIndex] = useState<
    number | null
  >(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);

  const handleGenerateImages = async () => {
    setIsGenerating(true);
    setGenerationProgress(0);

    // 模拟生成过程
    const interval = setInterval(() => {
      setGenerationProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsGenerating(false);

          setGeneratedImages({
            character_0:
              "https://zhuluoji.cn-sh2.ufileos.com/images-frontend/test/amu.png",
            character_1:
              "https://zhuluoji.cn-sh2.ufileos.com/images-frontend/test/anduming.png",
            character_2:
              "https://zhuluoji.cn-sh2.ufileos.com/images-frontend/test/atian.png",
          });
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const handleRegenerateCharacter = async (characterIndex: number) => {
    // 模拟重新生成单个角色
    const newImages = { ...generatedImages };
    const imageUrls = [
      "https://zhuluoji.cn-sh2.ufileos.com/images-frontend/test/amu.png",
      "https://zhuluoji.cn-sh2.ufileos.com/images-frontend/test/anduming.png",
      "https://zhuluoji.cn-sh2.ufileos.com/images-frontend/test/atian.png",
    ];

    // 随机选择一个不同的图片
    const currentImage = newImages[`character_${characterIndex}`];
    const availableImages = imageUrls.filter((url) => url !== currentImage);
    const randomImage =
      availableImages[Math.floor(Math.random() * availableImages.length)];

    newImages[`character_${characterIndex}`] = randomImage;
    setGeneratedImages(newImages);
  };

  const handleEditCharacter = (index: number) => {
    setEditingCharacterIndex(index);
    setIsEditModalOpen(true);
  };

  const handleSaveCharacter = (updatedCharacter: CharacterInfo) => {
    if (editingCharacterIndex !== null) {
      const newCharacters = [...charactersData];
      newCharacters[editingCharacterIndex] = updatedCharacter;
      setCharactersData(newCharacters);
      setIsEditModalOpen(false);
      setEditingCharacterIndex(null);
    }
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingCharacterIndex(null);
  };

  const handleImageClick = (imageUrl: string) => {
    setPreviewImage(imageUrl);
    setIsImagePreviewOpen(true);
  };

  const getStyleLabel = (value: string) => {
    return (
      STYLE_OPTIONS.find((option) => option.value === value)?.label || value
    );
  };

  return (
    <div className="h-[calc(100vh-136px)]">
      <div className="space-y-4 px-6 h-full overflow-y-auto pb-20">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-semibold">{`故事包含${charactersData.length}个角色`}</h3>
          {/* 生成按钮 */}
          <Button
            onClick={handleGenerateImages}
            disabled={isGenerating}
            className="px-4 py-4 text-sm text-primary"
            variant="secondary"
          >
            <WandSparkles className="w-3 h-3" />
            {isGenerating
              ? t("生成中")
              : Object.keys(generatedImages).length > 0
              ? t("重新生成")
              : t("生成角色形象")}
          </Button>
        </div>
        {/* 生成进度 */}
        {isGenerating && (
          <div className="flex justify-between items-center text-sm gap-2">
            <Progress value={generationProgress} className="w-full" />
            <span>{generationProgress}%</span>
          </div>
        )}
        {/* 风格选择 */}
        <div className="space-y-3">
          <h3 className="text-base text-gray-900 dark:text-gray-400">
            {t("视觉风格")}
          </h3>
          <div className="flex items-center space-x-4">
            {/* <label className="text-sm font-medium">{t("风格选择")}:</label> */}
            <Select value={selectedStyle} onValueChange={setSelectedStyle}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t("风格选择")} />
              </SelectTrigger>
              <SelectContent>
                {STYLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {/* 角色信息展示 */}
        <div className="space-y-3">
          <h3 className="text-base text-gray-900 dark:text-gray-400">
            {t("角色设定")}
          </h3>
          <div className="w-full overflow-x-auto">
            <div className="flex space-x-3 pb-4">
              {charactersData.map((character, index) => (
                <div className="flex flex-col w-[65vw] md:w-[240px] lg:w-[300px] flex-shrink-0" key={index}>
                  <div className="w-fit text-sm text-nowrap py-2 px-4 bg-gradient-to-b from-orange-400/50 to-gray-600/30 rounded-t tracking-wider font-bold flex items-center gap-1">
                    <span>{character.姓名}</span>
                    <PenLine
                      className="inline-block w-3 h-3 text-stone-400 cursor-pointer hover:text-primary transition-colors"
                      onClick={() => handleEditCharacter(index)}
                    />
                  </div>
                  <Card
                    key={index}
                    className="w-full bg-gray-600/30 rounded-tl-none border-none p-y-3"
                  >
                    <CardContent className="space-y-2 px-3">
                      <div className="flex gap-2">
                        <div className="w-[66px] flex justify-end">
                          <Badge variant="outline" className="mb-2 w-[66px]">
                            {t("基础信息")}
                          </Badge>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <p className="text-sm text-muted-foreground line-clamp-2 cursor-pointer hover:text-primary transition-colors">
                              {character.基础信息}
                            </p>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-[300px] max-h-[300px] overflow-auto">
                            <DropdownMenuItem className="whitespace-pre-line">
                              {character.基础信息}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex gap-2 items-start">
                        <div className="w-[66px] flex justify-end">
                          <Badge variant="outline" className="mb-2">
                            {t("容貌特征")}
                          </Badge>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <p className="text-sm text-muted-foreground line-clamp-2 cursor-pointer hover:text-primary transition-colors">
                              {character.容貌特征}
                            </p>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-[300px] max-h-[300px] overflow-auto">
                            <DropdownMenuItem className="whitespace-pre-line">
                              {character.容貌特征}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex gap-2">
                        <div className="w-[66px] flex justify-end">
                          <Badge variant="outline" className="mb-2">
                            {t("身材特征")}
                          </Badge>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <p className="text-sm text-muted-foreground line-clamp-2 cursor-pointer hover:text-primary transition-colors">
                              {character.身材特征}
                            </p>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-[300px] max-h-[300px] overflow-auto">
                            <DropdownMenuItem className="whitespace-pre-line">
                              {character.身材特征}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex gap-2">
                        <div className="w-[66px] flex justify-end">
                          <Badge variant="outline" className="mb-2">
                            {t("头发")}
                          </Badge>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <p className="text-sm text-muted-foreground line-clamp-2 cursor-pointer hover:text-primary transition-colors">
                              {character.头发}
                            </p>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-[300px] max-h-[300px] overflow-auto">
                            <DropdownMenuItem className="whitespace-pre-line">
                              {character.头发}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex gap-2">
                        <div className="w-[66px] flex justify-end">
                          <Badge variant="outline" className="mb-2">
                            {t("服装")}
                          </Badge>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <p className="text-sm text-muted-foreground line-clamp-2 cursor-pointer hover:text-primary transition-colors">
                              {character.服装}
                            </p>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-[300px] max-h-[300px] overflow-auto">
                            <DropdownMenuItem className="whitespace-pre-line">
                              {character.服装}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex gap-2">
                        <div className="w-[66px] flex justify-end">
                          <Badge variant="outline" className="mb-2">
                            {t("特征标签")}
                          </Badge>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <p className="text-sm text-muted-foreground line-clamp-2 cursor-pointer hover:text-primary transition-colors">
                              {character.特征标签}
                            </p>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-[300px] max-h-[300px] overflow-auto">
                            <DropdownMenuItem className="whitespace-pre-line">
                              {character.特征标签}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      {generatedImages[`character_${index}`] && (
                        <div className="flex flex-col gap-1 items-center">
                          <div className="h-[1px] bg-zinc-700 w-full mb-2" />
                          <div className="relative">
                            <img
                              src={generatedImages[`character_${index}`]}
                              alt={`${character.基础信息} - ${getStyleLabel(
                                selectedStyle
                              )}`}
                              className="w-42 object-cover rounded cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() =>
                                handleImageClick(
                                  generatedImages[`character_${index}`]
                                )
                              }
                            />
                            {/* 重新生成按钮 */}
                            <div className="absolute bottom-2 flex justify-between w-full px-2">
                              <div
                                className={cn(
                                  "py-1 px-2 bg-black/40 hover:bg-black/50 text-white border-0 shadow-lg rounded-full",
                                  "flex items-center justify-center"
                                )}
                                onClick={() =>
                                  handleImageClick(
                                    generatedImages[`character_${index}`]
                                  )
                                }
                              >
                                <Maximize2 className="w-3 h-3" />
                              </div>
                              <div
                                className={cn(
                                  "py-1 px-2 bg-black/40 hover:bg-black/50 text-white border-0 shadow-lg rounded-md",
                                  "flex items-center gap-1"
                                )}
                                onClick={() => handleRegenerateCharacter(index)}
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span className="text-xs">{t("重新生成")}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 角色编辑模态框 */}
      {editingCharacterIndex !== null && (
        <CharacterEditModal
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          character={charactersData[editingCharacterIndex]}
          onSave={handleSaveCharacter}
        />
      )}

      {/* 图片预览弹窗 */}
      <ImagePreview
        open={isImagePreviewOpen}
        onOpenChange={setIsImagePreviewOpen}
        src={previewImage || undefined}
        alt="角色图片预览"
        closeButtonPosition="top-right"
      />

      {/* 底部操作浮层 */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-700 shadow-lg">
        <div className="px-6 py-4">
          <div className="flex items-center justify-center">
            {/* 右侧操作按钮 */}

            <Button
              onClick={() => {
                // 下一步操作
                onComplete();
              }}
              disabled={Object.keys(generatedImages).length === 0}
              className="bg-orange-400/80 hover:bg-orange-600 text-white px-6 disabled:opacity-50 disabled:cursor-not-allowed w-[120px]"
            >
              下一步
              <ArrowRight className="w-4 h-4 mr-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
