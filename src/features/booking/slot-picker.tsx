"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/surface";
import { addDaysToKey, formatDateKey, formatLimaTime, limaDateKey } from "@/lib/datetime";
import { cn } from "@/lib/utils";

import { bookingMessage } from "./messages";
import { api, type BookingDoctor, type Slot } from "./types";

const WINDOW_DAYS = 7;
const MAX_WEEKS_AHEAD = 9;

/**
 * Selector de fecha y hora: días con disponibilidad y lista de horas por día (lista de botones,
 * operable con teclado y lector de pantalla; no depende de un calendario gráfico).
 * La disponibilidad llega del servidor; para «primera disponibilidad» se asigna el primer profesional libre.
 */
export function SlotPicker({
  serviceId,
  doctorId,
  doctors,
  selected,
  busy,
  refreshKey,
  onSelect,
}: {
  serviceId: string;
  doctorId: string | null;
  doctors: BookingDoctor[];
  selected?: { starts_at: string; doctor_id: string } | null;
  busy?: boolean;
  refreshKey?: number;
  onSelect: (slot: Slot) => void;
}) {
  const today = limaDateKey();
  const [weekOffset, setWeekOffset] = useState(0);
  const [day, setDay] = useState<string | null>(null);
  const from = addDaysToKey(today, weekOffset * WINDOW_DAYS);
  const to = addDaysToKey(from, WINDOW_DAYS - 1);
  const requestKey = `${serviceId}|${doctorId ?? "any"}|${from}|${to}|${refreshKey ?? 0}`;
  // Resultado asociado a la petición que lo produjo: si la clave cambió, se está cargando.
  const [loaded, setLoaded] = useState<{ key: string; slots: Slot[]; error: string | null } | null>(null);
  const current = loaded?.key === requestKey ? loaded : null;
  const slots = current?.slots ?? null;
  const error = current?.error ?? null;

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ service: serviceId, from, to });
    if (doctorId) params.set("doctor", doctorId);
    api<{ slots: Slot[] }>(`/api/booking/slots?${params}`)
      .catch(() => null)
      .then((res) => {
        if (!active) return;
        if (!res || !res.ok) setLoaded({ key: requestKey, slots: [], error: bookingMessage(res && !res.ok ? res.code : "unavailable") });
        else setLoaded({ key: requestKey, slots: res.slots, error: null });
      });
    return () => {
      active = false;
    };
  }, [requestKey, serviceId, doctorId, from, to]);

  const order = useMemo(() => new Map(doctors.map((d, i) => [d.id, i])), [doctors]);
  const byDay = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots ?? []) {
      const key = limaDateKey(s.starts_at);
      const list = map.get(key) ?? [];
      // «Primera disponibilidad»: una entrada por hora con el primer profesional libre.
      const existing = list.find((x) => x.starts_at === s.starts_at);
      if (!existing) list.push(s);
      else if ((order.get(s.doctor_id) ?? 99) < (order.get(existing.doctor_id) ?? 99)) list.splice(list.indexOf(existing), 1, s);
      map.set(key, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    return map;
  }, [slots, order]);

  const days = Array.from({ length: WINDOW_DAYS }, (_, i) => addDaysToKey(from, i));
  const firstAvailable = days.find((d) => byDay.has(d)) ?? null;
  const activeDay = day && byDay.has(day) ? day : firstAvailable;
  const daySlots = activeDay ? (byDay.get(activeDay) ?? []) : [];
  const morning = daySlots.filter((s) => Number(formatLimaTime(s.starts_at).slice(0, 2)) < 13);
  const afternoon = daySlots.filter((s) => Number(formatLimaTime(s.starts_at).slice(0, 2)) >= 13);
  const doctorName = (id: string) => doctors.find((d) => d.id === id)?.name ?? "Profesional";

  const renderTimes = (list: Slot[], label: string) =>
    list.length ? (
      <fieldset className="mt-4">
        <legend className="mb-2 font-semibold text-ink">{label}</legend>
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {list.map((s) => {
            const isSelected = selected?.starts_at === s.starts_at && selected.doctor_id === s.doctor_id;
            return (
              <li key={`${s.doctor_id}-${s.starts_at}`}>
                <button
                  type="button"
                  disabled={busy}
                  aria-pressed={isSelected}
                  onClick={() => onSelect(s)}
                  className={cn(
                    "min-h-12 w-full rounded-xl border px-2 py-2 text-base font-semibold tabular-nums transition-colors disabled:opacity-60",
                    isSelected ? "border-plum bg-plum text-ivory" : "border-line bg-paper text-plum hover:border-plum",
                  )}
                >
                  {formatLimaTime(s.starts_at)}
                  {!doctorId ? <span className="sr-only">, con {doctorName(s.doctor_id)}</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </fieldset>
    ) : null;

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" disabled={weekOffset === 0} onClick={() => { setWeekOffset((w) => w - 1); setDay(null); }}>
          <ChevronLeft aria-hidden="true" /> Anterior
        </Button>
        <p className="text-center font-semibold" aria-live="polite">
          {formatDateKey(from, { day: "numeric", month: "short" })} – {formatDateKey(to, { day: "numeric", month: "short" })}
        </p>
        <Button variant="ghost" size="sm" disabled={weekOffset >= MAX_WEEKS_AHEAD} onClick={() => { setWeekOffset((w) => w + 1); setDay(null); }}>
          Siguiente <ChevronRight aria-hidden="true" />
        </Button>
      </div>

      {error ? (
        <Alert tone="danger" role="alert" className="mt-4">
          {error}
        </Alert>
      ) : null}

      {slots === null ? (
        <p role="status" className="mt-6 text-muted">
          Buscando horarios disponibles…
        </p>
      ) : (
        <>
          <fieldset className="mt-4">
            <legend className="sr-only">Día</legend>
            <ul className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {days.map((d) => {
                const count = byDay.get(d)?.length ?? 0;
                const active = d === activeDay;
                return (
                  <li key={d}>
                    <button
                      type="button"
                      disabled={count === 0}
                      aria-pressed={active}
                      onClick={() => setDay(d)}
                      className={cn(
                        "flex min-h-16 w-full flex-col items-center justify-center rounded-xl border px-1 py-2 text-sm disabled:cursor-not-allowed disabled:border-transparent disabled:bg-transparent disabled:text-muted/70",
                        active ? "border-plum bg-plum-soft text-plum-strong" : "border-line bg-paper text-ink hover:border-plum",
                      )}
                    >
                      <span className="font-semibold capitalize">{formatDateKey(d, { weekday: "short" })}</span>
                      <span>{formatDateKey(d, { day: "numeric", month: "short" })}</span>
                      <span className="sr-only">{count ? `, ${count} horarios` : ", sin horarios"}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </fieldset>
          {activeDay ? (
            <div className="mt-6">
              <h3 className="font-sans text-lg font-semibold capitalize text-ink">{formatDateKey(activeDay)}</h3>
              {renderTimes(morning, "Mañana")}
              {renderTimes(afternoon, "Tarde")}
            </div>
          ) : (
            <p className="mt-6 text-muted">No hay horarios disponibles en estas fechas. Prueba con la semana siguiente.</p>
          )}
        </>
      )}
    </div>
  );
}
