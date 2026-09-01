'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  Music,
  Image as ImageIcon,
  Video,
  Trash2,
  Loader2,
  FileAudio,
  X,
  Search
} from 'lucide-react';
import { IAsset, AssetType } from '@/types/asset';
import assetApi from '@/lib/api/asset';
import { toast } from 'sonner'
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AssetManagerProps {
  novelId: number;
  assets: IAsset[];
  onAssetsChange: () => void;
}

export const AssetManager: React.FC<AssetManagerProps> = ({
  novelId,
  assets,
  onAssetsChange,
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<AssetType | 'all'>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; asset: IAsset | null }>({
    open: false,
    asset: null,
  });
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dragCounterRef = useRef(0);

  // 文件过滤器
  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || asset.type === selectedType;
    return matchesSearch && matchesType;
  });

  // 处理文件上传（通用函数）
  const uploadFile = useCallback(
    async (file: File) => {
      // 验证文件类型 - 只支持视频和音频
      const validTypes = ['audio/', 'video/'];
      if (!validTypes.some((type) => file.type.startsWith(type))) {
        toast.error(t('onlyVideoAudio'));
        return;
      }

      // 验证文件大小 (100MB)
      if (file.size > 100 * 1024 * 1024) {
        toast.error(t('fileTooLargeMax', { size: '100MB' }));
        return;
      }

      setUploading(true);
      setUploadProgress(0);

      try {
        const res = await assetApi.uploadAsset(file, novelId, (progress) => {
          setUploadProgress(progress);
        });

        if (res.success) {
          toast.success(t('uploadSuccess'));
          onAssetsChange();
        } else {
          toast.error(res.message || '上传失败');
        }
      } catch (error: any) {
        console.error('Upload error:', error);
        toast.error(error.message || '上传失败');
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    },
    [novelId, onAssetsChange]
  );

  // 处理拖拽进入
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    dragCounterRef.current += 1;

    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingOver(true);
    }
  }, []);

  // 处理拖拽悬停
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // 处理拖拽离开
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    dragCounterRef.current -= 1;

    if (dragCounterRef.current === 0) {
      setIsDraggingOver(false);
    }
  }, []);

  // 处理文件拖放
  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      setIsDraggingOver(false);
      dragCounterRef.current = 0;

      const files = e.dataTransfer.files;
      if (!files || files.length === 0) return;

      const file = files[0];
      await uploadFile(file);
    },
    [uploadFile]
  );

  // 处理删除
  const handleDelete = useCallback(async () => {
    if (!deleteConfirm.asset) return;

    try {
      const res = await assetApi.deleteAsset(
        deleteConfirm.asset.uuid || String(deleteConfirm.asset.asset_id)
      );

      if (res.success) {
        toast.success(t('deleteSuccess'));
        onAssetsChange();
      } else {
        toast.error(res.message || '删除失败');
      }
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.message || '删除失败');
    } finally {
      setDeleteConfirm({ open: false, asset: null });
    }
  }, [deleteConfirm.asset, onAssetsChange]);

  // 处理拖拽开始
  const handleDragStart = useCallback((event: React.DragEvent, asset: IAsset) => {
    // 计算鼠标在卡片上的Y轴偏移(保持垂直居中的拖拽效果)
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const offsetY = event.clientY - rect.top;

    // 设置拖拽图像,让素材卡片的左侧边缘对齐到鼠标位置
    // offsetX设为0,表示鼠标位置对应素材的左侧边缘
    event.dataTransfer.setDragImage(event.currentTarget as HTMLElement, 0, offsetY);

    event.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        type: 'asset',
        assetType: asset.type,
        url: asset.url,
        name: asset.name,
        duration: asset.duration,
      })
    );
    event.dataTransfer.effectAllowed = 'copy';

    // 将素材类型存储到 window 对象,供 timeline 使用
    (window as any).__draggingAssetType = asset.type;
  }, []);

  // 处理拖拽结束
  const handleDragEnd = useCallback(() => {
    // 清除 window 对象中的素材类型
    delete (window as any).__draggingAssetType;
  }, []);

  // 获取资产图标
  const getAssetIcon = (type: AssetType) => {
    switch (type) {
      case AssetType.AUDIO:
        return <Music size={16} />;
      case AssetType.IMAGE:
        return <ImageIcon size={16} />;
      case AssetType.VIDEO:
        return <Video size={16} />;
      default:
        return <FileAudio size={16} />;
    }
  };

  // 获取资产类型颜色
  const getAssetTypeColor = (type: AssetType) => {
    switch (type) {
      case AssetType.AUDIO:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case AssetType.IMAGE:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case AssetType.VIDEO:
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  // 格式化文件大小
  const formatSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // 格式化时长(从毫秒转换为 MM:SS 格式)
  const formatDuration = (milliseconds?: number) => {
    if (!milliseconds) return '-';
    const totalSeconds = Math.floor(milliseconds / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="h-full flex flex-col relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 拖拽覆盖层 */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 bg-blue-600/20 backdrop-blur-sm border-2 border-dashed border-blue-400 flex items-center justify-center">
          <div className="text-center">
            <Upload size={48} className="mx-auto mb-3 text-blue-400" />
            <p className="text-lg font-medium text-blue-400">{t("dropVideoAudio")}</p>
            <p className="text-sm text-slate-300 mt-1">支持 MP4, MOV, MP3, WAV 等格式</p>
          </div>
        </div>
      )}

      {/* 工具栏 */}
      <div className="p-4 space-y-3 shadow-[0_2px_4px_rgba(173,221,230,0.2)]">
        {/* 上传提示 */}
        <div className="relative">
          {uploading ? (
            <div className="text-center p-4 rounded-lg bg-[#ADD8E6]/30 shadow-[4px_4px_8px_rgba(173,221,230,0.3),-2px_-2px_4px_rgba(255,255,255,0.7)] hover:shadow-[6px_6px_12px_rgba(173,221,230,0.4),-4px_-4px_8px_rgba(255,255,255,0.8)] transition-all duration-300">
              <Loader2 size={24} className="mx-auto mb-2 text-[#22C55E] animate-spin" />
              <p className="text-sm font-medium text-[#22C55E] mb-1">上传中... {uploadProgress}%</p>
              <div className="w-full h-1 bg-white rounded-full overflow-hidden shadow-[inset_1px_1px_2px_rgba(173,221,230,0.3),inset_-1px_-1px_2px_rgba(255,255,255,0.7)]">
                <div
                  className="h-full bg-[#22C55E] transition-all duration-300 shadow-[2px_2px_4px_rgba(173,221,230,0.3),-1px_-1px_3px_rgba(255,255,255,0.7)]"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="text-center p-4 rounded-lg bg-white shadow-[4px_4px_8px_rgba(173,221,230,0.3),-2px_-2px_4px_rgba(255,255,255,0.7)] hover:shadow-[6px_6px_12px_rgba(173,221,230,0.4),-4px_-4px_8px_rgba(255,255,255,0.8)] transition-all duration-300">
              <Upload size={24} className="mx-auto mb-2 text-[#22C55E]" />
              <p className="text-sm font-medium text-gray-800 mb-1">{t("dragDropHere")}</p>
              <p className="text-xs text-gray-600">{t("dropFilesSupported")}</p>
            </div>
          )}
        </div>

        {/* 搜索框 */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
          <Input
            placeholder={t("searchAssets")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8 text-sm bg-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* 类型过滤 */}
        <div className="flex gap-1">
          <Button
            variant={selectedType === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedType('all')}
            className="flex-1 h-7 text-xs"
          >
            {t("selectAll", { default: "All" })}
          </Button>
          <Button
            variant={selectedType === AssetType.AUDIO ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedType(AssetType.AUDIO)}
            className="flex-1 h-7 text-xs"
          >
            <Music size={12} className="mr-1" />
            {t("audio", { default: "Audio" })}
          </Button>
          <Button
            variant={selectedType === AssetType.IMAGE ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedType(AssetType.IMAGE)}
            className="flex-1 h-7 text-xs"
          >
            <ImageIcon size={12} className="mr-1" />
            {t("image")}
          </Button>
          <Button
            variant={selectedType === AssetType.VIDEO ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedType(AssetType.VIDEO)}
            className="flex-1 h-7 text-xs"
          >
            <Video size={12} className="mr-1" />
            {t("video", { default: "Video" })}
          </Button>
        </div>
      </div>

      {/* 素材列表 - 使用网格布局,一行两个 */}
      <ScrollArea className="flex-1">
        <div className="p-4 grid grid-cols-2 gap-2">
          {filteredAssets.length === 0 ? (
            <div className="col-span-2 text-center py-12 text-slate-500">
              <FileAudio size={48} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">
                {searchQuery || selectedType !== 'all' ? t('noAssetsFound') : t('noAssets')}
              </p>
              <p className="text-xs mt-1">{t("dropVideoAudio")}</p>
            </div>
          ) : (
            filteredAssets.map((asset) => (
              <Card
                key={asset.asset_id}
                draggable
                onDragStart={(e) => handleDragStart(e, asset)}
                onDragEnd={handleDragEnd}
                className={cn(
                  'p-3 cursor-move transition-all hover:shadow-xl hover:shadow-[#ADD8E6]/40 group'
                )}
              >
                <div className="flex items-start gap-2">
                  {/* 图标 */}
                  <div
                    className={cn(
                      'p-2 rounded-lg shrink-0 shadow-[2px_2px_4px_rgba(173,221,230,0.3),-1px_-1px_3px_rgba(255,255,255,0.7)]',
                      asset.type === AssetType.AUDIO ? 'bg-[#FDBCB4]' : asset.type === AssetType.IMAGE ? 'bg-[#ADD8E6]' : 'bg-[#22C55E] text-white'
                    )}
                  >
                    {getAssetIcon(asset.type)}
                  </div>

                  {/* 信息 */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-xs font-medium text-gray-800 truncate leading-tight">
                        {asset.name}
                      </p>
                      <button
                        onClick={() => setDeleteConfirm({ open: true, asset })}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 hover:text-red-500 shrink-0 p-1 rounded hover:bg-gray-100"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
                      <span>{formatSize(asset.size)}</span>
                      {asset.duration && (
                        <>
                          <span>•</span>
                          <span>{formatDuration(asset.duration)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* 删除确认对话框 */}
      <Dialog open={deleteConfirm.open} onOpenChange={(open) => !open && setDeleteConfirm({ open: false, asset: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteConfirmTitle")}</DialogTitle>
            <DialogDescription>
              确定要删除素材 "{deleteConfirm.asset?.name}" 吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm({ open: false, asset: null })}
            >{t("cancel")}</Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >{t("delete")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
