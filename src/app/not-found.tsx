import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-50/30">
      <div className="text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100">
          <span className="text-3xl font-bold text-orange-600">404</span>
        </div>
        <h2 className="text-xl font-bold tracking-tight">ไม่พบหน้านี้</h2>
        <p className="text-sm text-gray-500">หน้าที่คุณกำลังมองหาไม่มีอยู่ในระบบ</p>
        <Link
          href="/dashboard"
          className="inline-block rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all"
        >
          กลับหน้าหลัก
        </Link>
      </div>
    </div>
  );
}
