"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CustomTabs } from "@/components/ui/custom-tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Book, FileText, ChevronRight, Check, ArrowLeft, Loader2, PlayCircle, Plus, Bot, Wrench, Sparkles, Send } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/auth";

// API BASE URL
// 留空时走同源相对路径，由 next.config.js 的 rewrites 代理到后端。
// 不要回落到 http://localhost:8000 —— 那在用户浏览器里指向用户自己的机器。
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface Novel {
    novel_id: number;
    uuid: string;
    title: string;
    author: string;
    chapter_count: number;
    type: string; // 'novel' or 'script'
}

interface Chapter {
    chapter_id: number;
    uuid: string;
    title: string;
    chapter_number: number;
    has_creation: boolean;
    preview?: string;
}

export default function CreateDynamicComicPage() {
    const t = useTranslations('createDynamicComic');
    const tAgent = useTranslations('agentCreation');
    const router = useRouter();
    const params = useParams();
    const locale = params?.locale as string;

    // State
    const token = useAuthStore(state => state.token);
    const [novels, setNovels] = useState<Novel[]>([]);
    const [selectedNovel, setSelectedNovel] = useState<string>(""); // novel uuid
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [selectedChapterUuid, setSelectedChapterUuid] = useState<string>("");

    // Pagination for chapters
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoadingChapters, setIsLoadingChapters] = useState(false);

    // Script Projects State
    const [scriptProjects, setScriptProjects] = useState<Novel[]>([]);
    const [selectedProject, setSelectedProject] = useState<string>(""); // project uuid
    const [projectChapters, setProjectChapters] = useState<Chapter[]>([]); // scripts/chapters in project
    const [selectedProjectChapterUuid, setSelectedProjectChapterUuid] = useState<string>("");

    // Script Creation Dialog State
    const [isScriptDialogOpen, setIsScriptDialogOpen] = useState(false);
    const [newScriptTitle, setNewScriptTitle] = useState("");
    const [newScriptContent, setNewScriptContent] = useState("");
    const [isCreatingScript, setIsCreatingScript] = useState(false);

    // New Project Dialog
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newProjectTitle, setNewProjectTitle] = useState("");
    const [isCreatingProject, setIsCreatingProject] = useState(false);

    // Global Loading
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeTab, setActiveTab] = useState("novel");
    const [style, setStyle] = useState("anime"); // Default style: anime
    const [creationMode, setCreationMode] = useState<"professional" | "agent">("professional"); // Creation mode
    
    // Blank/Agent Mode State
    const [agentMessage, setAgentMessage] = useState("");
    const [agentMessages, setAgentMessages] = useState<Array<{role: string; content: string; intentResult?: any}>>([]);
    const [isAgentLoading, setIsAgentLoading] = useState(false);
    const searchParams = useSearchParams();

    useEffect(() => {
        const novelUuid = searchParams.get("novel");
        const typeParam = searchParams.get("type"); 
        const chapterParam = searchParams.get("chapter");

        if (novelUuid) {
            // Determine type if not provided
            // We might need to wait for novels list to be populated to know the type if not provided?
            // For now, trust the param or default to novel. 
            // If type is explicitly 'script', switch tab.
            if (typeParam === 'script') {
                setActiveTab('script');
                setSelectedProject(novelUuid);
            } else {
                // If type is novel or undefined, check if we should switch?
                // Default is novel tab.
                setActiveTab('novel');
                setSelectedNovel(novelUuid);
            }
        }
    }, [searchParams]);

    // Auto-select chapter when chapters are loaded and chapter param is present
    useEffect(() => {
        const chapterParam = searchParams.get("chapter");
        if (!chapterParam) return;

        if (activeTab === 'novel' && chapters.length > 0) {
             // Try to find by UUID first (since param is UUID), or fallback to ID check just in case
             const chapter = chapters.find(c => c.uuid === chapterParam || String(c.chapter_id) === chapterParam);
             if (chapter) {
                 setSelectedChapterUuid(chapter.uuid);
             }
        } else if (activeTab === 'script' && projectChapters.length > 0) {
             const chapter = projectChapters.find(c => c.uuid === chapterParam || String(c.chapter_id) === chapterParam);
             if (chapter) {
                 setSelectedProjectChapterUuid(chapter.uuid);
             }
        }
    }, [chapters, projectChapters, searchParams, activeTab]);

    // Fetch Novels and Projects
    const fetchNovels = async () => {
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/novels?page=1&page_size=100`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                const allItems: Novel[] = data.data.items;
                setNovels(allItems.filter(n => n.type === 'novel' || !n.type)); // Default to novel if type missing
                setScriptProjects(allItems.filter(n => n.type === 'script'));
            }
        } catch (error) {
            console.error("Failed to fetch novels", error);
            toast.error(t('fetchNovelsFailed'));
        }
    };

    useEffect(() => {
        fetchNovels();
    }, [token]);

    // Fetch Chapters for Novel
    useEffect(() => {
        if (!selectedNovel || !token) {
            setChapters([]);
            return;
        }
        const fetchChapters = async () => {
            setIsLoadingChapters(true);
            try {
                const res = await fetch(`${API_BASE_URL}/api/v1/novels/${selectedNovel}/chapters?page=${page}&page_size=10`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setChapters(data.data.items);
                    setTotalPages(data.data.total_pages);
                }
            } catch (error) {
                console.error("Failed to fetch chapters", error);
            } finally {
                setIsLoadingChapters(false);
            }
        };
        fetchChapters();
    }, [selectedNovel, page, token]);

    // Fetch Chapters (Scripts) for Project
    useEffect(() => {
        if (!selectedProject || !token) {
            setProjectChapters([]);
            return;
        }
        // Using same chapters endpoint but treating them as scripts
        const fetchProjectChapters = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/v1/novels/${selectedProject}/chapters?page=1&page_size=100`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }); // Fetch more for scripts
                if (res.ok) {
                    const data = await res.json();
                    setProjectChapters(data.data.items);
                }
            } catch (error) {
                console.error("Failed to fetch scripts", error);
            }
        };
        fetchProjectChapters();
    }, [selectedProject, token]);

    const createNewScript = async () => {
        if (!selectedProject) {
            toast.error(t('selectProjectFirst'));
            return;
        }
        if (!newScriptTitle.trim()) {
            toast.error(t('scriptTitleRequired'));
            return;
        }
        if (!newScriptContent.trim()) {
            toast.error(t('scriptContentRequired'));
            return;
        }

        setIsCreatingScript(true);
        try {
            const project = scriptProjects.find(p => p.uuid === selectedProject);
            if (!project) throw new Error("Project not found");

            const res = await fetch(`${API_BASE_URL}/api/v1/novels/${selectedProject}/chapters`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: newScriptTitle,
                    chapter_number: projectChapters.length + 1,
                    content: newScriptContent,
                    novel_id: project.novel_id
                })
            });

            if (res.ok) {
                const data = await res.json();
                toast.success(t('scriptCreated'));
                setIsScriptDialogOpen(false);
                setNewScriptTitle("");
                setNewScriptContent("");
                // Refresh chapters
                const chaptersRes = await fetch(`${API_BASE_URL}/api/v1/novels/${selectedProject}/chapters?page=1&page_size=100`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (chaptersRes.ok) {
                    const chaptersData = await chaptersRes.json();
                    setProjectChapters(chaptersData.data.items);
                    // Select the new chapter
                    if (data.data.uuid) {
                        setSelectedProjectChapterUuid(data.data.uuid);
                    }
                }
            } else {
                const data = await res.json();
                throw new Error(data.detail || "创建失败");
            }
        } catch (e: any) {
            toast.error(`${t('scriptCreationFailed')}: ${e.message}`);
        } finally {
            setIsCreatingScript(false);
        }
    };


    const createNewProject = async () => {
        if (!newProjectTitle.trim()) {
            toast.error(t('projectNameRequired'));
            return;
        }
        setIsCreatingProject(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/novels/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: newProjectTitle,
                    type: 'script',
                    author: 'User' // Default
                })
            });
            if (res.ok) {
                toast.success(t('creationSuccess'));
                setIsDialogOpen(false);
                setNewProjectTitle("");
                fetchNovels(); // Refresh lists
            } else {
                const data = await res.json();
                throw new Error(data.detail);
            }
        } catch (e: any) {
            toast.error(`${t('creationFailed', { error: e.message })}`);
        } finally {
            setIsCreatingProject(false);
        }
    };

    const handleBlankCreate = async () => {
        setIsAgentLoading(true);
        
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/creations/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: "自由创作",
                    creation_type: "chat",
                    workflow_mode: "agent"
                })
            });
            
            if (!res.ok) throw new Error(tAgent('createFailed'));
            
            const result = await res.json();
            const creationUuid = result.data?.uuid || result.data?.creation_uuid;
            
            toast.success(tAgent('createSuccess'));
            
            router.push(`/${locale}/create-agent?creationId=${creationUuid}`);
        } catch (e: any) {
            toast.error(`${tAgent('createFailed')}: ${e.message}`);
        } finally {
            setIsAgentLoading(false);
        }
    };

    const onSubmit = async () => {
        let payload: any = {};

        if (activeTab === "novel") {
            // Logic for Novel + Chapter
            if (!selectedNovel || !selectedChapterUuid) {
                toast.error(t('selectNovelChapter'));
                return;
            }
            const novel = novels.find(n => n.uuid === selectedNovel);
            const chapter = chapters.find(c => c.uuid === selectedChapterUuid);
            if (!novel || !chapter) return;

            payload = {
                novel_id: novel.novel_id,
                chapter_id: chapter.chapter_id,
                style: style
            };

        } else if (activeTab === "script") {
            // Logic for Project + Script Selection
            if (!selectedProject || !selectedProjectChapterUuid) {
                toast.error(t('selectProjectScript'));
                return;
            }
            const project = scriptProjects.find(p => p.uuid === selectedProject);
            const script = projectChapters.find(c => c.uuid === selectedProjectChapterUuid);
            if (!project || !script) return;

            payload = {
                novel_id: project.novel_id,
                chapter_id: script.chapter_id,
                style: style
            };
        }

        setIsGenerating(true);
        toast.info(t('creatingTask'));

        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/video-generation/v2/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || `API call failed: ${response.statusText}`);
            }

            const data = await response.json();
            const taskId = data.task_id;

            toast.success(t('creationSuccess'));
            // 根据创作模式跳转到不同页面
            if (creationMode === "agent") {
                router.push(`/${locale}/create-agent?creationId=${taskId}`);
            } else {
                router.push(`/${locale}/dynamic-comic-editor?taskId=${taskId}`);
            }

        } catch (error: any) {
            console.error("Creation failed:", error);
            toast.error(t('creationFailed', { error: error.message }));
        } finally {
            setIsGenerating(false);
        }
    };


    return (
        <div className="min-h-screen bg-gradient-to-br from-white to-blue-50 flex flex-col">
            <div className="max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    {/* Back button removed as requested */}
                    <div className="text-center w-full">
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-emerald-600 drop-shadow-sm">
                            {t('title')}
                        </h1>
                        <p className="text-gray-600 mt-1">{t('description')}</p>
                    </div>
                </div>

                {/* Main Content */}
                <Card className="bg-gradient-to-br from-white to-blue-50 shadow-[8px_8px_24px_rgba(0,0,0,0.12),-8px_-8px_24px_rgba(255,255,255,0.95)] border border-white/50 p-6 rounded-xl">
                    <CustomTabs
                        variant="segmented"
                        value={activeTab}
                        onValueChange={setActiveTab}
                        className="w-full"
                        items={[
                            {
                                value: "novel",
                                label: (
                                    <div className="flex items-center gap-2 py-3 px-4">
                                        <Book className="h-4 w-4 text-green-600" />
                                        <span className="font-medium">{t('selectNovelChapter')}</span>
                                    </div>
                                ),
                                content: (
                                    <div className="p-6 bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-[4px_4px_16px_rgba(0,0,0,0.12),-4px_-4px_16px_rgba(255,255,255,0.95)]">
                                        <div className="space-y-6">
                                            <div>
                                                <Label className="text-lg font-medium mb-2 block text-gray-800">{t('selectNovel')}</Label>
                                                <Select value={selectedNovel} onValueChange={setSelectedNovel}>
                                                    <SelectTrigger className="w-full bg-gradient-to-br from-white to-blue-50 border border-white/50 shadow-[4px_4px_12px_rgba(0,0,0,0.1),-2px_-2px_8px_rgba(255,255,255,0.9)] text-gray-800">
                                                        <SelectValue placeholder={t('selectNovel')} />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-white border border-white/50 shadow-[8px_8px_24px_rgba(0,0,0,0.15),-4px_-4px_16px_rgba(255,255,255,0.95)] text-gray-800">
                                                        {novels.length > 0 ? (
                                                            novels.map((novel) => (
                                                                <SelectItem key={novel.uuid} value={novel.uuid}>{novel.title}</SelectItem>
                                                            ))
                                                        ) : (
                                                            <div className="py-6 px-4 text-center text-gray-500">
                                                                {t('noNovels')}
                                                            </div>
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            {selectedNovel && (
                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <Label className="text-gray-800 font-medium">{t('selectNovelChapter')}</Label>
                                                        {totalPages > 1 && (
                                                            <div className="flex gap-2 text-sm">
                                                                <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="h-6 px-2 text-gray-600 hover:text-gray-900">{t('previous')}</Button>
                                                                <span className="text-gray-600 leading-6">{t('pageInfo', { current: page, total: totalPages })}</span>
                                                                <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="h-6 px-2 text-gray-600 hover:text-gray-900">{t('next')}</Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <ScrollArea className="h-[300px] border border-gray-200 rounded-xl p-3 bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_16px_rgba(0,0,0,0.12),-4px_-4px_16px_rgba(255,255,255,0.95)]">
                                                        {isLoadingChapters ? (
                                                            <div className="flex justify-center items-center h-full"><Loader2 className="w-8 h-8 animate-spin text-green-500" /></div>
                                                        ) : (
                                                            <div className="space-y-3">
                                                                {chapters.map((chapter) => (
                                                                    <div key={chapter.uuid || chapter.chapter_id}
                                                                        className={`flex items-start justify-between p-4 rounded-xl border cursor-pointer transition-all duration-300 ${selectedChapterUuid === chapter.uuid ? "border-green-500 bg-green-50 shadow-[4px_4px_12px_rgba(34,197,94,0.2),-2px_-2px_8px_rgba(255,255,255,0.9)]" : "border-gray-200 hover:border-green-500 hover:bg-white hover:shadow-[4px_4px_12px_rgba(0,0,0,0.1),-2px_-2px_8px_rgba(255,255,255,0.9)]"}`}
                                                                        onClick={() => setSelectedChapterUuid(chapter.uuid)}
                                                                    >
                                                                        <div className="flex flex-col gap-1 flex-1 min-w-0 mr-4">
                                                                            <div className="font-medium text-gray-800 truncate">{chapter.title}</div>
                                                                            {chapter.preview && (
                                                                                <div className="text-sm text-gray-600 line-clamp-2 break-all">
                                                                                    {chapter.preview}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        {chapter.has_creation && <span className="shrink-0 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">{t('hasCreation')}</span>}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </ScrollArea>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            },
                            {
                                value: "script",
                                label: (
                                    <div className="flex items-center gap-2 py-3 px-4">
                                        <FileText className="h-4 w-4 text-green-600" />
                                        <span className="font-medium">{t('selectScript')}</span>
                                    </div>
                                ),
                                content: (
                                    <div className="p-6 bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-[4px_4px_16px_rgba(0,0,0,0.12),-4px_-4px_16px_rgba(255,255,255,0.95)]">
                                        <div className="space-y-6">
                                            <div className="flex items-end gap-4">
                                                <div className="flex-1">
                                                    <Label className="text-lg font-medium mb-2 block text-gray-800">{t('selectProject')}</Label>
                                                    <Select value={selectedProject} onValueChange={setSelectedProject}>
                                                        <SelectTrigger className="w-full bg-gradient-to-br from-white to-blue-50 border border-white/50 shadow-[4px_4px_12px_rgba(0,0,0,0.1),-2px_-2px_8px_rgba(255,255,255,0.9)] text-gray-800">
                                                            <SelectValue placeholder={t('selectProject')} />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-white border border-white/50 shadow-[8px_8px_24px_rgba(0,0,0,0.15),-4px_-4px_16px_rgba(255,255,255,0.95)] text-gray-800">
                                                            {scriptProjects.length > 0 ? (
                                                                scriptProjects.map((p) => (
                                                                    <SelectItem key={p.uuid} value={p.uuid}>{p.title}</SelectItem>
                                                                ))
                                                            ) : (
                                                                <div className="py-6 px-4 text-center text-gray-500">
                                                                    {t('noProjects')}
                                                                </div>
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                                    <DialogTrigger asChild>
                                                        <Button variant="outline" className="border-purple-500 text-purple-600 hover:bg-purple-50 shadow-[4px_4px_12px_rgba(168,85,247,0.2),-2px_-2px_8px_rgba(255,255,255,0.9)] rounded-xl">
                                                            <Plus className="w-4 h-4 mr-2" />{t('createProject')}
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="bg-gradient-to-br from-white to-blue-50 border border-white/50 shadow-[8px_8px_24px_rgba(0,0,0,0.15),-4px_-4px_16px_rgba(255,255,255,0.95)]">
                                                        <DialogHeader>
                                                            <DialogTitle className="text-gray-900">{t('createProject')}</DialogTitle>
                                                            <DialogDescription className="sr-only text-gray-600">
                                                                {t('enterProjectName')}
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <div className="py-4">
                                                            <Label className="mb-2 block text-gray-800">{t('projectName')}</Label>
                                                            <Input
                                                                value={newProjectTitle}
                                                                onChange={(e) => setNewProjectTitle(e.target.value)}
                                                                className="bg-gradient-to-br from-white to-blue-50 border border-gray-200 shadow-[4px_4px_12px_rgba(0,0,0,0.1),-2px_-2px_8px_rgba(255,255,255,0.9)] text-gray-800"
                                                                placeholder={t('enterProjectName')}
                                                            />
                                                        </div>
                                                        <DialogFooter>
                                                            <Button onClick={createNewProject} disabled={isCreatingProject} className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border border-green-400/30 shadow-[4px_4px_12px_rgba(34,197,94,0.2),-2px_-2px_8px_rgba(255,255,255,0.9)] rounded-xl">
                                                                {isCreatingProject ? t('creating') : t('create')}
                                                            </Button>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                            </div>

                                            {selectedProject && (
                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <Label className="text-gray-800 font-medium block">{t('selectScript')}</Label>
                                                        <Dialog open={isScriptDialogOpen} onOpenChange={setIsScriptDialogOpen}>
                                                            <DialogTrigger asChild>
                                                                <Button variant="outline" size="sm" className="h-8 border-purple-500 text-purple-600 hover:bg-purple-50">
                                                                    <Plus className="w-3 h-3 mr-1" />{t('addScript')}
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent className="bg-gradient-to-br from-white to-blue-50 border border-white/50 shadow-[8px_8px_24px_rgba(0,0,0,0.15),-4px_-4px_16px_rgba(255,255,255,0.95)] max-w-2xl">
                                                                <DialogHeader>
                                                                    <DialogTitle className="text-gray-900">{t('addScript')}</DialogTitle>
                                                                    <DialogDescription className="sr-only text-gray-600">
                                                                        {t('enterScriptContent')}
                                                                    </DialogDescription>
                                                                </DialogHeader>
                                                                <div className="space-y-4 py-4">
                                                                    <div>
                                                                        <Label className="mb-2 block text-gray-800">{t('scriptTitle')}</Label>
                                                                        <Input
                                                                            value={newScriptTitle}
                                                                            onChange={(e) => setNewScriptTitle(e.target.value)}
                                                                            placeholder={t('enterScriptTitle')}
                                                                            className="bg-gradient-to-br from-white to-blue-50 border border-gray-200 shadow-[4px_4px_12px_rgba(0,0,0,0.1),-2px_-2px_8px_rgba(255,255,255,0.9)] text-gray-800"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <Label className="mb-2 block text-gray-800">{t('scriptContent')}</Label>
                                                                        <textarea
                                                                            value={newScriptContent}
                                                                            onChange={(e) => setNewScriptContent(e.target.value)}
                                                                            className="w-full h-[300px] p-3 border border-gray-200 rounded-xl bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.1),-2px_-2px_8px_rgba(255,255,255,0.9)] text-gray-800 resize-none focus:outline-none focus:border-green-500"
                                                                            placeholder={t('enterScriptContent')}
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <DialogFooter>
                                                                    <Button onClick={createNewScript} disabled={isCreatingScript} className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border border-green-400/30 shadow-[4px_4px_12px_rgba(34,197,94,0.2),-2px_-2px_8px_rgba(255,255,255,0.9)] rounded-xl">
                                                                        {isCreatingScript ? t('saving') : t('saveAndUse')}
                                                                    </Button>
                                                                </DialogFooter>
                                                            </DialogContent>
                                                        </Dialog>
                                                    </div>
                                                    <ScrollArea className="h-[300px] border border-gray-200 rounded-xl p-3 bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_16px_rgba(0,0,0,0.12),-4px_-4px_16px_rgba(255,255,255,0.95)]">
                                                        <div className="space-y-3">
                                                            {projectChapters.map((chapter) => (
                                                                <div key={chapter.uuid || chapter.chapter_id}
                                                                    className={`flex items-start justify-between p-4 rounded-xl border cursor-pointer transition-all duration-300 ${selectedProjectChapterUuid === chapter.uuid ? "border-green-500 bg-green-50 shadow-[4px_4px_12px_rgba(34,197,94,0.2),-2px_-2px_8px_rgba(255,255,255,0.9)]" : "border-gray-200 hover:border-green-500 hover:bg-white hover:shadow-[4px_4px_12px_rgba(0,0,0,0.1),-2px_-2px_8px_rgba(255,255,255,0.9)]"}`}
                                                                    onClick={() => setSelectedProjectChapterUuid(chapter.uuid)}
                                                                >
                                                                    <div className="flex flex-col gap-1 flex-1 min-w-0 mr-4">
                                                                        <div className="font-medium text-gray-800 truncate">{chapter.title}</div>
                                                                        {chapter.preview && (
                                                                            <div className="text-sm text-gray-600 line-clamp-2 break-all">
                                                                                {chapter.preview}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    {chapter.has_creation && <span className="shrink-0 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">{t('hasCreation')}</span>}
                                                                </div>
                                                            ))}
                                                            {projectChapters.length === 0 && <div className="text-center text-gray-500 py-10">{t('noScripts')}</div>}
                                                        </div>
                                                    </ScrollArea>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            },
                            {
                                value: "blank",
                                label: (
                                    <div className="flex items-center gap-2 py-3 px-4">
                                        <Sparkles className="h-4 w-4 text-[#22C55E]" />
                                        <span className="font-medium">{tAgent('tabLabel')}</span>
                                    </div>
                                ),
                                content: (
                                    <div className="p-8 bg-gradient-to-br from-white to-[#22C55E]/5 rounded-xl shadow-[4px_4px_16px_rgba(0,0,0,0.12),-4px_-4px_16px_rgba(255,255,255,0.95)]">
                                        <div className="text-center space-y-6">
                                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-[#22C55E] to-[#ADD8E6] shadow-[4px_4px_16px_rgba(34,197,94,0.3),-2px_-2px_8px_rgba(255,255,255,0.9)]">
                                                <Sparkles className="w-10 h-10 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-semibold text-gray-800 mb-2">{tAgent('title')}</h3>
                                                <p className="text-gray-600 max-w-lg mx-auto">
                                                    {tAgent('description')}
                                                </p>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto mt-6">
                                                <div className="p-4 rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-white hover:shadow-md transition-all">
                                                    <div className="text-2xl mb-2">📚</div>
                                                    <div className="font-medium text-gray-800 mb-1">{tAgent('features.vocabVideo.title')}</div>
                                                    <div className="text-sm text-gray-500">{tAgent('features.vocabVideo.description')}</div>
                                                </div>
                                                <div className="p-4 rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white hover:shadow-md transition-all">
                                                    <div className="text-2xl mb-2">😂</div>
                                                    <div className="font-medium text-gray-800 mb-1">{tAgent('features.gaoxiaoVideo.title')}</div>
                                                    <div className="text-sm text-gray-500">{tAgent('features.gaoxiaoVideo.description')}</div>
                                                </div>
                                                <div className="p-4 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white hover:shadow-md transition-all">
                                                    <div className="text-2xl mb-2">📖</div>
                                                    <div className="font-medium text-gray-800 mb-1">{tAgent('features.storyVideo.title')}</div>
                                                    <div className="text-sm text-gray-500">{tAgent('features.storyVideo.description')}</div>
                                                </div>
                                            </div>
                                            
                                            <Button
                                                onClick={handleBlankCreate}
                                                disabled={isAgentLoading}
                                                className="h-14 px-10 text-lg bg-gradient-to-r from-[#22C55E] to-[#ADD8E6] hover:from-[#16A34A] hover:to-[#87CEEB] text-white font-medium rounded-xl shadow-[4px_4px_16px_rgba(34,197,94,0.3),-2px_-2px_8px_rgba(255,255,255,0.9)]"
                                            >
                                                {isAgentLoading ? (
                                                    <>
                                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                                        {tAgent('creating')}
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus className="w-5 h-5 mr-2" />
                                                        {tAgent('startButton')}
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                )
                            }
                        ]}
                    />

                    {/* Style Selection - 只在非 blank tab 显示 */}
                    {activeTab !== "blank" && (
                        <>
                            <div className="px-6 py-6 border-t border-blue-100">
                                <Label className="text-lg font-medium mb-4 block text-gray-800">{t('styleSelection')}</Label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-4">
                                    <div
                                        className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 ${style === "realism" ? "border-green-500 bg-green-50 shadow-[4px_4px_12px_rgba(34,197,94,0.2),-2px_-2px_8px_rgba(255,255,255,0.9)]" : "border-gray-200 hover:border-green-500 hover:bg-white hover:shadow-[4px_4px_12px_rgba(0,0,0,0.1),-2px_-2px_8px_rgba(255,255,255,0.9)]"}`}
                                        onClick={() => setStyle("realism")}
                                    >
                                        <div className="font-medium text-gray-800 mb-1">{t('realism')}</div>
                                        <div className="text-sm text-gray-600">{t('realismDescription')}</div>
                                    </div>
                                    <div
                                        className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 ${style === "cyberpunk" ? "border-green-500 bg-green-50 shadow-[4px_4px_12px_rgba(34,197,94,0.2),-2px_-2px_8px_rgba(255,255,255,0.9)]" : "border-gray-200 hover:border-green-500 hover:bg-white hover:shadow-[4px_4px_12px_rgba(0,0,0,0.1),-2px_-2px_8px_rgba(255,255,255,0.9)]"}`}
                                        onClick={() => setStyle("cyberpunk")}
                                    >
                                        <div className="font-medium text-gray-800 mb-1">{t('cyberpunk')}</div>
                                        <div className="text-sm text-gray-600">{t('cyberpunkDescription')}</div>
                                    </div>
                                    <div
                                        className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 ${style === "ukiyoe" ? "border-green-500 bg-green-50 shadow-[4px_4px_12px_rgba(34,197,94,0.2),-2px_-2px_8px_rgba(255,255,255,0.9)]" : "border-gray-200 hover:border-green-500 hover:bg-white hover:shadow-[4px_4px_12px_rgba(0,0,0,0.1),-2px_-2px_8px_rgba(255,255,255,0.9)]"}`}
                                        onClick={() => setStyle("ukiyoe")}
                                    >
                                        <div className="font-medium text-gray-800 mb-1">{t('ukiyoe')}</div>
                                        <div className="text-sm text-gray-600">{t('ukiyoeDescription')}</div>
                                    </div>
                                    <div
                                        className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 ${style === "watercolor" ? "border-green-500 bg-green-50 shadow-[4px_4px_12px_rgba(34,197,94,0.2),-2px_-2px_8px_rgba(255,255,255,0.9)]" : "border-gray-200 hover:border-green-500 hover:bg-white hover:shadow-[4px_4px_12px_rgba(0,0,0,0.1),-2px_-2px_8px_rgba(255,255,255,0.9)]"}`}
                                        onClick={() => setStyle("watercolor")}
                                    >
                                        <div className="font-medium text-gray-800 mb-1">{t('watercolor')}</div>
                                        <div className="text-sm text-gray-600">{t('watercolorDescription')}</div>
                                    </div>
                                    <div
                                        className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 ${style === "anime" ? "border-green-500 bg-green-50 shadow-[4px_4px_12px_rgba(34,197,94,0.2),-2px_-2px_8px_rgba(255,255,255,0.9)]" : "border-gray-200 hover:border-green-500 hover:bg-white hover:shadow-[4px_4px_12px_rgba(0,0,0,0.1),-2px_-2px_8px_rgba(255,255,255,0.9)]"}`}
                                        onClick={() => setStyle("anime")}
                                    >
                                        <div className="font-medium text-gray-800 mb-1">{t('anime')}</div>
                                        <div className="text-sm text-gray-600">{t('animeDescription')}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Creation Mode Selection */}
                            <div className="px-6 py-6 border-t border-blue-100">
                                <Label className="text-lg font-medium mb-4 block text-gray-800">{tAgent('creationMode.title')}</Label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div
                                        className={`p-5 rounded-xl border cursor-pointer transition-all duration-300 ${creationMode === "professional" ? "border-[#FDBCB4] bg-gradient-to-br from-[#FDBCB4]/10 to-[#ADD8E6]/10 shadow-[4px_4px_12px_rgba(253,188,180,0.3),-2px_-2px_8px_rgba(255,255,255,0.9)]" : "border-gray-200 hover:border-[#FDBCB4] hover:bg-white hover:shadow-[4px_4px_12px_rgba(0,0,0,0.1),-2px_-2px_8px_rgba(255,255,255,0.9)]"}`}
                                        onClick={() => setCreationMode("professional")}
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className={`p-2 rounded-lg ${creationMode === "professional" ? "bg-gradient-to-r from-[#FDBCB4] to-[#ADD8E6]" : "bg-gray-100"}`}>
                                                <Wrench className={`w-5 h-5 ${creationMode === "professional" ? "text-white" : "text-gray-600"}`} />
                                            </div>
                                            <div className="font-semibold text-gray-800">{tAgent('creationMode.professional.title')}</div>
                                            {creationMode === "professional" && <Check className="w-5 h-5 text-green-500 ml-auto" />}
                                        </div>
                                        <div className="text-sm text-gray-600 pl-12">
                                            {tAgent('creationMode.professional.description')}
                                        </div>
                                    </div>
                                    <div
                                        className={`p-5 rounded-xl border cursor-pointer transition-all duration-300 ${creationMode === "agent" ? "border-[#22C55E] bg-gradient-to-br from-[#22C55E]/10 to-[#ADD8E6]/10 shadow-[4px_4px_12px_rgba(34,197,94,0.3),-2px_-2px_8px_rgba(255,255,255,0.9)]" : "border-gray-200 hover:border-[#22C55E] hover:bg-white hover:shadow-[4px_4px_12px_rgba(0,0,0,0.1),-2px_-2px_8px_rgba(255,255,255,0.9)]"}`}
                                        onClick={() => setCreationMode("agent")}
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className={`p-2 rounded-lg ${creationMode === "agent" ? "bg-gradient-to-r from-[#22C55E] to-[#ADD8E6]" : "bg-gray-100"}`}>
                                                <Bot className={`w-5 h-5 ${creationMode === "agent" ? "text-white" : "text-gray-600"}`} />
                                            </div>
                                            <div className="font-semibold text-gray-800">{tAgent('creationMode.agent.title')}</div>
                                            {creationMode === "agent" && <Check className="w-5 h-5 text-green-500 ml-auto" />}
                                        </div>
                                        <div className="text-sm text-gray-600 pl-12">
                                            {tAgent('creationMode.agent.description')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* 开始创作按钮 - 只在非 blank Tab 显示 */}
                    {activeTab !== "blank" && (
                        <div className="px-6 py-4 border-t border-blue-100 flex justify-end">
                            <Button
                                onClick={onSubmit}
                                disabled={isGenerating}
                                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-8 py-6 rounded-xl hover:translate-y-0.5 transition-all duration-300 border border-green-400/30 shadow-[6px_6px_20px_rgba(34,197,94,0.3),-2px_-2px_12px_rgba(255,255,255,0.9)]"
                            >
                                {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('processing')}</> : <><span className="mr-2 font-medium">{t('startCreating')}</span><ChevronRight className="h-4 w-4" /></>}
                            </Button>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
