
import { IProductRepository } from '../contracts';
import { Product } from '../../types/index';
import { DevDatabase } from '../../utils/devDatabase';
import { STORE_PRODUCTS } from '../../constants';

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
