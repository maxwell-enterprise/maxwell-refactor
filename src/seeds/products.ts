
import { Product, InventoryItem } from '../types/index';

export const STORE_PRODUCTS_SEED: Product[] = [
  // --- CORE PROGRAMS (Ref: PDF Column 'Program') ---
  {
    id: "PKG-MLCT-FULL",
    title: "Full Access (Mentorship)",
    description: "Flagship one-year program. Includes 16 mentorship sessions, US & IN LMS access, and IMC Jakarta ticket.",
    priceIdr: 35000000, 
    category: "Packages",
    imageUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=1000",
    hasVariants: false,
    items: [
      { id: "ACC-MLOP", name: "LMS Access (US & IN)", type: "DIGITAL_LINK", quantity: 1, meta: { url: "https://online.maxwellleadership.com" } },
      { id: "ACC-16-SESS", name: "16 Mentorship Sessions", type: "EVENT_CREDIT", quantity: 16, meta: { creditTag: "MLCT_FULL", expiration: "2025-12-31" } },
      { id: "TKT-IMC", name: "IMC Jakarta Ticket", type: "TICKET", quantity: 1, meta: { eventId: "EVT-25-IMC" } },
      { id: "MERCH-KIT", name: "Welcome Kit & N-Tag", type: "PHYSICAL", quantity: 1, meta: { skuRef: "MERCH-NAMETAG" } }
    ]
  },
  {
    id: "PKG-PAY-105",
    title: "MLCT PAYMENT 1X105",
    description: "Founding / strategic partner bundle. Paid in full upfront for long-term access (3–5 years).",
    priceIdr: 105000000,
    category: "Packages",
    imageUrl: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&q=80&w=1000",
    hasVariants: false,
    items: [
      { id: "ACC-LIFETIME", name: "Lifetime Platform Access", type: "DIGITAL_LINK", quantity: 1 },
      { id: "ACC-VVIP", name: "VVIP Event Access", type: "EVENT_CREDIT", quantity: 50, meta: { creditTag: "MLCT_FULL", isUnlimited: true } }
    ]
  },
  {
    id: "PKG-ESSENTIA",
    title: "Essentia Program",
    description: "30-week leadership fundamentals program. Cohort-based.",
    priceIdr: 15000000,
    category: "Packages",
    imageUrl: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=1000",
    hasVariants: false,
    items: [
      { id: "ACC-ESS", name: "Essentia Cohort Access", type: "DIGITAL_LINK", quantity: 1, meta: { url: "https://online.maxwellleadership.com/essentia" } }
    ]
  },
  {
    id: "PKG-TTL",
    title: "Thrive to Lead (TTL)",
    description: "Six-week intensive webinar series on Zoom. Practitioner-focused.",
    priceIdr: 5000000,
    category: "Digital",
    imageUrl: "https://images.unsplash.com/photo-1591115765373-5207764f72e4?auto=format&fit=crop&q=80&w=1000",
    hasVariants: false,
    items: [
      { id: "ACC-TTL", name: "TTL Zoom Link", type: "DIGITAL_LINK", quantity: 1, meta: { url: "https://zoom.us/webinar/register/TTL" } }
    ]
  },

  // --- UPGRADES & EVENTS ---
  {
    id: "TKT-IMC-25",
    title: "International Maxwell Conference 2025",
    description: "General admission ticket for IMC Jakarta.",
    priceIdr: 3500000,
    category: "Upgrade",
    imageUrl: "https://images.unsplash.com/photo-1475721027767-p4d8563d0369?auto=format&fit=crop&q=80&w=1000",
    hasVariants: false,
    items: [{ id: "TKT-IMC-ITEM", name: "IMC E-Ticket", type: "TICKET", quantity: 1, meta: { eventId: "EVT-25-IMC" } }]
  },

  // --- MERCHANDISE ---
  {
    id: "BK-DT1",
    title: "Book: Empower Right Results",
    description: "By David Tjokrorahardjo. Practical leadership guide.",
    priceIdr: 250000,
    category: "Merchandise",
    imageUrl: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=600",
    hasVariants: false,
    items: [{ id: "DT1-EMPOWER", name: "Physical Book", type: "PHYSICAL", quantity: 1, meta: { skuRef: "DT1-EMPOWER" } }]
  }
];

// --- INVENTORY ---
export const INVENTORY_DATA_SEED: InventoryItem[] = [
  { sku: "DT1-EMPOWER", name: "Book: Empower Right Results", category: "Books", stock: 200, reorderLevel: 20, status: "In Stock", price: 250000 },
  { sku: "MERCH-NAMETAG", name: "Maxwell N-Tag (Magnetic)", category: "Merchandise", stock: 500, reorderLevel: 50, status: "In Stock", price: 50000 },
  { sku: "KIT-WELCOME", name: "Welcome Kit Box (Pen, Notebook)", category: "Merchandise", stock: 100, reorderLevel: 10, status: "In Stock", price: 150000 }
];
