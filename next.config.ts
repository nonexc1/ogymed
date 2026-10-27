import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseOrigin = supabaseUrl ? new URL(supabaseUrl).origin : "";
const isProductionDeploy = process.env.VERCEL_ENV === "production" || process.env.APP_ENV === "production";
const indexable = isProductionDeploy && process.env.SITE_INDEXING === "on";
// HSTS y upgrade-insecure-requests sólo cuando el sitio se sirve por HTTPS (no en pruebas locales).
const httpsSite = (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://");

/**
 * CSP sin nonces (las páginas públicas son estáticas/ISR). 'unsafe-inline' en scripts es necesario
 * para los scripts de hidratación de Next; se compensa con fuentes restringidas y sin terceros salvo
 * GA4 (sólo cargado tras consentimiento) y el mapa bajo demanda. Ver docs/ARCHITECTURE.md §11.
 */
function csp(withAnalytics: boolean) {
  const ga = withAnalytics ? " https://www.googletagmanager.com" : "";
  const gaConnect = withAnalytics ? " https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com" : "";
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}${ga}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${supabaseOrigin}${withAnalytics ? " https://*.google-analytics.com https://www.googletagmanager.com" : ""}`.trim(),
    "font-src 'self'",
    `connect-src 'self' ${supabaseOrigin}${gaConnect}`.trim(),
    withAnalytics ? "frame-src https://www.google.com" : "frame-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    ...(httpsSite ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

const baseHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(httpsSite ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }] : []),
];

const privateHeaders = [
  { key: "Cache-Control", value: "no-store, max-age=0" },
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Content-Security-Policy", value: csp(false) },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  typedRoutes: false,
  experimental: {
    globalNotFound: true,
    // Subida de imágenes por acción del servidor. Vercel limita el cuerpo a 4,5 MB.
    serverActions: { bodySizeLimit: "4.5mb" },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [75],
    remotePatterns: supabaseUrl
      ? [{ protocol: new URL(supabaseUrl).protocol.replace(":", "") as "http" | "https", hostname: new URL(supabaseUrl).hostname, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
  async headers() {
    return [
      { source: "/:path*", headers: [...baseHeaders, { key: "Content-Security-Policy", value: csp(true) }] },
      ...(indexable ? [] : [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }]),
      { source: "/reservar", headers: privateHeaders },
      { source: "/reservar/:path*", headers: privateHeaders },
      { source: "/cita/:path*", headers: privateHeaders },
      { source: "/libro-de-reclamaciones", headers: privateHeaders },
      { source: "/admin", headers: privateHeaders },
      { source: "/admin/:path*", headers: privateHeaders },
      { source: "/api/:path*", headers: privateHeaders },
    ];
  },
};

export default nextConfig;
