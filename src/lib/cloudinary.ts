"use client";

export interface CloudinaryUploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export async function uploadToCloudinary(
  file: File,
  onProgressOrFolder?: ((progress: UploadProgress) => void) | string,
  folder?: string
): Promise<CloudinaryUploadResult> {
  // Support both (file, onProgress, folder) and (file, folder) signatures
  let onProgress: ((progress: UploadProgress) => void) | undefined;
  let uploadFolder: string | undefined;
  if (typeof onProgressOrFolder === "string") {
    uploadFolder = onProgressOrFolder;
  } else {
    onProgress = onProgressOrFolder;
    uploadFolder = folder;
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);
    if (uploadFolder) formData.append("folder", uploadFolder);

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress({
          loaded: event.loaded,
          total: event.total,
          percentage: Math.round((event.loaded / event.total) * 100),
        });
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve({
            publicId: response.publicId,
            url: response.url,
            secureUrl: response.secureUrl,
          });
        }
      } else {
        try {
          const errData = JSON.parse(xhr.responseText);
          reject(new Error(errData.error || `อัพโหลดล้มเหลว (${xhr.status})`));
        } catch {
          reject(new Error(`อัพโหลดล้มเหลว: ${xhr.statusText}`));
        }
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ต"));
    });

    xhr.open("POST", "/api/upload");
    xhr.send(formData);
  });
}
