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

  const handleRegenerateImage = () => {
    onRegenerateImage?.(character?.characterId || "");
  };

  return (
    <div className="flex flex-col flex-shrink-0" key={character.characterId}>
      <div className="w-fit text-sm text-nowrap py-2 px-4 bg-gradient-to-b from-orange-400/50 to-gray-600/30 rounded-t tracking-wider font-bold flex items-center gap-1">
        <span>{character.name}</span>
      </div>
      <div className="w-full rounded-tl-none border-[1px] border-slate-200 dark:border-zinc-700 p-y-3 rounded-b-lg rounded-tr-lg p-3 space-y-1">
        <div className="flex gap-2">
          <div className="w-[66px] flex justify-end">
            <Badge variant="outline" className="mb-2 w-[66px]">
              {tFunc("character.basicInfo")}
            </Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <p className="text-sm text-muted-foreground line-clamp-2 cursor-pointer hover:text-primary transition-colors">
                {character.basicInfo}
              </p>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[300px] max-h-[300px] overflow-auto">
              <DropdownMenuItem className="whitespace-pre-line">
                {character.basicInfo}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex gap-2 items-start">
          <div className="w-[66px] flex justify-end">
            <Badge variant="outline" className="mb-2">
              {tFunc("character.appearanceFeatures")}
            </Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <p className="text-sm text-muted-foreground line-clamp-2 cursor-pointer hover:text-primary transition-colors">
                {character.featureDescription.appearance}
              </p>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[300px] max-h-[300px] overflow-auto">
              <DropdownMenuItem className="whitespace-pre-line">
                {character.featureDescription.appearance}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex gap-2">
          <div className="w-[66px] flex justify-end">
            <Badge variant="outline" className="mb-2">
              {tFunc("character.bodyFeatures")}
            </Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <p className="text-sm text-muted-foreground line-clamp-2 cursor-pointer hover:text-primary transition-colors">
                {character.featureDescription.body}
              </p>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[300px] max-h-[300px] overflow-auto">
              <DropdownMenuItem className="whitespace-pre-line">
                {character.featureDescription.body}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex gap-2">
          <div className="w-[66px] flex justify-end">
            <Badge variant="outline" className="mb-2">
              {tFunc("character.hair")}
            </Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <p className="text-sm text-muted-foreground line-clamp-2 cursor-pointer hover:text-primary transition-colors">
                {character.featureDescription.hair}
              </p>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[300px] max-h-[300px] overflow-auto">
              <DropdownMenuItem className="whitespace-pre-line">
                {character.featureDescription.hair}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex gap-2">
          <div className="w-[66px] flex justify-end">
            <Badge variant="outline" className="mb-2">
              {tFunc("character.clothing")}
            </Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <p className="text-sm text-muted-foreground line-clamp-2 cursor-pointer hover:text-primary transition-colors">
                {character.featureDescription.clothing}
              </p>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[300px] max-h-[300px] overflow-auto">
              <DropdownMenuItem className="whitespace-pre-line">
                {character.featureDescription.clothing}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex gap-2">
          <div className="w-[66px] flex justify-end">
            <Badge variant="outline" className="mb-2">
              {tFunc("character.featureTags")}
            </Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <p className="text-sm text-muted-foreground line-clamp-2 cursor-pointer hover:text-primary transition-colors">
                {character.featureDescription.tags.join(", ")}
              </p>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[300px] max-h-[300px] overflow-auto">
              <DropdownMenuItem className="whitespace-pre-line">
                {character.featureDescription.tags.join(", ")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex justify-center">
          {character.characterImage ? (
            <div className="relative">
              <img
                src={character.characterImage}
                alt={character.name}
                className="w-42 object-cover rounded cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => handleImageClick(character.characterImage)}
              />
              {/* 重新生成按钮 */}
              <div className={cn("absolute bottom-2 flex w-full px-2", canRegenerateImage ? "justify-between" : "justify-end")}>
                <div
                  className={cn(
                    "py-1 px-2 bg-black/40 hover:bg-black/50 text-white border-0 shadow-lg rounded-full",
                    "flex items-center justify-center"
                  )}
                  onClick={() => handleImageClick(character.characterImage)}
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
                  <span className="text-xs">{tFunc("character.regenerate")}</span>
                </div>)}
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="flex justify-center items-center w-[150px] aspect-[3/4] rounded-lg bg-slate-200 dark:bg-zinc-700">
                <span className="text-sm tracking-wider font-bold text-secondary">
                  {tFunc("character.characterImage")}
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
