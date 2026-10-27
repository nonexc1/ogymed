import type { Metadata } from "next";
import Link from "next/link";

import { APPOINTMENT_STATUS_LABELS, AppointmentStatus, ORIGIN_LABELS, PageHeader, Panel, Table } from "@/components/admin/ui";
import { buttonVariants } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { APPOINTMENT_SELECT, doctorLabel, limaDayStart, listDoctorsAdmin, type AppointmentRow } from "@/features/admin/data";
import { hasRole, requireStaff } from "@/lib/auth/staff";
import { addDaysToKey, formatDateKey, formatLimaShortDate, formatLimaTime, isDateKey, limaDateKey } from "@/lib/datetime";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Agenda" };

const VIEWS = { dia: "Día", semana: "Semana", mes: "Mes", lista: "Lista" } as const;
type View = keyof typeof VIEWS;

function range(view: View, date: string): [string, string] {
  if (view === "dia") return [date, addDaysToKey(date, 1)];
  if (view === "semana") {
    const dow = new Date(`${date}T12:00:00Z`).getUTCDay() || 7;
    const monday = addDaysToKey(date, 1 - dow);
    return [monday, addDaysToKey(monday, 7)];
  }
  if (view === "mes") {
    const first = `${date.slice(0, 7)}-01`;
    const [y, m] = first.split("-").map(Number);
    const next = m === 12 ? `${y! + 1}-01-01` : `${y}-${String(m! + 1).padStart(2, "0")}-01`;
    return [first, next];
  }
  return [date, addDaysToKey(date, 60)];
}

