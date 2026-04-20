'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Product, UserRole } from '../../types/index';
import { DataService } from '../../services/dataService';
import { DiscountService } from '../../services/discountService';
import { PricingEngine } from '../../services/pricingEngine';
import ProductDetailModal from './ProductDetailModal';
import ModernLogin from '../auth/ModernLogin';

interface PublicCampaignProductDeepLinkProps {
  productId: string;
  discountCode?: string;
  /** `source` query — shown as subtle “Ref” in the same modal as storefront. */
  campaignSource?: string;
}

const formatIDR = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n);

/**
 * Logged-out campaign landing: product detail + optional voucher price; checkout gated by login.
 */
const PublicCampaignProductDeepLink: React.FC<PublicCampaignProductDeepLinkProps> = ({
  productId,
  discountCode,
  campaignSource,
}) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [priceOverride, setPriceOverride] = useState<{
    current: number;
    compare?: number;
    voucherCode?: string;
  } | null>(null);

  const initialVariantId = useMemo(() => {
    if (!product?.hasVariants || !product.variants?.length) return undefined;
    return product.variants[0].id;
  }, [product]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const p = await DataService.getProductById(productId.trim());
        if (cancelled) return;
        if (!p) {
          setLoadError('Product not found.');
          setProduct(null);
          return;
        }
        setProduct(p);

        const rules = await PricingEngine.getRules();
        if (cancelled) return;

        let base = p.priceIdr;
        const v0 = p.hasVariants && p.variants?.length ? p.variants[0] : null;
        if (v0) base = v0.priceIdr;

        const proxy = { ...p, priceIdr: base };
        const calc = PricingEngine.calculatePrice(proxy, null, 1, rules);
        let listAfterEngine = calc.finalPrice;
        const listOriginal = base;

        const code = discountCode?.trim().toUpperCase();
        if (!code) {
          setPriceOverride(
            listAfterEngine < listOriginal
              ? { current: listAfterEngine, compare: listOriginal }
              : { current: listAfterEngine },
          );
          return;
        }

        const d = await DiscountService.findByCode(code);
        if (cancelled) return;
        if (!d) {
          setPriceOverride({ current: listAfterEngine, compare: listOriginal });
          return;
        }

        const { valid } = await DiscountService.isValid(d, UserRole.GUEST);
        if (cancelled) return;
        if (!valid) {
          setPriceOverride({ current: listAfterEngine, compare: listOriginal });
          return;
        }

        const off = DiscountService.calculateDiscount(
          d,
          listAfterEngine,
          1,
          p.category,
          p.id,
          UserRole.GUEST,
        );
        if (off <= 0) {
          setPriceOverride({ current: listAfterEngine, compare: listOriginal });
          return;
        }

        const after = Math.max(0, Math.round(listAfterEngine - off));
        setPriceOverride({
          current: after,
          compare: listAfterEngine,
          voucherCode: d.code,
        });
      } catch (e) {
        if (!cancelled) {
          setLoadError(
            e instanceof Error ? e.message : 'Failed to load product.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId, discountCode]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        <p className="mt-4 text-sm text-slate-500">Loading offer…</p>
      </div>
    );
  }

  if (loadError || !product) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
        <p className="max-w-md text-sm text-slate-600">{loadError ?? 'Product unavailable.'}</p>
        <a
          href="/"
          className="mt-6 text-sm font-semibold text-blue-600 hover:underline"
        >
          Back to home
        </a>
      </div>
    );
  }

  const displayPriceOverride =
    priceOverride && priceOverride.compare != null && priceOverride.compare > priceOverride.current
      ? {
          current: priceOverride.current,
          compare: priceOverride.compare,
          voucherCode: priceOverride.voucherCode,
        }
      : priceOverride
        ? {
            current: priceOverride.current,
            voucherCode: priceOverride.voucherCode,
          }
        : undefined;

  return (
    <>
      {/* Same ProductDetailModal as Storefront; only price/CTA/ref differ via props */}
      <ProductDetailModal
        product={product}
        onClose={() => {
          window.location.href = '/';
        }}
        onAddToCart={() => {
          setShowLogin(true);
        }}
        initialVariantId={initialVariantId}
        displayPriceOverride={displayPriceOverride}
        primaryCtaLabel="Sign in to checkout"
        primaryCtaHint={formatIDR(displayPriceOverride?.current ?? product.priceIdr)}
        closeOnAddToCart={false}
        campaignSource={campaignSource}
      />

      {showLogin && (
        <ModernLogin
          onLogin={() => {
            setShowLogin(false);
          }}
          onClose={() => setShowLogin(false)}
        />
      )}
    </>
  );
};

export default PublicCampaignProductDeepLink;
