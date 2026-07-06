"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, Lock, User, ArrowRight } from "lucide-react";
import { loginAction } from "./actions";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await loginAction(formData);

    if (result.success) {
      router.push("/pos");
      router.refresh();
    } else {
      setError(result.error || "เกิดข้อผิดพลาด");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-blue-100" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-blue-200/40 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-blue-300/20 to-transparent rounded-full blur-3xl" />
      <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-blue-200/20 rounded-full blur-2xl animate-pulse" />

      {/* Pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #2563eb 1px, transparent 0)", backgroundSize: "40px 40px" }} />

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl gradient-blue shadow-luxury-lg animate-glow mb-4">
            <Zap className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            ARINYADA <span className="text-blue-500">POS</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">ระบบจัดการร้านแบตเตอรี่</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-luxury-lg border border-white/60 p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-foreground">เข้าสู่ระบบ</h2>
            <p className="text-sm text-muted-foreground mt-1">กรอกข้อมูลเพื่อเริ่มใช้งาน</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-semibold">ชื่อผู้ใช้</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400" />
                <Input
                  id="username"
                  name="username"
                  placeholder="กรอกชื่อผู้ใช้"
                  required
                  autoFocus
                  className="pl-10 h-12 rounded-xl border-blue-200/60 bg-blue-50/30 focus:border-blue-400 focus:ring-blue-400/20 transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold">รหัสผ่าน</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  className="pl-10 h-12 rounded-xl border-blue-200/60 bg-blue-50/30 focus:border-blue-400 focus:ring-blue-400/20 transition-all"
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full h-12 rounded-xl gradient-blue text-white font-semibold text-base shadow-luxury hover:shadow-luxury-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] gap-2"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  กำลังเข้าสู่ระบบ...
                </span>
              ) : (
                <>เข้าสู่ระบบ <ArrowRight className="h-5 w-5" /></>
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground/60 mt-6">
          ARINYADA POS System
        </p>
      </div>
    </div>
  );
}
