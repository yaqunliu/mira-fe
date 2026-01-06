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
import { toast } from 'sonner';
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
        toast.error('拖拽上传仅支持视频和音频文件');
        return;
      }

      // 验证文件大小 (100MB)
      if (file.size > 100 * 1024 * 1024) {
        toast.error('文件大小不能超过100MB');
        return;
      }

      setUploading(true);
      setUploadProgress(0);

      try {
        const res = await assetApi.uploadAsset(file, novelId, (progress) => {
          setUploadProgress(progress);
        });

        if (res.success) {
          toast.success('上传成功');
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
        toast.success('删除成功');
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
            <p className="text-lg font-medium text-blue-400">拖放视频或音频文件到此处</p>
            <p className="text-sm text-slate-300 mt-1">支持 MP4, MOV, MP3, WAV 等格式</p>
          </div>
        </div>
      )}

      {/* 工具栏 */}
      <div className="p-4 space-y-3 border-b border-slate-800">
        {/* 上传提示 */}
        <div className="relative">
          {uploading ? (
            <div className="text-center p-4 border-2 border-blue-500 rounded-lg bg-blue-500/10">
              <Loader2 size={24} className="mx-auto mb-2 text-blue-400 animate-spin" />
              <p className="text-sm font-medium text-blue-400 mb-1">上传中... {uploadProgress}%</p>
              <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="text-center p-4 border-2 border-dashed border-slate-700 rounded-lg bg-slate-800/30 hover:border-blue-500/50 transition-colors">
              <Upload size={24} className="mx-auto mb-2 text-slate-500" />
              <p className="text-sm font-medium text-slate-300 mb-1">拖放文件到此处上传</p>
              <p className="text-xs text-slate-500">支持视频和音频文件，最大100MB</p>
            </div>
          )}
        </div>

        {/* 搜索框 */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <Input
            placeholder="搜索素材..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8 text-sm bg-slate-800/50 border-slate-700"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
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
            全部
          </Button>
          <Button
            variant={selectedType === AssetType.AUDIO ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedType(AssetType.AUDIO)}
            className="flex-1 h-7 text-xs"
          >
            <Music size={12} className="mr-1" />
            音频
          </Button>
          <Button
            variant={selectedType === AssetType.IMAGE ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedType(AssetType.IMAGE)}
            className="flex-1 h-7 text-xs"
          >
            <ImageIcon size={12} className="mr-1" />
            图片
          </Button>
          <Button
            variant={selectedType === AssetType.VIDEO ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedType(AssetType.VIDEO)}
            className="flex-1 h-7 text-xs"
          >
            <Video size={12} className="mr-1" />
            视频
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
                {searchQuery || selectedType !== 'all' ? '没有找到素材' : '暂无素材'}
              </p>
              <p className="text-xs mt-1">拖放视频或音频文件到上方区域上传</p>
            </div>
          ) : (
            filteredAssets.map((asset) => (
              <Card
                key={asset.asset_id}
                draggable
                onDragStart={(e) => handleDragStart(e, asset)}
                onDragEnd={handleDragEnd}
                className={cn(
                  'p-2 bg-slate-800/50 border-slate-700 hover:bg-slate-800 cursor-move',
                  'transition-all hover:border-blue-500/50 group'
                )}
              >
                <div className="flex items-start gap-2">
                  {/* 图标 */}
                  <div
                    className={cn(
                      'p-1.5 rounded border shrink-0',
                      getAssetTypeColor(asset.type)
                    )}
                  >
                    {getAssetIcon(asset.type)}
                  </div>

                  {/* 信息 */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-xs font-medium text-slate-200 truncate leading-tight">
                        {asset.name}
                      </p>
                      <button
                        onClick={() => setDeleteConfirm({ open: true, asset })}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-red-400 shrink-0"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
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
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除素材 "{deleteConfirm.asset?.name}" 吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm({ open: false, asset: null })}
            >
              取消
            </Button>
            <Button
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
