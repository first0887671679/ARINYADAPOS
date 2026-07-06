"use client";

import { useState, useEffect } from "react";

export default function LineDebugPage() {
  const [env, setEnv] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEnv() {
      try {
        const res = await fetch("/api/debug/env");
        const data = await res.json();
        setEnv(data);
      } catch (err) {
        setEnv({ error: "Failed to fetch env" });
      }
      setLoading(false);
    }
    fetchEnv();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">🔍 LINE Environment Debug</h1>
        
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold mb-4">Environment Variables</h2>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="font-medium">LINE_CHANNEL_SECRET:</span>
              <span className={`px-2 py-1 rounded text-xs ${env.LINE_CHANNEL_SECRET ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {env.LINE_CHANNEL_SECRET ? '✅ มีค่า' : '❌ ไม่มีค่า'}
              </span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="font-medium">LINE_CHANNEL_TOKEN:</span>
              <span className={`px-2 py-1 rounded text-xs ${env.LINE_CHANNEL_TOKEN ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {env.LINE_CHANNEL_TOKEN ? '✅ มีค่า' : '❌ ไม่มีค่า'}
              </span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="font-medium">LINE_USER_ID:</span>
              <span className={`px-2 py-1 rounded text-xs ${env.LINE_USER_ID ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {env.LINE_USER_ID ? '✅ มีค่า' : '❌ ไม่มีค่า'}
              </span>
            </div>
          </div>

          {env.error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-600">
              {env.error}
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">📋 ถ้า ENV โหลดถูกต้องแล้ว:</h3>
            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
              <li>ตรวจสอบ Webhook URL ใน LINE Console</li>
              <li>กด "Verify" ใน LINE Console</li>
              <li>ส่งข้อความไปหา LINE OA เพื่อทดสอบ</li>
              <li>ดู log ใน terminal ว่ามี error อะไร</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
