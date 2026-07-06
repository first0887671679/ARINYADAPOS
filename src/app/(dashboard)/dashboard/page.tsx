import { getDashboardStats, getStoreSettings } from "@/app/actions";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
  const stats = await getDashboardStats();
  const storeSettings = await getStoreSettings();

  return <DashboardClient initialStats={stats} initialSettings={storeSettings} />;
}
