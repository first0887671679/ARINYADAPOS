-- Add weight column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight NUMERIC(8,3);
