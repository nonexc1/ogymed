import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let redirectCache: { at: number; map: Map<string, string> } | null = null;
const REDIRECT_TTL_MS = 60_000;

/** Redirecciones del CMS (lectura pública), cacheadas por instancia durante 60 s. */
async function loadRedirects(): Promise<Map<string, string>> {
  if (redirectCache && Date.now() - redirectCache.at < REDIRECT_TTL_MS) return redirectCache.map;
  if (!SUPABASE_URL || !SUPABASE_KEY) return new Map();
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/redirects?select=from_path,to_path`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      cache: "no-store",
    });
    if (!res.ok) return redirectCache?.map ?? new Map();
    const rows = (await res.json()) as { from_path: string; to_path: string }[];
    redirectCache = { at: Date.now(), map: new Map(rows.map((r) => [r.from_path, r.to_path])) };
    return redirectCache.map;
  } catch {
    return redirectCache?.map ?? new Map();
  }
}

/** Refresca la sesión de Supabase del personal (cookies) en rutas del panel. */
async function refreshStaffSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!SUPABASE_URL || !SUPABASE_KEY) return response;
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });
  // Valida el JWT (firma) y refresca tokens si corresponde.
  await supabase.auth.getClaims();
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    return refreshStaffSession(request);
  }

  // 301 automáticas por cambio de slug publicado (servicios, equipo, blog).
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const target = (await loadRedirects()).get(path);
  if (target) {
    const url = request.nextUrl.clone();
    url.pathname = target;
    return NextResponse.redirect(url, 301);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/servicios/:slug", "/equipo/:slug", "/blog/:slug", "/admin/:path*", "/admin"],
};
