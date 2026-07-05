
import React, { useState, useEffect } from 'react';
import { ContentService } from '../services/contentService';
import { DataService } from '../services/dataService';
import { ContentPost, ContentType, ContentStatus, Product } from '../types/index';
import { STORE_PRODUCTS } from '../constants';
import { useToast } from '../context/ToastContext';
import { useAccess } from '../context/SecurityContext';
import { useDialog } from '../context/DialogContext';
import { 
    LayoutTemplate, PenTool, BarChart3, Plus, Search, 
    Edit3, Save, Sparkles, Image as ImageIcon, Link, Trash2
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import RichTextEditor from './communication/RichTextEditor';
import ContentLinkedProductCard from './cms/ContentLinkedProductCard';

const createEmptyEditingPost = (): Partial<ContentPost> => ({
    title: '',
    body: '',
    type: 'ARTICLE',
    status: 'DRAFT',
    publishDate: new Date().toISOString().slice(0, 16),
    unpublishDate: '',
    author: 'Admin',
    linkedProductId: '',
    ctaLabel: '',
    imageUrl: '',
});

/** RichTextEditor expects HTML; AI returns plain text or markdown-like paragraphs. */
function plainTextToEditorHtml(text: string): string {
    const trimmed = text.trim();
    if (!trimmed) return '';
    if (/<[a-z][\s\S]*>/i.test(trimmed)) return trimmed;
    return trimmed
        .split(/\n\n+/)
        .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
        .join('');
}

function formatCmsError(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message.trim()) {
        return error.message.replace(/^(Service unavailable|Server error|Request failed \(\d+\)):\s*/i, '');
    }
    return fallback;
}

