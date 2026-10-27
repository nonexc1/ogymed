import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { createSessionClient } from "@/lib/supabase/server";

export type StaffRole = "admin" | "reception" | "professional" | "editor";
export type Staff = {
  user_id: string;
  display_name: string;
  active: boolean;
  doctor_id: string | null;
  can_review_medical: boolean;
  roles: StaffRole[];
  aal: string | null;
};

/** Sesión del personal verificada (firma del JWT validada por getClaims), memoizada por petición. */
export const getStaffSession = cache(async () => {
  const supabase = await createSessionClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) return { supabase, claims: null, staff: null };
  const { data } = await supabase.rpc("staff_whoami");
  return { supabase, claims, staff: (data as Staff | null) ?? null };
});

/**
 * Autoriza una página o acción del panel: sesión válida, MFA (aal2), perfil activo y rol.
 * El rol se lee de la base (staff_roles), nunca de metadatos editables por el usuario.
 * Las funciones SQL y RLS vuelven a comprobarlo: esto es la primera barrera, no la única.
 */
export async function requireStaff(roles?: StaffRole[]) {
  const { supabase, claims, staff } = await getStaffSession();
  if (!claims) redirect("/admin/login");
  if (claims.aal !== "aal2") redirect("/admin/mfa");
  if (!staff || !staff.active) redirect("/admin/sin-acceso");
  if (roles && !staff.roles.some((r) => roles.includes(r))) redirect("/admin/sin-acceso");
  return { supabase, staff, userId: claims.sub as string };
}

export const hasRole = (staff: Staff, ...roles: StaffRole[]) => staff.roles.some((r) => roles.includes(r));

export const ROLE_LABELS: Record<StaffRole, string> = {
  admin: "Administración",
  reception: "Recepción",
  professional: "Profesional",
  editor: "Editorial",
};
