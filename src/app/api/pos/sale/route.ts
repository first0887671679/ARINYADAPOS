import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, sales, saleItems } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSession(request: NextRequest) {
  const sessionCookie = request.cookies.get("arinyadapos_session");
  if (!sessionCookie?.value) return null;
  try { return JSON.parse(sessionCookie.value); } catch { return null; }
}

// POST /api/pos/sale — สร้างการขายใหม่
export async function POST(request: NextRequest) {
  try {
    if (!getSession(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const billNumber = `BILL-${Date.now()}`;

    // Generate sequential tax invoice number
    let taxInvoiceNumber = null;
    if (data.isTaxInvoice) {
      const lastSale = await db.select({ taxInvoiceNumber: sales.taxInvoiceNumber })
        .from(sales)
        .where(sql`${sales.isTaxInvoice} = true AND ${sales.taxInvoiceNumber} IS NOT NULL`)
        .orderBy(desc(sales.id))
        .limit(1);

      let nextNum = 1;
      if (lastSale[0]?.taxInvoiceNumber) {
        const match = lastSale[0].taxInvoiceNumber.match(/(\d+)$/);
        if (match) nextNum = parseInt(match[1]) + 1;
      }
      taxInvoiceNumber = `TAX-${String(nextNum).padStart(6, "0")}`;
    }

    const subtotalVal = data.items.reduce((sum: number, item: any) => {
      return sum + (parseFloat(item.unitPrice) * item.quantity - parseFloat(item.discount || "0"));
    }, 0);
    const serviceFeeVal = parseFloat(data.serviceFee || "0");
    const discountVal = parseFloat(data.discount || "0");
    const taxRateVal = parseFloat(data.taxRate || "7");

    let beforeTax: number;
    let taxAmountVal: number;
    let totalVal: number;

    if (data.isTaxInvoice) {
      if (data.vatType === "vat_in") {
        const grossTotal = subtotalVal + serviceFeeVal - discountVal;
        beforeTax = grossTotal / (1 + taxRateVal / 100);
        taxAmountVal = grossTotal - beforeTax;
        totalVal = grossTotal;
      } else {
        beforeTax = subtotalVal + serviceFeeVal - discountVal;
        taxAmountVal = beforeTax * taxRateVal / 100;
        totalVal = beforeTax + taxAmountVal;
      }
    } else {
      beforeTax = subtotalVal + serviceFeeVal - discountVal;
      taxAmountVal = 0;
      totalVal = beforeTax;
    }

    const [sale] = await db.insert(sales).values({
      billNumber,
      taxInvoiceNumber,
      employeeId: data.employeeId,
      customerId: data.customerId,
      buyerName: data.buyerName || null,
      buyerPhone: data.buyerPhone || null,
      buyerAddress: data.buyerAddress || null,
      buyerTaxId: data.buyerTaxId || null,
      subtotal: subtotalVal.toFixed(2),
      serviceFee: serviceFeeVal.toFixed(2),
      serviceDescription: data.serviceDescription || null,
      discount: discountVal.toFixed(2),
      vatType: data.vatType || "vat_out",
      taxRate: taxRateVal.toFixed(2),
      taxAmount: taxAmountVal.toFixed(2),
      isTaxInvoice: data.isTaxInvoice,
      total: totalVal.toFixed(2),
      paymentMethod: data.paymentMethod || "cash",
      note: data.note || null,
      status: "completed",
    }).returning();

    for (const item of data.items) {
      const lineTotal = parseFloat(item.unitPrice) * item.quantity - parseFloat(item.discount || "0");
      await db.insert(saleItems).values({
        saleId: sale.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount || "0",
        total: lineTotal.toFixed(2),
      });
    }

    // ตัดสต๊อกทันทีพร้อมบันทึกบิล (ไม่รอ finalize)
    const updatedStock: { id: number; stock: number }[] = [];
    for (const item of data.items) {
      const qty = Number(item.quantity) || 0;
      const result = await db.update(products).set({
        stock: sql`GREATEST(${products.stock} - ${qty}, 0)`,
      }).where(eq(products.id, item.productId)).returning({ id: products.id, stock: products.stock });
      if (result[0]) updatedStock.push({ id: result[0].id, stock: Number(result[0].stock) });
      console.log(`[STOCK DEDUCT] saleId=${sale.id} productId=${item.productId} qty=${qty} newStock=${result[0]?.stock}`);
    }

    return NextResponse.json({ ...sale, updatedStock });
  } catch (err: any) {
    console.error("[POST /api/pos/sale]", err);
    return NextResponse.json({ error: err?.message || "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