export default async function AgendaPage({ searchParams }: PageProps<"/admin/agenda">) {
  const { supabase, staff } = await requireStaff(["admin", "reception", "professional"]);
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const view = (one(sp.vista) as View) in VIEWS ? (one(sp.vista) as View) : "semana";
  const date = isDateKey(one(sp.fecha) ?? "") ? one(sp.fecha)! : limaDateKey();
  const doctor = one(sp.profesional) ?? "";
  const status = one(sp.estado) ?? "";
  const [from, to] = range(view, date);

  let query = supabase.from("appointments").select(APPOINTMENT_SELECT).gte("starts_at", limaDayStart(from)).lt("starts_at", limaDayStart(to)).order("starts_at").limit(1000);
  if (doctor) query = query.eq("doctor_id", doctor);
  query = status ? query.eq("status", status) : query.not("status", "in", "(hold,expired)");
  const [{ data, error }, doctors] = await Promise.all([query, listDoctorsAdmin(supabase)]);
  const rows = (data ?? []) as unknown as AppointmentRow[];

  const qs = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ vista: view, fecha: date, ...(doctor ? { profesional: doctor } : {}), ...(status ? { estado: status } : {}), ...patch });
    return `/admin/agenda?${p}`;
  };
  const step = view === "dia" ? 1 : view === "semana" ? 7 : view === "mes" ? 31 : 60;
  const byDay = new Map<string, AppointmentRow[]>();
  for (const r of rows) {
    const k = limaDateKey(r.starts_at);
    byDay.set(k, [...(byDay.get(k) ?? []), r]);
  }

  const list = (items: AppointmentRow[]) => (
    <Table>
      <thead>
        <tr>
          <th scope="col">Fecha y hora</th>
          <th scope="col">Paciente</th>
          <th scope="col">Servicio</th>
          <th scope="col">Profesional</th>
          <th scope="col">Origen</th>
          <th scope="col">Estado</th>
        </tr>
      </thead>
      <tbody>
        {items.map((a) => (
          <tr key={a.id}>
            <td>
              <Link href={`/admin/citas/${a.id}`} className="font-semibold text-plum underline-offset-4 hover:underline">
                {formatLimaShortDate(a.starts_at)} · {formatLimaTime(a.starts_at)}–{formatLimaTime(a.ends_at)}
              </Link>
            </td>
            <td>{a.contact?.full_name ?? "—"}</td>
            <td>{a.service?.name ?? "—"}</td>
            <td>{doctorLabel(a.doctor)}</td>
            <td>{ORIGIN_LABELS[a.origin] ?? a.origin}</td>
            <td><AppointmentStatus status={a.status} /></td>
          </tr>
        ))}
      </tbody>
    </Table>
  );

  return (
    <>
      <PageHeader
        title="Agenda"
        description="Todas las citas (web, teléfono, WhatsApp y presenciales) viven aquí. Horas de Lima."
        actions={
          hasRole(staff, "admin", "reception") ? (
            <Link href="/admin/agenda/nueva" className={buttonVariants({ size: "sm" })}>Nueva cita</Link>
          ) : null
        }
      />
      <form className="mb-6 flex flex-wrap items-end gap-3" method="get">
        <input type="hidden" name="vista" value={view} />
        <label className="text-sm">
          <span className="mb-1 block font-semibold">Fecha</span>
          <input type="date" name="fecha" defaultValue={date} className="min-h-11 rounded-xl border border-line bg-paper px-3" />
        </label>
        {hasRole(staff, "admin", "reception") ? (
          <label className="text-sm">
            <span className="mb-1 block font-semibold">Profesional</span>
            <Select name="profesional" defaultValue={doctor} className="min-h-11 py-2">
              <option value="">Todos</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{doctorLabel(d)}</option>
              ))}
            </Select>
          </label>
        ) : null}
        <label className="text-sm">
          <span className="mb-1 block font-semibold">Estado</span>
          <Select name="estado" defaultValue={status} className="min-h-11 py-2">
            <option value="">Activas y finalizadas</option>
            {Object.entries(APPOINTMENT_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </label>
        <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>Filtrar</button>
      </form>
      <nav aria-label="Vista de agenda" className="mb-4 flex flex-wrap items-center gap-2">
        {(Object.keys(VIEWS) as View[]).map((v) => (
          <Link key={v} href={qs({ vista: v })} aria-current={v === view ? "page" : undefined} className={cn("rounded-full border px-4 py-1.5 text-sm font-semibold", v === view ? "border-plum bg-plum text-ivory" : "border-line bg-paper text-plum")}>
            {VIEWS[v]}
          </Link>
        ))}
        <span className="mx-2 h-6 w-px bg-line" aria-hidden="true" />
        <Link href={qs({ fecha: addDaysToKey(date, -step) })} className="rounded-full px-3 py-1.5 text-sm font-semibold text-plum hover:bg-plum-soft">← Anterior</Link>
        <Link href={qs({ fecha: limaDateKey() })} className="rounded-full px-3 py-1.5 text-sm font-semibold text-plum hover:bg-plum-soft">Hoy</Link>
        <Link href={qs({ fecha: addDaysToKey(date, step) })} className="rounded-full px-3 py-1.5 text-sm font-semibold text-plum hover:bg-plum-soft">Siguiente →</Link>
        <span className="text-sm text-muted">
          {formatDateKey(from, { day: "numeric", month: "short", year: "numeric" })} – {formatDateKey(addDaysToKey(to, -1), { day: "numeric", month: "short", year: "numeric" })}
        </span>
      </nav>
      {error ? <p role="alert" className="text-danger">No se pudo cargar la agenda.</p> : null}

      {view === "mes" ? (
        <Panel>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {Array.from({ length: Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) }, (_, i) => addDaysToKey(from, i)).map((d) => {
              const items = byDay.get(d) ?? [];
              return (
                <li key={d}>
                  <Link href={qs({ vista: "dia", fecha: d })} className="block min-h-20 rounded-xl border border-line p-2 hover:border-plum">
                    <span className="block text-sm font-semibold capitalize">{formatDateKey(d, { weekday: "short", day: "numeric" })}</span>
                    <span className="text-sm text-muted">{items.length ? `${items.length} cita${items.length > 1 ? "s" : ""}` : "—"}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Panel>
      ) : view === "semana" ? (
        <div className="space-y-6">
          {Array.from({ length: 7 }, (_, i) => addDaysToKey(from, i)).map((d) => (
            <Panel key={d} title={formatDateKey(d, { weekday: "long", day: "numeric", month: "long" })}>
              {byDay.get(d)?.length ? list(byDay.get(d)!) : <p className="text-muted">Sin citas.</p>}
            </Panel>
          ))}
        </div>
      ) : (
        <Panel>{rows.length ? list(rows) : <p className="text-muted">No hay citas con estos filtros.</p>}</Panel>
      )}
    </>
  );
}
