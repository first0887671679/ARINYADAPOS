"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50/30">
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">เกิดข้อผิดพลาด</h2>
          <p className="text-sm text-gray-500">{error.message || "Something went wrong"}</p>
          <button
            onClick={() => reset()}
            className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all"
          >
            ลองใหม่อีกครั้ง
          </button>
        </div>
      </body>
    </html>
  );
}
