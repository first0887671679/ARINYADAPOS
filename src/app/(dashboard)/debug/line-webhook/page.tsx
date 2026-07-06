"use client";

import { useState, useEffect } from "react";
import { Loader2, RefreshCw, CheckCircle, XCircle, AlertTriangle, Copy, ExternalLink } from "lucide-react";

export default function LineWebhookDebugPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/debug/line-webhook");
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch debug info");
    } finally {
      setLoading(false);
    }
  }

  async function testWebhook() {
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/debug/line-webhook/test", { method: "POST" });
      const json = await res.json();
      setTestResult(json);
    } catch (err: any) {
      setTestResult({ success: false, error: err?.message });
    } finally {
      setTestLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-3 text-gray-500">กำลังโหลด...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <XCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
        <p className="text-red-500">{error}</p>
        <button onClick={fetchData} className="mt-3 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
          <RefreshCw className="h-4 w-4 inline mr-1" /> ลองใหม่
        </button>
      </div>
    );
  }

  const isHealthy = data?.env?.LINE_CHANNEL_TOKEN?.startsWith("✅") && data?.env?.LINE_CHANNEL_SECRET?.startsWith("✅");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🔍 Debug: LINE Webhook</h1>
          <p className="text-gray-600 mt-1">ตรวจสอบสถานะ LINE Webhook และการเชื่อมต่อ</p>
        </div>
        <button onClick={fetchData} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
          <RefreshCw className="h-4 w-4 inline mr-1" /> Refresh
        </button>
      </div>

      {/* Health Status */}
      <div className={`p-4 rounded-xl border ${isHealthy ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
        <div className="flex items-center gap-2">
          {isHealthy ? <CheckCircle className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
          <span className="font-semibold">{isHealthy ? "ระบบพร้อมใช้งาน" : "ระบบยังไม่พร้อม"}</span>
        </div>
      </div>

      {/* Environment Variables */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">🔑 Environment Variables</h2>
        <div className="space-y-2">
          {Object.entries(data?.env || {}).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <span className="text-sm font-mono text-gray-600">{key}</span>
              <span className={`text-sm font-medium ${(value as string).startsWith("✅") ? "text-green-600" : "text-red-600"}`}>
                {value as string}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Database Status */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">🗄️ Database</h2>
        <div className="space-y-2">
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-600">Tables</span>
            <span className="text-sm font-medium">
              {data?.database?.tables?.join(", ") || data?.database?.tablesError}
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-600">LINE Channels</span>
            <span className="text-sm font-medium">{data?.database?.lineChannelsCount ?? data?.database?.lineChannelsError}</span>
          </div>
        </div>
      </div>

      {/* Webhook URL */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">🔗 Webhook URL</h2>
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
          <code className="text-sm font-mono flex-1 break-all">{data?.webhookUrl}</code>
          <button
            onClick={() => navigator.clipboard.writeText(data?.webhookUrl)}
            className="p-2 hover:bg-gray-200 rounded-lg"
            title="Copy"
          >
            <Copy className="h-4 w-4" />
          </button>
          <a href={data?.webhookUrl} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-gray-200 rounded-lg">
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>

      {/* Test Webhook */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">🧪 ทดสอบ Webhook</h2>
        <button
          onClick={testWebhook}
          disabled={testLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 text-sm font-medium"
        >
          {testLoading ? <><Loader2 className="h-4 w-4 animate-spin inline mr-1" /> กำลังทดสอบ...</> : "ทดสอบ Webhook"}
        </button>
        {testResult && (
          <div className={`mt-3 p-3 rounded-lg text-sm ${testResult.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            <pre className="whitespace-pre-wrap">{JSON.stringify(testResult, null, 2)}</pre>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-blue-800 mb-3">📋 ขั้นตอนตั้งค่า</h2>
        <ol className="space-y-2 text-sm text-blue-700 list-decimal list-inside">
          {data?.instructions?.map((inst: string, i: number) => (
            <li key={i}>{inst}</li>
          ))}
          <li>ไปที่ <a href="https://developers.line.biz/" target="_blank" className="underline">LINE Developers Console</a></li>
          <li>เลือก Channel → Webhook settings</li>
          <li>ใส่ Webhook URL ด้านบน → กด Verify</li>
          <li>เปิดใช้งาน "Use webhooks"</li>
          <li>ส่งข้อความทดสอบจาก LINE OA</li>
        </ol>
      </div>
    </div>
  );
}
