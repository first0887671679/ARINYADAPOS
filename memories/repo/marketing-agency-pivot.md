# ARINYADA POS - Marketing Agency Pivot

## Project Type
- บริการรับจ้างทำการตลาด (Marketing Agency)
- เดิม: ร้านแบตเตอรี่ → เปลี่ยนเป็น Marketing Agency

## Tech Stack
- Next.js 14.2.22 (App Router), React 18, TypeScript 5.7
- Drizzle ORM 0.36.4 + Neon PostgreSQL serverless
- Tailwind CSS 3.4.17 blue theme (#2563eb), shadcn/ui
- Deploy: https://arinyadapos.vercel.app
- Login: admin/admin123, cashier1/cashier123

## Migration 004_marketing_agency.sql
- Dropped columns: brand, model, size, battery_terminal, weight, stock, warranty from products
- Dropped: license_plate from customers
- Dropped: kg_price, low_stock_threshold, low_stock_alert_enabled, out_of_stock_alert_enabled, last_stock_reset_at, line_report_model from store_settings
- Added: service_duration to products
- Added: company_name, industry, contact_person to customers
- Added: contracts table

## Key Schema (products)
- id, name, costPrice, sellPrice, categoryId, serviceDuration, imageUrl, images, active, sortOrder, createdAt

## Key Schema (customers)
- id, name, phone, companyName, industry, contactPerson, address, taxId, createdAt

## Build Notes
- dotenv NOT installed; use fs.readFileSync('.env') to load DATABASE_URL for scripts
- Thai text encoding issues with replace_string_in_file — use PowerShell Get-Content/Set-Content for Thai text edits
- smsTemplates has durationDays (not durationMonths)