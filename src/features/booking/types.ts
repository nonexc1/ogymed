export type Slot = { doctor_id: string; starts_at: string; ends_at: string };
export type Hold = {
  appointment_id: string;
  status: string;
  starts_at: string;
  ends_at: string;
  doctor_id: string;
  service_id: string;
  hold_expires_at: string | null;
  pending_expires_at?: string | null;
};
export type BookingService = { id: string; slug: string; name: string; summary: string };
export type BookingDoctor = { id: string; slug: string; name: string; specialty: string | null };
export type Offering = { doctor_id: string; service_id: string };

export type ApiResult<T = Record<string, unknown>> = ({ ok: true } & T) | { ok: false; code?: string };

export async function api<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<ApiResult<T> & { status: number }> {
  const res = await fetch(url, {
    ...init,
    method: init?.method ?? (init?.json !== undefined ? "POST" : "GET"),
    headers: init?.json !== undefined ? { "content-type": "application/json" } : undefined,
    body: init?.json !== undefined ? JSON.stringify(init.json) : undefined,
    cache: "no-store",
    credentials: "same-origin",
  });
  const body = (await res.json().catch(() => ({ ok: false, code: "unavailable" }))) as ApiResult<T>;
  return { ...body, status: res.status };
}
