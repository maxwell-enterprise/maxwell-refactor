
import React, { useEffect, useState } from 'react';
import { ContentService } from '../services/contentService';
import { ContentPost, Product } from '../types/index';
import { STORE_PRODUCTS } from '../constants';
import { Calendar, Share2, ArrowRight, Eye, ShoppingCart } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface PublicPortalProps {
    onNavigateProduct: (productId: string) => void;
}

const PublicPortal: React.FC<PublicPortalProps> = ({ onNavigateProduct }) => {
    const { showToast } = useToast();
    const [content, setContent] = useState<ContentPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPost, setSelectedPost] = useState<ContentPost | null>(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const data = await ContentService.getPublishedContent();
            setContent(data);
            setLoading(false);
        };
        load();
    }, []);

    const handleRead = (post: ContentPost) => {
        ContentService.trackView(post.id);
        setSelectedPost(post);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleShare = (e: React.MouseEvent, post: ContentPost) => {
        e.stopPropagation();
        ContentService.trackShare(post.id, 'link');
        navigator.clipboard.writeText(window.location.href); // Simulate share
        showToast('Link copied to clipboard!', 'success');
    };

    const handleProductClick = (productId: string, contentId: string) => {
        ContentService.trackClick(contentId);
        onNavigateProduct(productId);
    };

    // Render a single post detail
    if (selectedPost) {
        const product = STORE_PRODUCTS.find(p => p.id === selectedPost.linkedProductId);
        
        return (
            <div className="max-w-4xl mx-auto p-6 animate-fade-in">
                <button onClick={() => setSelectedPost(null)} className="mb-6 text-slate-500 hover:text-blue-600 flex items-center font-bold text-sm">
                    ← Back to News
                </button>
                
                <div className="bg-white rounded-3xl overflow-hidden shadow-xl border border-slate-200">
                    {selectedPost.imageUrl && (
                        <div className="h-80 w-full relative">
                            <img src={selectedPost.imageUrl} alt={selectedPost.title} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                            <div className="absolute bottom-6 left-6 text-white">
                                <span className="bg-blue-600 text-xs font-bold px-3 py-1 rounded-full mb-3 inline-block">{selectedPost.tags[0] || 'News'}</span>
                                <h1 className="text-3xl md:text-4xl font-bold leading-tight">{selectedPost.title}</h1>
                            </div>
                        </div>
                    )}
                    
                    <div className="p-8 md:p-12">
                        <div className="flex justify-between items-center text-slate-400 text-sm mb-8 border-b border-slate-100 pb-4">
                            <div className="flex items-center gap-4">
                                <span className="font-bold text-slate-700">{selectedPost.author}</span>
                                <span>•</span>
                                <span>{new Date(selectedPost.publishDate).toLocaleDateString()}</span>
                            </div>
                            <button onClick={(e) => handleShare(e, selectedPost)} className="flex items-center hover:text-blue-600 transition-colors">
                                <Share2 size={16} className="mr-2"/> Share
                            </button>
                        </div>

                        {/* Article Body */}
                        <div className="prose prose-lg text-slate-600 max-w-none mb-12 whitespace-pre-wrap leading-relaxed">
                            {selectedPost.body}
                        </div>

                        {/* Integrated Product Card */}
                        {product && (
                            <div className="bg-slate-900 rounded-2xl p-8 text-white relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-600/30 to-transparent"></div>
                                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                                    <div className="flex-1">
                                        <div className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">Featured Resource</div>
                                        <h3 className="text-2xl font-bold mb-2">{product.title}</h3>
                                        <p className="text-slate-300 mb-6">{product.description}</p>
                                        <button 
                                            onClick={() => handleProductClick(product.id, selectedPost.id)}
                                            className="bg-white text-slate-900 px-8 py-3 rounded-xl font-bold hover:bg-blue-50 transition-colors flex items-center shadow-lg"
                                        >
                                            {selectedPost.ctaLabel || 'View Product'} <ArrowRight size={18} className="ml-2"/>
                                        </button>
                                    </div>
                                    <div className="w-32 h-32 md:w-48 md:h-48 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/10 shadow-2xl transform rotate-3 group-hover:rotate-0 transition-transform duration-500">
                                        <ShoppingCart size={48} className="text-white/50" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
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

            {/* Featured Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {content.map((post, idx) => {
                    if (post.type === 'ADVERTISEMENT') {
                        return (
                            <div key={post.id} className="col-span-1 md:col-span-2 lg:col-span-3 bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row items-center gap-8">
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
                                <div className="relative z-10 flex-1">
                                    <span className="bg-white/20 backdrop-blur px-3 py-1 rounded text-xs font-bold uppercase mb-4 inline-block">Sponsored</span>
                                    <h2 className="text-3xl font-bold mb-2">{post.title}</h2>
                                    <p className="text-white/90 mb-6 text-lg">{post.body}</p>
                                    {post.linkedProductId && (
                                        <button 
                                            onClick={() => handleProductClick(post.linkedProductId!, post.id)}
                                            className="bg-white text-orange-600 px-6 py-3 rounded-xl font-bold hover:bg-orange-50 transition-colors shadow-xl"
                                        >
                                            {post.ctaLabel || 'Check it out'}
                                        </button>
                                    )}
                                </div>
                                {post.imageUrl && (
                                    <div className="relative z-10 w-full md:w-1/3 h-48 rounded-xl overflow-hidden shadow-2xl border-4 border-white/20 transform md:rotate-3">
                                        <img src={post.imageUrl} className="w-full h-full object-cover" alt="Ad"/>
                                    </div>
                                )}
                            </div>
                        );
                    }

                    return (
                        <div key={post.id} className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col h-full cursor-pointer" onClick={() => handleRead(post)}>
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
                                <p className="text-slate-500 text-sm mb-6 line-clamp-3 flex-1">{post.body.substring(0, 150)}...</p>
                                <div className="mt-auto flex justify-between items-center text-xs text-slate-400 border-t border-slate-50 pt-4">
                                    <span>{new Date(post.publishDate).toLocaleDateString()}</span>
                                    <div className="flex items-center gap-3">
                                        <span className="flex items-center"><Eye size={14} className="mr-1"/> {post.stats.views}</span>
                                        <button onClick={(e) => handleShare(e, post)} className="hover:text-blue-600"><Share2 size={14}/></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PublicPortal;
