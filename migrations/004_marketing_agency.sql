-- Migration: ปรับโปรเจคเป็น Marketing Agency (บริการรับจ้างทำการตลาด)
-- ลบฟิลด์เฉพาะแบตเตอรี่, ลบสต็อก, ลบ licensePlate, เพิ่มตาราง contracts

-- 1. ลบฟิลด์เฉพาะแบตเตอรี่จาก products
ALTER TABLE products DROP COLUMN IF EXISTS brand;
ALTER TABLE products DROP COLUMN IF EXISTS model;
ALTER TABLE products DROP COLUMN IF EXISTS size;
ALTER TABLE products DROP COLUMN IF EXISTS battery_terminal;
ALTER TABLE products DROP COLUMN IF EXISTS weight;
ALTER TABLE products DROP COLUMN IF EXISTS stock;
ALTER TABLE products DROP COLUMN IF EXISTS warranty;
ALTER TABLE products ADD COLUMN IF NOT EXISTS service_duration varchar(100);

-- 2. ลบ licensePlate จาก customers, เพิ่ม company fields
ALTER TABLE customers DROP COLUMN IF EXISTS license_plate;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_name varchar(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS industry varchar(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS contact_person varchar(255);

-- 3. ลบ inventory settings จาก store_settings
ALTER TABLE store_settings DROP COLUMN IF EXISTS kg_price;
ALTER TABLE store_settings DROP COLUMN IF EXISTS low_stock_threshold;
ALTER TABLE store_settings DROP COLUMN IF EXISTS low_stock_alert_enabled;
ALTER TABLE store_settings DROP COLUMN IF EXISTS out_of_stock_alert_enabled;
ALTER TABLE store_settings DROP COLUMN IF EXISTS last_stock_reset_at;
ALTER TABLE store_settings DROP COLUMN IF EXISTS line_report_model;
ALTER TABLE store_settings ALTER COLUMN store_name SET DEFAULT 'บริษัทรับจ้างทำการตลาด';

-- 4. เปลี่ยน sms_templates: durationMonths → durationDays
ALTER TABLE sms_templates DROP COLUMN IF EXISTS duration_months;
ALTER TABLE sms_templates ADD COLUMN IF NOT EXISTS duration_days integer NOT NULL DEFAULT 7;

-- 5. สร้างตาราง contracts (สัญญาบริการ)
CREATE TABLE IF NOT EXISTS contracts (
  id SERIAL PRIMARY KEY,
  contract_number VARCHAR(50) NOT NULL UNIQUE,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  product_id INTEGER REFERENCES products(id),
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  monthly_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  auto_renew BOOLEAN NOT NULL DEFAULT false,
  note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contracts_customer_id ON contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_end_date ON contracts(end_date);