function toDatetimeLocalValue(iso?: string): string {
    if (!iso?.trim()) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const CMSAdmin: React.FC = () => {
    const { showToast } = useToast();
    const { confirm } = useDialog();
    const { can } = useAccess('cms_content');
    const canManageContent = can('WRITE');
    const [posts, setPosts] = useState<ContentPost[]>([]);
    const [activeTab, setActiveTab] = useState<'LIST' | 'EDITOR' | 'CALENDAR' | 'STATS'>('LIST');

    // Editor State
    const [editingPost, setEditingPost] = useState<Partial<ContentPost>>(createEmptyEditingPost);
    const [isAiGenerating, setIsAiGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [catalogProducts, setCatalogProducts] = useState<Product[]>(STORE_PRODUCTS);

    useEffect(() => {
        loadContent();
    }, []);

    useEffect(() => {
        void (async () => {
            try {
                const fromApi = await DataService.getProducts();
                if (fromApi.length > 0) {
                    setCatalogProducts(fromApi);
                }
            } catch {
                /* keep seed catalog for offline / mock */
            }
        })();
    }, []);

    const loadContent = async () => {
        const data = await ContentService.getAllContent();
        setPosts(data);
    };

    const handleNewPost = () => {
        if (!canManageContent) {
            showToast('You do not have permission to create content.', 'error');
            return;
        }
        setEditingPost(createEmptyEditingPost());
        setActiveTab('EDITOR');
    };

    const handleEditPost = (post: ContentPost) => {
        if (!canManageContent) {
            showToast('You do not have permission to edit content.', 'error');
            return;
        }
        setEditingPost({
            ...createEmptyEditingPost(),
            ...post,
            publishDate: toDatetimeLocalValue(post.publishDate),
            unpublishDate: post.unpublishDate ? toDatetimeLocalValue(post.unpublishDate) : '',
            ctaLabel: post.ctaLabel || '',
            linkedProductId: post.linkedProductId || '',
            imageUrl: post.imageUrl || '',
        });
        setActiveTab('EDITOR');
    };

    const handleSave = async () => {
        if (!canManageContent) {
            showToast('You do not have permission to save content.', 'error');
            return;
        }
        if (!editingPost.title) {
            showToast('Title is required', 'error');
            return;
        }

        setIsSaving(true);
        try {
            if (editingPost.id) {
                await ContentService.updateContent(editingPost.id, editingPost);
                showToast('Content updated', 'success');
            } else {
                await ContentService.createContent(editingPost);
                showToast('Content created', 'success');
            }
            await loadContent();
            setActiveTab('LIST');
        } catch (e) {
            showToast(formatCmsError(e, 'Failed to save content'), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeletePost = async (post: ContentPost) => {
        if (!canManageContent) {
            showToast('You do not have permission to delete content.', 'error');
            return;
        }
        const ok = await confirm({
            title: 'Delete content?',
            message: `"${post.title}" will be permanently removed from the portal.`,
            confirmLabel: 'Delete',
            variant: 'danger',
        });
        if (!ok) return;

        try {
            await ContentService.deleteContent(post.id);
            if (editingPost.id === post.id) {
                setEditingPost(createEmptyEditingPost());
                setActiveTab('LIST');
            }
            await loadContent();
            showToast('Content deleted', 'success');
        } catch (e) {
            showToast(e instanceof Error ? e.message : 'Failed to delete content', 'error');
        }
    };

    const handleAiGenerate = async () => {
        if (!aiPrompt) return;
        const hasExistingContent = !!editingPost.title?.trim() || !!editingPost.body?.trim();
        if (hasExistingContent) {
            const confirmed = window.confirm(
                'Headline atau body sudah terisi. Hasil AI akan menimpa isi saat ini. Lanjutkan?',
            );
            if (!confirmed) {
                return;
            }
        }

        setIsAiGenerating(true);
        try {
            const product = catalogProducts.find(p => p.id === editingPost.linkedProductId);
            const result = await ContentService.generateAiContent({
                prompt: aiPrompt,
                contentType: (editingPost.type as 'ARTICLE' | 'ADVERTISEMENT' | 'NEWS') || 'ARTICLE',
                existingTitle: editingPost.title,
                existingBody: editingPost.body,
                ctaLabel: editingPost.ctaLabel,
                linkedProduct: product
                    ? {
                        id: product.id,
                        title: product.title,
                        category: product.category,
                        priceIdr: product.priceIdr,
                        description: product.description,
                    }
                    : null,
            });
            setEditingPost(prev => ({
                ...prev,
                title: result.title,
                body: plainTextToEditorHtml(result.body),
            }));
            showToast('Content generated by AI', 'success');
        } catch (e) {
            showToast(formatCmsError(e, 'AI generation failed'), 'error');
        } finally {
            setIsAiGenerating(false);
        }
    };

    const formatIDR = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(num);

    if (!can('READ')) {
        return <div className="p-8 text-center text-slate-400">Access Restricted</div>;
    }

    // --- VIEWS ---

    const renderList = () => (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-w-0">
            <div className="p-3 sm:p-4 border-b border-slate-100 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center bg-slate-50">
                <div className="relative w-full sm:max-w-md min-w-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    <input type="text" placeholder="Search content..." className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-400/20" />
                </div>
                <button type="button" onClick={handleNewPost} disabled={!canManageContent} className="shrink-0 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto">
                    <Plus size={16} /> Create Content
                </button>
            </div>
            <div className="responsive-table-wrap">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-medium text-xs sm:text-sm">
                        <tr>
                            <th className="px-3 sm:px-5 py-3 sm:py-4">Title</th>
                            <th className="px-3 sm:px-5 py-3 sm:py-4 whitespace-nowrap">Type</th>
                            <th className="px-3 sm:px-5 py-3 sm:py-4 whitespace-nowrap">Status</th>
                            <th className="px-3 sm:px-5 py-3 sm:py-4 whitespace-nowrap">Schedule</th>
                            <th className="px-3 sm:px-5 py-3 sm:py-4 whitespace-nowrap">Engagement</th>
                            <th className="px-3 sm:px-5 py-3 sm:py-4 text-right whitespace-nowrap">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {posts.map(post => (
                            <tr key={post.id} className="hover:bg-slate-50">
                                <td className="px-3 sm:px-5 py-3 sm:py-4 max-w-[220px] sm:max-w-xs">
                                    <div className="font-bold text-slate-900 text-sm break-words">{post.title}</div>
                                    <div className="text-xs text-slate-500 mt-0.5 break-all line-clamp-2">{post.slug}</div>
                                </td>
                                <td className="px-3 sm:px-5 py-3 sm:py-4 align-top">
                                    <span className={`inline-block text-xs font-bold px-2 py-1 rounded ${post.type === 'ADVERTISEMENT' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {post.type}
                                    </span>
                                </td>
                                <td className="px-3 sm:px-5 py-3 sm:py-4 align-top">
                                    <span className={`flex items-center gap-1.5 text-xs font-medium ${post.status === 'PUBLISHED' ? 'text-green-600' : 'text-slate-500'}`}>
                                        <span className={`w-2 h-2 rounded-full shrink-0 ${post.status === 'PUBLISHED' ? 'bg-green-500' : 'bg-slate-400'}`}></span>
                                        {post.status}
                                    </span>
                                </td>
                                <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs text-slate-500 whitespace-nowrap">
                                    {new Date(post.publishDate).toLocaleDateString()}
                                </td>
                                <td className="px-3 sm:px-5 py-3 sm:py-4 align-top">
                                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                                        <span title="Views">👁️ {post.stats.views}</span>
                                        <span title="Clicks">🖱️ {post.stats.clicks}</span>
                                        <span title="Sales" className="text-green-600 font-bold">💲 {post.stats.conversions}</span>
                                    </div>
                                </td>
                                <td className="px-3 sm:px-5 py-3 sm:py-4 text-right align-top">
                                    <div className="inline-flex items-center gap-1">
                                        <button type="button" onClick={() => handleEditPost(post)} disabled={!canManageContent} className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors inline-flex touch-target sm:min-h-0 sm:min-w-0 disabled:opacity-40 disabled:cursor-not-allowed" title="Edit"><Edit3 size={18}/></button>
                                        <button type="button" onClick={() => void handleDeletePost(post)} disabled={!canManageContent} className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors inline-flex touch-target sm:min-h-0 sm:min-w-0 disabled:opacity-40 disabled:cursor-not-allowed" title="Delete"><Trash2 size={18}/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderEditor = () => (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 w-full items-start">
            {/* Left: on lg, bounded height so rich text scrolls inside; on mobile, page scrolls via <main> */}
            <div className="lg:col-span-2 flex flex-col gap-4 min-w-0 w-full">
                <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-[22rem] w-full lg:h-[min(44rem,calc(100dvh-13rem))]">
                    <div className="space-y-4 mb-4 flex-shrink-0 min-w-0">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Headline</label>
                            <input 
                                type="text" 
                                className="w-full min-w-0 text-lg sm:text-xl font-bold p-2 border-b-2 border-slate-200 focus:border-blue-500 outline-none placeholder:text-slate-300"
                                placeholder="Enter catchy headline..."
                                value={editingPost.title || ''}
                                onChange={e => setEditingPost({...editingPost, title: e.target.value})}
                            />
                        </div>
                        
                        {/* AI Prompt Area */}
                        <div className="bg-indigo-50 p-3 sm:p-4 rounded-xl border border-indigo-100 flex flex-col sm:flex-row gap-3 sm:gap-2 sm:items-stretch">
                            <Sparkles className="text-indigo-600 shrink-0 hidden sm:block" size={20} />
                            <input 
                                type="text" 
                                className="min-w-0 w-full flex-1 bg-white border border-indigo-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                                placeholder="AI Co-Pilot: describe the article you want…"
                                value={aiPrompt}
                                onChange={e => setAiPrompt(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAiGenerate()}
                            />
                            <button 
                                type="button"
                                onClick={handleAiGenerate}
                                disabled={isAiGenerating || !aiPrompt}
                                className="shrink-0 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 w-full sm:w-auto"
                            >
                                {isAiGenerating ? 'Writing...' : 'Generate'}
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 min-h-[260px] lg:min-h-0 border border-slate-200 rounded-lg overflow-hidden flex flex-col">
                        <RichTextEditor 
                            value={editingPost.body || ''}
                            onChange={(val) => setEditingPost({...editingPost, body: val})}
                        />
                    </div>

                    {editingPost.linkedProductId && (
                        <div className="mt-4 flex-shrink-0">
                            <p className="text-xs font-bold text-slate-500 uppercase mb-2">
                                Reader preview — linked product
                            </p>
                            <ContentLinkedProductCard
                                productId={editingPost.linkedProductId}
                                ctaLabel={editingPost.ctaLabel}
                                variant="light"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Right: Settings — internal scroll on wide screens if tall; mobile uses page scroll */}
            <div className="space-y-4 min-w-0 w-full lg:max-h-[min(44rem,calc(100dvh-13rem))] lg:overflow-y-auto lg:pr-1">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Publishing</h3>
                    
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Status</label>
                            <select 
                            className="w-full p-2 border border-slate-200 rounded text-sm"
                            value={editingPost.status || 'DRAFT'}
                            onChange={e => setEditingPost({...editingPost, status: e.target.value as ContentStatus})}
                        >
                            <option value="DRAFT">Draft</option>
                            <option value="SCHEDULED">Scheduled</option>
                            <option value="PUBLISHED">Published</option>
                            <option value="ARCHIVED">Archived</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Publish Date</label>
                        <input 
                            type="datetime-local" 
                            className="w-full p-2 border border-slate-200 rounded text-sm"
                            value={editingPost.publishDate || ''}
                            onChange={e => setEditingPost({...editingPost, publishDate: e.target.value})}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Unpublish Date (Optional)</label>
                        <input 
                            type="datetime-local" 
                            className="w-full p-2 border border-slate-200 rounded text-sm"
                            value={editingPost.unpublishDate || ''}
                            onChange={e => setEditingPost({...editingPost, unpublishDate: e.target.value})}
                        />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center">
                        <Link size={16} className="mr-2"/> Commercial Link
                    </h3>
                    <p className="text-xs text-slate-500">Attach a product card to this content to drive sales.</p>
                    
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Linked Product</label>
                        <select 
                            className="w-full p-2 border border-slate-200 rounded text-sm"
                            value={editingPost.linkedProductId || ''}
                            onChange={e => setEditingPost({...editingPost, linkedProductId: e.target.value})}
                        >
                            <option value="">-- None --</option>
                            {catalogProducts.map(p => (
                                <option key={p.id} value={p.id}>{p.title}</option>
                            ))}
                        </select>
                    </div>

                    {editingPost.linkedProductId && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">CTA Label</label>
                            <input 
                                type="text"
                                className="w-full p-2 border border-slate-200 rounded text-sm"
                                placeholder="e.g. Buy Now"
                                value={editingPost.ctaLabel || ''}
                                onChange={e => setEditingPost({...editingPost, ctaLabel: e.target.value})}
                            />
                        </div>
                    )}
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Meta Info</h3>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Type</label>
                        <div className="flex gap-2">
                            {['ARTICLE', 'ADVERTISEMENT', 'NEWS'].map(t => (
                                <button 
                                    key={t}
                                    type="button"
                                    onClick={() => setEditingPost({...editingPost, type: t as ContentType})}
                                    className={`flex-1 py-2 px-1 text-xs font-bold rounded-lg border ${editingPost.type === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 border-slate-200'}`}
                                >
                                    {t === 'ADVERTISEMENT' ? 'Ad' : t === 'ARTICLE' ? 'Article' : 'News'}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Image URL</label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                className="flex-1 p-2 border border-slate-200 rounded text-xs"
                                value={editingPost.imageUrl || ''}
                                onChange={e => setEditingPost({...editingPost, imageUrl: e.target.value})}
                                placeholder="https://..."
                            />
                            <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center border border-slate-200">
                                <ImageIcon size={14} className="text-slate-400"/>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                    {editingPost.id && (
                        <button
                            type="button"
                            onClick={() => void handleDeletePost(editingPost as ContentPost)}
                            disabled={!canManageContent}
                            className="w-full py-2 border border-red-200 text-red-600 rounded-lg text-sm font-bold hover:bg-red-50 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Trash2 size={16} /> Delete Content
                        </button>
                    )}
                    <div className="flex gap-3">
                        <button onClick={() => setActiveTab('LIST')} className="flex-1 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 font-bold hover:bg-slate-50">Cancel</button>
                        <button onClick={handleSave} disabled={!canManageContent || isSaving} className="flex-[2] py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 shadow-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed">
                            <Save size={16} className="mr-2" /> {isSaving ? 'Saving...' : 'Save Content'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderStats = () => {
        const data = posts.map(p => ({
            name: p.title.substring(0, 15) + '...',
            views: p.stats.views,
            revenue: p.stats.revenueAttributed / 1000000 // In Millions
        })).sort((a,b) => b.views - a.views).slice(0, 10);

        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-xs font-bold text-slate-500 uppercase">Total Views</div>
                        <div className="text-3xl font-bold text-slate-900 mt-1">{posts.reduce((a,b) => a + b.stats.views, 0).toLocaleString()}</div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-xs font-bold text-slate-500 uppercase">Total Shares</div>
                        <div className="text-3xl font-bold text-blue-600 mt-1">{posts.reduce((a,b) => a + b.stats.shares, 0).toLocaleString()}</div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-xs font-bold text-slate-500 uppercase">Link Clicks</div>
                        <div className="text-3xl font-bold text-purple-600 mt-1">{posts.reduce((a,b) => a + b.stats.clicks, 0).toLocaleString()}</div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-xs font-bold text-slate-500 uppercase">Attributed Rev</div>
                        <div className="text-3xl font-bold text-green-600 mt-1">{formatIDR(posts.reduce((a,b) => a + b.stats.revenueAttributed, 0))}</div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-6">Top Content Performance</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data}>
                                <XAxis dataKey="name" tick={{fontSize: 10}} />
                                <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
                                <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
                                <Tooltip />
                                <Bar yAxisId="left" dataKey="views" fill="#3b82f6" name="Views" radius={[4,4,0,0]} />
                                <Bar yAxisId="right" dataKey="revenue" fill="#10b981" name="Rev (M)" radius={[4,4,0,0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="page-container flex flex-col animate-fade-in relative min-w-0 pb-8">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end mb-5 sm:mb-6 gap-4 min-w-0">
                <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2 sm:gap-3">
                        <LayoutTemplate className="shrink-0 text-blue-600" size={28} /> 
                        <span className="leading-tight">Content Intelligence</span>
                    </h1>
                    <p className="text-slate-500 mt-1.5 text-sm sm:text-base">Manage public portal, ads, and track content ROI.</p>
                </div>
                <div className="flex flex-wrap gap-2 bg-slate-100 p-1 rounded-xl w-full lg:w-auto">
                    <button type="button" onClick={() => setActiveTab('LIST')} className={`flex-1 min-w-[100px] sm:flex-none px-3 sm:px-4 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'LIST' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}>
                        <LayoutTemplate size={16} className="shrink-0"/> All Content
                    </button>
                    <button type="button" onClick={() => setActiveTab('EDITOR')} className={`flex-1 min-w-[100px] sm:flex-none px-3 sm:px-4 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'EDITOR' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}>
                        <PenTool size={16} className="shrink-0"/> Editor
                    </button>
                    <button type="button" onClick={() => setActiveTab('STATS')} className={`flex-1 min-w-[100px] sm:flex-none px-3 sm:px-4 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'STATS' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}>
                        <BarChart3 size={16} className="shrink-0"/> Analytics
                    </button>
                </div>
            </div>

            <div className="min-w-0 w-full">
                {activeTab === 'LIST' && renderList()}
                {activeTab === 'EDITOR' && renderEditor()}
                {activeTab === 'STATS' && renderStats()}
            </div>
        </div>
    );
};

export default CMSAdmin;
