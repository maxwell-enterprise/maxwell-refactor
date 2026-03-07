
import { Product } from '../types/index';

export const DIGITAL_CREDIT_PRODUCT_SEED: Product = {
    id: 'PKG-DIGITAL-MASTER',
    title: 'Digital Mastery & Flex Credits',
    description: 'A bundle containing digital resources and flexible event credits.',
    priceIdr: 2500000,
    category: 'Digital',
    imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=1000',
    items: [
        {
            id: 'ITM-EBOOK-01',
            name: 'Leadership E-Book',
            type: 'DIGITAL_LINK',
            quantity: 1,
            meta: { url: 'https://maxwellleadership.com/resources/ebook.pdf', cta: 'Download PDF' }
        },
        {
            id: 'ITM-CREDIT-01',
            name: 'Webinar Flex Pass',
            type: 'EVENT_CREDIT',
            quantity: 5,
            meta: { creditTag: 'WEBINAR_2025', expiration: '2025-12-31' }
        }
    ],
    hasVariants: false
};
