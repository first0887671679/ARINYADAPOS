"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSessionUser, getStoreSettings, updateStoreSettings, getCategories, getEmployees } from "@/app/actions";
import { formatCurrency } from "@/lib/utils";
import { Search, Plus, Minus, Trash2, ShoppingCart, Printer, X, CheckCircle2, Wrench, Image as ImageIcon, FileText, Filter, MessageCircle, Send, Loader2, Smartphone, UserPlus, Users } from "lucide-react";
import { Label } from "@/components/ui/label";

interface CartItem {
  productId: number;
  name: string;
  brand?: string;
  model?: string;
  weight?: number; // kg
  unitPrice: number;
  quantity: number;
  discount: number;
  stock: number;
  imageUrl?: string;
}

export default function POSClient({ initialProducts = [] }: { initialProducts?: any[] }) {
  const PAGE_VERSION = "v9-no-reload";
  const [query, setQuery] = useState("");
  const [productList, setProductList] = useState<any[]>(initialProducts);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customers, setCustomersList] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [discount, setDiscount] = useState(0);
  const [serviceFee, setServiceFee] = useState(0);
  const [serviceDescription, setServiceDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [note, setNote] = useState("");
  const [taxRate, setTaxRate] = useState(7); // อัตราภาษี 7%
  const [vatType, setVatType] = useState<"vat_in" | "vat_out">("vat_out"); // แวทใน/แวทนอก
  const [isTaxInvoice, setIsTaxInvoice] = useState(false); // เป็นใบกำกับภาษีหรือไม่
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptCart, setReceiptCart] = useState<CartItem[]>([]);
  const [employeeId, setEmployeeId] = useState<number>(1);
  const [userRole, setUserRole] = useState<string>("cashier");
  const [storeSettings, setStoreSettings] = useState<any>(null);
  // Editable buyer info for tax invoice
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [buyerTaxId, setBuyerTaxId] = useState("");
  // LINE + SMS send to employee
  const [showLineSend, setShowLineSend] = useState(false);
  const [empList, setEmpList] = useState<any[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<number | null>(null);
  const [lineExtraMsg, setLineExtraMsg] = useState("");
  const [lineSending, setLineSending] = useState(false);
  const [lineSendResult, setLineSendResult] = useState<{ success: boolean; error?: string } | null>(null);
  // SMS editable fields (ส่งงานพนักงาน)
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [smsModel, setSmsModel] = useState("");
  const [smsPrice, setSmsPrice] = useState("");
  const [smsEmpPhone, setSmsEmpPhone] = useState("");
  const [smsConditions, setSmsConditions] = useState("");
  const [smsSending, setSmsSending] = useState(false);
  const [smsSendResult, setSmsSendResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [smsCredit, setSmsCredit] = useState<number | null>(null);
  // SMS reminder ลูกค้า (ตั้งแจ้งเตือนล่วงหน้า)
  const [showSmsReminder, setShowSmsReminder] = useState(false);
  const [smsReminderEnabled, setSmsReminderEnabled] = useState(false);
  const [smsTemplateList, setSmsTemplateList] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [smsReminderPhone, setSmsReminderPhone] = useState("");
  const [smsReminderMsg, setSmsReminderMsg] = useState("");
  const [smsReminderDate, setSmsReminderDate] = useState("");
  const [smsReminderProductInfo, setSmsReminderProductInfo] = useState("");
  const [smsReminderSaving, setSmsReminderSaving] = useState(false);
  const [smsReminderResult, setSmsReminderResult] = useState<{ success: boolean; error?: string } | null>(null);
  // Inline add customer in POS
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustLicensePlate, setNewCustLicensePlate] = useState("");
  const [newCustAddress, setNewCustAddress] = useState("");
  const [newCustTaxId, setNewCustTaxId] = useState("");
  const [newCustSaving, setNewCustSaving] = useState(false);
  // Customer search
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  // Success popup
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  // Cancelled state
  const [saleCancelled, setSaleCancelled] = useState(false);
  // Mobile cart drawer
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  // Inline template management in POS
  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [newTplName, setNewTplName] = useState("");
  const [newTplMsg, setNewTplMsg] = useState("");
  const [newTplMonths, setNewTplMonths] = useState(18);
  const [tplSaving, setTplSaving] = useState(false);
  // Refs for preventing double submission & closing dropdown
  const checkoutInProgress = useRef(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const cartSectionRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close customer dropdown when tapping outside (critical for mobile)
  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // Lock body scroll when receipt modal is open (prevent background scroll on mobile)
  useEffect(() => {
    if (success && showReceipt) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [success, showReceipt]);

  useEffect(() => {
    // ลบ Service Worker เก่าที่ cache หน้า POS ไว้ เพื่อให้ได้ข้อมูลใหม่ทุกครั้ง
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(r => r.unregister());
      });
      if ('caches' in window) {
        caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
      }
    }
    // ไม่ fetch สินค้าจาก API — ใช้ initialProducts จาก SSR เท่านั้น
    loadCustomers().catch(() => {});
    loadCategories().catch(() => {});
    getSessionUser().then((s) => { if (s) { setEmployeeId(s.id); setUserRole(s.role); } }).catch(() => {});
    loadStoreSettings().catch(() => {});
    loadEmployees().catch(() => {});
    loadSmsTemplates().catch(() => {});
  }, []);

  // ไม่ต้อง fetch จาก API เมื่อเปลี่ยน category — filter ที่ client แทน

  async function loadEmployees() {
    const data = await getEmployees();
    setEmpList(data.filter((e: any) => e.active));
  }

  async function loadSmsTemplates() {
    try {
      const res = await fetch("/api/pos/sms-templates");
      const data = await res.json();
      setSmsTemplateList((data || []).filter((t: any) => t.active));
    } catch { setSmsTemplateList([]); }
  }

  function handleApplyReminderTemplate(templateId: number) {
    const t = smsTemplateList.find((tpl: any) => tpl.id === templateId);
    if (!t) return;
    setSelectedTemplateId(templateId);
    // คำนวณวันที่
    const d = new Date();
    d.setMonth(d.getMonth() + t.durationMonths);
    setSmsReminderDate(d.toISOString().split("T")[0]);
    // แทนที่ตัวแปรในข้อความ
    let msg = t.message;
    const custName = buyerName || success?.buyerName || "ลูกค้า";
    msg = msg.replace(/\{\{name\}\}/g, custName);
    msg = msg.replace(/\{\{phone\}\}/g, smsReminderPhone || buyerPhone || "");
    msg = msg.replace(/\{\{product\}\}/g, smsReminderProductInfo || receiptCart.map(i => i.name).join(", ") || "แบตเตอรี่");
    msg = msg.replace(/\{\{shopPhone\}\}/g, storeSettings?.phone || "");
    msg = msg.replace(/\{\{date\}\}/g, d.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" }));
    setSmsReminderMsg(msg);
  }

  async function handleSmsReminderSave() {
    if (!smsReminderPhone || !smsReminderMsg || !smsReminderDate) return;
    setSmsReminderSaving(true);
    setSmsReminderResult(null);
    try {
      const reminderRes = await fetch("/api/pos/sms-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: success?.customerId || undefined,
          saleId: success?.id || undefined,
          templateId: selectedTemplateId || undefined,
          customerName: buyerName || success?.buyerName || undefined,
          phone: smsReminderPhone,
          message: smsReminderMsg,
          productInfo: smsReminderProductInfo || receiptCart.map(i => i.name).join(", ") || undefined,
          scheduledDate: smsReminderDate,
        }),
      });
      if (!reminderRes.ok) {
        const errData = await reminderRes.json().catch(() => null);
        throw new Error(errData?.error || "Failed");
      }
      setSmsReminderResult({ success: true });
    } catch (err: any) {
      setSmsReminderResult({ success: false, error: err?.message || "เกิดข้อผิดพลาดในการบันทึก" });
    } finally {
      setSmsReminderSaving(false);
    }
  }

  async function handleAddTemplate() {
    if (!newTplName || !newTplMsg || !newTplMonths) return;
    setTplSaving(true);
    try {
      await fetch("/api/pos/sms-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTplName, message: newTplMsg, durationMonths: newTplMonths }),
      });
      await loadSmsTemplates();
      setShowAddTemplate(false);
      setNewTplName(""); setNewTplMsg(""); setNewTplMonths(18);
    } catch { /* ignore */ } finally { setTplSaving(false); }
  }

  async function handleDeleteTemplateInline(id: number) {
    if (!confirm("ลบเทมเพลตนี้?")) return;
    await fetch(`/api/pos/sms-templates?id=${id}`, { method: "DELETE" });
    await loadSmsTemplates();
    if (selectedTemplateId === id) setSelectedTemplateId(null);
  }

  async function handleAddCustomerInline() {
    if (!newCustName) return;
    setNewCustSaving(true);
    try {
      // ใช้ fetch แทน server action เพื่อป้องกัน Next.js Router Cache invalidation ที่ทำให้ cart รีเซ็ต
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCustName, phone: newCustPhone, licensePlate: newCustLicensePlate, address: newCustAddress, taxId: newCustTaxId || undefined }),
      });
      if (!res.ok) throw new Error("Failed to create customer");
      const newCust = await res.json();
      // โหลดรายชื่อลูกค้าใหม่ผ่าน fetch เช่นกัน
      await loadCustomers();
      // Auto-select the newly created customer
      if (newCust?.id) setSelectedCustomer(newCust.id);
      setNewCustName(""); setNewCustPhone(""); setNewCustLicensePlate(""); setNewCustAddress(""); setNewCustTaxId("");
      setShowAddCustomer(false);
      // บนมือถือ: ฟอร์มพับลงทำให้ browser เลื่อนขึ้น → ดึง scroll กลับมาที่ตะกร้า
      requestAnimationFrame(() => {
        cartSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch { /* ignore */ } finally { setNewCustSaving(false); }
  }

  async function handleFinish() {
    if (!success?.id) return;

    try {
      // ส่ง LINE Notify + เช็คสต็อกต่ำ (ข้อมูลการขายบันทึกไว้แล้วตอนกดชำระเงิน)
      const items = receiptCart.map(item => ({
        productId: item.productId,
        quantity: item.quantity
      }));
      await fetch("/api/pos/sale/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saleId: success.id, saleItems: items }),
      });
    } catch (err) {
      console.error("Failed to finalize sale:", err);
    }

    // แสดง popup สำเร็จ แล้วรีเซ็ตหลังผู้ใช้กดปิด หรือ timeout 3 วินาที
    setShowSuccessPopup(true);
    setShowReceipt(false);
    setShowLineSend(false);
    setLineSendResult(null);
    setShowSmsReminder(false);
    setSmsReminderResult(null);
  }

  function dismissSuccessPopup() {
    setShowSuccessPopup(false);
    setSuccess(null);
  }

  async function loadCategories() {
    const data = await getCategories();
    setCategories(data);
  }

  async function loadStoreSettings() {
    const settings = await getStoreSettings();
    setStoreSettings(settings);
  }

  async function autoSaveStoreSettings(updated: any) {
    try {
      await updateStoreSettings({
        storeName: updated.storeName || "ร้านแบตเตอรี่",
        branchName: updated.branchName,
        address: updated.address,
        phone: updated.phone,
        taxId: updated.taxId,
        storeLogo: updated.storeLogo || undefined,
      });
    } catch {}
  }

  async function fetchProducts(q: string, catId: number | null) {
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (catId) params.set("category", catId.toString());
      params.set("_t", Date.now().toString());
      const url = `/api/pos/products?${params}`;
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) setProductList(await res.json());
    } catch {}
  }

  function loadProducts() {
    return fetchProducts("", null);
  }

  async function loadCustomers() {
    try {
      const res = await fetch("/api/customers");
      if (res.ok) {
        const data = await res.json();
        setCustomersList(data);
      }
    } catch {}
  }

  async function handleSearch(q: string) {
    setQuery(q);
    // ไม่ต้อง fetch จาก API — filter ที่ client แทน (เร็วกว่าและไม่มีปัญหา cache)
  }

  const isServiceRole = userRole === "service";

  function handleSelectEmp(empId: number | null) {
    setSelectedEmpId(empId);
    setLineSendResult(null);
    setSmsSendResult(null);
    if (empId) {
      const emp = empList.find((e: any) => e.id === empId);
      if (emp) {
        setSmsEmpPhone(emp.phone || "");
      }
      // Auto-fill product model/price from cart
      if (receiptCart.length > 0) {
        setSmsModel(receiptCart.map(i => [i.brand, i.name, i.model].filter(Boolean).join(" / ")).join(", "));
        setSmsPrice(formatCurrency(parseFloat(success?.total || "0")));
      }
    }
  }

  async function handleLineSend() {
    if (!selectedEmpId || !success) return;
    setLineSending(true);
    setLineSendResult(null);
    try {
      // สร้างข้อความรวม LINE + SMS info
      let extraMsg = lineExtraMsg || "";
      if (smsModel) extraMsg += `\nรุ่น/สินค้า: ${smsModel}`;
      if (smsPrice) extraMsg += `\nราคา: ${smsPrice}`;
      if (smsConditions) extraMsg += `\nเงื่อนไข: ${smsConditions}`;

      const lineRes = await fetch("/api/pos/notify/line", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selectedEmpId,
          saleId: success.id,
          extraMessage: extraMsg.trim() || undefined,
          buyerName: buyerName || success.buyerName || undefined,
          buyerPhone: buyerPhone || success.buyerPhone || undefined,
          buyerAddress: buyerAddress || success.buyerAddress || undefined,
        }),
      });
      const result = await lineRes.json();
      setLineSendResult(result);
    } catch {
      setLineSendResult({ success: false, error: "เกิดข้อผิดพลาดในการส่ง LINE" });
    } finally {
      setLineSending(false);
    }
  }

  async function handleSmsSend() {
    if (!selectedEmpId || !smsEmpPhone) return;
    setSmsSending(true);
    setSmsSendResult(null);
    try {
      let smsText = `งานมอบหมาย`;
      if (smsModel) smsText += `\nรุ่น: ${smsModel}`;
      if (smsPrice) smsText += `\nราคา: ${smsPrice}`;
      if (success?.billNumber) smsText += `\nบิล: ${success.billNumber}`;
      if (smsConditions) smsText += `\nเงื่อนไข: ${smsConditions}`;
      if (lineExtraMsg) smsText += `\n${lineExtraMsg}`;

      const smsRes = await fetch("/api/pos/notify/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selectedEmpId,
          phone: smsEmpPhone,
          message: smsText,
          saleId: success?.id,
          billNumber: success?.billNumber,
        }),
      });
      const result = await smsRes.json();
      setSmsSendResult(result);
    } catch (err: any) {
      setSmsSendResult({ success: false, error: err?.message || "เกิดข้อผิดพลาดในการส่ง SMS" });
    } finally {
      setSmsSending(false);
    }
  }

  function addToCart(product: any) {
    if (isServiceRole) return;
    const p = product.products || product;
    const existing = cart.find((item) => item.productId === p.id);
    if (existing) {
      if (existing.quantity >= p.stock) return;
      setCart(cart.map((item) =>
        item.productId === p.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      if (p.stock <= 0) return;
      setCart([...cart, {
        productId: p.id, name: p.name,
        brand: p.brand || undefined, model: p.model || undefined, weight: p.weight ? parseFloat(p.weight) : undefined,
        unitPrice: parseFloat(p.sellPrice), quantity: 1, discount: 0, stock: p.stock,
        imageUrl: p.imageUrl || undefined,
      }]);
    }
    // On mobile, the sticky bottom bar updates automatically showing count + total
    // No need to scroll since the cart is always visible at the bottom
  }

  function updateQuantity(productId: number, qty: number) {
    if (qty <= 0) {
      setCart(cart.filter((item) => item.productId !== productId));
    } else {
      setCart(cart.map((item) =>
        item.productId === productId ? { ...item, quantity: Math.min(qty, item.stock) } : item
      ));
    }
  }

  function removeFromCart(productId: number) {
    setCart(cart.filter((item) => item.productId !== productId));
  }

  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity - item.discount, 0);
  const totalCartWeight = cart.reduce((sum, item) => sum + (item.weight || 0) * item.quantity, 0);
  const kgPrice = parseFloat(storeSettings?.kgPrice || "0");
  const beforeDiscount = subtotal + serviceFee;
  const afterDiscount = beforeDiscount - discount;
  
  // Calculate tax based on VAT type
  let beforeTax: number;
  let taxAmount: number;
  let total: number;
  
  if (isTaxInvoice) {
    if (vatType === "vat_in") {
      // ราคารวมภาษีแล้ว
      total = afterDiscount;
      beforeTax = total / (1 + taxRate / 100);
      taxAmount = total - beforeTax;
    } else {
      // ราคายังไม่รวมภาษี
      beforeTax = afterDiscount;
      taxAmount = beforeTax * taxRate / 100;
      total = beforeTax + taxAmount;
    }
  } else {
    beforeTax = afterDiscount;
    taxAmount = 0;
    total = afterDiscount;
  }

  async function handleCheckout() {
    if (cart.length === 0 && serviceFee <= 0) {
      alert("กรุณาเพิ่มสินค้าหรือค่าบริการ");
      return;
    }
    // ป้องกันกดซ้ำบนมือถือ (double-tap protection)
    if (checkoutInProgress.current) return;
    checkoutInProgress.current = true;
    setLoading(true);
    try {
      // บันทึกข้อมูลการขายลง DB ผ่าน API route (ป้องกัน revalidatePath ทำ state หาย)
      const saleRes = await fetch("/api/pos/sale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          customerId: selectedCustomer,
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice.toString(),
            discount: item.discount.toString(),
          })),
          serviceFee: serviceFee.toString(),
          serviceDescription,
          discount: discount.toString(),
          vatType,
          taxRate: taxRate.toString(),
          isTaxInvoice,
          buyerName: buyerName || (selectedCustomer ? customers.find(c => c.id === selectedCustomer)?.name : undefined),
          buyerPhone: buyerPhone || (selectedCustomer ? customers.find(c => c.id === selectedCustomer)?.phone : undefined),
          buyerAddress: buyerAddress || (selectedCustomer ? customers.find(c => c.id === selectedCustomer)?.address : undefined),
          buyerTaxId: buyerTaxId || (selectedCustomer ? customers.find(c => c.id === selectedCustomer)?.taxId : undefined),
          paymentMethod,
          note,
        }),
      });
      if (!saleRes.ok) throw new Error("Failed to create sale");
      const sale = await saleRes.json();
      setReceiptCart([...cart]);
      setSuccess(sale);
      setShowReceipt(true);
      setCart([]);
      setDiscount(0);
      setServiceFee(0);
      setServiceDescription("");
      setNote("");
      setIsTaxInvoice(false);
      setVatType("vat_out");
      setSelectedCustomer(null);
      // อัพเดทสต๊อกจาก API response ทันที (ไม่ต้องรอ fetch ใหม่)
      if (sale.updatedStock && sale.updatedStock.length > 0) {
        console.log("[SALE] updatedStock:", JSON.stringify(sale.updatedStock));
        setProductList(prev => prev.map(p => {
          const updated = sale.updatedStock.find((s: any) => s.id === (p.products?.id ?? p.id));
          if (updated) {
            return p.products
              ? { ...p, products: { ...p.products, stock: updated.stock } }
              : { ...p, stock: updated.stock };
          }
          return p;
        }));
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการบันทึกการขาย กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
      checkoutInProgress.current = false;
    }
  }

  function handlePrint() {
    if (!success) return;

    const copyLabels = ["สำหรับลูกค้า", "สำหรับบริษัท", "สำหรับบัญชี"];
    const store: any = storeSettings || {};
    const logoUrl = store.storeLogo || "";
    const bName = buyerName || success.buyerName || (selectedCustomer ? customers.find((c: any) => c.id === selectedCustomer)?.name : "");
    const bPhone = buyerPhone || success.buyerPhone || (selectedCustomer ? customers.find((c: any) => c.id === selectedCustomer)?.phone : "");
    const bAddr = buyerAddress || success.buyerAddress || (selectedCustomer ? customers.find((c: any) => c.id === selectedCustomer)?.address : "");
    const bTaxId = buyerTaxId || success.buyerTaxId || "";
    const bLicensePlate = success.licensePlate || "";
    const docTitle = success.isTaxInvoice ? "ใบกำกับภาษี / TAX INVOICE" : "ใบเสร็จรับเงิน / RECEIPT";
    const fmtD = (d: Date) => d.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
    const fmtT = (d: Date) => d.toLocaleTimeString("th-TH");
    const createdAt = new Date(success.createdAt || new Date());

    let idx = 0;
    let itemsHtml = "";
    if (receiptCart.length === 0 && parseFloat(success.serviceFee) > 0) {
      idx++;
      itemsHtml = `<tr class="svc"><td class="tc">${idx}</td><td>${success.serviceDescription || "ค่าบริการ"}</td><td class="tc">1</td><td class="tr">${formatCurrency(parseFloat(success.serviceFee))}</td><td class="tr">${formatCurrency(parseFloat(success.serviceFee))}</td></tr>`;
    } else {
      receiptCart.forEach((item) => {
        idx++;
        const nameDisplay = [item.brand, item.name, item.model].filter(Boolean).join(" / ");
        const bg = idx % 2 === 0 ? ' style="background:#fafafa"' : '';
        itemsHtml += `<tr${bg}><td class="tc">${idx}</td><td>${nameDisplay}</td><td class="tc">${item.quantity}</td><td class="tr">${formatCurrency(item.unitPrice)}</td><td class="tr">${formatCurrency(item.unitPrice * item.quantity)}</td></tr>`;
      });
      if (parseFloat(success.serviceFee) > 0) {
        idx++;
        itemsHtml += `<tr class="svc"><td class="tc">${idx}</td><td>${success.serviceDescription || "ค่าบริการ"}</td><td class="tc">1</td><td class="tr">${formatCurrency(parseFloat(success.serviceFee))}</td><td class="tr">${formatCurrency(parseFloat(success.serviceFee))}</td></tr>`;
      }
    }

    const payLabel = success.paymentMethod === "cash" ? "เงินสด" : success.paymentMethod === "transfer" ? "โอนเงิน" : "เครดิต";

    function buildPage(label: string, i: number) {
      return `<div class="page" style="page-break-after:${i < 2 ? "always" : "auto"}">
  <div class="copy-label"><span class="copy-tag">${label}</span><span class="copy-num">(${i+1}/3)</span></div>
  <div class="header-bar">
    <div class="logo-box">${logoUrl ? `<img src="${logoUrl}" alt="logo">` : `<div class="logo-ph"></div>`}</div>
    <div class="header-text">
      <div class="doc-title">${docTitle}</div>
      <div class="store-name">${store.storeName || "ร้านแบตเตอรี่"}${store.branchName ? ` - ${store.branchName}` : ""}</div>
      <div class="store-detail">${store.address || ""}${store.phone ? ` | โทร. ${store.phone}` : ""}${store.taxId ? `<br>เลขประจำตัวผู้เสียภาษี: ${store.taxId}` : ""}</div>
    </div>
  </div>
  <div class="info-section">
    <div class="info-left">
      <div class="info-row"><span class="info-label">เลขที่${success.isTaxInvoice ? "ใบกำกับภาษี" : "บิล"}</span><span class="info-val">${success.isTaxInvoice ? success.taxInvoiceNumber : success.billNumber}</span></div>
      ${success.isTaxInvoice && success.billNumber !== success.taxInvoiceNumber ? `<div class="info-row"><span class="info-label">เลขที่บิลอ้างอิง</span><span class="info-val">${success.billNumber}</span></div>` : ""}
    </div>
    <div class="info-right">
      <div class="info-row"><span class="info-label">วันที่</span><span class="info-val">${fmtD(createdAt)}</span></div>
      <div class="info-row"><span class="info-label">เวลา</span><span class="info-val">${fmtT(createdAt)}</span></div>
    </div>
  </div>
  ${bName || bTaxId || bAddr ? `<div class="buyer-section">
    <div class="buyer-title">ข้อมูลผู้ซื้อ / Customer Information</div>
    <div class="buyer-grid">
      ${bName ? `<div class="buyer-item"><span class="bl">ชื่อ:</span> ${bName}</div>` : ""}
      ${bPhone ? `<div class="buyer-item"><span class="bl">โทร:</span> ${bPhone}</div>` : ""}
      ${bAddr ? `<div class="buyer-item" style="min-width:100%"><span class="bl">ที่อยู่:</span> ${bAddr}</div>` : ""}
      ${bTaxId ? `<div class="buyer-item"><span class="bl">เลขประจำตัวผู้เสียภาษี:</span> ${bTaxId}</div>` : ""}
      ${bLicensePlate ? `<div class="buyer-item"><span class="bl">ทะเบียนรถ:</span> ${bLicensePlate}</div>` : ""}
    </div>
  </div>` : ""}
  <table class="items">
    <thead><tr><th class="tc" style="width:30px">#</th><th style="text-align:left">รายการสินค้า / Description</th><th class="tc" style="width:50px">จำนวน</th><th class="tr" style="width:80px">ราคา/หน่วย</th><th class="tr" style="width:90px">จำนวนเงิน</th></tr></thead>
    <tbody>${itemsHtml}</tbody>
  </table>
  <div class="summary-section"><div class="summary-box">
    <div class="s-row"><span>รวมมูลค่าสินค้า/บริการ</span><span>${formatCurrency(parseFloat(success.subtotal) + parseFloat(success.serviceFee || "0"))}</span></div>
    ${parseFloat(success.discount) > 0 ? `<div class="s-row disc"><span>ส่วนลด</span><span>-${formatCurrency(parseFloat(success.discount))}</span></div>` : ""}
    ${success.isTaxInvoice ? `<div class="s-row"><span>มูลค่าก่อนภาษี</span><span>${formatCurrency(parseFloat(success.total) - parseFloat(success.taxAmount || "0"))}</span></div><div class="s-row tax"><span>ภาษีมูลค่าเพิ่ม ${success.vatType === "vat_in" ? "(รวมในราคา) " : ""}${success.taxRate}%</span><span>${formatCurrency(parseFloat(success.taxAmount || "0"))}</span></div>` : ""}
    <div class="s-row total"><span>ยอดรวมทั้งสิ้น</span><span class="amt">${formatCurrency(parseFloat(success.total))} บาท</span></div>
  </div></div>
  <div class="pay-section"><span>วิธีชำระเงิน</span><span class="pay-method">${payLabel}</span></div>
  ${success.note ? `<div class="note-section"><strong>หมายเหตุ:</strong> ${success.note}</div>` : ""}
  <div class="sig-section">
    <div class="sig-block"><div class="sig-line"></div><div class="sig-label">ผู้รับเงิน</div><div class="sig-sub">(...............................)</div><div class="sig-sub">วันที่ ____/____/____</div></div>
    <div class="sig-block"><div class="sig-line"></div><div class="sig-label">ผู้จ่ายเงิน / ผู้ซื้อ</div><div class="sig-sub">(...............................)</div><div class="sig-sub">วันที่ ____/____/____</div></div>
    <div class="sig-block"><div class="sig-line"></div><div class="sig-label">ผู้อนุมัติ</div><div class="sig-sub">(...............................)</div><div class="sig-sub">วันที่ ____/____/____</div></div>
  </div>
  <div class="footer"><div class="footer-thanks">ขอบคุณที่ใช้บริการ / Thank you for your business</div><div class="footer-sub">${store.storeName || "ร้านแบตเตอรี่"}${store.phone ? ` | โทร. ${store.phone}` : ""}</div></div>
</div>`;
    }

    const allPages = copyLabels.map((label, i) => buildPage(label, i)).join("");

    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html lang="th"><head><meta charset="utf-8"><title>พิมพ์ใบเสร็จ</title>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Sarabun',sans-serif}
.page{padding:10mm 12mm;font-size:11px;color:#1a1a1a;line-height:1.4}
.copy-label{text-align:right;margin-bottom:8px;font-size:10px}
.copy-tag{border:1px solid #666;padding:2px 10px;border-radius:4px;font-weight:700;font-size:11px}
.copy-num{margin-left:6px;color:#888}
.header-bar{background:linear-gradient(135deg,#ea580c,#f97316);color:#fff;padding:14px 18px;border-radius:8px;margin-bottom:12px;display:flex;align-items:center;gap:14px}
.logo-box{width:72px;height:72px;background:#fff;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;padding:4px;box-shadow:0 1px 3px rgba(0,0,0,0.1)}
.logo-box img{width:100%;height:100%;object-fit:contain}
.logo-ph{width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.3)}
.header-text{flex:1}
.doc-title{font-size:17px;font-weight:700;letter-spacing:.5px}
.store-name{font-size:13px;font-weight:600;margin-top:2px;opacity:.95}
.store-detail{font-size:9.5px;opacity:.85;margin-top:2px;line-height:1.4}
.info-section{display:flex;gap:10px;margin-bottom:10px}
.info-left,.info-right{flex:1;background:#f8f8f8;border:1px solid #e8e8e8;border-radius:6px;padding:10px 12px;font-size:10.5px}
.info-right{text-align:right}
.info-label{color:#888;font-size:9.5px;display:block;margin-bottom:1px}
.info-val{font-weight:600;color:#1a1a1a}
.info-row{margin-bottom:4px}
.buyer-section{border:1px solid #e0e0e0;border-radius:6px;padding:10px 12px;margin-bottom:10px;font-size:10.5px;background:#fefefe}
.buyer-title{font-weight:700;font-size:11px;color:#ea580c;margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid #f0f0f0}
.buyer-grid{display:flex;flex-wrap:wrap;gap:4px 20px}
.buyer-item{min-width:45%}
.buyer-item .bl{color:#888;font-size:9.5px}
table.items{width:100%;border-collapse:collapse;margin-bottom:10px}
table.items th{background:#fff7ed;border-top:2px solid #ea580c;border-bottom:2px solid #ea580c;padding:6px 5px;font-weight:700;font-size:9.5px;text-transform:uppercase;color:#92400e;letter-spacing:.3px}
table.items td{padding:5px;border-bottom:1px solid #f0f0f0;font-size:10.5px}
table.items .tc{text-align:center}
table.items .tr{text-align:right}
table.items tr.svc td{color:#b45309;font-style:italic}
table.items tbody tr:last-child td{border-bottom:2px solid #ea580c}
.summary-section{display:flex;justify-content:flex-end;margin-bottom:10px}
.summary-box{width:260px}
.s-row{display:flex;justify-content:space-between;padding:3px 0;font-size:11px}
.s-row.disc{color:#dc2626}
.s-row.tax{color:#2563eb}
.s-row.total{font-weight:700;font-size:15px;border-top:3px double #ea580c;padding-top:8px;margin-top:4px}
.s-row.total .amt{color:#ea580c}
.pay-section{display:flex;justify-content:space-between;align-items:center;background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;padding:8px 12px;margin-bottom:10px;font-size:11px}
.pay-method{font-weight:700;color:#ea580c}
.note-section{background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:8px 12px;font-size:10px;color:#555;margin-bottom:10px}
.note-section strong{color:#333}
.sig-section{display:flex;justify-content:space-around;margin-top:24px;padding-top:12px;border-top:1px solid #e0e0e0}
.sig-block{text-align:center;width:150px}
.sig-line{border-bottom:1px dotted #999;height:40px;margin-bottom:4px}
.sig-label{font-size:10px;font-weight:600;color:#333}
.sig-sub{font-size:8.5px;color:#999;margin-top:1px}
.footer{text-align:center;margin-top:12px;padding-top:8px;border-top:1px solid #eee}
.footer-thanks{font-size:12px;font-weight:600;color:#ea580c}
.footer-sub{font-size:9px;color:#aaa;margin-top:2px}
@media print{body{margin:0;padding:0}.header-bar{-webkit-print-color-adjust:exact;print-color-adjust:exact}table.items th{-webkit-print-color-adjust:exact;print-color-adjust:exact}.pay-section{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>${allPages}</body></html>`);
    printWindow.document.close();
    printWindow.onload = () => { setTimeout(() => { printWindow.print(); printWindow.close(); }, 300); };
    
    // อัปเดตสถานะพิมพ์แล้ว
    if (success?.id) {
      fetch("/api/pos/sale/printed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saleId: success.id }),
      }).catch(() => {});
    }
  }

  return (
    <div className="flex flex-col lg:flex-row h-full gap-4 p-4 pb-24 lg:pb-4">
      {/* Version indicator for debugging */}
      <div className="fixed bottom-1 right-1 z-50 text-[9px] text-gray-400 bg-white/80 px-1 rounded">{PAGE_VERSION}</div>
      {/* Left: Product search */}
      <div className="flex flex-col w-full lg:w-[55%] min-h-0 order-1">
        <div className="mb-4 flex gap-2 flex-shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="ค้นหาสินค้า... (ชื่อ, ยี่ห้อ, รุ่น)"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 h-11 rounded-xl border-orange-200/60 bg-white focus:border-orange-400 focus:ring-orange-400/20"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="mb-3 flex overflow-x-auto pb-1 gap-2 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <button
            onClick={() => setSelectedCategory(null)}
            className={`whitespace-nowrap flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              selectedCategory === null
                ? "bg-orange-500 text-white shadow-sm"
                : "bg-white border border-orange-200 text-orange-700 hover:bg-orange-50"
            }`}
          >
            ทั้งหมด
          </button>
          {categories.map((cat: any) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`whitespace-nowrap flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                selectedCategory === cat.id
                  ? "bg-orange-500 text-white shadow-sm"
                  : "bg-white border border-orange-200 text-orange-700 hover:bg-orange-50"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto bg-orange-50/20 rounded-xl p-2 border border-orange-100/50">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2">
            {productList
              .filter((item) => {
                const p = item.products || item;
                if (selectedCategory && p.categoryId !== selectedCategory) return false;
                if (query) {
                  const q = query.toLowerCase();
                  return (p.name || '').toLowerCase().includes(q) ||
                    (p.brand || '').toLowerCase().includes(q) ||
                    (p.model || '').toLowerCase().includes(q);
                }
                return true;
              })
              .map((item) => {
                const p = item.products || item;
                const modelName = [p.brand, p.model].filter(Boolean).join(" ") || p.name;
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(item)}
                    disabled={p.stock <= 0}
                    className="group rounded-lg lg:rounded-xl border border-orange-100/60 bg-white px-2 py-2 lg:p-3 text-left shadow-sm transition-all duration-150 hover:shadow-md hover:border-orange-300 disabled:opacity-40 lg:hover:shadow-luxury lg:hover:-translate-y-0.5"
                  >
                    {/* Desktop: show image */}
                    <div className="hidden lg:block">
                      {p.imageUrl ? (
                        <div className="mb-2 aspect-square w-full rounded-lg overflow-hidden bg-orange-50">
                          <img src={p.imageUrl} alt={p.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="mb-2 aspect-square w-full rounded-lg bg-orange-50 flex items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-orange-200" />
                        </div>
                      )}
                      <p className="text-sm font-semibold truncate group-hover:text-orange-700">{p.name}</p>
                      {p.brand && <p className="text-xs text-muted-foreground">{p.brand} {p.model}</p>}
                      {p.size && <p className="text-xs text-muted-foreground">{p.size}</p>}
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-sm font-bold text-orange-600">{formatCurrency(parseFloat(p.sellPrice))}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.stock > 0 ? "bg-orange-50 text-orange-600 border border-orange-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
                          คงเหลือ {p.stock}
                        </span>
                      </div>
                    </div>
                    {/* Mobile: compact - brand, name, price, stock */}
                    <div className="lg:hidden">
                      {p.brand && <p className="text-[10px] text-muted-foreground truncate">{p.brand}</p>}
                      <p className="text-xs font-semibold truncate group-hover:text-orange-700">{p.name}</p>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-xs font-bold text-orange-600">{formatCurrency(parseFloat(p.sellPrice))}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${p.stock > 0 ? "bg-orange-50 text-orange-600" : "bg-red-50 text-red-600"}`}>
                          {p.stock}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      </div>

      {/* Right: Cart - hidden on mobile, shown on lg+ */}
      <div ref={cartSectionRef} className="hidden lg:flex flex-col w-full lg:w-[45%] min-h-0 overflow-hidden order-2">
        <div className="flex flex-col rounded-2xl bg-white border border-orange-100/60 shadow-luxury overflow-hidden h-full">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-orange-100/60 bg-gradient-to-r from-orange-50/80 to-white">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600">
              <ShoppingCart className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-lg font-bold tracking-tight">ตะกร้าสินค้า</h2>
            {cart.length > 0 && <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">{cart.length}</span>}
          </div>
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
            {/* Cart items */}
            <div className="flex-1 space-y-2 overflow-auto">
              {cart.length === 0 ? (
                <div className="py-12 text-center">
                  <ShoppingCart className="h-10 w-10 mx-auto mb-2 text-orange-200" />
                  <p className="text-muted-foreground">ยังไม่มีสินค้าในตะกร้า</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.productId} className="rounded-xl border border-orange-100 bg-orange-50/30 p-2.5 transition-all hover:bg-orange-50">
                    <div className="flex items-center gap-2">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} loading="lazy" decoding="async" className="h-10 w-10 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                          <ImageIcon className="h-5 w-5 text-orange-300" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(item.unitPrice)} x {item.quantity}
                          {item.weight && <span className="ml-2 text-orange-600">{item.weight}kg x{item.quantity} = {(item.weight * item.quantity).toFixed(3)}kg</span>}
                        </p>
                      </div>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0" onClick={() => removeFromCart(item.productId)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between mt-1.5 pl-12">
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="outline" className="h-7 w-7 rounded-lg border-orange-200 hover:bg-orange-50" onClick={() => updateQuantity(item.productId, item.quantity - 1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                        <Button size="icon" variant="outline" className="h-7 w-7 rounded-lg border-orange-200 hover:bg-orange-50" onClick={() => updateQuantity(item.productId, item.quantity + 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <span className="text-sm font-bold text-orange-700">
                        {formatCurrency(item.unitPrice * item.quantity)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Customer select + add new */}
            <div className="space-y-2">
              <div className="flex gap-1.5 relative" ref={customerDropdownRef}>
                {/* Searchable customer dropdown */}
                <div className="flex-1 relative">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-orange-400" />
                    <input
                      type="text"
                      className="w-full rounded-xl border border-orange-200/60 bg-orange-50/30 pl-8 pr-10 p-2.5 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400/20 outline-none transition-all"
                      placeholder={selectedCustomer ? customers.find(c => c.id === selectedCustomer)?.name : "ค้นหาลูกค้า..."}
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setShowCustomerDropdown(true);
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                    />
                    {selectedCustomer && (
                      <button
                        type="button"
                        onClick={() => { setSelectedCustomer(null); setCustomerSearch(""); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-gray-200 text-gray-500 hover:bg-gray-300 flex items-center justify-center"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  {/* Dropdown list */}
                  {showCustomerDropdown && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-auto rounded-xl border border-orange-200 bg-white shadow-lg">
                      {/* Default option */}
                      <button
                        type="button"
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-orange-50 flex items-center gap-2 ${!selectedCustomer ? "bg-orange-100 font-semibold" : ""}`}
                        onClick={() => {
                          setSelectedCustomer(null);
                          setCustomerSearch("");
                          setShowCustomerDropdown(false);
                        }}
                      >
                        <Users className="h-4 w-4 text-gray-400" /> ลูกค้าทั่วไป
                      </button>
                      {/* Filtered customers */}
                      {customers
                        .filter((c: any) => {
                          if (!customerSearch) return true;
                          const q = customerSearch.toLowerCase();
                          return (
                            c.name?.toLowerCase().includes(q) ||
                            c.phone?.toLowerCase().includes(q) ||
                            c.licensePlate?.toLowerCase().includes(q)
                          );
                        })
                        .slice(0, 10)
                        .map((c: any) => (
                          <button
                            key={c.id}
                            type="button"
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-orange-50 flex items-center justify-between ${selectedCustomer === c.id ? "bg-orange-100 font-semibold" : ""}`}
                            onClick={() => {
                              setSelectedCustomer(c.id);
                              setCustomerSearch("");
                              setShowCustomerDropdown(false);
                            }}
                          >
                            <span>{c.name}</span>
                            {c.phone && <span className="text-xs text-gray-400">{c.phone}</span>}
                          </button>
                        ))}
                      {customers.filter((c: any) => {
                        if (!customerSearch) return false;
                        const q = customerSearch.toLowerCase();
                        return c.name?.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q);
                      }).length === 0 && customerSearch && (
                        <div className="px-3 py-2 text-sm text-gray-400 text-center">ไม่พบลูกค้า</div>
                      )}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddCustomer(!showAddCustomer)}
                  className="flex items-center gap-1 px-3 rounded-xl border border-green-300 bg-green-50 text-green-700 text-xs font-semibold hover:bg-green-100 transition-all whitespace-nowrap"
                >
                  <UserPlus className="h-3.5 w-3.5" /> เพิ่มลูกค้า
                </button>
              </div>
              {showAddCustomer && (
                <div className="rounded-xl border-2 border-green-200 bg-green-50/50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-green-800 flex items-center gap-1"><UserPlus className="h-3.5 w-3.5" /> เพิ่มลูกค้าใหม่</span>
                    <button type="button" onClick={() => setShowAddCustomer(false)}><X className="h-3.5 w-3.5 text-gray-400" /></button>
                  </div>
                  <div>
                    <Label className="text-[10px] text-green-700">ชื่อลูกค้า *</Label>
                    <Input className="h-8 text-xs border-green-200" value={newCustName} onChange={(e) => setNewCustName(e.target.value)} placeholder="ชื่อ-นามสกุล หรือ ชื่อบริษัท" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] text-green-700">เบอร์โทร</Label>
                      <Input className="h-8 text-xs border-green-200" value={newCustPhone} onChange={(e) => setNewCustPhone(e.target.value)} placeholder="0xx-xxx-xxxx" />
                    </div>
                    <div>
                      <Label className="text-[10px] text-green-700">ทะเบียนรถ</Label>
                      <Input className="h-8 text-xs border-green-200" value={newCustLicensePlate} onChange={(e) => setNewCustLicensePlate(e.target.value)} placeholder="เช่น กก 1234" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-[10px] text-green-700">ที่อยู่</Label>
                    <textarea className="w-full rounded-lg border border-green-200 bg-white p-2 text-xs focus:border-green-400 outline-none transition-all resize-none" rows={2} value={newCustAddress} onChange={(e) => setNewCustAddress(e.target.value)} placeholder="ที่อยู่สำหรับออกใบกำกับภาษี / จัดส่ง" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-green-700">เลขประจำตัวผู้เสียภาษี</Label>
                    <Input className="h-8 text-xs border-green-200" value={newCustTaxId} onChange={(e) => setNewCustTaxId(e.target.value)} placeholder="เลข 13 หลัก (ถ้ามี)" />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCustomerInline}
                    disabled={!newCustName || newCustSaving}
                    className="w-full h-8 rounded-lg bg-green-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-green-700 disabled:opacity-50 transition-all"
                  >
                    {newCustSaving ? <><Loader2 className="h-3 w-3 animate-spin" /> กำลังบันทึก...</> : <><UserPlus className="h-3 w-3" /> บันทึกลูกค้าใหม่</>}
                  </button>
                </div>
              )}
            </div>

            {/* Service Fee Section */}
            <div className="rounded-xl border border-amber-200/60 bg-gradient-to-r from-amber-50/50 to-orange-50/30 p-3 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100">
                  <Wrench className="h-3.5 w-3.5 text-amber-600" />
                </div>
                <span className="text-sm font-semibold text-amber-800">ค่าบริการ (จั้มแบต, ติดตั้ง, อื่นๆ)</span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="0"
                  value={serviceFee || ""}
                  onChange={(e) => setServiceFee(Number(e.target.value))}
                  className="h-9 w-28 rounded-lg border-amber-200/60 bg-white focus:border-amber-400"
                />
                <span className="text-sm">บาท</span>
              </div>
              <Input
                placeholder="รายละเอียดบริการ เช่น จั้มแบตรถยนต์..."
                value={serviceDescription}
                onChange={(e) => setServiceDescription(e.target.value)}
                className="h-9 rounded-lg border-amber-200/60 bg-white focus:border-amber-400 text-sm"
              />
            </div>

            {/* Payment method */}
            <div className="flex gap-2">
              {["cash", "transfer", "credit"].map((m) => (
                <button
                  key={m}
                  onClick={() => setPaymentMethod(m)}
                  className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-all duration-200 ${
                    paymentMethod === m
                      ? "gradient-orange text-white shadow-luxury"
                      : "bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100"
                  }`}
                >
                  {m === "cash" ? "เงินสด" : m === "transfer" ? "โอน" : "เครดิต"}
                </button>
              ))}
            </div>

            {/* Discount + Note */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">ส่วนลด:</span>
              <Input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="h-9 w-28 rounded-lg border-orange-200/60" />
              <span className="text-sm">บาท</span>
            </div>
            <Input placeholder="หมายเหตุ..." value={note} onChange={(e) => setNote(e.target.value)} className="h-9 rounded-lg border-orange-200/60" />

            {/* Tax Invoice Option */}
            <div className="rounded-xl border border-blue-200/60 bg-gradient-to-r from-blue-50/50 to-sky-50/30 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="taxInvoice"
                  checked={isTaxInvoice}
                  onChange={(e) => setIsTaxInvoice(e.target.checked)}
                  className="h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="taxInvoice" className="text-sm font-semibold text-blue-800 flex items-center gap-1.5">
                  <FileText className="h-4 w-4" />
                  ออกใบกำกับภาษี
                </label>
              </div>
              {isTaxInvoice && (
                <div className="space-y-2 mt-2 pt-2 border-t border-blue-200/40">
                  {/* VAT Type Selection */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setVatType("vat_out")}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                        vatType === "vat_out"
                          ? "bg-blue-500 text-white"
                          : "bg-white border border-blue-200 text-blue-700 hover:bg-blue-50"
                      }`}
                    >
                      แวทนอก (ราคา + ภาษี)
                    </button>
                    <button
                      type="button"
                      onClick={() => setVatType("vat_in")}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                        vatType === "vat_in"
                          ? "bg-blue-500 text-white"
                          : "bg-white border border-blue-200 text-blue-700 hover:bg-blue-50"
                      }`}
                    >
                      แวทใน (ราคารวมภาษี)
                    </button>
                  </div>
                  {/* Tax Rate */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-blue-700">อัตราภาษี:</span>
                    <Input
                      type="number"
                      value={taxRate}
                      onChange={(e) => setTaxRate(Number(e.target.value))}
                      className="h-8 w-16 rounded-lg border-blue-200/60 text-sm text-center"
                      min="0"
                      max="100"
                      step="0.1"
                    />
                    <span className="text-xs text-blue-700">%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="space-y-1.5 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/40 p-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">รวมสินค้า</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              {totalCartWeight > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>น้ำหนักรวม</span>
                  <span className="font-medium">
                    {totalCartWeight.toFixed(3)} kg
                    {kgPrice > 0 && <span className="ml-1 text-xs">({formatCurrency(totalCartWeight * kgPrice)})</span>}
                  </span>
                </div>
              )}
              {serviceFee > 0 && (
                <div className="flex justify-between text-sm text-amber-600">
                  <span>ค่าบริการ</span>
                  <span className="font-medium">+{formatCurrency(serviceFee)}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between text-sm text-red-500">
                  <span>ส่วนลด</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              {isTaxInvoice && (
                <div className="flex justify-between text-sm text-blue-600">
                  <span>มูลค่าก่อนภาษี</span>
                  <span className="font-medium">{formatCurrency(beforeTax)}</span>
                </div>
              )}
              {isTaxInvoice && taxAmount > 0 && (
                <div className="flex justify-between text-sm text-blue-600">
                  <span>ภาษีมูลค่าเพิ่ม ({taxRate}%) {vatType === "vat_in" ? "(รวมในราคา)" : ""}</span>
                  <span className="font-medium">{formatCurrency(taxAmount)}</span>
                </div>
              )}
              <div className="border-t border-orange-200/40 pt-1.5 flex justify-between text-lg font-bold">
                <span>ยอดสุทธิ</span>
                <span className="text-orange-600">{formatCurrency(total)}</span>
              </div>
            </div>

            <button
              className="w-full h-12 rounded-xl gradient-orange text-white font-bold text-base shadow-luxury hover:shadow-luxury-lg transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:hover:scale-100"
              disabled={(cart.length === 0 && serviceFee <= 0) || loading || isServiceRole}
              onClick={handleCheckout}
            >
              {isServiceRole ? "ไม่มีสิทธิ์ขายสินค้า (พนักงานบริการ)" : loading ? "กำลังบันทึก..." : `ชำระเงิน ${formatCurrency(total)}`}
            </button>
          </div>
        </div>
      </div>

      {/* ===== Mobile: Sticky Bottom Cart Bar ===== */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
          <div className="bg-white border-t-2 border-orange-300 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
            {cart.length === 0 && serviceFee <= 0 ? (
              <button
                onClick={() => setShowCartDrawer(true)}
                className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-gray-100 text-gray-400 font-semibold"
              >
                <ShoppingCart className="h-5 w-5" />
                <span>ตะกร้าว่าง</span>
              </button>
            ) : (
              <div className="flex items-center gap-3">
                {/* Cart info - tap to open drawer */}
                <button
                  onClick={() => setShowCartDrawer(true)}
                  className="flex-1 flex items-center gap-3 bg-orange-50 rounded-xl px-3 py-2.5 border border-orange-200 active:bg-orange-100 transition-colors"
                >
                  <div className="relative">
                    <ShoppingCart className="h-6 w-6 text-orange-600" />
                    <span className="absolute -top-1.5 -right-1.5 h-5 w-5 flex items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
                      {cart.reduce((sum, i) => sum + i.quantity, 0)}
                    </span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-bold text-orange-800">{cart.length} รายการ</p>
                    <p className="text-xs text-orange-600">{formatCurrency(total)}</p>
                  </div>
                  <svg className="h-5 w-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                </button>
                {/* Pay button */}
                <button
                  onClick={handleCheckout}
                  disabled={loading || isServiceRole}
                  className="h-12 px-5 rounded-xl gradient-orange text-white font-bold text-sm shadow-luxury active:scale-95 transition-transform disabled:opacity-40"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "ชำระเงิน"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ===== Mobile: Cart Drawer (Bottom Sheet) ===== */}
        {showCartDrawer && (
          <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setShowCartDrawer(false)}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            {/* Drawer */}
            <div
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col"
              style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-orange-100 sticky top-0 bg-white rounded-t-2xl z-10">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-orange-600" />
                  <h3 className="text-lg font-bold">ตะกร้าสินค้า</h3>
                  {cart.length > 0 && (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
                      {cart.reduce((sum, i) => sum + i.quantity, 0)}
                    </span>
                  )}
                </div>
                <button onClick={() => setShowCartDrawer(false)} className="h-8 w-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {/* Cart items */}
                {cart.length === 0 ? (
                  <div className="py-8 text-center">
                    <ShoppingCart className="h-10 w-10 mx-auto mb-2 text-orange-200" />
                    <p className="text-muted-foreground">ยังไม่มีสินค้าในตะกร้า</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {cart.map((item) => (
                      <div key={item.productId} className="rounded-xl border border-orange-100 bg-orange-50/30 p-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{formatCurrency(item.unitPrice)} x {item.quantity}</p>
                          </div>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0" onClick={() => removeFromCart(item.productId)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="outline" className="h-8 w-8 rounded-lg border-orange-200" onClick={() => updateQuantity(item.productId, item.quantity - 1)}>
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                            <Button size="icon" variant="outline" className="h-8 w-8 rounded-lg border-orange-200" onClick={() => updateQuantity(item.productId, item.quantity + 1)}>
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <span className="text-sm font-bold text-orange-700">{formatCurrency(item.unitPrice * item.quantity)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Customer select + Add new */}
                <div className="space-y-2">
                  <div className="flex gap-1.5 relative" ref={customerDropdownRef}>
                    <div className="flex-1 relative">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-orange-400" />
                        <input
                          type="text"
                          className="w-full rounded-xl border border-orange-200/60 bg-orange-50/30 pl-8 pr-10 p-2.5 text-sm focus:border-orange-400 outline-none"
                          placeholder={selectedCustomer ? customers.find(c => c.id === selectedCustomer)?.name : "ค้นหาลูกค้า..."}
                          value={customerSearch}
                          onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }}
                          onFocus={() => setShowCustomerDropdown(true)}
                        />
                        {selectedCustomer && (
                          <button type="button" onClick={() => { setSelectedCustomer(null); setCustomerSearch(""); }} className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center">
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      {showCustomerDropdown && (
                        <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-auto rounded-xl border border-orange-200 bg-white shadow-lg">
                          <button type="button" className={`w-full text-left px-3 py-2 text-sm hover:bg-orange-50 flex items-center gap-2 ${!selectedCustomer ? "bg-orange-100 font-semibold" : ""}`} onClick={() => { setSelectedCustomer(null); setCustomerSearch(""); setShowCustomerDropdown(false); }}>
                            <Users className="h-4 w-4 text-gray-400" /> ลูกค้าทั่วไป
                          </button>
                          {customers.filter((c: any) => !customerSearch || c.name?.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone?.toLowerCase().includes(customerSearch.toLowerCase())).slice(0, 10).map((c: any) => (
                            <button key={c.id} type="button" className={`w-full text-left px-3 py-2 text-sm hover:bg-orange-50 flex items-center justify-between ${selectedCustomer === c.id ? "bg-orange-100 font-semibold" : ""}`} onClick={() => { setSelectedCustomer(c.id); setCustomerSearch(""); setShowCustomerDropdown(false); }}>
                              <span>{c.name}</span>
                              {c.phone && <span className="text-xs text-gray-400">{c.phone}</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddCustomer(!showAddCustomer)}
                      className="flex items-center gap-1 px-3 rounded-xl border border-green-300 bg-green-50 text-green-700 text-xs font-semibold hover:bg-green-100 transition-all whitespace-nowrap"
                    >
                      <UserPlus className="h-3.5 w-3.5" /> เพิ่มลูกค้า
                    </button>
                  </div>
                  {showAddCustomer && (
                    <div className="rounded-xl border-2 border-green-200 bg-green-50/50 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-green-800 flex items-center gap-1"><UserPlus className="h-3.5 w-3.5" /> เพิ่มลูกค้าใหม่</span>
                        <button type="button" onClick={() => setShowAddCustomer(false)}><X className="h-3.5 w-3.5 text-gray-400" /></button>
                      </div>
                      <div>
                        <Label className="text-[10px] text-green-700">ชื่อลูกค้า *</Label>
                        <Input className="h-8 text-xs border-green-200" value={newCustName} onChange={(e) => setNewCustName(e.target.value)} placeholder="ชื่อ-นามสกุล หรือ ชื่อบริษัท" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px] text-green-700">เบอร์โทร</Label>
                          <Input className="h-8 text-xs border-green-200" value={newCustPhone} onChange={(e) => setNewCustPhone(e.target.value)} placeholder="0xx-xxx-xxxx" />
                        </div>
                        <div>
                          <Label className="text-[10px] text-green-700">ทะเบียนรถ</Label>
                          <Input className="h-8 text-xs border-green-200" value={newCustLicensePlate} onChange={(e) => setNewCustLicensePlate(e.target.value)} placeholder="เช่น กก 1234" />
                        </div>
                      </div>
                      <div>
                        <Label className="text-[10px] text-green-700">ที่อยู่</Label>
                        <textarea className="w-full rounded-lg border border-green-200 bg-white p-2 text-xs focus:border-green-400 outline-none transition-all resize-none" rows={2} value={newCustAddress} onChange={(e) => setNewCustAddress(e.target.value)} placeholder="ที่อยู่สำหรับออกใบกำกับภาษี / จัดส่ง" />
                      </div>
                      <div>
                        <Label className="text-[10px] text-green-700">เลขประจำตัวผู้เสียภาษี</Label>
                        <Input className="h-8 text-xs border-green-200" value={newCustTaxId} onChange={(e) => setNewCustTaxId(e.target.value)} placeholder="เลข 13 หลัก (ถ้ามี)" />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddCustomerInline}
                        disabled={!newCustName || newCustSaving}
                        className="w-full h-8 rounded-lg bg-green-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-green-700 disabled:opacity-50 transition-all"
                      >
                        {newCustSaving ? <><Loader2 className="h-3 w-3 animate-spin" /> กำลังบันทึก...</> : <><UserPlus className="h-3 w-3" /> บันทึกลูกค้าใหม่</>}
                      </button>
                    </div>
                  )}
                </div>

                {/* Service Fee */}
                <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-semibold text-amber-800">ค่าบริการ</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input type="number" placeholder="0" value={serviceFee || ""} onChange={(e) => setServiceFee(Number(e.target.value))} className="h-9 w-24 rounded-lg border-amber-200/60" />
                    <span className="text-sm">บาท</span>
                  </div>
                  <Input placeholder="รายละเอียด..." value={serviceDescription} onChange={(e) => setServiceDescription(e.target.value)} className="h-9 rounded-lg border-amber-200/60 text-sm" />
                </div>

                {/* Payment method */}
                <div className="flex gap-2">
                  {["cash", "transfer", "credit"].map((m) => (
                    <button key={m} onClick={() => setPaymentMethod(m)} className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${paymentMethod === m ? "gradient-orange text-white shadow-luxury" : "bg-orange-50 text-orange-700 border border-orange-200"}`}>
                      {m === "cash" ? "💵 เงินสด" : m === "transfer" ? "📲 โอน" : "💳 เครดิต"}
                    </button>
                  ))}
                </div>

                {/* Discount + Note */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">ส่วนลด:</span>
                  <Input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="h-9 w-24 rounded-lg border-orange-200/60" />
                  <span className="text-sm">บาท</span>
                </div>
                <Input placeholder="หมายเหตุ..." value={note} onChange={(e) => setNote(e.target.value)} className="h-9 rounded-lg border-orange-200/60" />

                {/* Tax Invoice / VAT Option */}
                <div className="rounded-xl border border-blue-200/60 bg-gradient-to-r from-blue-50/50 to-sky-50/30 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="taxInvoiceMobile"
                      checked={isTaxInvoice}
                      onChange={(e) => setIsTaxInvoice(e.target.checked)}
                      className="h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="taxInvoiceMobile" className="text-sm font-semibold text-blue-800 flex items-center gap-1.5">
                      <FileText className="h-4 w-4" />
                      ออกใบกำกับภาษี
                    </label>
                  </div>
                  {isTaxInvoice && (
                    <div className="space-y-2 mt-2 pt-2 border-t border-blue-200/40">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setVatType("vat_out")}
                          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                            vatType === "vat_out"
                              ? "bg-blue-500 text-white"
                              : "bg-white border border-blue-200 text-blue-700 hover:bg-blue-50"
                          }`}
                        >
                          แวทนอก (ราคา + ภาษี)
                        </button>
                        <button
                          type="button"
                          onClick={() => setVatType("vat_in")}
                          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                            vatType === "vat_in"
                              ? "bg-blue-500 text-white"
                              : "bg-white border border-blue-200 text-blue-700 hover:bg-blue-50"
                          }`}
                        >
                          แวทใน (ราคารวมภาษี)
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-blue-700">อัตราภาษี:</span>
                        <Input
                          type="number"
                          value={taxRate}
                          onChange={(e) => setTaxRate(Number(e.target.value))}
                          className="h-8 w-16 rounded-lg border-blue-200/60 text-sm text-center"
                          min="0"
                          max="100"
                          step="0.1"
                        />
                        <span className="text-xs text-blue-700">%</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Summary */}
                <div className="space-y-1.5 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/40 p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">รวมสินค้า</span>
                    <span className="font-medium">{formatCurrency(subtotal)}</span>
                  </div>
                  {totalCartWeight > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>น้ำหนักรวม</span>
                      <span className="font-medium">
                        {totalCartWeight.toFixed(3)} kg
                        {kgPrice > 0 && <span className="ml-1 text-xs">({formatCurrency(totalCartWeight * kgPrice)})</span>}
                      </span>
                    </div>
                  )}
                  {serviceFee > 0 && (
                    <div className="flex justify-between text-sm text-amber-600">
                      <span>ค่าบริการ</span>
                      <span className="font-medium">+{formatCurrency(serviceFee)}</span>
                    </div>
                  )}
                  {discount > 0 && (
                    <div className="flex justify-between text-sm text-red-500">
                      <span>ส่วนลด</span>
                      <span>-{formatCurrency(discount)}</span>
                    </div>
                  )}
                  {isTaxInvoice && (
                    <div className="flex justify-between text-sm text-blue-600">
                      <span>มูลค่าก่อนภาษี</span>
                      <span className="font-medium">{formatCurrency(beforeTax)}</span>
                    </div>
                  )}
                  {isTaxInvoice && taxAmount > 0 && (
                    <div className="flex justify-between text-sm text-blue-600">
                      <span>ภาษีมูลค่าเพิ่ม ({taxRate}%) {vatType === "vat_in" ? "(รวมในราคา)" : ""}</span>
                      <span className="font-medium">{formatCurrency(taxAmount)}</span>
                    </div>
                  )}
                  <div className="border-t border-orange-200/40 pt-1.5 flex justify-between text-lg font-bold">
                    <span>ยอดสุทธิ</span>
                    <span className="text-orange-600">{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>

              {/* Drawer Footer - Pay button */}
              <div className="sticky bottom-0 bg-white border-t border-orange-100 p-4 space-y-2">
                <button
                  className="w-full h-14 rounded-xl gradient-orange text-white font-bold text-lg shadow-luxury active:scale-[0.98] transition-transform disabled:opacity-40"
                  disabled={(cart.length === 0 && serviceFee <= 0) || loading || isServiceRole}
                  onClick={() => { setShowCartDrawer(false); handleCheckout(); }}
                >
                  {isServiceRole ? "ไม่มีสิทธิ์ขาย" : loading ? "กำลังบันทึก..." : `ชำระเงิน ${formatCurrency(total)}`}
                </button>
                {cart.length > 0 && (
                  <button
                    onClick={() => { if (confirm("ล้างตะกร้าทั้งหมด?")) { setCart([]); setShowCartDrawer(false); } }}
                    className="w-full h-10 rounded-xl bg-red-50 text-red-500 font-medium text-sm border border-red-200 active:bg-red-100"
                  >
                    ล้างตะกร้า
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Success/Receipt modal */}
        {success && showReceipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4" style={{ touchAction: "none" }} onClick={(e) => e.target === e.currentTarget && undefined}>
            <div className="w-full sm:w-[360px] h-full sm:h-auto sm:max-h-[90vh] bg-white shadow-luxury-lg border-0 sm:border border-orange-100 flex flex-col" style={{ WebkitOverflowScrolling: "touch" }}>
             <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
              {/* Header - Seller Info (editable) */}
              <div className="border-b-2 border-orange-400 pb-3 mb-3 text-center">
                <h2 className="text-xl font-bold text-orange-600">
                  {saleCancelled ? "❌ ยกเลิกแล้ว" : success.isTaxInvoice ? "ใบกำกับภาษี" : "ใบเสร็จรับเงิน"}
                </h2>
                {saleCancelled && (
                  <div className="mt-1 px-3 py-1.5 rounded-lg bg-red-100 border-2 border-red-400 text-red-700 font-bold text-sm animate-pulse">
                    บิลนี้ถูกยกเลิกแล้ว — สินค้าไม่ถูกหักสต๊อก
                  </div>
                )}
                <div className="mt-2">
                  <Input className="h-7 text-sm font-semibold text-center border-orange-200" value={storeSettings?.storeName || "ร้านแบตเตอรี่"} onChange={(e) => setStoreSettings({ ...storeSettings, storeName: e.target.value })} onBlur={() => autoSaveStoreSettings({ ...storeSettings })} placeholder="ชื่อร้าน" />
                </div>
                <div className="mt-1">
                  <Input className="h-6 text-xs text-center border-gray-200" value={storeSettings?.branchName || ""} onChange={(e) => setStoreSettings({ ...storeSettings, branchName: e.target.value })} onBlur={() => autoSaveStoreSettings({ ...storeSettings })} placeholder="สาขา" />
                </div>
                <div className="mt-1">
                  <Input className="h-6 text-xs text-center border-gray-200" value={storeSettings?.address || ""} onChange={(e) => setStoreSettings({ ...storeSettings, address: e.target.value })} onBlur={() => autoSaveStoreSettings({ ...storeSettings })} placeholder="ที่อยู่" />
                </div>
                <div className="mt-1">
                  <Input className="h-6 text-xs text-center border-gray-200" value={storeSettings?.phone || ""} onChange={(e) => setStoreSettings({ ...storeSettings, phone: e.target.value })} onBlur={() => autoSaveStoreSettings({ ...storeSettings })} placeholder="โทร." />
                </div>
                <div className="mt-1">
                  <Input className="h-6 text-xs text-center border-gray-200" value={storeSettings?.taxId || ""} onChange={(e) => setStoreSettings({ ...storeSettings, taxId: e.target.value })} onBlur={() => autoSaveStoreSettings({ ...storeSettings })} placeholder="เลขประจำตัวผู้เสียภาษี" />
                </div>
              </div>

              {/* Bill Info */}
              <div className="text-xs space-y-1 mb-3 border-b border-dashed border-gray-300 pb-3">
                <div className="flex justify-between">
                  <span>เลขที่{success.isTaxInvoice ? "ใบกำกับภาษี" : "บิล"}:</span>
                  <span className="font-semibold">{success.isTaxInvoice ? success.taxInvoiceNumber : success.billNumber}</span>
                </div>
                {success.isTaxInvoice && (
                  <div className="flex justify-between text-muted-foreground"><span>เลขที่บิล:</span><span>{success.billNumber}</span></div>
                )}
                <div className="flex justify-between"><span>วันที่:</span><span>{new Date(success.createdAt || new Date()).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}</span></div>
                <div className="flex justify-between"><span>เวลา:</span><span>{new Date(success.createdAt || new Date()).toLocaleTimeString("th-TH")}</span></div>
              </div>

              {/* Buyer Info (editable) */}
              {(success.buyerName || success.buyerPhone || success.buyerAddress || buyerName || buyerPhone || buyerAddress || (selectedCustomer && customers.find(c => c.id === selectedCustomer))) && (
                <div className={`text-xs mb-3 border-b border-dashed border-gray-300 pb-3 p-2 rounded ${success.isTaxInvoice ? 'bg-blue-50/50' : 'bg-gray-50'}`}>
                  <div className={`font-semibold mb-2 ${success.isTaxInvoice ? 'text-blue-700' : 'text-gray-700'}`}>ผู้ซื้อ:</div>
                  <div className="space-y-1">
                    <Input className="h-7 text-xs border-gray-200" value={buyerName || success.buyerName || (selectedCustomer ? customers.find(c => c.id === selectedCustomer)?.name : "")} onChange={(e) => setBuyerName(e.target.value)} placeholder="ชื่อผู้ซื้อ" />
                    <Input className="h-7 text-xs border-gray-200" value={buyerPhone || success.buyerPhone || (selectedCustomer ? customers.find(c => c.id === selectedCustomer)?.phone : "")} onChange={(e) => setBuyerPhone(e.target.value)} placeholder="โทรศัพท์" />
                    <Input className="h-7 text-xs border-gray-200" value={buyerAddress || success.buyerAddress || (selectedCustomer ? customers.find(c => c.id === selectedCustomer)?.address : "")} onChange={(e) => setBuyerAddress(e.target.value)} placeholder="ที่อยู่" />
                    {success.isTaxInvoice && (
                      <Input className="h-7 text-xs border-blue-200" value={buyerTaxId || success.buyerTaxId || ""} onChange={(e) => setBuyerTaxId(e.target.value)} placeholder="เลขประจำตัวผู้เสียภาษี (ถ้ามี)" />
                    )}
                  </div>
                </div>
              )}

              {/* Items preview */}
              <div className="text-xs mb-3 border-b border-dashed border-gray-300 pb-3">
                <table className="w-full">
                  <thead><tr className="border-b border-gray-200"><th className="text-left py-1 font-semibold">รายการ</th><th className="text-center py-1 font-semibold w-12">จำนวน</th><th className="text-right py-1 font-semibold w-16">หน่วยละ</th><th className="text-right py-1 font-semibold w-16">จำนวนเงิน</th></tr></thead>
                  <tbody>
                    {receiptCart.length === 0 && parseFloat(success.serviceFee) > 0 ? (
                      <tr><td className="py-1">{success.serviceDescription || "ค่าบริการ"}</td><td className="text-center py-1">1</td><td className="text-right py-1">{formatCurrency(parseFloat(success.serviceFee))}</td><td className="text-right py-1">{formatCurrency(parseFloat(success.serviceFee))}</td></tr>
                    ) : (
                      <>
                        {receiptCart.map((item) => (
                          <tr key={item.productId}><td className="py-0.5 text-[10px]">{[item.brand, item.name, item.model].filter(Boolean).join(" / ")}</td><td className="text-center py-0.5 text-[10px]">{item.quantity}</td><td className="text-right py-0.5 text-[10px]">{formatCurrency(item.unitPrice)}</td><td className="text-right py-0.5 text-[10px]">{formatCurrency(item.unitPrice * item.quantity)}</td></tr>
                        ))}
                        {parseFloat(success.serviceFee) > 0 && (
                          <tr className="text-amber-700"><td className="py-0.5 text-[10px]">{success.serviceDescription || "ค่าบริการ"}</td><td className="text-center py-0.5 text-[10px]">1</td><td className="text-right py-0.5 text-[10px]">{formatCurrency(parseFloat(success.serviceFee))}</td><td className="text-right py-0.5 text-[10px]">{formatCurrency(parseFloat(success.serviceFee))}</td></tr>
                        )}
                      </>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className="text-xs space-y-1 mb-3">
                <div className="flex justify-between"><span>รวมมูลค่าสินค้า/บริการ</span><span>{formatCurrency(parseFloat(success.subtotal) + parseFloat(success.serviceFee || "0"))}</span></div>
                {parseFloat(success.discount) > 0 && (<div className="flex justify-between text-red-600"><span>ส่วนลด</span><span>-{formatCurrency(parseFloat(success.discount))}</span></div>)}
                {success.isTaxInvoice && (<><div className="flex justify-between"><span>มูลค่าก่อนภาษี</span><span>{formatCurrency(parseFloat(success.total) - parseFloat(success.taxAmount || "0"))}</span></div><div className="flex justify-between text-blue-600"><span>ภาษีมูลค่าเพิ่ม {success.vatType === "vat_in" ? "(รวมในราคา)" : ""} {success.taxRate}%</span><span>{formatCurrency(parseFloat(success.taxAmount || "0"))}</span></div></>)}
                <div className="flex justify-between font-bold text-lg pt-2 border-t-2 border-gray-400 mt-2"><span>จำนวนเงินรวมทั้งสิ้น</span><span className="text-orange-600">{formatCurrency(parseFloat(success.total))}</span></div>
              </div>

              {/* Payment */}
              <div className="text-xs mb-3 border-b border-dashed border-gray-300 pb-3">
                <div className="flex justify-between"><span>วิธีชำระ:</span><span className="font-semibold">{success.paymentMethod === "cash" ? "เงินสด" : success.paymentMethod === "transfer" ? "โอนเงิน" : "เครดิต"}</span></div>
                {success.note && (<div className="mt-1 text-muted-foreground"><span>หมายเหตุ: {success.note}</span></div>)}
              </div>

              <div className="text-xs text-muted-foreground text-center mb-3">
                <p>ขอบคุณที่ใช้บริการ</p>
                <p className="mt-2 text-orange-500 font-medium text-[10px]">* พิมพ์จะได้ 3 ฉบับ: สำหรับลูกค้า / บริษัท / บัญชี</p>
              </div>

              {/* LINE + SMS Send to Employee */}
              {!showLineSend ? (
                <button
                  type="button"
                  className="w-full h-9 rounded-xl border-2 border-green-200 bg-green-50 text-green-700 font-semibold text-xs flex items-center justify-center gap-2 hover:bg-green-100 hover:border-green-300 transition-all mt-2"
                  onClick={async () => { 
                    setShowLineSend(true); 
                    setLineSendResult(null); 
                    setSmsSendResult(null); 
                    setLineExtraMsg(""); 
                    setSelectedEmpId(null); 
                    setSmsEnabled(false); 
                    // Auto-fill product names and total price from receipt
                    setSmsModel(receiptCart.map(i => [i.brand, i.name, i.model].filter(Boolean).join(" / ")).join(", "));
                    setSmsPrice(formatCurrency(parseFloat(success.total)));
                    setSmsEmpPhone(""); 
                    setSmsConditions(""); 
                    
                    // Fetch SMS Credit
                    try {
                      const creditRes = await fetch("/api/pos/sms-credit");
                      const creditData = await creditRes.json();
                      if (creditData.success) {
                        setSmsCredit(creditData.credit ?? null);
                      }
                    } catch (e) {
                      console.error("Error fetching SMS credit:", e);
                    }
                  }}
                >
                  <MessageCircle className="h-4 w-4" /> ส่งงานให้พนักงาน (LINE / SMS)
                </button>
              ) : (
                <div className="mt-2 rounded-xl border-2 border-green-200 bg-green-50/50 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-green-800 flex items-center gap-1.5"><MessageCircle className="h-3.5 w-3.5" /> ส่งงานให้พนักงาน</h4>
                    <div className="flex items-center gap-2">
                      {smsCredit !== null && (
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
                          SMS เครดิต: {smsCredit}
                        </span>
                      )}
                      <button type="button" onClick={() => setShowLineSend(false)} className="rounded p-0.5 hover:bg-green-200 transition-colors"><X className="h-3.5 w-3.5 text-green-600" /></button>
                    </div>
                  </div>

                  {/* เลือกพนักงาน */}
                  <div>
                    <Label className="text-xs text-green-800">เลือกพนักงานรับผิดชอบ *</Label>
                    <select
                      className="w-full rounded-lg border border-green-200 bg-white p-2 text-xs focus:border-green-400 outline-none transition-all mt-1"
                      value={selectedEmpId || ""}
                      onChange={(e) => handleSelectEmp(e.target.value ? Number(e.target.value) : null)}
                    >
                      <option value="">-- เลือกพนักงาน --</option>
                      {empList.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.role === "admin" ? "ผู้ดูแลระบบ" : emp.role === "service" ? "พนักงานบริการ" : "พนักงานขาย"})
                          {emp.lineUserId ? " 💬" : ""}{emp.phone ? " 📱" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* ข้อมูลสินค้า (แก้ไขได้) */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] text-green-700">ชื่อรุ่น / สินค้า</Label>
                      <Input className="h-7 text-xs border-green-200" value={smsModel} onChange={(e) => setSmsModel(e.target.value)} placeholder="ชื่อรุ่น/สินค้า" />
                    </div>
                    <div>
                      <Label className="text-[10px] text-green-700">ราคา</Label>
                      <Input className="h-7 text-xs border-green-200" value={smsPrice} onChange={(e) => setSmsPrice(e.target.value)} placeholder="ราคา" />
                    </div>
                  </div>

                  {/* เบอร์โทรพนักงาน (แก้ไขได้) */}
                  <div>
                    <Label className="text-[10px] text-green-700">เบอร์โทรพนักงาน (สำหรับ SMS)</Label>
                    <Input className="h-7 text-xs border-green-200" value={smsEmpPhone} onChange={(e) => setSmsEmpPhone(e.target.value)} placeholder="0xx-xxx-xxxx" />
                  </div>

                  {/* เงื่อนไขเพิ่มเติม (แก้ไขได้) */}
                  <div>
                    <Label className="text-[10px] text-green-700">เงื่อนไขเพิ่มเติม</Label>
                    <textarea
                      className="w-full rounded-lg border border-green-200 bg-white p-2 text-xs focus:border-green-400 outline-none transition-all mt-1 resize-none"
                      rows={2}
                      value={smsConditions}
                      onChange={(e) => setSmsConditions(e.target.value)}
                      placeholder="เช่น รับประกัน 1 ปี, ติดตั้งฟรี, นัดส่งภายใน 3 วัน"
                    />
                  </div>

                  {/* ข้อความเพิ่มเติม */}
                  <div>
                    <Label className="text-[10px] text-green-700">ข้อความเพิ่มเติม (ถ้ามี)</Label>
                    <textarea
                      className="w-full rounded-lg border border-green-200 bg-white p-2 text-xs focus:border-green-400 outline-none transition-all mt-1 resize-none"
                      rows={2}
                      value={lineExtraMsg}
                      onChange={(e) => setLineExtraMsg(e.target.value)}
                      placeholder="เช่น ให้ไปส่งของที่บ้านลูกค้า, นัดเปลี่ยนแบตวันพรุ่งนี้"
                    />
                  </div>

                  {/* Results */}
                  {lineSendResult && (
                    <div className={`rounded-lg p-2 text-xs font-medium ${lineSendResult.success ? "bg-green-100 text-green-800 border border-green-300" : "bg-red-50 text-red-700 border border-red-200"}`}>
                      {lineSendResult.success ? "✅ ส่ง LINE สำเร็จ!" : `❌ LINE: ${lineSendResult.error || "ส่งไม่สำเร็จ"}`}
                    </div>
                  )}
                  {smsSendResult && (
                    <div className={`rounded-lg p-2 text-xs font-medium ${smsSendResult.success ? "bg-blue-100 text-blue-800 border border-blue-300" : "bg-yellow-50 text-yellow-700 border border-yellow-200"}`}>
                      {smsSendResult.success ? "✅ ส่ง SMS สำเร็จ!" : `⚠️ SMS: ${smsSendResult.error || "ส่งไม่สำเร็จ"}`}
                    </div>
                  )}

                  {/* Send Buttons */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="flex-1 h-9 rounded-lg bg-green-600 text-white font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!selectedEmpId || lineSending}
                      onClick={handleLineSend}
                    >
                      {lineSending ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> ส่ง...</> : <><MessageCircle className="h-3.5 w-3.5" /> ส่ง LINE</>}
                    </button>
                    <button
                      type="button"
                      className="flex-1 h-9 rounded-lg bg-blue-600 text-white font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!selectedEmpId || !smsEmpPhone || smsSending}
                      onClick={handleSmsSend}
                    >
                      {smsSending ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> ส่ง...</> : <><Smartphone className="h-3.5 w-3.5" /> ส่ง SMS</>}
                    </button>
                  </div>
                </div>
              )}

              {/* SMS Reminder ลูกค้า (ตั้งแจ้งเตือนล่วงหน้า) */}
              {!showSmsReminder ? (
                <button
                  type="button"
                  className="w-full h-9 rounded-xl border-2 border-blue-200 bg-blue-50 text-blue-700 font-semibold text-xs flex items-center justify-center gap-2 hover:bg-blue-100 hover:border-blue-300 transition-all mt-2"
                  onClick={() => {
                    setShowSmsReminder(true);
                    setSmsReminderResult(null);
                    setSmsReminderMsg("");
                    setSmsReminderDate("");
                    setSelectedTemplateId(null);
                    setSmsReminderProductInfo(receiptCart.map(i => i.name).join(", "));
                    setSmsReminderPhone(buyerPhone || success?.buyerPhone || "");
                  }}
                >
                  <Smartphone className="h-4 w-4" /> ตั้งเวลา SMS แจ้งเตือนลูกค้า (ไม่บังคับ)
                </button>
              ) : (
                <div className="mt-2 rounded-xl border-2 border-blue-200 bg-blue-50/50 p-2.5 sm:p-3 space-y-2.5 sm:space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] sm:text-xs font-bold text-blue-800 flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5" /> ตั้งเวลา SMS แจ้งเตือนลูกค้า</h4>
                    <button type="button" onClick={() => setShowSmsReminder(false)} className="rounded p-0.5 hover:bg-blue-200 transition-colors"><X className="h-3.5 w-3.5 text-blue-600" /></button>
                  </div>

                  {/* เลือกเทมเพลต + เพิ่ม/ลบ */}
                  <div>
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] text-blue-700 font-semibold">เลือกเทมเพลต</Label>
                      <button type="button" onClick={() => setShowAddTemplate(!showAddTemplate)} className="text-[10px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-0.5">
                        <Plus className="h-3 w-3" /> เพิ่มเทมเพลต
                      </button>
                    </div>
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      {smsTemplateList.map((t: any) => (
                        <div key={t.id} className="relative group">
                          <button type="button" onClick={() => handleApplyReminderTemplate(t.id)}
                            className={`text-[10px] sm:text-[11px] px-2.5 py-1.5 sm:py-1 rounded-lg border font-medium transition-all pr-5 ${selectedTemplateId === t.id ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "border-blue-200 bg-white text-blue-700 hover:bg-blue-100"}`}>
                            {t.name} ({t.durationMonths} ด.)
                          </button>
                          <button type="button" onClick={() => handleDeleteTemplateInline(t.id)} className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white rounded-full text-[8px] flex items-center justify-center opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity hover:bg-red-600" title="ลบ">✕</button>
                        </div>
                      ))}
                      {smsTemplateList.length === 0 && <span className="text-[10px] text-blue-400">ยังไม่มีเทมเพลต</span>}
                    </div>

                    {/* Inline add template form */}
                    {showAddTemplate && (
                      <div className="mt-2 p-2 rounded-lg border border-blue-300 bg-white space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-blue-700">เพิ่มเทมเพลตใหม่</span>
                          <button type="button" onClick={() => setShowAddTemplate(false)}><X className="h-3 w-3 text-gray-400" /></button>
                        </div>
                        <Input className="h-8 sm:h-7 text-xs border-blue-200" value={newTplName} onChange={(e) => setNewTplName(e.target.value)} placeholder="ชื่อเทมเพลต เช่น แจ้งเตือน 18 เดือน" />
                        <div className="flex flex-wrap gap-2 items-center">
                          <Input type="number" min={1} className="h-8 sm:h-7 text-xs border-blue-200 w-20" value={newTplMonths} onChange={(e) => setNewTplMonths(parseInt(e.target.value) || 1)} />
                          <span className="text-[10px] text-blue-600">เดือน</span>
                          <div className="flex gap-1">
                            {[6, 12, 18, 24, 36].map((m) => (
                              <button key={m} type="button" onClick={() => setNewTplMonths(m)} className={`text-[9px] px-1.5 py-0.5 rounded border transition-all ${newTplMonths === m ? "bg-blue-500 text-white border-blue-500" : "border-blue-200 hover:bg-blue-50"}`}>{m}</button>
                            ))}
                          </div>
                        </div>
                        <textarea className="w-full rounded-lg border border-blue-200 bg-white p-2 text-xs focus:border-blue-400 outline-none resize-none" rows={2} value={newTplMsg} onChange={(e) => setNewTplMsg(e.target.value)} placeholder="ข้อความ SMS: สวัสดีครับ คุณ{{name}} แบตเตอรี่ {{product}} ครบ..." />
                        <p className="text-[9px] text-blue-400">ตัวแปร: {"{{name}}"} {"{{product}}"} {"{{phone}}"} {"{{shopPhone}}"} {"{{date}}"}</p>
                        <button type="button" onClick={handleAddTemplate} disabled={!newTplName || !newTplMsg || tplSaving} className="w-full h-8 sm:h-7 rounded-lg bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1 hover:bg-blue-600 disabled:opacity-50 transition-all">
                          {tplSaving ? <><Loader2 className="h-3 w-3 animate-spin" /> กำลังบันทึก...</> : <><Plus className="h-3 w-3" /> บันทึกเทมเพลต</>}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] text-blue-700 font-semibold">เบอร์โทรลูกค้า *</Label>
                      <Input className="h-8 sm:h-7 text-xs border-blue-200" value={smsReminderPhone} onChange={(e) => setSmsReminderPhone(e.target.value)} placeholder="0xx-xxx-xxxx" />
                    </div>
                    <div>
                      <Label className="text-[10px] text-blue-700 font-semibold">วันที่แจ้งเตือน *</Label>
                      <Input type="date" className="h-8 sm:h-7 text-xs border-blue-200" value={smsReminderDate} onChange={(e) => setSmsReminderDate(e.target.value)} />
                      <div className="flex gap-1 mt-1">
                        {[{ l: "18ด.", m: 18 }, { l: "24ด.", m: 24 }].map(({ l, m }) => {
                          const d = new Date(); d.setMonth(d.getMonth() + m);
                          return <button key={m} type="button" onClick={() => setSmsReminderDate(d.toISOString().split("T")[0])} className="text-[9px] px-2 py-0.5 rounded border border-blue-200 hover:bg-blue-100 transition-all">{l}</button>;
                        })}
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-[10px] text-blue-700 font-semibold">สินค้า/รุ่น</Label>
                    <Input className="h-8 sm:h-7 text-xs border-blue-200" value={smsReminderProductInfo} onChange={(e) => setSmsReminderProductInfo(e.target.value)} placeholder="เช่น แบตเตอรี่ FB 80Ah" />
                  </div>

                  <div>
                    <Label className="text-[10px] text-blue-700 font-semibold">ข้อความ SMS *</Label>
                    <textarea className="w-full rounded-lg border border-blue-200 bg-white p-2 text-xs focus:border-blue-400 outline-none transition-all mt-1 resize-none" rows={3} value={smsReminderMsg} onChange={(e) => setSmsReminderMsg(e.target.value)} placeholder="พิมพ์ข้อความ SMS หรือเลือกเทมเพลตด้านบน..." />
                  </div>

                  {smsReminderResult && (
                    <div className={`rounded-lg p-2 text-xs font-medium ${smsReminderResult.success ? "bg-green-100 text-green-800 border border-green-300" : "bg-red-50 text-red-700 border border-red-200"}`}>
                      {smsReminderResult.success ? "✅ บันทึกการแจ้งเตือนเรียบร้อย!" : `❌ ${smsReminderResult.error}`}
                    </div>
                  )}

                  <button
                    type="button"
                    className="w-full h-10 sm:h-9 rounded-lg bg-blue-600 text-white font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!smsReminderPhone || !smsReminderMsg || !smsReminderDate || smsReminderSaving}
                    onClick={handleSmsReminderSave}
                  >
                    {smsReminderSaving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> กำลังบันทึก...</> : <><Smartphone className="h-3.5 w-3.5" /> บันทึกการแจ้งเตือน</>}
                  </button>
                </div>
              )}

              {/* Buttons - sticky at bottom for mobile */}
             </div>
              <div className="flex-shrink-0 p-4 sm:p-5 pt-3 border-t border-gray-100 space-y-3 bg-white">
                {!saleCancelled && (
                <button
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-base shadow-lg shadow-green-200/50 hover:shadow-xl hover:shadow-green-300/50 hover:from-green-600 hover:to-emerald-700 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2.5"
                  onClick={handleFinish}
                >
                  <CheckCircle2 className="h-5 w-5" /> ดำเนินการเสร็จสิ้น
                </button>
                )}
                <div className="flex gap-2.5">
                  {!saleCancelled && (
                  <Button variant="outline" className="flex-1 gap-2 rounded-xl h-10 border-orange-200 hover:bg-orange-50 text-sm font-semibold" onClick={handlePrint}>
                    <Printer className="h-4 w-4" /> พิมพ์ (3 ฉบับ)
                  </Button>
                  )}
                  {!saleCancelled && (
                  <button
                    className="flex-1 h-10 rounded-xl border-2 border-purple-200 bg-purple-50 text-purple-700 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-purple-100 hover:border-purple-300 transition-all"
                    onClick={async () => {
                      if (!success?.id) return;
                      try {
                        const res = await fetch("/api/receipt-image", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ saleId: success.id }),
                        });
                        const data = await res.json();
                        if (data.success && data.url) {
                          window.open(data.url, "_blank");
                        } else {
                          alert(data.error || "ไม่สามารถสร้างลิงก์ได้");
                        }
                      } catch {
                        alert("เกิดข้อผิดพลาด");
                      }
                    }}
                  >
                    📤 แชร์เป็นรูป
                  </button>
                  )}
                  {!saleCancelled ? (
                  <button className="flex-1 h-10 rounded-xl border border-red-200 text-red-400 font-medium text-sm hover:bg-red-50 hover:text-red-600 transition-all" onClick={async () => {
                    if (success?.id) {
                      if (confirm("ยกเลิกการขายนี้? (สินค้าจะถูกคืนสต๊อก)")) {
                        try {
                          console.log("[CANCEL] sending cancel for saleId:", success.id);
                          const cancelRes = await fetch("/api/pos/sale/cancel", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ saleId: success.id }),
                          });
                          console.log("[CANCEL] response status:", cancelRes.status);
                          if (!cancelRes.ok) {
                            const errData = await cancelRes.json().catch(() => ({}));
                            throw new Error(errData.error || "Cancel failed");
                          }
                          const cancelData = await cancelRes.json();
                          console.log("[CANCEL] response data:", JSON.stringify(cancelData));
                          if (cancelData.updatedStock && cancelData.updatedStock.length > 0) {
                            setProductList(prev => prev.map(p => {
                              const updated = cancelData.updatedStock.find((s: any) => s.id === (p.products?.id ?? p.id));
                              if (updated) {
                                return p.products
                                  ? { ...p, products: { ...p.products, stock: updated.stock } }
                                  : { ...p, stock: updated.stock };
                              }
                              return p;
                            }));
                            console.log("[CANCEL] productList updated with", cancelData.updatedStock.length, "items");
                          }
                          setSaleCancelled(true);
                        } catch (err: any) {
                          console.error("[CANCEL] error:", err);
                          alert("เกิดข้อผิดพลาดในการยกเลิก: " + (err?.message || ""));
                        }
                      }
                    }
                  }}>
                    ยกเลิกการขาย
                  </button>
                ) : (
                  <button className="flex-1 h-10 rounded-xl border-2 border-red-400 bg-red-50 text-red-600 font-bold text-sm transition-all" onClick={() => {
                    setSaleCancelled(false);
                    setSuccess(null); setShowReceipt(false); setShowLineSend(false); setLineSendResult(null); setShowSmsReminder(false); setSmsReminderResult(null);
                  }}>
                    ปิดหน้านี้
                  </button>
                )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Popup */}
        {showSuccessPopup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={dismissSuccessPopup}>
            <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4 animate-in zoom-in-95 duration-300 max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">บันทึกข้อมูลเรียบร้อย!</h3>
              <p className="text-sm text-gray-500 text-center">ข้อมูลการขายถูกบันทึกในระบบเรียบร้อยแล้ว</p>
              <button
                className="w-full h-10 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 active:scale-[0.98] transition-all"
                onClick={dismissSuccessPopup}
              >
                ตกลง
              </button>
            </div>
          </div>
        )}
    </div>
  );
}
