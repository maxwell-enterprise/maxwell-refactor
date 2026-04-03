
import { IProductRepository, ProductListQuery } from '../contracts';
import { Product } from '../../types/index';
import { DevDatabase } from '../../utils/devDatabase';
import { STORE_PRODUCTS } from '../../constants';

function sortProducts(products: Product[], sortBy: ProductListQuery['sortBy'], sortOrder: ProductListQuery['sortOrder']): Product[] {
    const dir = sortOrder === 'desc' ? -1 : 1;
    const key = sortBy ?? 'title';
    return [...products].sort((a, b) => {
        if (key === 'priceIdr') return (a.priceIdr - b.priceIdr) * dir;
        if (key === 'category') return a.category.localeCompare(b.category) * dir;
        if (key === 'createdAt') {
            const ca = (a as unknown as { createdAt?: string }).createdAt;
            const cb = (b as unknown as { createdAt?: string }).createdAt;
            if (ca && cb) return ca.localeCompare(cb) * dir;
        }
        return a.title.localeCompare(b.title) * dir;
    });
}

export class MockProductRepository implements IProductRepository {
    async getAll(): Promise<Product[]> {
        try {
            const products = await DevDatabase.getAll<Product>('products');
            if (localStorage.getItem('MAXWELL_SKIP_SEED') === 'true') {
                return products;
            }

            // Check if seeded, if not seed from constants (Legacy logic for first load)
            if (await DevDatabase.isEmpty('products')) {
                await DevDatabase.bulkAdd('products', STORE_PRODUCTS);
                return STORE_PRODUCTS;
            }
            return products;
        } catch (e) {
            console.error("Mock Product Repo Error", e);
            if (localStorage.getItem('MAXWELL_SKIP_SEED') === 'true') return [];
            return STORE_PRODUCTS;
        }
    }

    async listProducts(
        query: ProductListQuery,
    ): Promise<{ data: Product[]; total: number }> {
        const all = await this.getAll();
        let filtered = all;
        const s = query.search?.trim().toLowerCase();
        if (s) {
            filtered = filtered.filter(
                (p) =>
                    p.title.toLowerCase().includes(s) ||
                    (p.description || '').toLowerCase().includes(s),
            );
        }
        if (query.category) {
            filtered = filtered.filter((p) => p.category === query.category);
        }
        if (typeof query.isActive === 'boolean') {
            filtered = filtered.filter((p) => (p.isActive !== false) === query.isActive);
        }
        const sorted = sortProducts(
            filtered,
            query.sortBy,
            query.sortOrder ?? 'asc',
        );
        const total = sorted.length;
        const start = (query.page - 1) * query.limit;
        const data = sorted.slice(start, start + query.limit);
        return { data, total };
    }

    async getById(id: string): Promise<Product | null> {
        const products = await this.getAll();
        return products.find(p => p.id === id) || null;
    }

    async upsert(product: Product): Promise<void> {
        await DevDatabase.add('products', product);
    }

    async delete(id: string): Promise<void> {
        await DevDatabase.delete('products', id);
    }
}
