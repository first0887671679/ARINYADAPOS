import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";
import { CronScheduler } from "@/components/cron-scheduler";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen relative overflow-hidden">
      <CronScheduler />
      
      {/* Premium Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/40 via-white to-amber-50/30 pointer-events-none" />
      <div className="absolute inset-0 gradient-blue-mesh opacity-30 pointer-events-none" />
      
      {/* Floating Decorative Elements - hidden on mobile for performance */}
      <div className="hidden lg:block absolute top-20 right-40 w-96 h-96 bg-blue-200/10 rounded-full blur-3xl animate-pulse-slow" />
      <div className="hidden lg:block absolute bottom-40 left-60 w-80 h-80 bg-amber-200/15 rounded-full blur-3xl animate-float" />
      <div className="hidden lg:block absolute top-1/2 right-20 w-64 h-64 bg-blue-300/10 rounded-full blur-2xl" style={{ animationDelay: "1s" }} />
      
      <Sidebar user={session} />
      <main className="flex-1 overflow-y-auto relative z-10 w-full min-w-full lg:w-0 lg:min-w-0 p-3 pt-16 lg:p-6 lg:pt-6">
        {children}
      </main>
    </div>
  );
}
