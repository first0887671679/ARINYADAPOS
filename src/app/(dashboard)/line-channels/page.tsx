"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, X, Check, AlertCircle, ExternalLink, Edit2, Trash2, Eye, EyeOff, Wifi } from "lucide-react";

interface LineChannel {
  id: number;
  name: string;
  channelId: string;
  webhookPath: string;
  pictureUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function LineChannelsPage() {
  const [channels, setChannels] = useState<LineChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editChannel, setEditChannel] = useState<LineChannel | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formChannelId, setFormChannelId] = useState("");
  const [formChannelSecret, setFormChannelSecret] = useState("");
  const [formChannelAccessToken, setFormChannelAccessToken] = useState("");
  const [formWebhookPath, setFormWebhookPath] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    fetchChannels();
  }, []);

  async function fetchChannels() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/line-channels");
      const data = await res.json();
      if (data.success) {
        setChannels(data.data);
      } else {
        setError(data.error || "ไม่สามารถโหลดข้อมูลได้");
      }
    } catch (err: any) {
      setError(err?.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setEditChannel(null);
    setFormName("");
    setFormChannelId("");
    setFormChannelSecret("");
    setFormChannelAccessToken("");
    setFormWebhookPath("/api/line-webhook");
    setShowModal(true);
    setSaveResult(null);
  }

  function openEditModal(ch: LineChannel) {
    setEditChannel(ch);
    setFormName(ch.name);
    setFormChannelId(ch.channelId);
    setFormChannelSecret("");
    setFormChannelAccessToken("");
    setFormWebhookPath(ch.webhookPath);
    setShowModal(true);
    setSaveResult(null);
  }

  function closeModal() {
    setShowModal(false);
    setEditChannel(null);
    setSaveResult(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveResult(null);

    try {
      const payload: any = {
        name: formName,
        channelId: formChannelId,
        webhookPath: formWebhookPath,
      };

      if (formChannelSecret) payload.channelSecret = formChannelSecret;
      if (formChannelAccessToken) payload.channelAccessToken = formChannelAccessToken;

      let res;
      if (editChannel) {
        payload.id = editChannel.id;
        res = await fetch("/api/line-channels", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        if (!formChannelSecret || !formChannelAccessToken) {
          setSaveResult({ success: false, message: "กรุณากรอก Channel Secret และ Access Token" });
          setSaving(false);
          return;
        }
        res = await fetch("/api/line-channels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const result = await res.json();
      if (result.success) {
        setSaveResult({ success: true, message: editChannel ? "แก้ไขสำเร็จ!" : "เพิ่มสำเร็จ!" });
        await fetchChannels();
        setTimeout(() => closeModal(), 1000);
      } else {
        setSaveResult({ success: false, message: result.error || "เกิดข้อผิดพลาด" });
      }
    } catch (err: any) {
      setSaveResult({ success: false, message: err?.message || "เกิดข้อผิดพลาด" });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(ch: LineChannel) {
    try {
      const res = await fetch("/api/line-channels", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: ch.id, isActive: !ch.isActive }),
      });
      const result = await res.json();
      if (result.success) {
        await fetchChannels();
      }
    } catch {}
  }

  async function handleDelete(ch: LineChannel) {
    if (!confirm(`ต้องการลบ "${ch.name}" ใช่หรือไม่?`)) return;
    try {
      const res = await fetch(`/api/line-channels?id=${ch.id}`, { method: "DELETE" });
      const result = await res.json();
      if (result.success) {
        await fetchChannels();
      } else {
        alert(result.error || "ลบไม่สำเร็จ");
      }
    } catch {
      alert("เกิดข้อผิดพลาด");
    }
  }

  async function handleTest(ch: LineChannel) {
    setTestingId(ch.id);
    setTestResult(null);
    try {
      const res = await fetch("/api/line-channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test", id: ch.id }),
      });
      const result = await res.json();
      setTestResult({ success: result.success, message: result.success ? `เชื่อมต่อสำเร็จ: ${result.botName}` : `ล้มเหลว: ${result.error}` });
    } catch {
      setTestResult({ success: false, message: "เกิดข้อผิดพลาด" });
    } finally {
      setTestingId(null);
    }
  }

  function maskString(s: string): string {
    if (!s || s.length <= 8) return "••••••••";
    return s.substring(0, 4) + "••••" + s.substring(s.length - 4);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">📱 จัดการ LINE Official Account</h1>
        <p className="text-gray-600 mt-1">เพิ่ม/แก้ไข/ลบ บัญชี LINE OA ที่ต้องการรับข้อความ</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">รายการ LINE OA ({channels.length})</h2>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" /> เพิ่ม LINE OA
          </button>
        </div>

        {/* Test Result */}
        {testResult && (
          <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${testResult.success ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {testResult.success ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {testResult.message}
            <button onClick={() => setTestResult(null)} className="ml-auto"><X className="h-4 w-4" /></button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-3" />
            <p className="text-gray-500">กำลังโหลด...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="text-center py-12">
            <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-3" />
            <p className="text-red-500">{error}</p>
            <button onClick={fetchChannels} className="mt-3 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
              ลองใหม่
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && channels.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-5xl mb-4">📱</p>
            <p className="text-lg font-medium">ยังไม่มี LINE OA ที่เชื่อมต่อ</p>
            <p className="text-sm mt-1 mb-4">กดปุ่ม &quot;เพิ่ม LINE OA&quot; เพื่อเริ่มต้น</p>
            <button onClick={openAddModal} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium">
              <Plus className="h-4 w-4 inline mr-1" /> เพิ่ม LINE OA
            </button>
          </div>
        )}

        {/* Channel List */}
        {!loading && !error && channels.length > 0 && (
          <div className="space-y-3">
            {channels.map((ch) => (
              <div key={ch.id} className={`flex items-center justify-between p-4 border rounded-lg transition-all ${ch.isActive ? "border-gray-200 hover:bg-gray-50" : "border-gray-100 bg-gray-50 opacity-60"}`}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {ch.pictureUrl ? (
                    <img src={ch.pictureUrl} alt="" className="h-10 w-10 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-lg flex-shrink-0">📱</div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{ch.name}</p>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${ch.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {ch.isActive ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">Channel ID: {maskString(ch.channelId)}</p>
                    <p className="text-xs text-gray-400 truncate">Webhook: <code className="bg-gray-100 px-1 rounded">{ch.webhookPath}</code></p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                  <button
                    onClick={() => handleTest(ch)}
                    disabled={testingId === ch.id}
                    className="p-2 text-xs border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50"
                    title="ทดสอบการเชื่อมต่อ"
                  >
                    {testingId === ch.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wifi className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => handleToggleActive(ch)}
                    className="p-2 text-xs border border-gray-300 rounded-lg hover:bg-gray-100"
                    title={ch.isActive ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                  >
                    {ch.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => openEditModal(ch)}
                    className="p-2 text-xs border border-gray-300 rounded-lg hover:bg-gray-100"
                    title="แก้ไข"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(ch)}
                    className="p-2 text-xs border border-red-200 text-red-500 rounded-lg hover:bg-red-50"
                    title="ลบ"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Webhook URL Guide */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">📋 วิธีตั้งค่า Webhook URL ใน LINE Developers</h3>
          <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
            <li>ไปที่ <a href="https://developers.line.biz/" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">LINE Developers Console <ExternalLink className="h-3 w-3" /></a></li>
            <li>เลือก Channel ของคุณ</li>
            <li>ไปที่แท็บ <strong>Webhook settings</strong></li>
            <li>ใส่ Webhook URL ของแต่ละ OA</li>
            <li>กด <strong>Verify</strong> เพื่อทดสอบ</li>
          </ol>
          <div className="mt-3 p-3 bg-white rounded border border-blue-200">
            <p className="text-xs text-gray-500 mb-1">Webhook URL รูปแบบ:</p>
            <code className="text-sm font-mono text-blue-600 break-all">
              {baseUrl}/api/line-webhook
            </code>
            <p className="text-xs text-gray-400 mt-2">
              * แต่ละ OA ต้องมี webhookPath ไม่ซ้ำกัน เช่น <code className="bg-gray-100 px-1 rounded">/api/line-webhook/oa1</code>
            </p>
          </div>
        </div>
      </div>

      {/* Add/Edit Channel Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{editChannel ? "แก้ไข LINE OA" : "เพิ่ม LINE OA ใหม่"}</h3>
              <button onClick={closeModal} className="p-1 hover:bg-gray-100 rounded-lg"><X className="h-5 w-5" /></button>
            </div>

            {saveResult && (
              <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${saveResult.success ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                {saveResult.success ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                {saveResult.message}
              </div>
            )}

            <form onSubmit={handleSave}>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อแสดง *</label>
                  <input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="เช่น FIRSTBATTERY Official"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Channel ID *</label>
                  <input
                    value={formChannelId}
                    onChange={(e) => setFormChannelId(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Channel ID จาก LINE Developers"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Channel Secret {editChannel ? "(เว้นว่างถ้าไม่เปลี่ยน)" : "*"}
                  </label>
                  <div className="relative">
                    <input
                      value={formChannelSecret}
                      onChange={(e) => setFormChannelSecret(e.target.value)}
                      type={showSecret ? "text" : "password"}
                      required={!editChannel}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Channel Secret"
                    />
                    <button type="button" onClick={() => setShowSecret(!showSecret)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600">
                      {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Channel Access Token {editChannel ? "(เว้นว่างถ้าไม่เปลี่ยน)" : "*"}
                  </label>
                  <div className="relative">
                    <input
                      value={formChannelAccessToken}
                      onChange={(e) => setFormChannelAccessToken(e.target.value)}
                      type={showToken ? "text" : "password"}
                      required={!editChannel}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Long-lived Channel Access Token"
                    />
                    <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600">
                      {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Webhook Path *</label>
                  <input
                    value={formWebhookPath}
                    onChange={(e) => setFormWebhookPath(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="เช่น /api/line-webhook/oa1"
                  />
                  <p className="text-xs text-gray-400 mt-1">ต้องไม่ซ้ำกับ OA อื่น</p>
                  {formWebhookPath && (
                    <p className="text-xs text-blue-500 mt-1 break-all">
                      Webhook URL: <code>{baseUrl}{formWebhookPath}</code>
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-5">
                <button type="button" onClick={closeModal} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> กำลังบันทึก...</> : editChannel ? "บันทึกการแก้ไข" : "เพิ่ม LINE OA"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
