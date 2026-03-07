
import { ModifiedTableDef } from './types';

export const COMMERCE_FINANCE_TABLES: ModifiedTableDef[] = [
    // 1. PRODUCT CATALOG HEADER
    {
        tableName: 'products',
        referenceRawTable: 'products',
        reasoning: "CORE ENTITY: The abstract parent product (e.g. 'Leadership T-Shirt'). It holds shared metadata like description and category, but does not hold price or stock (delegated to variants).",
        columns: [
            { name: 'id', type: 'uuid', isPk: true, constraints: 'DEFAULT gen_random_uuid()' },
            { name: 'title', type: 'varchar(255)', constraints: 'NOT NULL' },
            { name: 'slug', type: 'varchar(255)', constraints: 'UNIQUE NOT NULL' },
            { name: 'description', type: 'text' },
            { name: 'category', type: 'varchar(50)', constraints: "CHECK (category IN ('PACKAGES', 'CERTIFICATION', 'UPGRADE', 'MERCHANDISE', 'DIGITAL'))" },
            { name: 'image_url', type: 'varchar(500)' },
            { name: 'is_active', type: 'boolean', constraints: 'DEFAULT TRUE' },
            { name: 'installment_enabled', type: 'boolean', constraints: 'DEFAULT FALSE' },
            { name: 'installment_config', type: 'jsonb', description: '{min_dp_percent, max_tenor_months}' },
            { name: 'created_at', type: 'timestamptz', constraints: 'DEFAULT NOW()' },
            { name: 'updated_at', type: 'timestamptz', constraints: 'DEFAULT NOW()' }
        ],
        sqlDefinition: `CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  category VARCHAR(50) CHECK (category IN ('PACKAGES', 'CERTIFICATION', 'UPGRADE', 'MERCHANDISE', 'DIGITAL')),
  image_url VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  installment_enabled BOOLEAN DEFAULT FALSE,
  installment_config JSONB, -- { "min_dp": 20, "max_tenor": 3 }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`
    },

    // 2. PRODUCT VARIANTS (SKUs)
    {
        tableName: 'product_variants',
        referenceRawTable: 'products', // Extracted from nested 'variants'
        reasoning: "NORMALIZATION: This represents the actual sellable SKU (e.g. 'T-Shirt Red S'). It holds the specific price and physical/digital properties. If a product has no variations, a single 'Default' variant is created.",
        columns: [
            { name: 'id', type: 'uuid', isPk: true, constraints: 'DEFAULT gen_random_uuid()' },
            { name: 'product_id', type: 'uuid', isFk: true, fkTarget: 'products.id', constraints: 'ON DELETE CASCADE' },
            { name: 'sku', type: 'varchar(50)', constraints: 'UNIQUE NOT NULL' },
            { name: 'name', type: 'varchar(100)', constraints: 'NOT NULL', description: "e.g. 'Gold Package' or 'Size XL'" },
            { name: 'price_idr', type: 'decimal(15,2)', constraints: 'NOT NULL DEFAULT 0' },
            { name: 'compare_at_price_idr', type: 'decimal(15,2)', description: 'Strikethrough price' },
            { name: 'inventory_track', type: 'boolean', constraints: 'DEFAULT TRUE' },
            { name: 'stock_quantity', type: 'integer', constraints: 'DEFAULT 0' },
            { name: 'low_stock_threshold', type: 'integer', constraints: 'DEFAULT 5' },
            { name: 'weight_grams', type: 'integer', constraints: 'DEFAULT 0' }
        ],
        sqlDefinition: `CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  sku VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  price_idr DECIMAL(15,2) NOT NULL DEFAULT 0,
  compare_at_price_idr DECIMAL(15,2),
  inventory_track BOOLEAN DEFAULT TRUE,
  stock_quantity INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 5,
  weight_grams INTEGER DEFAULT 0
);`
    },

    // 3. BUNDLE COMPONENTS (Bill of Materials)
    {
        tableName: 'product_components',
        referenceRawTable: 'products', // Extracted from nested 'items' inside variants
        reasoning: "COMPOSITION: Handles Bundles. If Variant A (Welcome Kit) contains 1x Variant B (Book) and 1x Variant C (Pen), this table maps that relationship. Allows visual breakdown in Storefront Detail Modal and automatic inventory deduction.",
        columns: [
            { name: 'parent_variant_id', type: 'uuid', isPk: true, isFk: true, fkTarget: 'product_variants.id' },
            { name: 'child_variant_id', type: 'uuid', isPk: true, isFk: true, fkTarget: 'product_variants.id' },
            { name: 'quantity', type: 'integer', constraints: 'NOT NULL DEFAULT 1' },
            { name: 'display_order', type: 'integer', constraints: 'DEFAULT 0', description: 'Order in What\'s Inside list' }
        ],
        sqlDefinition: `CREATE TABLE product_components (
  parent_variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  child_variant_id UUID REFERENCES product_variants(id), -- The component being included
  quantity INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  PRIMARY KEY (parent_variant_id, child_variant_id)
);`
    },

    // 4. TRANSACTION HEADER (Order)
    {
        tableName: 'transactions',
        referenceRawTable: 'transactions',
        reasoning: "ORDER HEADER: Normalized version of the flat 'transaction'. Links strictly to a Member. Stores aggregate totals and payment state. 'legacy_id' keeps link to old system import.",
        columns: [
            { name: 'id', type: 'uuid', isPk: true, constraints: 'DEFAULT gen_random_uuid()' },
            { name: 'legacy_id', type: 'varchar(50)', description: 'For migration mapping' },
            { name: 'member_id', type: 'uuid', isFk: true, fkTarget: 'members.id', constraints: 'NOT NULL' },
            { name: 'transaction_date', type: 'timestamptz', constraints: 'DEFAULT NOW()' },
            { name: 'status', type: 'varchar(20)', constraints: "CHECK (status IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED'))" },
            { name: 'payment_method', type: 'varchar(50)' },
            { name: 'subtotal_amount', type: 'decimal(15,2)', constraints: 'NOT NULL' },
            { name: 'tax_amount', type: 'decimal(15,2)', constraints: 'DEFAULT 0' },
            { name: 'discount_total', type: 'decimal(15,2)', constraints: 'DEFAULT 0' },
            { name: 'grand_total', type: 'decimal(15,2)', constraints: 'NOT NULL' },
            { name: 'notes', type: 'text' },
            { name: 'attribution_source', type: 'varchar(100)', description: 'UTM Source / Campaign Tag' }
        ],
        sqlDefinition: `CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id VARCHAR(50),
  member_id UUID REFERENCES members(id) NOT NULL,
  transaction_date TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) CHECK (status IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED')),
  payment_method VARCHAR(50),
  subtotal_amount DECIMAL(15,2) NOT NULL,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  discount_total DECIMAL(15,2) DEFAULT 0,
  grand_total DECIMAL(15,2) NOT NULL,
  notes TEXT,
  attribution_source VARCHAR(100)
);`
    },

    // 5. TRANSACTION ITEMS (Order Lines)
    {
        tableName: 'transaction_items',
        referenceRawTable: 'transactions', // Implicitly part of old transactions
        reasoning: "LINE ITEMS: Connects an Order to specific Product Variants. Records price-at-purchase to preserve history if product prices change later. Essential for refunds and detailed analytics.",
        columns: [
            { name: 'id', type: 'uuid', isPk: true, constraints: 'DEFAULT gen_random_uuid()' },
            { name: 'transaction_id', type: 'uuid', isFk: true, fkTarget: 'transactions.id', constraints: 'ON DELETE CASCADE' },
            { name: 'variant_id', type: 'uuid', isFk: true, fkTarget: 'product_variants.id' },
            { name: 'quantity', type: 'integer', constraints: 'NOT NULL' },
            { name: 'unit_price_at_purchase', type: 'decimal(15,2)', constraints: 'NOT NULL' },
            { name: 'total_price', type: 'decimal(15,2)', description: 'qty * unit_price' },
            { name: 'entitlement_status', type: 'varchar(20)', constraints: "DEFAULT 'PENDING'", description: 'Track if digital rights/tickets have been granted' }
        ],
        sqlDefinition: `CREATE TABLE transaction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id),
  quantity INTEGER NOT NULL,
  unit_price_at_purchase DECIMAL(15,2) NOT NULL,
  total_price DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_price_at_purchase) STORED,
  entitlement_status VARCHAR(20) DEFAULT 'PENDING' -- PENDING, FULFILLED, REVOKED
);`
    },

    // 6. DISCOUNTS (Vouchers)
    {
        tableName: 'discounts',
        referenceRawTable: 'discounts',
        reasoning: "MARKETING LOGIC: Stores coupon codes. 'condition_config' JSONB allows storing complex rules (e.g. Min purchase amount, specific categories) without adding many columns.",
        columns: [
            { name: 'id', type: 'uuid', isPk: true, constraints: 'DEFAULT gen_random_uuid()' },
            { name: 'code', type: 'varchar(50)', constraints: 'UNIQUE NOT NULL' },
            { name: 'type', type: 'varchar(20)', constraints: "CHECK (type IN ('PERCENTAGE', 'FIXED_AMOUNT'))" },
            { name: 'value', type: 'decimal(15,2)', constraints: 'NOT NULL' },
            { name: 'start_date', type: 'timestamptz' },
            { name: 'end_date', type: 'timestamptz' },
            { name: 'usage_limit', type: 'integer' },
            { name: 'usage_count', type: 'integer', constraints: 'DEFAULT 0' },
            { name: 'condition_config', type: 'jsonb', description: 'Rules: min_spend, target_products, etc.' }
        ],
        sqlDefinition: `CREATE TABLE discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  type VARCHAR(20) CHECK (type IN ('PERCENTAGE', 'FIXED_AMOUNT')),
  value DECIMAL(15,2) NOT NULL,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  condition_config JSONB -- { min_spend: 100000, target_category: 'PACKAGES' }
);`
    },

    // 7. PRICING RULES (Automatic Discounts)
    {
        tableName: 'pricing_rules',
        referenceRawTable: 'pricing_rules',
        reasoning: "AUTOMATION: Rules that apply automatically without a code (e.g. 'Member Tier Discount'). 'abac_condition' JSONB stores the complex logic for matching users/contexts.",
        columns: [
            { name: 'id', type: 'uuid', isPk: true, constraints: 'DEFAULT gen_random_uuid()' },
            { name: 'name', type: 'varchar(100)' },
            { name: 'priority', type: 'integer', constraints: 'DEFAULT 0' },
            { name: 'is_active', type: 'boolean', constraints: 'DEFAULT TRUE' },
            { name: 'abac_condition', type: 'jsonb', description: 'Logic: target_lifecycle, min_engagement_score' },
            { name: 'action_config', type: 'jsonb', description: 'Effect: type: PERCENTAGE_OFF, value: 10' }
        ],
        sqlDefinition: `CREATE TABLE pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100),
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  abac_condition JSONB, -- { target_lifecycle: ['CERTIFIED'], min_score: 80 }
  action_config JSONB -- { type: 'PERCENTAGE_OFF', value: 10 }
);`
    },

    // 8. TRANSACTION DISCOUNTS (Junction)
    {
        tableName: 'transaction_discounts',
        referenceRawTable: 'discount_redemption_logs',
        reasoning: "AUDIT: Tracks which discounts or rules were applied to a specific transaction. Allows stacking multiple discounts and auditing marketing spend.",
        columns: [
            { name: 'transaction_id', type: 'uuid', isFk: true, fkTarget: 'transactions.id', constraints: 'ON DELETE CASCADE' },
            { name: 'discount_id', type: 'uuid', isFk: true, fkTarget: 'discounts.id', description: 'Nullable if it was a Rule' },
            { name: 'pricing_rule_id', type: 'uuid', isFk: true, fkTarget: 'pricing_rules.id', description: 'Nullable if it was a Code' },
            { name: 'amount_deducted', type: 'decimal(15,2)', constraints: 'NOT NULL' }
        ],
        sqlDefinition: `CREATE TABLE transaction_discounts (
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  discount_id UUID REFERENCES discounts(id),
  pricing_rule_id UUID REFERENCES pricing_rules(id),
  amount_deducted DECIMAL(15,2) NOT NULL,
  CHECK (discount_id IS NOT NULL OR pricing_rule_id IS NOT NULL)
);`
    }
];
