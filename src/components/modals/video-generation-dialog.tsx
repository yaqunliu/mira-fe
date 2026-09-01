import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { IShot } from '@/types/scene';
import { Loader2, Image as ImageIcon, Upload, ArrowRight, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from "sonner";
import assetApi from '@/lib/api/asset';

interface VideoGenerationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: { lastFrameImageUrl?: string }) => void;
    shot: IShot;
    nextShot?: IShot;
    isGenerating?: boolean;
    aspectRatio?: "16:9" | "9:16";
}

import { cn } from '@/lib/utils';

export function VideoGenerationDialog({
    isOpen,
    onClose,
    onConfirm,
    shot,
    nextShot,
    isGenerating = false,
    aspectRatio = "16:9"
}: VideoGenerationDialogProps) {
    const t = useTranslations('Editor');
    const tCommon = useTranslations('common');

    const [useLastFrame, setUseLastFrame] = useState(false);
    const [lastFrameType, setLastFrameType] = useState<'upload' | 'next_shot' | 'current_shot_end'>('next_shot');
    const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // Check if current shot has end frame
    const currentShotEndFrameUrl = (shot.extra_data as any)?.end_frame_image_url;

    // Reset state when opened
    useEffect(() => {
        if (isOpen) {
            // Default to current shot end frame if available
            if (currentShotEndFrameUrl) {
                setUseLastFrame(true);
                setLastFrameType('current_shot_end');
            } else {
                setUseLastFrame(false);
                setLastFrameType(nextShot ? 'next_shot' : 'upload');
            }
            setUploadedImageUrl(null);
        }
    }, [isOpen, nextShot, currentShotEndFrameUrl]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            // Convert to base64 for immediate preview and use
            const reader = new FileReader();
            reader.onloadend = () => {
                setUploadedImageUrl(reader.result as string);
                setIsUploading(false);
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error("Failed to upload image", error);
            toast.error(tCommon('error'));
            setIsUploading(false);
        }
    };

    const handleConfirm = () => {
        let lastFrameImageUrl: string | undefined = undefined;

        if (useLastFrame) {
            if (lastFrameType === 'current_shot_end' && currentShotEndFrameUrl) {
                lastFrameImageUrl = currentShotEndFrameUrl;
            } else if (lastFrameType === 'next_shot' && nextShot?.image_url) {
                lastFrameImageUrl = nextShot.image_url;
            } else if (lastFrameType === 'upload' && uploadedImageUrl) {
                lastFrameImageUrl = uploadedImageUrl;
            } else {
                toast.warning(t('pleaseSelectLastFrame') || t("pleaseSelectLastFrame"));
                return;
            }
        }

        onConfirm({ lastFrameImageUrl });
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && !isGenerating && onClose()}>
            <DialogContent className="bg-gradient-to-br from-white to-blue-50 border border-blue-100 text-gray-800 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] rounded-2xl sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-gray-800">{t('videoGenerationConfig') || t("videoGenerationConfig")}</DialogTitle>
                    <DialogDescription className="text-gray-600">
                        {t('videoGenerationConfigDesc') || t("videoGenerationConfigDesc")}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Frames Preview */}
                    <div className="flex items-center justify-between gap-4">
                        {/* First Frame */}
                        <div className="flex-1 space-y-2">
                            <Label className="text-xs text-gray-600">{t('firstFrame') || t("firstFrame")}</Label>
                            <div className={cn(
                                "rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 overflow-hidden shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)]",
                                aspectRatio === "9:16" ? "aspect-[9/16]" : "aspect-video"
                            )}>
                                {shot.image_url ? (
                                    <img src={shot.image_url} alt="First Frame" className="w-full h-full object-cover rounded-xl" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-100 to-blue-200">
                                        <ImageIcon className="w-6 h-6 text-white" />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center pt-6">
                            <ArrowRight className={`w-5 h-5 ${useLastFrame ? 'text-green-500' : 'text-gray-400'}`} />
                        </div>

                        {/* Last Frame */}
                        <div className="flex-1 space-y-2">
                            <Label className="text-xs text-gray-600">{t('lastFrame') || t("lastFrame")}</Label>
                            <div className={cn(
                                `rounded-xl overflow-hidden relative group shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)]`,
                                useLastFrame 
                                  ? "border-2 border-#22C55E bg-gradient-to-br from-white to-blue-50"
                                  : "border border-blue-100 bg-gradient-to-br from-white to-blue-50",
                                aspectRatio === "9:16" ? "aspect-[9/16]" : "aspect-video"
                            )}>
                                {useLastFrame ? (
                                    <>
                                        {lastFrameType === 'next_shot' && nextShot?.image_url ? (
                                            <img src={nextShot.image_url} alt="Next Shot Frame" className="w-full h-full object-cover rounded-xl" />
                                        ) : lastFrameType === 'current_shot_end' && currentShotEndFrameUrl ? (
                                            <img src={currentShotEndFrameUrl} alt="Current Shot End Frame" className="w-full h-full object-cover rounded-xl" />
                                        ) : uploadedImageUrl ? (
                                            <img src={uploadedImageUrl} alt="Uploaded Frame" className="w-full h-full object-cover rounded-xl" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-100 to-blue-200">
                                                <ImageIcon className="w-6 h-6 text-white" />
                                            </div>
                                        )}
                                        <button
                                            onClick={() => setUseLastFrame(false)}
                                            className="absolute top-2 right-2 bg-white/80 rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-3 h-3 text-gray-800" />
                                        </button>
                                    </>
                                ) : (
                                    <div
                                        className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-gradient-to-br from-blue-50 to-white transition-colors"
                                        onClick={() => setUseLastFrame(true)}
                                    >
                                        <Plus className="w-6 h-6 text-green-500 mb-1" />
                                        <span className="text-[10px] text-gray-600">{t('addLastFrame') || t("addLastFrame")}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Last Frame Options */}
                    {useLastFrame && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex gap-2 flex-wrap">
                                {currentShotEndFrameUrl && (
                                    <Button
                                        variant={lastFrameType === 'current_shot_end' ? 'default' : 'outline'}
                                        size="sm"
                                        className={`flex-1 text-xs h-8 ${lastFrameType === 'current_shot_end' ? 'rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white shadow-[4px_4px_12px_rgba(0,0,0,0.1),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200' : 'rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 text-gray-800 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200'}`}
                                        onClick={() => setLastFrameType('current_shot_end')}
                                    >
                                        {t("currentShotTailFrame")}
                                    </Button>
                                )}
                                {nextShot && (
                                    <Button
                                        variant={lastFrameType === 'next_shot' ? 'default' : 'outline'}
                                        size="sm"
                                        className={`flex-1 text-xs h-8 ${lastFrameType === 'next_shot' ? 'rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white shadow-[4px_4px_12px_rgba(0,0,0,0.1),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200' : 'rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 text-gray-800 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200'}`}
                                        onClick={() => setLastFrameType('next_shot')}
                                    >
                                        {t('useNextShot') || t("useNextShot")}
                                    </Button>
                                )}
                                <Button
                                    variant={lastFrameType === 'upload' ? 'default' : 'outline'}
                                    size="sm"
                                    className={`flex-1 text-xs h-8 ${lastFrameType === 'upload' ? 'rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white shadow-[4px_4px_12px_rgba(0,0,0,0.1),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200' : 'rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 text-gray-800 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200'}`}
                                    onClick={() => setLastFrameType('upload')}
                                >
                                    {t('uploadImage') || t("uploadImage")}
                                </Button>
                            </div>

                            {lastFrameType === 'upload' && (
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                        id="tail-frame-upload"
                                    />
                                    <label
                                        htmlFor="tail-frame-upload"
                                        className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-blue-200 rounded-xl cursor-pointer hover:bg-blue-50 transition-colors bg-gradient-to-br from-white to-blue-50"
                                    >
                                        {isUploading ? (
                                            <Loader2 className="w-5 h-5 animate-spin text-green-500" />
                                        ) : (
                                            <>
                                                <Upload className="w-5 h-5 text-green-500 mb-1" />
                                                <span className="text-xs text-gray-600">{t('clickToUpload') || t("clickToUpload")}</span>
                                            </>
                                        )}
                                    </label>
                                </div>
                            )}

                            {lastFrameType === 'next_shot' && nextShot && (
                                <p className="text-[11px] text-gray-600 text-center">
                                    {t('usingNextShotDesc', { number: nextShot.shot_number }) || `将使用分镜 ${nextShot.shot_number} 的图片作为当前分镜视频的结尾。`}
                                </p>
                            )}

                            {lastFrameType === 'current_shot_end' && currentShotEndFrameUrl && (
                                <p className="text-[11px] text-gray-600 text-center">
                                    将使用当前分镜的尾帧图片作为视频的结尾。
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-3 sm:gap-0">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        disabled={isGenerating}
                        className="rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200"
                    >
                        {tCommon('cancel')}
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={isGenerating || isUploading || (useLastFrame && lastFrameType === 'upload' && !uploadedImageUrl)}
                        className="rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white shadow-[4px_4px_12px_rgba(0,0,0,0.1),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200 min-w-[100px]"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2 text-white" />
                                {tCommon('processing')}
                            </>
                        ) : (
                            t('startGeneration') || "开始生成"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function Plus({ className, ...props }: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M5 12h14" />
            <path d="M12 5v14" />
        </svg>
    )
}
