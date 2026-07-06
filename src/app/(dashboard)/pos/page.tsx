import { db } from "@/db";
import { products, categories } from "@/db/schema";
import { eq } from "drizzle-orm";
import POSClient from "./pos-client";

export const dynamic = "force-dynamic";

export default async function POSPage() {
  // Query สินค้าจาก DB ตรงๆ ฝังใน HTML — ไม่พึ่ง client-side fetch
  const data = await db.select({
    products: {
      id: products.id,
      name: products.name,
      brand: products.brand,
      model: products.model,
      size: products.size,
      weight: products.weight,
      sellPrice: products.sellPrice,
      stock: products.stock,
      categoryId: products.categoryId,
      imageUrl: products.imageUrl,
      active: products.active,
      sortOrder: products.sortOrder,
    },
    categories: {
      id: categories.id,
      name: categories.name,
    },
  }).from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.active, true))
    .orderBy(products.sortOrder, products.name);

  return <POSClient initialProducts={data} />;
}
