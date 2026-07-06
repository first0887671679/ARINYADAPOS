"use server";

import { login, logout } from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!username || !password) {
    return { success: false, error: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" };
  }

  return login(username, password);
}

export async function logoutAction() {
  await logout();
}
