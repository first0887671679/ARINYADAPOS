"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/app/login/actions";
import {
  Battery,
  LayoutDashboard,
  ShoppingCart,
  Package,
  FolderOpen,
  Users,
  Receipt,
  UserCog,
  LogOut,
  Zap,
  FileText,
  Smartphone,
  Menu,
  X,
  Settings,
  MessageSquare,
} from "lucide-react";
import type { SessionUser } from "@/lib/auth";

const navItems = [
  { href: "/pos", label: "ขายสินค้า", icon: ShoppingCart, roles: [] },
  { href: "/dashboard", label: "แดชบอร์ด", icon: LayoutDashboard, roles: ["admin"] },
  { href: "/products", label: "สินค้า", icon: Package, roles: ["admin", "cashier"] },
  { href: "/categories", label: "หมวดหมู่", icon: FolderOpen, roles: ["admin"] },
  { href: "/customers", label: "ลูกค้า", icon: Users, roles: ["admin", "cashier"] },
  { href: "/quotations", label: "ใบเสนอราคา", icon: FileText, roles: ["admin", "cashier"] },
  { href: "/sales", label: "ประวัติการขาย", icon: Receipt, roles: ["admin", "cashier"] },
  { href: "/employees", label: "พนักงาน", icon: UserCog, roles: ["admin"] },
  { href: "/sms-reminders", label: "SMS แจ้งเตือน", icon: Smartphone, roles: ["admin"] },
  { href: "/line-channels", label: "📱 จัดการ LINE OA", icon: MessageSquare, roles: ["admin"] },
  { href: "/debug/line-webhook", label: "🔍 Debug LINE Webhook", icon: Settings, roles: ["admin"] },
  { href: "/settings", label: "ตั้งค่าร้าน", icon: Settings, roles: ["admin"] },
];

export function Sidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  // แสดงเมนูครบทุกฟังก์ชั่นสำหรับทุก role
  const filteredNav = navItems;

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  async function handleLogout() {
    await logoutAction();
    router.push("/login");
    router.refresh();
  }

  const currentPage = filteredNav.find((item) => item.href === pathname);

  const sidebarContent = (
    <>
      {/* Premium Background with Mesh Gradient */}
      <div className="absolute inset-0 bg-white pointer-events-none" />
      <div className="absolute inset-0 gradient-blue-mesh opacity-40 pointer-events-none" />
      <div className="absolute inset-0 glass-white pointer-events-none" />
      
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 right-0 h-1 gradient-blue shadow-luxury" />
      <div className="absolute top-20 -right-20 w-40 h-40 bg-blue-200/20 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-40 -left-20 w-32 h-32 bg-blue-300/15 rounded-full blur-2xl animate-float" />

      {/* Brand Header */}
      <div className="relative px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="relative animate-float">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-blue shadow-luxury-lg animate-glow">
              <Zap className="h-7 w-7 text-white drop-shadow-lg" />
            </div>
            <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 border-2 border-white shadow-lg animate-pulse" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">ARINYADA</h1>
            <p className="text-xs font-semibold text-blue-500/80">Premium POS System</p>
          </div>
          {/* Mobile close button */}
          <button type="button" onClick={() => setMobileOpen(false)} className="lg:hidden p-2 rounded-xl hover:bg-blue-100 active:bg-blue-200 active:scale-95 transition-all cursor-pointer pointer-events-auto">
            <X className="h-6 w-6 text-blue-600 pointer-events-none" />
          </button>
        </div>
      </div>

      {/* Elegant Divider */}
      <div className="mx-5 h-px bg-gradient-to-r from-transparent via-blue-300/50 to-transparent shadow-sm" />

      {/* Premium Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-5 relative overflow-auto">
        <div className="px-3 pb-3 text-[10px] font-bold uppercase tracking-widest text-blue-400/60 flex items-center gap-2">
          <span className="h-px flex-1 bg-gradient-to-r from-blue-200/40 to-transparent" />
          เมนูหลัก
          <span className="h-px flex-1 bg-gradient-to-l from-blue-200/40 to-transparent" />
        </div>

        {/* แสดงเมนูทั้งหมดตาม filteredNav */}
        {filteredNav.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group relative flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition-all duration-300 hover-lift",
              pathname === item.href
                ? "gradient-blue text-white shadow-luxury-lg"
                : "text-gray-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-50/50 hover:text-blue-700"
            )}
          >
            {pathname === item.href && (
              <>
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 h-10 w-1.5 rounded-r-full bg-gradient-to-b from-blue-400 to-blue-600 shadow-lg" />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/10 to-transparent" />
              </>
            )}
            <div className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-300 shadow-sm",
              pathname === item.href
                ? "bg-white/25 backdrop-blur-sm"
                : "bg-gradient-to-br from-blue-100 to-blue-50 group-hover:from-blue-200 group-hover:to-blue-100 group-hover:shadow-md"
            )}>
              <item.icon className={cn("h-4.5 w-4.5 transition-transform duration-300 group-hover:scale-110", pathname === item.href ? "text-white drop-shadow" : "text-blue-600")} />
            </div>
            <span className="flex-1">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Premium User Section */}
      <div className="mx-3 mb-4 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-blue-600/10 rounded-2xl blur-xl" />
        <div className="relative rounded-2xl glass-blue p-4 border border-blue-200/30 shadow-luxury hover-scale">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-base font-bold text-white shadow-luxury-lg">
                {user.name.charAt(0)}
              </div>
              <div className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 border-2 border-white shadow-md" />
            </div>
            <div className="flex-1 min-w-0 space-y-0.5">
              <p className="text-sm font-bold truncate text-gray-800 leading-tight">{user.name}</p>
              <p className="text-xs font-semibold text-blue-600 leading-tight flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
                <span className="truncate">{user.role === "admin" ? "ผู้ดูแลระบบ" : user.role === "service" ? "พนักงานบริการ" : "พนักงานขาย"}</span>
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-center gap-2 rounded-xl border-2 border-blue-200/50 bg-gradient-to-r from-white to-blue-50/30 text-sm font-semibold text-blue-700 hover:border-blue-300 hover:from-blue-50 hover:to-blue-100/50 hover:text-blue-800 hover:shadow-md transition-all duration-300 h-10"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            ออกจากระบบ
          </Button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden no-print fixed top-0 left-0 right-0 z-[60] flex items-center justify-between px-4 py-3 bg-white/90 backdrop-blur-md border-b border-blue-100 shadow-sm pointer-events-auto">
        <button type="button" onClick={() => setMobileOpen(true)} className="relative p-2 rounded-xl hover:bg-blue-50 active:bg-blue-100 active:scale-95 transition-all cursor-pointer pointer-events-auto">
          <Menu className="h-6 w-6 text-blue-600 pointer-events-none" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl gradient-blue shadow-sm">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
            {currentPage?.label || "ARINYADA"}
          </span>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-xs font-bold text-white">
          {user.name.charAt(0)}
        </div>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile Drawer */}
      <aside className={cn(
        "lg:hidden no-print fixed top-0 left-0 bottom-0 z-[80] w-72 flex flex-col overflow-hidden transition-transform duration-300 ease-in-out transform bg-white shadow-2xl",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {sidebarContent}
      </aside>

      {/* Desktop Sidebar */}
      <aside className="no-print hidden lg:flex w-72 flex-col relative overflow-hidden">
        {sidebarContent}
      </aside>
    </>
  );
}

