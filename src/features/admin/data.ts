import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type DoctorRow = { id: string; full_name: string; honorific: string | null; active: boolean; slug: string };
export type ServiceRow = { id: string; name: string; active: boolean; slug: string };

export const doctorLabel = (d: Pick<DoctorRow, "full_name" | "honorific"> | null | undefined) =>
  d ? `${d.honorific ? `${d.honorific} ` : ""}${d.full_name}` : "—";

export async function listDoctorsAdmin(db: SupabaseClient): Promise<DoctorRow[]> {
  const { data } = await db.from("doctors").select("id, full_name, honorific, active, slug").order("sort_order").order("full_name");
  return (data ?? []) as DoctorRow[];
}

export async function listServicesAdmin(db: SupabaseClient): Promise<ServiceRow[]> {
  const { data } = await db.from("services").select("id, name, active, slug").order("sort_order").order("name");
  return (data ?? []) as ServiceRow[];
}

export type AppointmentRow = {
  id: string;
  status: string;
  origin: string;
  starts_at: string;
  ends_at: string;
  doctor_id: string;
  service_id: string;
  contact_id: string | null;
  admin_note: string | null;
  version: number;
  doctor: { full_name: string; honorific: string | null } | null;
  service: { name: string } | null;
  contact: { full_name: string; phone_e164: string | null } | null;
};

export const APPOINTMENT_SELECT =
  "id, status, origin, starts_at, ends_at, doctor_id, service_id, contact_id, admin_note, version, doctor:doctors(full_name, honorific), service:services(name), contact:contacts(full_name, phone_e164)";

/** Instante UTC del inicio de un día de Lima (UTC−05, sin horario de verano). */
export const limaDayStart = (key: string) => new Date(`${key}T00:00:00-05:00`).toISOString();
