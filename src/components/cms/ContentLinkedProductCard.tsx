'use client';

import React, { useEffect, useState } from 'react';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import { Product } from '../../types/index';
import { resolveLinkedProduct } from '../../services/contentLinkedProduct';

function formatIdr(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

type ContentLinkedProductCardProps = {
  productId: string;
  ctaLabel?: string;
  onCtaClick?: (product: Product) => void;
  variant?: 'dark' | 'light';
  className?: string;
};

const ContentLinkedProductCard: React.FC<ContentLinkedProductCardProps> = ({
  productId,
  ctaLabel,
  onCtaClick,
  variant = 'dark',
  className = '',
}) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void resolveLinkedProduct(productId).then((resolved) => {
      if (!cancelled) {
        setProduct(resolved);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (loading) {
    return (
      <div
        className={`rounded-2xl border border-slate-200 bg-slate-50 p-6 animate-pulse ${className}`}
      >
        <div className="h-4 w-24 bg-slate-200 rounded mb-3" />
        <div className="h-6 w-2/3 bg-slate-200 rounded mb-2" />
        <div className="h-4 w-full bg-slate-100 rounded mb-4" />
        <div className="h-10 w-36 bg-slate-200 rounded-full" />
      </div>
    );
  }

  if (!product) {
    return null;
  }

  const isDark = variant === 'dark';
  const label = ctaLabel?.trim() || 'View product';

  return (
    <aside
      className={`rounded-2xl overflow-hidden relative ${
        isDark
          ? 'bg-slate-900 text-white'
          : 'bg-white border border-slate-200 text-slate-900 shadow-sm'
      } ${className}`}
    >
      {isDark && (
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-600/30 to-transparent pointer-events-none" />
      )}
      <div className="relative z-10 flex flex-col sm:flex-row items-stretch gap-4 p-6">
        {product.imageUrl ? (
          <div className="sm:w-36 md:w-44 shrink-0 rounded-xl overflow-hidden">
            <img
              src={product.imageUrl}
              alt={product.title}
              className="w-full h-40 sm:h-full sm:min-h-[9rem] object-cover"
            />
          </div>
        ) : (
          <div
            className={`sm:w-36 md:w-44 shrink-0 h-40 sm:min-h-[9rem] rounded-xl flex items-center justify-center ${
              isDark ? 'bg-white/10' : 'bg-slate-100'
            }`}
          >
            <ShoppingBag
              size={40}
              className={isDark ? 'text-white/40' : 'text-slate-300'}
            />
          </div>
        )}
        <div className="flex-1 flex flex-col justify-center min-w-0">
          <p
            className={`text-xs font-bold uppercase tracking-widest mb-2 ${
              isDark ? 'text-blue-300' : 'text-blue-600'
            }`}
          >
            Featured program
          </p>
          <h3 className="text-xl font-bold leading-snug mb-1">{product.title}</h3>
          {product.category && (
            <p
              className={`text-xs font-medium mb-2 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              {product.category}
            </p>
          )}
          <p
            className={`text-sm mb-3 line-clamp-3 ${
              isDark ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            {product.description}
          </p>
          <p
            className={`text-lg font-bold mb-4 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            {formatIdr(product.priceIdr)}
            {product.compareAtPriceIdr != null &&
              product.compareAtPriceIdr > product.priceIdr && (
                <span
                  className={`ml-2 text-sm font-normal line-through ${
                    isDark ? 'text-slate-400' : 'text-slate-400'
                  }`}
                >
                  {formatIdr(product.compareAtPriceIdr)}
                </span>
              )}
          </p>
          {onCtaClick ? (
            <button
              type="button"
              onClick={() => onCtaClick(product)}
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-colors w-fit ${
                isDark
                  ? 'bg-white text-slate-900 hover:bg-blue-50'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {label}
              <ArrowRight size={16} />
            </button>
          ) : (
            <span
              className={`inline-flex items-center gap-2 text-sm font-bold ${
                isDark ? 'text-blue-200' : 'text-blue-600'
              }`}
            >
              {label}
              <ArrowRight size={16} />
            </span>
          )}
        </div>
      </div>
    </aside>
  );
};

export default ContentLinkedProductCard;
