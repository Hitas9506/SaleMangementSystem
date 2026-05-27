-- VTShop manual migration for Supabase SQL Editor
-- Use this when `npx prisma migrate dev` cannot run yet because credentials are managed manually.
-- Order matters: pgvector extension must exist before product_embeddings vector columns.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  icon VARCHAR(50),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL UNIQUE,
  phone VARCHAR(20),
  note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL ON UPDATE CASCADE,
  name VARCHAR(300) NOT NULL,
  sku VARCHAR(50) NOT NULL UNIQUE,
  unit VARCHAR(30) NOT NULL,
  retail_price DECIMAL(12,0) NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  technical_specs TEXT,
  image_url VARCHAR(500),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE,
  image_vector vector(768),
  text_vector vector(768),
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL ON UPDATE CASCADE,
  import_price DECIMAL(12,0) NOT NULL,
  quantity INTEGER NOT NULL,
  note TEXT,
  import_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_amount DECIMAL(12,0) NOT NULL,
  paid_amount DECIMAL(12,0),
  payment_method VARCHAR(20) NOT NULL,
  payment_status VARCHAR(20) NOT NULL,
  note TEXT,
  order_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(12,0) NOT NULL,
  subtotal DECIMAL(12,0) NOT NULL
);

CREATE TABLE IF NOT EXISTS returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  reason TEXT,
  refund_amount DECIMAL(12,0),
  return_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE ON UPDATE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(12,0) NOT NULL
);

CREATE TABLE IF NOT EXISTS store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name VARCHAR(200) NOT NULL DEFAULT 'Cửa hàng Vật tư Gia đình',
  bank_name VARCHAR(100),
  bank_account VARCHAR(50),
  account_holder_name VARCHAR(200),
  zalo_phone VARCHAR(20),
  zalo_notify_hour INTEGER NOT NULL DEFAULT 21,
  zalo_notify_enabled BOOLEAN NOT NULL DEFAULT true,
  default_low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  logo_url VARCHAR(500),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_name_fts ON products USING GIN (to_tsvector('simple', name));
CREATE INDEX IF NOT EXISTS idx_import_product_date ON import_logs(product_id, import_date DESC);
CREATE INDEX IF NOT EXISTS idx_import_supplier ON import_logs(supplier_id);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_returns_order ON returns(order_id);
CREATE INDEX IF NOT EXISTS idx_return_items_return ON return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_return_items_product ON return_items(product_id);

-- Run after product_embeddings has enough rows for ivfflat to be useful.
CREATE INDEX IF NOT EXISTS idx_embedding_ivfflat
ON product_embeddings USING ivfflat (image_vector vector_cosine_ops)
WITH (lists = 100);

INSERT INTO store_settings (store_name, zalo_notify_hour, zalo_notify_enabled, default_low_stock_threshold)
SELECT 'Cửa hàng Vật tư Gia đình', 21, true, 5
WHERE NOT EXISTS (SELECT 1 FROM store_settings);
