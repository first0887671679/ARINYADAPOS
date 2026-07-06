-- Indexes for faster product search (ILIKE) on POS page
-- pg_trgm extension enables GIN trigram indexes for fast ILIKE queries
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_brand_trgm ON products USING gin (brand gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_model_trgm ON products USING gin (model gin_trgm_ops);

-- Composite index for active + category filter (covers most POS queries)
CREATE INDEX IF NOT EXISTS idx_products_active_category ON products(active, category_id);

-- Composite index for ordering
CREATE INDEX IF NOT EXISTS idx_products_sort_name ON products(sort_order, name);
