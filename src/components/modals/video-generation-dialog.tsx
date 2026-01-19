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
}

export function VideoGenerationDialog({
    isOpen,
    onClose,
    onConfirm,
    shot,
    nextShot,
    isGenerating = false
}: VideoGenerationDialogProps) {
    const t = useTranslations('Editor');
    const tCommon = useTranslations('common');

    const [useLastFrame, setUseLastFrame] = useState(false);
    const [lastFrameType, setLastFrameType] = useState<'upload' | 'next_shot'>('next_shot');
    const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // Reset state when opened
    useEffect(() => {
        if (isOpen) {
            setUseLastFrame(false);
            setLastFrameType(nextShot ? 'next_shot' : 'upload');
            setUploadedImageUrl(null);
        }
    }, [isOpen, nextShot]);

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
            if (lastFrameType === 'next_shot' && nextShot?.image_url) {
                lastFrameImageUrl = nextShot.image_url;
            } else if (lastFrameType === 'upload' && uploadedImageUrl) {
                lastFrameImageUrl = uploadedImageUrl;
            } else {
                toast.warning(t('pleaseSelectLastFrame') || "请选择或上传尾帧图片");
                return;
            }
        }

        onConfirm({ lastFrameImageUrl });
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && !isGenerating && onClose()}>
            <DialogContent className="bg-slate-900 border-slate-800 text-slate-200 sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('videoGenerationConfig') || "视频生成配置"}</DialogTitle>
                    <DialogDescription>
                        {t('videoGenerationConfigDesc') || "配置视频生成的首尾帧，以获得更连贯的动态效果。"}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Frames Preview */}
                    <div className="flex items-center justify-between gap-4">
                        {/* First Frame */}
                        <div className="flex-1 space-y-2">
                            <Label className="text-xs text-slate-400">{t('firstFrame') || "首帧 (当前分镜)"}</Label>
                            <div className="aspect-video rounded-md bg-black border border-slate-800 overflow-hidden">
                                {shot.image_url ? (
                                    <img src={shot.image_url} alt="First Frame" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <ImageIcon className="w-6 h-6 text-slate-700" />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center pt-6">
                            <ArrowRight className={`w-5 h-5 ${useLastFrame ? 'text-purple-500' : 'text-slate-700'}`} />
                        </div>

                        {/* Last Frame */}
                        <div className="flex-1 space-y-2">
                            <Label className="text-xs text-slate-400">{t('lastFrame') || "尾帧 (可选)"}</Label>
                            <div className={`aspect-video rounded-md bg-black border ${useLastFrame ? 'border-purple-500/50' : 'border-slate-800'} overflow-hidden relative group`}>
                                {useLastFrame ? (
                                    <>
                                        {lastFrameType === 'next_shot' && nextShot?.image_url ? (
                                            <img src={nextShot.image_url} alt="Next Shot Frame" className="w-full h-full object-cover" />
                                        ) : uploadedImageUrl ? (
                                            <img src={uploadedImageUrl} alt="Uploaded Frame" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Upload className="w-6 h-6 text-slate-700" />
                                            </div>
                                        )}
                                        <button 
                                            onClick={() => setUseLastFrame(false)}
                                            className="absolute top-1 right-1 bg-black/50 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-3 h-3 text-white" />
                                        </button>
                                    </>
                                ) : (
                                    <div 
                                        className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800/50 transition-colors"
                                        onClick={() => setUseLastFrame(true)}
                                    >
                                        <Plus className="w-6 h-6 text-slate-700 mb-1" />
                                        <span className="text-[10px] text-slate-500">{t('addLastFrame') || "添加尾帧"}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Last Frame Options */}
                    {useLastFrame && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex gap-2">
                                {nextShot && (
                                    <Button
                                        variant={lastFrameType === 'next_shot' ? 'default' : 'outline'}
                                        size="sm"
                                        className="flex-1 text-xs h-8"
                                        onClick={() => setLastFrameType('next_shot')}
                                    >
                                        {t('useNextShot') || "使用下一分镜"}
                                    </Button>
                                )}
                                <Button
                                    variant={lastFrameType === 'upload' ? 'default' : 'outline'}
                                    size="sm"
                                    className="flex-1 text-xs h-8"
                                    onClick={() => setLastFrameType('upload')}
                                >
                                    {t('uploadImage') || "上传图片"}
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
                                        className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-slate-700 rounded-lg cursor-pointer hover:bg-slate-800/50 transition-colors"
                                    >
                                        {isUploading ? (
                                            <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
                                        ) : (
                                            <>
                                                <Upload className="w-5 h-5 text-slate-500 mb-1" />
                                                <span className="text-xs text-slate-500">{t('clickToUpload') || "点击上传图片"}</span>
                                            </>
                                        )}
                                    </label>
                                </div>
                            )}
                            
                            {lastFrameType === 'next_shot' && nextShot && (
                                <p className="text-[11px] text-slate-500 text-center">
                                    {t('usingNextShotDesc', { number: nextShot.shot_number }) || `将使用分镜 ${nextShot.shot_number} 的图片作为当前分镜视频的结尾。`}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button 
                        variant="ghost" 
                        onClick={onClose} 
                        disabled={isGenerating}
                        className="text-slate-400 hover:text-white"
                    >
                        {tCommon('cancel')}
                    </Button>
                    <Button 
                        onClick={handleConfirm} 
                        disabled={isGenerating || isUploading || (useLastFrame && lastFrameType === 'upload' && !uploadedImageUrl)}
                        className="bg-purple-600 hover:bg-purple-700 text-white min-w-[100px]"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
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
