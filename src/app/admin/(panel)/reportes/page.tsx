import type { Metadata } from "next";

import { APPOINTMENT_STATUS_LABELS, ORIGIN_LABELS, PageHeader, Panel, Table } from "@/components/admin/ui";
import { buttonVariants } from "@/components/ui/button";
import { hasRole, requireStaff } from "@/lib/auth/staff";
import { addDaysToKey, isDateKey, limaDateKey } from "@/lib/datetime";

export const metadata: Metadata = { title: "Reportes" };

type Row = { month: string; status: string; origin: string; service_id: string; doctor_id: string; total: number };

export default async function ReportsPage({ searchParams }: PageProps<"/admin/reportes">) {
  const { supabase, staff } = await requireStaff(["admin", "reception"]);
  const sp = await searchParams;
  const today = limaDateKey();
  const from = typeof sp.desde === "string" && isDateKey(sp.desde) ? sp.desde : addDaysToKey(today, -90);
  const to = typeof sp.hasta === "string" && isDateKey(sp.hasta) ? sp.hasta : today;
  const { data } = await supabase.rpc("report_appointments_summary", { p_from: from, p_to: to });
  const rows = (data ?? []) as Row[];
  const sum = (key: "status" | "origin") => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r[key], (m.get(r[key]) ?? 0) + Number(r.total));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const months = [...new Set(rows.map((r) => r.month))].sort();
  return (
    <>
      <PageHeader title="Reportes" description="Datos propios agregados (no se envían a Google Analytics). Sin datos de contacto." />
      <form method="get" className="mb-6 flex flex-wrap items-end gap-3">
        <label className="text-sm"><span className="mb-1 block font-semibold">Desde</span><input type="date" name="desde" defaultValue={from} className="min-h-11 rounded-xl border border-line bg-paper px-3" /></label>
        <label className="text-sm"><span className="mb-1 block font-semibold">Hasta</span><input type="date" name="hasta" defaultValue={to} className="min-h-11 rounded-xl border border-line bg-paper px-3" /></label>
        <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>Ver</button>
        {hasRole(staff, "admin") ? (
          <a href={`/admin/reportes/exportar?desde=${from}&hasta=${to}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>Exportar CSV (auditado)</a>
        ) : null}
      </form>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Por estado">
          <Table><tbody>{sum("status").map(([k, v]) => <tr key={k}><td>{APPOINTMENT_STATUS_LABELS[k] ?? k}</td><td className="text-right font-semibold">{v}</td></tr>)}</tbody></Table>
        </Panel>
        <Panel title="Por origen">
          <Table><tbody>{sum("origin").map(([k, v]) => <tr key={k}><td>{ORIGIN_LABELS[k] ?? k}</td><td className="text-right font-semibold">{v}</td></tr>)}</tbody></Table>
        </Panel>
        <Panel title="Por mes" className="lg:col-span-2">
          <Table>
            <thead><tr><th scope="col">Mes</th><th scope="col">Total</th><th scope="col">Confirmadas/atendidas</th><th scope="col">Canceladas</th><th scope="col">No asistió</th></tr></thead>
            <tbody>
              {months.map((m) => {
                const of = (s: string[]) => rows.filter((r) => r.month === m && s.includes(r.status)).reduce((a, r) => a + Number(r.total), 0);
                return (
                  <tr key={m}>
                    <td>{m.slice(0, 7)}</td>
                    <td>{rows.filter((r) => r.month === m).reduce((a, r) => a + Number(r.total), 0)}</td>
                    <td>{of(["confirmed", "completed"])}</td>
                    <td>{of(["cancelled"])}</td>
                    <td>{of(["no_show"])}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Panel>
      </div>
    </>
  );
}
