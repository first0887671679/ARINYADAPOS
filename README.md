# ARINYADA POS System

ระบบ POS สำหรับร้านแบตเตอรี่ พัฒนาด้วย Next.js 14, Drizzle ORM, Neon PostgreSQL

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** Neon PostgreSQL + Drizzle ORM
- **UI:** Tailwind CSS + shadcn/ui + Lucide Icons
- **Auth:** Cookie-based session
- **Language:** TypeScript

## Features

- **POS (หน้าขาย)** — ค้นหาสินค้า, ตะกร้า, เลือกลูกค้า, ส่วนลด, ชำระเงิน
- **Dashboard** — สรุปยอดขายวันนี้, สินค้า, ลูกค้า, รายการขายล่าสุด
- **Products** — CRUD สินค้า (ชื่อ, ยี่ห้อ, รุ่น, ขนาด, ราคา, สต็อก, รับประกัน)
- **Categories** — CRUD หมวดหมู่สินค้า
- **Customers** — CRUD ลูกค้า
- **Sales History** — ประวัติการขาย
- **Employees** — จัดการพนักงาน (admin only)
- **Role-based Access** — admin / cashier

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Setup environment

สร้างไฟล์ `.env` ที่ root ของโปรเจค:

```
DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require
```

### 3. Push database schema

```bash
npm run db:push
```

### 4. Seed data

```bash
npm run db:seed
```

### 5. Start dev server

```bash
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000)

## Login Credentials (after seeding)

| Role    | Username  | Password    |
| ------- | --------- | ----------- |
| Admin   | admin     | admin123    |
| Cashier | cashier1  | cashier123  |

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── dashboard/    # สรุปยอดขาย
│   │   ├── pos/          # หน้าขาย POS
│   │   ├── products/     # จัดการสินค้า
│   │   ├── categories/   # จัดการหมวดหมู่
│   │   ├── customers/    # จัดการลูกค้า
│   │   ├── sales/        # ประวัติการขาย
│   │   ├── employees/    # จัดการพนักงาน
│   │   └── layout.tsx    # Dashboard layout + sidebar
│   ├── login/            # หน้า Login
│   ├── actions.ts        # Server actions (CRUD)
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Redirect
├── components/
│   ├── sidebar.tsx       # Sidebar navigation
│   └── ui/               # shadcn/ui components
├── db/
│   ├── index.ts          # DB connection
│   ├── schema.ts         # Drizzle schema
│   └── seed.ts           # Seed script
└── lib/
    ├── auth.ts           # Auth helpers
    └── utils.ts          # Utility functions
```
