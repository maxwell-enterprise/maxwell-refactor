
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ContentService } from '../services/contentService';
import { ContentPost } from '../types/index';
import { Share2, Eye } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { excerpt } from '../lib/cmsContentUtils';

interface PublicPortalProps {
    onNavigateProduct: (productId: string) => void;
}

const PublicPortal: React.FC<PublicPortalProps> = ({ onNavigateProduct }) => {
    const { showToast } = useToast();
    const [content, setContent] = useState<ContentPost[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const data = await ContentService.getPublishedContent();
            setContent(data);
            setLoading(false);
        };
        load();
    }, []);

    const handleShare = (e: React.MouseEvent, post: ContentPost) => {
        e.preventDefault();
        e.stopPropagation();
        ContentService.trackShare(post.id, 'link');
        const url = `${window.location.origin}/articles/${encodeURIComponent(post.slug)}`;
        navigator.clipboard.writeText(url);
        showToast('Link copied to clipboard!', 'success');
    };

    const handleProductClick = (e: React.MouseEvent, productId: string, contentId: string) => {
        e.preventDefault();
        e.stopPropagation();
        ContentService.trackClick(contentId);
        onNavigateProduct(productId);
    };

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto p-6 animate-pulse space-y-8">
                <div className="h-10 w-64 bg-slate-200 rounded mx-auto" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="h-64 bg-slate-100 rounded-2xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6 animate-fade-in space-y-10">
            <div className="text-center py-10">
                <h1 className="text-4xl font-bold text-slate-900 mb-3">Maxwell Insights</h1>
                <p className="text-slate-500 text-lg">Leadership principles, news, and resources for your growth journey.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {content.map((post) => {
                    const articleHref = `/articles/${encodeURIComponent(post.slug)}`;

                    if (post.type === 'ADVERTISEMENT') {
                        return (
                            <div key={post.id} className="col-span-1 md:col-span-2 lg:col-span-3 bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row items-center gap-8">
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
                                <div className="relative z-10 flex-1">
                                    <span className="bg-white/20 backdrop-blur px-3 py-1 rounded text-xs font-bold uppercase mb-4 inline-block">Sponsored</span>
                                    <Link href={articleHref}>
                                        <h2 className="text-3xl font-bold mb-2 hover:underline">{post.title}</h2>
                                    </Link>
                                    <p className="text-white/90 mb-6 text-lg">{excerpt(post, 220)}</p>
                                    <div className="flex flex-wrap gap-3">
                                        <Link
                                            href={articleHref}
                                            className="bg-white text-orange-600 px-6 py-3 rounded-xl font-bold hover:bg-orange-50 transition-colors shadow-xl"
                                        >
                                            Read article
                                        </Link>
                                        {post.linkedProductId && (
                                            <button 
                                                onClick={(e) => handleProductClick(e, post.linkedProductId!, post.id)}
                                                className="border border-white/40 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/10 transition-colors"
                                            >
                                                {post.ctaLabel || 'Check it out'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {post.imageUrl && (
                                    <Link href={articleHref} className="relative z-10 w-full md:w-1/3 h-48 rounded-xl overflow-hidden shadow-2xl border-4 border-white/20 transform md:rotate-3 block">
                                        <img src={post.imageUrl} className="w-full h-full object-cover" alt="Ad"/>
                                    </Link>
                                )}
                            </div>
                        );
                    }

                    return (
                        <article key={post.id} className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col h-full">
                            <Link href={articleHref} className="flex flex-col flex-1">
                                <div className="h-48 overflow-hidden relative bg-slate-100">
                                    {post.imageUrl ? (
                                        <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-slate-300">No Image</div>
                                    )}
                                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-slate-900 shadow-sm">
                                        {post.tags[0] || 'Article'}
                                    </div>
                                </div>
                                <div className="p-6 flex-1 flex flex-col">
                                    <h3 className="text-xl font-bold text-slate-900 mb-2 leading-snug group-hover:text-blue-600 transition-colors">{post.title}</h3>
                                    <p className="text-slate-500 text-sm mb-6 line-clamp-3 flex-1">{excerpt(post, 150)}</p>
                                </div>
                            </Link>
                            <div className="px-6 pb-6 flex justify-between items-center text-xs text-slate-400 border-t border-slate-50 pt-4 mx-6">
                                <span>{new Date(post.publishDate).toLocaleDateString()}</span>
                                <div className="flex items-center gap-3">
                                    <span className="flex items-center"><Eye size={14} className="mr-1"/> {post.stats.views}</span>
                                    <button onClick={(e) => handleShare(e, post)} className="hover:text-blue-600"><Share2 size={14}/></button>
                                </div>
                            </div>
                        </article>
                    );
                })}
            </div>
        </div>
    );
};

export default PublicPortal;
