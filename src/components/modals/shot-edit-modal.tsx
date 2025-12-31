import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, RotateCcw, Image as ImageIcon, Edit2, Maximize2, Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { IShot } from '@/types/scene';
import { ICharacter } from '@/types/character';
import { IScene } from '@/types/scene';
import shotApi from '@/lib/api/shot';
import { toast } from "sonner";

interface ShotEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    shot: IShot;
    availableCharacters: ICharacter[];
    availableScenes: IScene[];
    onSuccess: () => void;
    onRegenerateImage: (shotId: string, imagePrompt?: string) => void;
    isRegenerating: boolean;
}

export function ShotEditModal({ 
    isOpen, 
    onClose, 
    shot, 
    availableCharacters,
    availableScenes,
    onSuccess,
    onRegenerateImage,
    isRegenerating
}: ShotEditModalProps) {
    const t = useTranslations('Editor');
    const tCommon = useTranslations('common');
    
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Form state
    const [description, setDescription] = useState(shot.description || '');
    const [narration, setNarration] = useState(shot.narration || '');
    const [imagePrompt, setImagePrompt] = useState(shot.image_prompt || '');
    const [sceneId, setSceneId] = useState<string>(String(shot.scene_id));
    const [characterIds, setCharacterIds] = useState<number[]>(
        shot.characters?.map(c => c.character_id) || []
    );

    // Reset form when shot changes
    useEffect(() => {
        if (isOpen && shot) {
            setDescription(shot.description || '');
            setNarration(shot.narration || '');
            setImagePrompt(shot.image_prompt || '');
            setSceneId(String(shot.scene_id));
            // Handle both full character objects (from shot.characters) or just IDs if that's what we get
            const ids = shot.characters?.map(c => c.character_id) || (shot.associated_characters || []);
            setCharacterIds(ids);
            setIsEditing(false); // Reset editing mode
        }
    }, [isOpen, shot]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const shotUuid = shot.uuid || String(shot.shot_id);
            await shotApi.updateShot(shotUuid, {
                description,
                narration,
                image_prompt: imagePrompt,
                scene_id: parseInt(sceneId),
                character_ids: characterIds
            });
            
            toast.success(tCommon('save') + " " + tCommon('success'));
            setIsEditing(false);
            onSuccess();
        } catch (error: any) {
            console.error("Failed to update shot", error);
            toast.error(tCommon('error'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleRegenerate = () => {
        const shotUuid = shot.uuid || String(shot.shot_id);
        // 如果正在编辑，使用当前编辑框里的 prompt
        onRegenerateImage(shotUuid, isEditing ? imagePrompt : undefined);
    };

    const toggleCharacter = (id: number) => {
        if (!isEditing) return;
        setCharacterIds(prev => 
            prev.includes(id) 
                ? prev.filter(cid => cid !== id)
                : [...prev, id]
        );
    };

    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    // Helper to get scene name
    const getSceneName = (id: string) => {
        const s = availableScenes.find(sc => String(sc.scene_id) === id);
        return s ? (s.title || s.location || `Scene ${s.scene_id}`) : id;
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="bg-slate-900 border-slate-800 text-slate-200 sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between">
                            <span>{shot.title || `Shot ${shot.shot_number}`}</span>
                            {!isEditing && (
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setIsEditing(true)}
                                    className="h-8 text-slate-400 hover:text-white"
                                >
                                    <Edit2 size={14} className="mr-2" />
                                    {tCommon('edit')}
                                </Button>
                            )}
                        </DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-6 mt-2">
                        {/* Image Area */}
                        <div className="w-full aspect-video rounded-lg bg-black overflow-hidden border border-slate-800 relative group">
                            {isRegenerating ? (
                                <div className="w-full h-full flex items-center justify-center text-orange-500 gap-2">
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    <span className="text-sm">{tCommon('generating')}</span>
                                </div>
                            ) : shot.image_url ? (
                                <>
                                    <img 
                                        src={shot.image_url} 
                                        alt="Shot" 
                                        className="w-full h-full object-contain cursor-pointer" 
                                        onClick={() => setIsPreviewOpen(true)}
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none" />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white rounded-full"
                                        onClick={() => setIsPreviewOpen(true)}
                                    >
                                        <Maximize2 size={16} />
                                    </Button>
                                </>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-500">
                                    <ImageIcon size={32} className="opacity-50 mb-2" />
                                    <span className="text-xs">{t('noShotImage')}</span>
                                </div>
                            )}
                            
                            {/* Regenerate Button */}
                            <Button
                                variant="secondary"
                                size="sm"
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white border border-white/10 backdrop-blur-md"
                                onClick={handleRegenerate}
                                disabled={isRegenerating}
                            >
                                <RotateCcw size={14} className={`mr-2 ${isRegenerating ? "animate-spin" : ""}`} />
                                {t('regenerate')}
                            </Button>
                        </div>

                        {/* Form / Display Area */}
                        <div className="space-y-4">
                            {/* Scene Selection */}
                            <div className="space-y-2">
                                <Label className="text-xs text-slate-500">{t('scene')}</Label>
                                {isEditing ? (
                                    <Select value={sceneId} onValueChange={setSceneId}>
                                        <SelectTrigger className="bg-slate-800 border-slate-700 h-9 text-sm">
                                            <SelectValue placeholder="Select a scene" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-800 border-slate-700">
                                            {availableScenes.map((s) => (
                                                <SelectItem key={s.scene_id} value={String(s.scene_id)} className="text-slate-200 focus:bg-slate-700">
                                                    {s.location || `Scene ${s.scene_id}`}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <div className="text-sm text-slate-300 bg-slate-800/30 p-2 rounded-md border border-slate-800">
                                        {getSceneName(sceneId)}
                                    </div>
                                )}
                            </div>

                            {/* Character Selection */}
                            <div className="space-y-2">
                                <Label className="text-xs text-slate-500">{t('characters')}</Label>
                                {isEditing ? (
                                    <div className="flex flex-wrap gap-2 bg-slate-800/50 p-3 rounded-md border border-slate-800">
                                        {availableCharacters.map((char) => {
                                            const isSelected = characterIds.includes(char.character_id!);
                                            return (
                                                <Badge
                                                    key={char.character_id}
                                                    variant={isSelected ? "default" : "outline"}
                                                    className={`cursor-pointer transition-all ${
                                                        isSelected 
                                                            ? "bg-blue-600 hover:bg-blue-500 border-transparent" 
                                                            : "border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300"
                                                    }`}
                                                    onClick={() => toggleCharacter(char.character_id!)}
                                                >
                                                    {char.name}
                                                    {isSelected && <X size={12} className="ml-1 opacity-50" />}
                                                    {!isSelected && <Plus size={12} className="ml-1 opacity-50" />}
                                                </Badge>
                                            );
                                        })}
                                        {availableCharacters.length === 0 && (
                                            <span className="text-xs text-slate-500 italic">No characters available</span>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {characterIds.length > 0 ? characterIds.map(id => {
                                            const char = availableCharacters.find(c => c.character_id === id);
                                            return (
                                                <Badge key={id} variant="secondary" className="bg-slate-800 text-slate-300 border border-slate-700">
                                                    {char ? char.name : `ID: ${id}`}
                                                </Badge>
                                            );
                                        }) : (
                                            <span className="text-sm text-slate-500 italic">{tCommon('none')}</span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <Label className="text-xs text-slate-500">{t('description')} (Visual Content)</Label>
                                {isEditing ? (
                                    <Textarea 
                                        value={description} 
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="bg-slate-800 border-slate-700 text-sm min-h-[80px]"
                                        placeholder="Describe what is seen in the shot..."
                                    />
                                ) : (
                                    <div className="text-sm text-slate-300 leading-relaxed bg-slate-800/30 p-3 rounded-md min-h-[40px]">
                                        {description || tCommon('none')}
                                    </div>
                                )}
                            </div>

                            {/* Narration/Dialogue */}
                            <div className="space-y-2">
                                <Label className="text-xs text-slate-500">{t('narration')} / {t('dialogue')}</Label>
                                {isEditing ? (
                                    <Textarea 
                                        value={narration} 
                                        onChange={(e) => setNarration(e.target.value)}
                                        className="bg-slate-800 border-slate-700 text-sm min-h-[60px]"
                                        placeholder="Dialogue or voiceover text..."
                                    />
                                ) : (
                                    <div className="text-sm text-blue-300/90 leading-relaxed bg-slate-800/30 p-3 rounded-md min-h-[40px] italic">
                                        {narration ? `"${narration}"` : tCommon('none')}
                                    </div>
                                )}
                            </div>

                            {/* Image Prompt (Advanced) */}
                            {(isEditing || imagePrompt) && (
                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-500 flex items-center justify-between">
                                        <span>{t('imagePrompt')}</span>
                                        <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">AI Input</span>
                                    </Label>
                                    {isEditing ? (
                                        <Textarea 
                                            value={imagePrompt} 
                                            onChange={(e) => setImagePrompt(e.target.value)}
                                            className="bg-slate-900 border-slate-800 text-xs font-mono text-slate-400 min-h-[80px]"
                                            placeholder={t('enterPrompt')}
                                        />
                                    ) : (
                                        <div className="text-xs text-slate-500 font-mono leading-relaxed bg-black/20 p-3 rounded-md border border-white/5">
                                            {imagePrompt}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {isEditing && (
                        <DialogFooter className="mt-4">
                            <Button variant="ghost" onClick={() => setIsEditing(false)} disabled={isSaving}>
                                {tCommon('cancel')}
                            </Button>
                            <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-500">
                                {isSaving && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                                {tCommon('save')}
                            </Button>
                        </DialogFooter>
                    )}
                </DialogContent>
            </Dialog>

            {/* Fullscreen Preview */}
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent showCloseButton={true} className="bg-transparent border-0 shadow-none max-w-[95vw] max-h-[95vh] p-0 flex items-center justify-center">
                    {shot.image_url && (
                        <img 
                            src={shot.image_url} 
                            alt="Preview" 
                            className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
                        />
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
