import type { Metadata } from "next";
import { Sarabun } from "next/font/google";
import "./globals.css";

const sarabun = Sarabun({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  display: "swap",
  variable: "--font-sarabun",
});

export const metadata: Metadata = {
  title: "ระบบ POS ร้านแบตเตอรี่",
  description: "ระบบบริหารงานขายร้านแบตเตอรี่รถยนต์",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ARINYADA POS",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${sarabun.variable}`}>
      <head>
        <meta name="theme-color" content="#2563eb" />
        <meta httpEquiv="Cache-Control" content="no-store, no-cache, must-revalidate, max-age=0" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        <link rel="apple-touch-icon" href="/api/pwa-icon?size=180&v=3" />
      </head>
      <body className="min-h-screen bg-background antialiased font-sans flex flex-col">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  // ลบ Service Worker ทั้งหมดและล้าง cache
  if('serviceWorker' in navigator){
    navigator.serviceWorker.getRegistrations().then(function(regs){
      regs.forEach(function(r){r.unregister()});
    });
  }
  if('caches' in window){
    caches.keys().then(function(keys){
      keys.forEach(function(k){caches.delete(k)});
    });
  }
})();
`,
          }}
        />
      </body>
    </html>
  );
}
