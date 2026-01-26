"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    FileText,
    User,
    Calendar,
    ChevronLeft,
    Pencil,
    Plus,
    Check,
    X,
    Trash2,
    BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { scriptApi } from "@/lib/api/script";
import { formatDate, cn } from "@/lib/utils";
import type { ScriptGroup as Script, ScriptItem } from "@/lib/api/script";
import LoadingIcon from "@/components/ui/loading-icon";
import { toast } from "sonner";
import creationApi from "@/lib/api/creation";
import { useConfirm } from "@/hooks/use-confirm";

export default function ScriptDetailPage() {
    const router = useRouter();
    const params = useParams();
    const t = useTranslations();
    const locale = params?.locale as string;
    const scriptId = params?.id as string;
    const queryClient = useQueryClient();
    const { confirm, ConfirmDialog: ConfirmDialogComponent } = useConfirm();

    // 编辑状态
    const [editingScriptTitle, setEditingScriptTitle] = useState(false);
    const [scriptTitleValue, setScriptTitleValue] = useState("");
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [itemTitleValue, setItemTitleValue] = useState("");
    const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
    const [isAddingItem, setIsAddingItem] = useState(false);
    const [newItemTitle, setNewItemTitle] = useState("");
    const [newItemContent, setNewItemContent] = useState("");
    
    // 章节分页状态
    const [itemPage, setItemPage] = useState(1);
    const [itemPageInput, setItemPageInput] = useState("");
    const itemPageSize = 10;

    const {
        data: scriptResponse,
        isLoading,
        error,
    } = useQuery({
        queryKey: ["script", scriptId],
        queryFn: () => scriptApi.getScript(scriptId),
        enabled: !!scriptId,
    });

    // 创建文案的mutation
    const createItemMutation = useMutation({
        mutationFn: (data: { title: string; content: string }) =>
            scriptApi.createScriptItem(scriptId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["scriptItems", scriptId] });
            setIsAddingItem(false);
            setNewItemTitle("");
            setNewItemContent("");
            toast.success("添加成功");
        },
        onError: (error) => {
            toast.error("添加失败");
            console.error(error);
        },
    });

    // 更新文案组标题的mutation
    const updateScriptMutation = useMutation({
        mutationFn: (title: string) => scriptApi.updateScript(scriptId, { title }),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["script", scriptId] });
            queryClient.invalidateQueries({ queryKey: ["scripts"] });
            setEditingScriptTitle(false);
            setScriptTitleValue("");
            toast.success("更新成功");
        },
        onError: (error) => {
            toast.error("更新失败");
            console.error("更新标题失败:", error);
        },
    });

    // 更新文案标题的mutation
    const updateItemMutation = useMutation({
        mutationFn: ({ itemUuid, title }: { itemUuid: string; title: string }) =>
            scriptApi.updateScriptItem(scriptId, itemUuid, { title }),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["script", scriptId] });
            queryClient.invalidateQueries({ queryKey: ["scriptItems", scriptId] });
            setEditingItemId(null);
            setItemTitleValue("");
            toast.success(t("common.success"));
        },
        onError: (error) => {
            toast.error(t("common.error"));
            console.error("更新标题失败:", error);
        },
    });

    // 删除文案的mutation
    const deleteItemMutation = useMutation({
        mutationFn: (itemUuid: string) =>
            scriptApi.deleteScriptItem(scriptId, itemUuid),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["script", scriptId] });
            queryClient.invalidateQueries({ queryKey: ["scriptItems", scriptId] });
            setDeletingItemId(null);
            toast.success(t("common.success"));
        },
        onError: (error) => {
            toast.error(t("common.error"));
            console.error("删除失败:", error);
            setDeletingItemId(null);
        },
    });

    const scriptData = (scriptResponse as any)?.data?.data || (scriptResponse as any)?.data;
    const script = scriptData as Script;

    const {
        data: itemsResponse,
        isLoading: isItemsLoading,
        error: itemsError,
    } = useQuery({
        queryKey: ["scriptItems", scriptId, itemPage, itemPageSize],
        queryFn: () => scriptApi.getScriptItems(scriptId, { page: itemPage, page_size: itemPageSize }),
        enabled: !!scriptId,
    });

    const itemsData = itemsResponse as any;
    const finalItems =
        itemsData?.data?.data ||
        itemsData?.data?.items ||
        itemsData?.data ||
        itemsData?.items ||
        (Array.isArray(itemsData) ? itemsData : []);

    const itemsTotal = itemsData?.data?.total || itemsData?.total || finalItems.length;
    const itemsTotalPages = Math.ceil(itemsTotal / itemPageSize);

    useEffect(() => {
        if (!isItemsLoading && finalItems.length === 0 && itemPage > 1 && itemsTotalPages > 0) {
            const targetPage = Math.max(1, itemsTotalPages);
            setItemPage(targetPage);
            setItemPageInput("");
        }
    }, [finalItems.length, itemPage, itemsTotalPages, isItemsLoading]);

    const handleCreateVideo = async (itemUuid?: string) => {
        // 获取实际的类型（novel 或 script）
        const contentType = script?.type || 'script';

        if (!itemUuid) {
            router.push(`/${locale}/create-dynamic-comic?novel=${scriptId}&type=${contentType}`);
            return;
        }

        try {
            const creationResponse = await creationApi.queryCreationByChapterId(String(itemUuid));
            if (creationResponse?.data) {
                const creationUuid = (creationResponse.data as any).uuid || (creationResponse.data as any).creation_id;
                if (creationUuid) {
                    router.push(`/${locale}/dynamic-comic-editor?taskId=${creationUuid}`);
                    return;
                }
            }
        } catch (error) { }

        router.push(`/${locale}/create-dynamic-comic?novel=${scriptId}&chapter=${itemUuid}&type=${contentType}`);
    };

    const handleStartEditScriptTitle = () => {
        if (script) {
            setScriptTitleValue(script.title);
            setEditingScriptTitle(true);
        }
    };

    const handleSaveScriptTitle = () => {
        if (scriptTitleValue.trim() && scriptTitleValue !== script?.title) {
            updateScriptMutation.mutate(scriptTitleValue.trim());
        } else {
            setEditingScriptTitle(false);
        }
    };

    const handleStartEditItemTitle = (item: ScriptItem) => {
        setItemTitleValue(item.title);
        setEditingItemId(item.uuid);
    };

    const handleSaveItemTitle = (itemUuid: string) => {
        if (itemTitleValue.trim()) {
            updateItemMutation.mutate({ itemUuid, title: itemTitleValue.trim() });
        } else {
            setEditingItemId(null);
        }
    };

    const handleDeleteItem = async (itemUuid: string, itemTitle: string) => {
        const confirmed = await confirm({
            title: t("common.delete"),
            description: t("novelDetail.deleteChapterConfirm", { title: itemTitle }),
            confirmText: t("common.confirm"),
            cancelText: t("common.cancel"),
            variant: "destructive",
        });
        if (confirmed) {
            setDeletingItemId(itemUuid);
            deleteItemMutation.mutate(itemUuid);
        }
    };

    const handleAddItem = () => {
        createItemMutation.mutate({ 
            title: newItemTitle, 
            content: newItemContent
        });
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-white to-gray-50/80">
                <div className="container mx-auto px-4 py-8 lg:px-8">
                    <div className="max-w-5xl mx-auto">
                        <div className="animate-pulse space-y-6">
                            {/* 返回按钮骨架屏 */}
                            <div className="h-10 bg-gradient-to-r from-[#FDBCB4]/20 to-[#ADD8E6]/20 rounded-xl w-24 shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]"></div>
                            
                            {/* 主卡片骨架屏 */}
                            <div className="h-48 bg-white rounded-2xl shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)] p-6">
                                <div className="flex items-center gap-4">
                                    {/* 图标骨架屏 */}
                                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#ADD8E6] to-[#FDBCB4] shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]"></div>
                                    
                                    {/* 标题和信息骨架屏 */}
                                    <div className="flex-1 space-y-3">
                                        <div className="h-10 bg-gradient-to-r from-[#FDBCB4]/20 to-[#ADD8E6]/20 rounded-lg w-3/4 shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]"></div>
                                        <div className="flex flex-wrap gap-2">
                                            <div className="h-6 bg-gradient-to-r from-[#FDBCB4]/20 to-[#ADD8E6]/20 rounded-full px-3 shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]"></div>
                                            <div className="h-6 bg-gradient-to-r from-[#FDBCB4]/20 to-[#ADD8E6]/20 rounded-full px-3 shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]"></div>
                                            <div className="h-6 bg-gradient-to-r from-[#FDBCB4]/20 to-[#ADD8E6]/20 rounded-full px-3 shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* 章节列表标题骨架屏 */}
                            <div className="h-10 bg-gradient-to-r from-[#FDBCB4]/20 to-[#ADD8E6]/20 rounded-lg w-1/3 shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]"></div>
                            
                            {/* 章节项骨架屏 */}
                            <div className="space-y-4">
                                <div className="h-20 bg-white rounded-2xl shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)] p-4"></div>
                                <div className="h-20 bg-white rounded-2xl shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)] p-4"></div>
                                <div className="h-20 bg-white rounded-2xl shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)] p-4"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !script) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-gray-50/50 via-white to-gray-100/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-[#FDBCB4]/20 to-[#ADD8E6]/20 flex items-center justify-center mb-6 shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]">
                    <FileText className="h-10 w-10 text-[#ADD8E6]" />
                </div>
                <h2 className="text-2xl font-bold mb-3 bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">文案未找到</h2>
                <Button onClick={() => router.push(`/${locale}/scripts`)} variant="outline" className="mt-2 border-[#ADD8E6] text-[#ADD8E6] hover:bg-[#ADD8E6]/10 hover:text-[#ADD8E6] shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]">
                    返回列表
                </Button>
            </div>
        );
    }

    const renderItems = () => {
        if (isItemsLoading && !finalItems?.length) {
            return (
                <div className="flex items-center justify-center py-20">
                    <LoadingIcon />
                </div>
            );
        }

        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex items-center justify-between border-b border-gray-200/30 pb-6">
                    <div className="space-y-1">
                        <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                            {script.type === 'novel' ? '章节列表' : '文案列表'}
                        </h2>
                        <p className="text-sm text-gray-600">
                            {script.type === 'novel' 
                                ? `管理您的小说章节，共 ${itemsTotal} 章`
                                : `管理您的分镜脚本和文案内容，共 ${itemsTotal} 篇`
                            }
                        </p>
                    </div>
                    {script.type === 'script' && (
                        <Button 
                            onClick={() => setIsAddingItem(true)} 
                            className="rounded-full px-6 bg-gradient-to-r from-[#FDBCB4] to-[#F9A899] hover:from-[#F9A899] hover:to-[#F69689] text-white shadow-[4px_4px_8px_rgba(253,188,180,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)] hover:shadow-[6px_6px_12px_rgba(253,188,180,0.3),-4px_-4px_8px_rgba(255,255,255,0.8)] transition-all hover:scale-105"
                        >
                            <Plus className="h-4 w-4 mr-2" /> 
                            新增文案
                        </Button>
                    )}
                </div>

                {isAddingItem && (
                    <div className="relative overflow-hidden rounded-2xl shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)] bg-gradient-to-br from-white to-gray-50/80 animate-in slide-in-from-top-4 duration-300">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#ADD8E6]/10 via-transparent to-transparent pointer-events-none" />
                        <div className="p-6 space-y-6 relative">
                            <div className="space-y-2">
                                <label className="text-sm font-medium bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">标题</label>
                                <Input
                                    placeholder="给文案起个好听的名字"
                                    value={newItemTitle}
                                    onChange={(e) => setNewItemTitle(e.target.value)}
                                    className="bg-white shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">内容</label>
                                <div className="relative">
                                    <Textarea
                                        placeholder="在此输入文案内容..."
                                        value={newItemContent}
                                        onChange={(e) => {
                                            if (e.target.value.length <= 3000) {
                                                setNewItemContent(e.target.value);
                                            }
                                        }}
                                        maxLength={3000}
                                        className="min-h-[200px] bg-white shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)] transition-all resize-y leading-relaxed pb-8"
                                    />
                                    <div className="absolute bottom-2 right-3 text-xs text-[#ADD8E6]">
                                        {newItemContent.length}/3000
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <Button variant="ghost" onClick={() => setIsAddingItem(false)} className="hover:bg-[#ADD8E6]/10 text-[#ADD8E6] hover:text-[#ADD8E6] shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]">取消</Button>
                                <Button
                                    onClick={handleAddItem}
                                    disabled={!newItemTitle.trim() || !newItemContent.trim() || createItemMutation.isPending}
                                    className="min-w-[100px] bg-gradient-to-r from-[#FDBCB4] to-[#F9A899] hover:from-[#F9A899] hover:to-[#F69689] text-white shadow-[4px_4px_8px_rgba(253,188,180,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {createItemMutation.isPending ? <LoadingIcon /> : "确认添加"}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {!finalItems?.length ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center rounded-2xl border border-dashed border-[#ADD8E6]/30 bg-gradient-to-br from-[#ADD8E6]/10 to-[#FDBCB4]/10 shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#ADD8E6]/20 to-[#FDBCB4]/20 flex items-center justify-center mb-4 shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]">
                            <BookOpen className="h-8 w-8 text-[#ADD8E6]" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">暂无文案</h3>
                        <p className="text-sm text-gray-600 max-w-xs mx-auto">
                            {script.type === 'script' 
                                ? '点击右上角的"新增文案"按钮，开始创作您的第一个文案。'
                                : '该小说暂无章节。'}
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {finalItems.map((item: ScriptItem, index: number) => {
                            const itemUuid = item.uuid;
                            const isEditing = editingItemId === itemUuid;
                            
                            return (
                                <div
                                    key={itemUuid}
                                    className="group relative flex flex-col sm:flex-row gap-4 p-4 rounded-2xl shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)] bg-gradient-to-br from-white to-gray-50/80 hover:shadow-[6px_6px_12px_rgba(173,221,230,0.3),-4px_-4px_8px_rgba(255,255,255,0.8)] transition-all duration-300"
                                >
                                    <div className="flex-1 space-y-2 min-w-0">
                                        {isEditing ? (
                                            <div className="flex items-center gap-2 max-w-md animate-in fade-in zoom-in-95 duration-200">
                                                <Input
                                                    value={itemTitleValue}
                                                    onChange={(e) => setItemTitleValue(e.target.value)}
                                                    className="h-9 font-medium bg-white shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]"
                                                    autoFocus
                                                    onKeyDown={(e) => e.key === "Enter" && handleSaveItemTitle(itemUuid)}
                                                />
                                                <Button size="icon" variant="ghost" onClick={() => handleSaveItemTitle(itemUuid)} className="h-9 w-9 text-[#22C55E] hover:text-[#22C55E] hover:bg-[#22C55E]/10 rounded-full shadow-[4px_4px_8px_rgba(34,197,94,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]">
                                                    <Check className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" onClick={() => setEditingItemId(null)} className="h-9 w-9 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]">
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3 group/title">
                                                <div className="flex items-center justify-center w-6 h-6 rounded bg-gradient-to-r from-[#ADD8E6]/20 to-[#ADD8E6]/10 font-mono text-xs shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)] text-gray-700">
                                                    {index + 1}
                                                </div>
                                                <h4 className="text-base font-semibold text-gray-900 truncate cursor-pointer hover:text-[#ADD8E6] transition-colors" onClick={() => handleStartEditItemTitle(item)}>
                                                    {item.title}
                                                </h4>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-6 w-6 opacity-0 group-hover/title:opacity-100 transition-all -ml-1 text-gray-500 hover:text-[#ADD8E6] shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]"
                                                    onClick={() => handleStartEditItemTitle(item)}
                                                >
                                                    <Pencil className="h-3 w-3" />
                                                </Button>
                                                {item.has_creation && (
                                                    <span className="flex items-center gap-1.5 text-white bg-gradient-to-r from-[#22C55E] to-[#16A34A] px-2 py-0.5 rounded text-[10px] font-bold shadow-[4px_4px_8px_rgba(34,197,94,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)] animate-pulse">
                                                        <Check className="h-3 w-3" />
                                                        已有创作
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        
                                        {item.preview && (
                                            <div className="pl-9">
                                                <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed font-light">
                                                    {item.preview.length > 50 ? item.preview.slice(0, 50) + "…" : item.preview}
                                                </p>
                                            </div>
                                        )}
                                        
                                        <div className="flex items-center gap-6 text-xs pl-9 pt-1">
                                            <span className="flex items-center gap-1.5 bg-gradient-to-r from-[#ADD8E6]/20 to-[#ADD8E6]/10 px-3 py-1 rounded-lg shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)] text-gray-700">
                                                <Calendar className="h-3.5 w-3.5 text-[#ADD8E6]" />
                                                {formatDate(item.created_at)}
                                            </span>
                                            {item.word_count > 0 && (
                                                <span className="flex items-center gap-1.5 bg-gradient-to-r from-[#ADD8E6]/20 to-[#ADD8E6]/10 px-3 py-1 rounded-lg shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)] text-gray-700">
                                                    <FileText className="h-3.5 w-3.5 text-[#ADD8E6]" />
                                                    {item.word_count} 字
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 sm:self-center sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300 sm:translate-x-4 sm:group-hover:translate-x-0">
                                        <Button 
                                            size="sm" 
                                            className="h-8 px-4 rounded-full font-medium shadow-sm hover:shadow-md bg-gradient-to-r from-[#ADD8E6] to-[#ADD8E6]/80 text-white hover:from-[#ADD8E6] hover:to-[#ADD8E6] transition-all shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]" 
                                            onClick={() => handleCreateVideo(itemUuid)}
                                        >
                                            去创作
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 text-gray-500 hover:text-[#FDBCB4] hover:bg-[#FDBCB4]/10 rounded-full transition-colors shadow-[4px_4px_8px_rgba(253,188,180,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]"
                                            onClick={() => handleDeleteItem(itemUuid, item.title)}
                                            disabled={deletingItemId === itemUuid}
                                        >
                                            {deletingItemId === itemUuid ? <LoadingIcon /> : <Trash2 className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50/50 via-white to-gray-100/30 transition-colors duration-300">
            <div className="container mx-auto px-4 py-8 lg:px-8">
                <div className="max-w-5xl mx-auto space-y-10">
                    {/* Header Navigation */}
                    <div className="flex items-center justify-between">
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/${locale}/scripts`)} className="hover:bg-[#ADD8E6]/10 -ml-2 text-[#ADD8E6] hover:text-[#ADD8E6] shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)] bg-white rounded-xl">
                            <ChevronLeft className="h-4 w-4 mr-1" />返回列表
                        </Button>
                    </div>

                    {/* Script Info Card */}
                    <div className="overflow-hidden rounded-2xl shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)] bg-gradient-to-br from-white to-gray-50/80">
                        <div className="p-6 md:p-8">
                            <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
                                <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-gradient-to-br from-[#ADD8E6] to-[#FDBCB4] flex items-center justify-center flex-shrink-0 shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]">
                                    <FileText className="h-10 w-10 md:h-12 md:w-12 text-white" />
                                </div>
                                
                                <div className="flex-1 space-y-4 w-full">
                                    {editingScriptTitle ? (
                                        <div className="flex items-center gap-2 max-w-lg">
                                            <Input
                                                value={scriptTitleValue}
                                                onChange={(e) => setScriptTitleValue(e.target.value)}
                                                className="text-2xl font-bold h-12 bg-white shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]"
                                                autoFocus
                                                onKeyDown={(e) => e.key === "Enter" && handleSaveScriptTitle()}
                                            />
                                            <Button size="icon" onClick={handleSaveScriptTitle} className="h-10 w-10 bg-gradient-to-r from-[#FDBCB4] to-[#F9A899] hover:from-[#F9A899] hover:to-[#F69689] text-white shadow-[4px_4px_8px_rgba(253,188,180,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]">
                                                <Check className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" onClick={() => setEditingScriptTitle(false)} className="h-10 w-10 text-gray-500 hover:text-gray-700 hover:bg-gray-100 shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]">
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3 group">
                                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
                                                {script.title}
                                            </h1>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-[#ADD8E6]/10 shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]" onClick={handleStartEditScriptTitle}>
                                                <Pencil className="h-4 w-4 text-[#ADD8E6]" />
                                            </Button>
                                        </div>
                                    )}

                                    <div className="flex flex-wrap gap-4 md:gap-6 text-sm">
                                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-[#ADD8E6]/20 to-[#ADD8E6]/10 shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]">
                                            <User className="h-3.5 w-3.5 text-[#ADD8E6]" />
                                            <span className="text-gray-700">{script.author || '未知作者'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-[#ADD8E6]/20 to-[#ADD8E6]/10 shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]">
                                            <Calendar className="h-3.5 w-3.5 text-[#ADD8E6]" />
                                            <span className="text-gray-700">{formatDate(script.created_at)}</span>
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-[#ADD8E6]/20 to-[#ADD8E6]/10 shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]">
                                            <BookOpen className="h-3.5 w-3.5 text-[#ADD8E6]" />
                                            <span className="text-gray-700">{itemsTotal} 条文案</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content List */}
                    <div className="space-y-4">
                        {renderItems()}
                        
                        {/* Pagination */}
                        {itemsTotalPages > 1 && (
                            <div className="flex items-center justify-center gap-4 py-4">
                                <Button variant="outline" size="sm" onClick={() => setItemPage(p => Math.max(1, p - 1))} disabled={itemPage <= 1} className="border-[#ADD8E6] text-[#ADD8E6] hover:bg-[#ADD8E6]/10 hover:text-[#ADD8E6] disabled:opacity-50 shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]">
                                    <ChevronLeft className="h-4 w-4 mr-1" /> 上一页
                                </Button>
                                <span className="text-sm font-medium bg-gradient-to-r from-[#ADD8E6]/20 to-[#FDBCB4]/20 px-3 py-1 rounded-md shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)] bg-clip-text text-transparent">
                                    {itemPage} / {itemsTotalPages}
                                </span>
                                <Button variant="outline" size="sm" onClick={() => setItemPage(p => Math.min(itemsTotalPages, p + 1))} disabled={itemPage >= itemsTotalPages} className="border-[#ADD8E6] text-[#ADD8E6] hover:bg-[#ADD8E6]/10 hover:text-[#ADD8E6] disabled:opacity-50 shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]">
                                    下一页 <ChevronLeft className="h-4 w-4 ml-1 rotate-180" />
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <ConfirmDialogComponent />
        </div>
    );
}
