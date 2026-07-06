import { getStoreSettings } from "@/app/actions";
import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import SettingsClient from "./settings-client";

export default async function SettingsPage() {
  const session = await requireAuth().catch(() => null);
  if (!session || session.role !== "admin") {
    redirect("/pos");
  }
  const storeSettings = await getStoreSettings();
  return <SettingsClient initialSettings={storeSettings} />;
}
