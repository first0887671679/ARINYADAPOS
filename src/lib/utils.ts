import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function generateBillNumber(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = (now.getMonth() + 1).toString().padStart(2, "0");
  const d = now.getDate().toString().padStart(2, "0");
  const rand = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `BIL${y}${m}${d}-${rand}`;
}

// --- Payment Method Helpers ---

export type PaymentMethod = "cash" | "transfer" | "credit";

export function getPaymentLabel(method: string): string {
  switch (method) {
    case "cash":
      return "เงินสด";
    case "transfer":
      return "โอนเงิน";
    case "credit":
      return "เครดิต";
    default:
      return method;
  }
}

export function getPaymentBadgeStyle(method: string): string {
  switch (method) {
    case "cash":
      return "bg-green-100 text-green-700 font-bold border border-green-300";
    case "transfer":
      return "bg-orange-100 text-orange-600 border border-orange-200";
    case "credit":
      return "bg-red-100 text-red-700 border border-red-200";
    default:
      return "bg-gray-100 text-gray-600 border border-gray-200";
  }
}
