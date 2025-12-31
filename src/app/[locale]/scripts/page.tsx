"use client";

import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Plus,
    FileText,
    Calendar,
    User,
    ChevronLeft,
    ChevronRight,
    Trash2,
    Search,
    Sparkles,
    Scroll,
    BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { scriptApi } from "@/lib/api/script";
import type { ScriptGroup } from "@/lib/api/script";
import { useParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useConfirm } from "@/hooks/use-confirm";
import { CustomTabs } from "@/components/ui/custom-tabs";

// 格式化日期
function formatDateTime(dateString: string): string {
    if (!dateString) return "-";
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString("zh-CN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });
    } catch {
        return "-";
    }
}

// 文案组卡片组件
function ScriptCard({
    script,
    onClick,
    onDelete,
    isDeleting,
    t,
    confirm,
}: {
    script: ScriptGroup & { type?: string };
    onClick: () => void;
    onDelete: (e: React.MouseEvent) => void;
    isDeleting: boolean;
    t: any;
    confirm: (options?: any) => Promise<boolean>;
}) {
    const handleDeleteClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const confirmed = await confirm({
            title: t("common.delete"),
            description: t("novel.deleteConfirm"),
            confirmText: t("common.confirm") || "确认",
            cancelText: t("common.cancel") || "取消",
            variant: "destructive",
        });
        if (confirmed) {
            onDelete(e);
        }
    };

    const isNovel = script.type === 'novel';
    const Icon = isNovel ? BookOpen : FileText;
    const coverImage = isNovel ? '/novel-cover.png' : '/article-cover.png';

    return (
        <div className="relative rounded-2xl group">
            {/* 卡片内容 */}
            <div
                className={cn(
                    "cursor-pointer transition-all relative rounded-2xl overflow-hidden min-h-[160px]",
                    "bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-900/80",
                    "border-2 border-gray-200/50 dark:border-gray-700/50",
                    isNovel
                        ? "hover:border-green-400/50 hover:shadow-2xl hover:shadow-green-500/20"
                        : "hover:border-purple-400/50 hover:shadow-2xl hover:shadow-purple-500/20",
                    "hover:scale-[1.02] transition-transform duration-200"
                )}
                onClick={onClick}
            >
                {/* 封面背景图 */}
                <div className="absolute inset-0 z-0 overflow-hidden opacity-30 group-hover:opacity-40 transition-opacity">
                    <img
                        src={coverImage}
                        className="w-full h-full object-cover blur-[2px]"
                        alt="cover"
                    />
                    <div className={cn(
                        "absolute inset-0 bg-gradient-to-br",
                        isNovel
                            ? "from-green-500/10 to-teal-600/20"
                            : "from-purple-500/10 to-pink-600/20"
                    )} />
                </div>

                <div className="relative z-10 p-5 space-y-4">
                    {/* 标题和作者 */}
                    <div className="space-y-3">
                        <div className="flex items-start gap-3">
                            <div className={cn(
                                "p-3 rounded-xl shadow-md group-hover:scale-110 transition-transform",
                                isNovel
                                    ? "bg-gradient-to-br from-green-500 to-teal-600"
                                    : "bg-gradient-to-br from-purple-500 to-pink-600"
                            )}>
                                <Icon className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className={cn(
                                    "text-base font-bold line-clamp-2 text-gray-900 dark:text-gray-100 transition-colors mb-2",
                                    isNovel
                                        ? "group-hover:text-green-600 dark:group-hover:text-green-400"
                                        : "group-hover:text-purple-600 dark:group-hover:text-purple-400"
                                )}>
                                    {script.title}
                                </h3>
                                {script.author && (
                                    <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded-full w-fit backdrop-blur-sm">
                                        <User className="h-3 w-3" />
                                        <span className="truncate">{script.author}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 元信息 */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
                        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 bg-gray-100/80 dark:bg-gray-800/80 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                            <Calendar className="h-3.5 w-3.5 text-gray-500" />
                            <span>{formatDateTime(script.created_at)}</span>
                        </div>
                        <Badge className={cn(
                            "border-2 font-semibold",
                            isNovel
                                ? "bg-gradient-to-r from-green-100 to-teal-100 dark:from-green-900/30 dark:to-teal-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700"
                                : "bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700"
                        )}>
                            {t("novel.totalChapters", { count: script.chapter_count || 0 })}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* 删除按钮 */}
            <button
                onClick={handleDeleteClick}
                disabled={isDeleting}
                className="absolute top-3 right-3 z-20 p-2 rounded-lg bg-red-500/90 hover:bg-red-600 text-white shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="删除"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    );
}

export default function ScriptsPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState("all");
    const pageSize = 9;
    const t = useTranslations();
    const { confirm, ConfirmDialog: ConfirmDialogComponent } = useConfirm();

    const router = useRouter();
    const params = useParams();
    const locale = params?.locale as string;
    const queryClient = useQueryClient();

    // 搜索防抖
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
            setCurrentPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const {
        data: scriptsResponse,
        isLoading,
        error,
        refetch: refetchScripts,
    } = useQuery({
        queryKey: ["scripts", currentPage, pageSize, debouncedSearchTerm, activeTab],
        queryFn: () => scriptApi.getScripts({
            page: currentPage,
            page_size: pageSize,
            title: debouncedSearchTerm || undefined,
            type: activeTab === "all" ? undefined : activeTab,
        }),
    });

    // 下拉刷新
    const handleRefresh = useCallback(async () => {
        await refetchScripts();
    }, [refetchScripts]);

    // 删除文案组
    const deleteMutation = useMutation({
        mutationFn: (scriptId: string) => scriptApi.deleteScript(scriptId),
        onSuccess: () => {
            toast.success(t("common.success"));
            queryClient.invalidateQueries({ queryKey: ["scripts"] });
            setDeletingId(null);
        },
        onError: (error) => {
            toast.error(error instanceof Error ? error.message : t("common.error"));
            setDeletingId(null);
        },
    });

    // 处理 API 返回数据
    const responseData = scriptsResponse as any;
    const scripts: (ScriptGroup & { type?: string })[] =
        responseData?.data?.items ||
        responseData?.data ||
        responseData?.items ||
        (Array.isArray(responseData) ? responseData : []);

    const total = responseData?.data?.total || responseData?.total || scripts.length;
    const totalPages = Math.ceil(total / pageSize);

    const handleScriptClick = (script: ScriptGroup & { type?: string }) => {
        if (script.uuid) {
            window.open(`/${locale}/scripts/${script.uuid}`, '_blank', 'noopener,noreferrer');
        }
    };

    const handleDelete = (scriptUuid: string) => {
        setDeletingId(scriptUuid);
        deleteMutation.mutate(scriptUuid);
    };

    return (
        <div className="h-screen flex flex-col bg-gradient-to-b from-gray-50/50 via-white to-gray-100/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
            {/* 页头 */}
            <div className="relative overflow-hidden">
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-purple-400/10 dark:bg-purple-400/5 rounded-full blur-3xl" />
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-pink-400/10 dark:bg-pink-400/5 rounded-full blur-3xl" />

                <div className="relative z-10 container mx-auto px-4 pt-4 pb-3">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-700 to-gray-900 dark:from-gray-300 dark:to-gray-100 bg-clip-text text-transparent flex items-center gap-2">
                            <Scroll className="w-6 h-6 text-purple-500" />
                            {t("sidebar.scripts")}
                        </h1>
                    </div>
                </div>
            </div>
            <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-800/30 to-transparent mb-6" />

            {/* 内容区域 */}
            <PullToRefresh onRefresh={handleRefresh} className="flex-1 px-4 pb-8">
                <div className="container mx-auto space-y-6">
                    {/* 搜索、筛选和创建 */}
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                                <Input
                                    placeholder={t("novel.searchPlaceholder")}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-11 h-12 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm transition-all duration-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                                />
                            </div>
                            <Button
                                onClick={() => router.push(`/${locale}/scripts/create`)}
                                className="h-12 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/40 transition-all duration-200 hover:scale-105"
                            >
                                <Plus className="h-5 w-5 mr-2" />
                                {t("createVideo.createProject")}
                            </Button>
                        </div>

                        <div className="max-w-md">
                            <CustomTabs
                                variant="pills"
                                value={activeTab}
                                onValueChange={setActiveTab}
                                items={[
                                    { value: "all", label: t("novel.typeAll"), content: null },
                                    { value: "script", label: t("novel.typeScript"), content: null },
                                    { value: "novel", label: t("novel.typeNovel"), content: null },
                                ]}
                            />
                        </div>
                    </div>

                    {/* 内容区域 */}
                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[...Array(6)].map((_, i) => (
                                <div
                                    key={i}
                                    className="rounded-2xl h-40 w-full bg-gradient-to-br from-gray-200 to-gray-100 dark:from-gray-800 dark:to-gray-900 animate-pulse"
                                />
                            ))}
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="text-center space-y-4">
                                <div className="p-6 bg-red-100 dark:bg-red-900/30 rounded-full w-24 h-24 mx-auto flex items-center justify-center">
                                    <FileText className="h-12 w-12 text-red-500 dark:text-red-400" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t("novel.loadingFailed")}</h3>
                                <p className="text-gray-600 dark:text-gray-400">请稍后重试</p>
                            </div>
                        </div>
                    ) : scripts.length === 0 ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="text-center space-y-6 max-w-md">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-purple-400/10 dark:bg-purple-400/5 blur-3xl rounded-full" />
                                    <div className="relative p-8 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-full w-32 h-32 mx-auto flex items-center justify-center">
                                        <FileText className="h-16 w-16 text-purple-500 dark:text-purple-400 animate-pulse" />
                                    </div>
                                </div>
                                {debouncedSearchTerm ? (
                                    <>
                                        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t("novel.noSearchResults")}</h3>
                                        <p className="text-gray-600 dark:text-gray-400">{t("novel.noSearchResultsDescription")}</p>
                                    </>
                                ) : (
                                    <>
                                        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">暂无内容</h3>
                                        <p className="text-gray-600 dark:text-gray-400">开始您的创作之旅吧</p>
                                        <div className="flex gap-4 justify-center">
                                            <Button
                                                onClick={() => router.push(`/${locale}/scripts/create`)}
                                                className="h-12 px-8 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg shadow-purple-500/30"
                                            >
                                                <Plus className="h-5 w-5 mr-2" />
                                                {t("createVideo.createProject")}
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* 文案组列表 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {scripts.map((script: ScriptGroup & { type?: string }) => (
                                    <ScriptCard
                                        key={script.uuid}
                                        script={script}
                                        onClick={() => handleScriptClick(script)}
                                        onDelete={(e) => {
                                            e.stopPropagation();
                                            handleDelete(script.uuid);
                                        }}
                                        isDeleting={deletingId === script.uuid}
                                        t={t}
                                        confirm={confirm}
                                    />
                                ))}
                            </div>

                            {/* 分页 */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-center gap-3 pt-6">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                        disabled={currentPage <= 1}
                                        className={cn(
                                            "h-11 px-5 rounded-xl border-2 transition-all duration-200",
                                            currentPage <= 1
                                                ? "opacity-50 cursor-not-allowed"
                                                : "hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:scale-105"
                                        )}
                                    >
                                        <ChevronLeft className="w-4 h-4 mr-1" />
                                        {t("novel.previousPage")}
                                    </Button>

                                    <div className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 border-2 border-purple-200 dark:border-purple-800">
                                        <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                                            {t("novel.pageInfo", { current: currentPage, total: totalPages })}
                                        </span>
                                    </div>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={currentPage >= totalPages}
                                        className={cn(
                                            "h-11 px-5 rounded-xl border-2 transition-all duration-200",
                                            currentPage >= totalPages
                                                ? "opacity-50 cursor-not-allowed"
                                                : "hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:scale-105"
                                        )}
                                    >
                                        {t("novel.nextPage")}
                                        <ChevronRight className="w-4 h-4 ml-1" />
                                    </Button>
                                </div>
                            )}

                            {/* 总数 */}
                            <div className="text-center pt-4">
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    <Sparkles className="w-4 h-4 text-purple-500" />
                                    {t("novel.totalChapters", { count: total })}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </PullToRefresh>
            <ConfirmDialogComponent />
        </div>
    );
}
