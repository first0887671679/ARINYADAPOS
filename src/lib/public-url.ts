/**
 * Get the public base URL for generating shareable links.
 * Priority order:
 * 1. SITE_URL env (explicit production URL)
 * 2. NEXT_PUBLIC_APP_URL env (client-side accessible)
 * 3. VERCEL_URL env (only if it's the production deployment, not preview)
 * 4. Hardcoded production fallback: https://videcodebattery.vercel.app
 *
 * NEVER returns preview deployment URLs or request-based origins
 * that might require Vercel login.
 */
export function getPublicBaseUrl(requestOrigin?: string): string {
  // 1) Explicit production URL (best)
  if (process.env.SITE_URL) {
    return process.env.SITE_URL.replace(/\/+$/, "");
  }

  // 2) Client-side accessible URL
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  }

  // 3) VERCEL_URL — only use if it matches the known production domain
  //    Vercel sets this to preview URLs like "xxx-project.vercel.app" during preview deploys
  //    We only trust it if it's the actual production domain
  if (process.env.VERCEL_URL) {
    const vercelUrl = `https://${process.env.VERCEL_URL}`;
    // Only trust if it's the production domain (no random prefix)
    if (vercelUrl.includes("videcodebattery.vercel.app")) {
      return vercelUrl.replace(/\/+$/, "");
    }
  }

  // 4) Hardcoded production fallback — known working domain
  return "https://videcodebattery.vercel.app";
}
