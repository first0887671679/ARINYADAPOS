import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// Allow large file uploads (up to 50MB)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const sessionCookie = request.cookies.get("arinyadapos_session");
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try { JSON.parse(sessionCookie.value); } catch {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "Cloudinary ยังไม่ได้ตั้งค่า กรุณาเพิ่ม CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET ใน .env" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "ไม่พบไฟล์" }, { status: 400 });
    }

    // Validate file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "ไฟล์ใหญ่เกินไป (สูงสุด 10MB)" }, { status: 400 });
    }

    // Validate file type
    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "ประเภทไฟล์ไม่รองรับ (รองรับ: JPG, PNG, WebP, GIF, SVG)" }, { status: 400 });
    }

    // Generate signature for signed upload
    // Transformation: auto-resize large images to max 2000px, auto quality
    const timestamp = Math.round(Date.now() / 1000).toString();
    const ALLOWED_FOLDERS = ["products", "employees", "logos"];
    const rawFolder = (formData.get("folder") as string) || "products";
    const folder = ALLOWED_FOLDERS.includes(rawFolder) ? rawFolder : "products";
    const transformation = folder === "logos" ? "c_limit,w_400,h_400,q_auto:best" : "c_limit,w_2000,h_2000,q_auto";
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}&transformation=${transformation}${apiSecret}`;
    const signature = crypto.createHash("sha1").update(paramsToSign).digest("hex");

    // Forward to Cloudinary with signed upload
    const cloudinaryForm = new FormData();
    cloudinaryForm.append("file", file);
    cloudinaryForm.append("folder", folder);
    cloudinaryForm.append("timestamp", timestamp);
    cloudinaryForm.append("api_key", apiKey);
    cloudinaryForm.append("signature", signature);
    cloudinaryForm.append("transformation", transformation);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: "POST", body: cloudinaryForm }
    );

    if (!res.ok) {
      const errData = await res.json();
      return NextResponse.json(
        { error: errData?.error?.message || "อัพโหลดไปยัง Cloudinary ล้มเหลว" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({
      publicId: data.public_id,
      url: data.url,
      secureUrl: data.secure_url,
    });
  } catch (err: any) {
    console.error("Upload API error:", err);
    return NextResponse.json(
      { error: err?.message || "เกิดข้อผิดพลาดในการอัพโหลด" },
      { status: 500 }
    );
  }
}
