import type { NextRequest } from "next/server";

import { getStaffSession } from "@/lib/auth/staff";
import { isDateKey } from "@/lib/datetime";

/** Exportación minimizada (sin contactos) y auditada. Sólo administración con MFA. */
export async function GET(request: NextRequest) {
  const { supabase, claims, staff } = await getStaffSession();
  if (!claims || claims.aal !== "aal2" || !staff?.active || !staff.roles.includes("admin")) {
    return new Response("No autorizado", { status: 403 });
  }
  const from = request.nextUrl.searchParams.get("desde") ?? "";
  const to = request.nextUrl.searchParams.get("hasta") ?? "";
  if (!isDateKey(from) || !isDateKey(to)) return new Response("Rango inválido", { status: 400 });
  const { data, error } = await supabase.rpc("report_export_appointments", { p_from: from, p_to: to });
  if (error) return new Response("No se pudo exportar", { status: 400 });
  const [{ data: doctors }, { data: services }] = await Promise.all([
    supabase.from("doctors").select("id, full_name"),
    supabase.from("services").select("id, name"),
  ]);
  const name = (list: { id: string }[] | null, id: string, key: string) => (list?.find((x) => x.id === id) as Record<string, string> | undefined)?.[key] ?? "";
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [
    ["inicio_utc", "profesional", "servicio", "estado", "origen"].join(","),
    ...((data ?? []) as { starts_at: string; doctor_id: string; service_id: string; status: string; origin: string }[]).map((r) =>
      [r.starts_at, name(doctors, r.doctor_id, "full_name"), name(services, r.service_id, "name"), r.status, r.origin].map((v) => esc(String(v))).join(","),
    ),
  ];
  return new Response(`﻿${lines.join("\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="citas-${from}-${to}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
