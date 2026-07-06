-- Add kg_price column to store_settings table (ราคา kg ละ)
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS kg_price NUMERIC(10,2) DEFAULT 0;
