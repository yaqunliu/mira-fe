import { Character } from "@/types";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { ImagePreview } from "@/components/ui/image-preview";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Maximize2 } from "lucide-react";
import { useTranslations } from "next-intl";

function CharactorCard({
  character,
  canRegenerateImage = false,
  onRegenerateImage,
}: {
  character: Character;
  canRegenerateImage?: boolean;
  onRegenerateImage?: (characterId: string) => void;
}) {
  const t = useTranslations();
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const handleImageClick = (imageUrl: string) => {
    setPreviewImage(imageUrl);
  };

  // 兼容两种数据结构：API返回的数据和mock数据
  const char = character as any;
  // 优先使用UUID，如果没有UUID则使用character_id（向后兼容），确保转换为字符串
  const characterId = char.uuid || (char.character_id ? String(char.character_id) : '') || (char.characterId ? String(char.characterId) : '') || "";
  const basicInfo = char.basic_info || char.basicInfo || "";
  const appearance = char.appearance || char.featureDescription?.appearance || "";
  const body = char.body || char.featureDescription?.body || "";
  const hair = char.hair || char.featureDescription?.hair || "";
  const clothing = char.clothing || char.featureDescription?.clothing || "";
  const tags = char.tags || char.featureDescription?.tags || [];
  const imageUrl = char.image_url || char.characterImage || "";

  const handleRegenerateImage = () => {
    onRegenerateImage?.(characterId);
  };

  return (
    <div className="flex flex-col flex-shrink-0" key={characterId}>
      <div className="w-fit text-sm text-nowrap py-2 px-4 bg-gradient-to-b from-orange-400/50 to-gray-600/30 rounded-t tracking-wider font-bold flex items-center gap-1">
        <span>{character.name}</span>
      </div>
      <div className="w-full rounded-tl-none border-[1px] border-slate-200 dark:border-zinc-700 p-y-3 rounded-b-lg rounded-tr-lg p-3 space-y-1">
        <div className="flex gap-2">
          <div className="w-[66px] flex justify-end">
            <Badge variant="outline" className="mb-2 w-[66px]">
              {t("character.basicInfo")}
            </Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <p className="text-sm text-muted-foreground line-clamp-2 cursor-pointer hover:text-primary transition-colors">
                {basicInfo}
              </p>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[300px] max-h-[300px] overflow-auto">
              <DropdownMenuItem className="whitespace-pre-line">
                {basicInfo}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex gap-2 items-start">
          <div className="w-[66px] flex justify-end">
            <Badge variant="outline" className="mb-2">
              {t("character.appearanceFeatures")}
            </Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <p className="text-sm text-muted-foreground line-clamp-2 cursor-pointer hover:text-primary transition-colors">
                {appearance}
              </p>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[300px] max-h-[300px] overflow-auto">
              <DropdownMenuItem className="whitespace-pre-line">
                {appearance}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex gap-2">
          <div className="w-[66px] flex justify-end">
            <Badge variant="outline" className="mb-2">
              {t("character.bodyFeatures")}
            </Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <p className="text-sm text-muted-foreground line-clamp-2 cursor-pointer hover:text-primary transition-colors">
                {body}
              </p>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[300px] max-h-[300px] overflow-auto">
              <DropdownMenuItem className="whitespace-pre-line">
                {body}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex gap-2">
          <div className="w-[66px] flex justify-end">
            <Badge variant="outline" className="mb-2">
              {t("character.hair")}
            </Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <p className="text-sm text-muted-foreground line-clamp-2 cursor-pointer hover:text-primary transition-colors">
                {hair}
              </p>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[300px] max-h-[300px] overflow-auto">
              <DropdownMenuItem className="whitespace-pre-line">
                {hair}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex gap-2">
          <div className="w-[66px] flex justify-end">
            <Badge variant="outline" className="mb-2">
              {t("character.clothing")}
            </Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <p className="text-sm text-muted-foreground line-clamp-2 cursor-pointer hover:text-primary transition-colors">
                {clothing}
              </p>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[300px] max-h-[300px] overflow-auto">
              <DropdownMenuItem className="whitespace-pre-line">
                {clothing}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex gap-2">
          <div className="w-[66px] flex justify-end">
            <Badge variant="outline" className="mb-2">
              {t("character.featureTags")}
            </Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <p className="text-sm text-muted-foreground line-clamp-2 cursor-pointer hover:text-primary transition-colors">
                {Array.isArray(tags) ? tags.join(", ") : tags}
              </p>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[300px] max-h-[300px] overflow-auto">
              <DropdownMenuItem className="whitespace-pre-line">
                {Array.isArray(tags) ? tags.join(", ") : tags}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex justify-center">
          {imageUrl ? (
            <div className="relative">
              <img
                src={imageUrl}
                alt={character.name}
                className="w-42 object-cover rounded cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => handleImageClick(imageUrl)}
              />
              {/* 重新生成按钮 */}
              <div className={cn("absolute bottom-2 flex w-full px-2", canRegenerateImage ? "justify-between" : "justify-end")}>
                <div
                  className={cn(
                    "py-1 px-2 bg-black/40 hover:bg-black/50 text-white border-0 shadow-lg rounded-full",
                    "flex items-center justify-center"
                  )}
                  onClick={() => handleImageClick(imageUrl)}
                >
                  <Maximize2 className="w-3 h-3" />
                </div>
                {canRegenerateImage && (<div
                  className={cn(
                    "py-1 px-2 bg-black/40 hover:bg-black/50 text-white border-0 shadow-lg rounded-md",
                    "flex items-center gap-1"
                  )}
                  onClick={() => handleRegenerateImage()}
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="text-xs">{t("character.regenerate")}</span>
                </div>)}
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="flex justify-center items-center w-[150px] aspect-[3/4] rounded-lg bg-slate-200 dark:bg-zinc-700">
                <span className="text-sm tracking-wider font-bold text-secondary">
                  {t("character.characterImage")}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
      {previewImage && (
        <ImagePreview
          open={previewImage !== null}
          onOpenChange={() => setPreviewImage(null)}
          src={previewImage}
          alt="角色形象"
        />
      )}
    </div>
  );
}

export default CharactorCard;
