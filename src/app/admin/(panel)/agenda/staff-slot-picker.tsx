"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { formatLimaTime, limaDateKey } from "@/lib/datetime";
import { cn } from "@/lib/utils";

import { fetchStaffSlots } from "./actions";

type Option = { id: string; label: string };

/**
 * Elección de horario para recepción: consulta la misma disponibilidad que la web (servidor) y
 * guarda profesional e inicio en campos ocultos del formulario. La validación final es transaccional.
 */
export function StaffSlotPicker({
  services,
  doctors,
  fixedServiceId,
  defaultDoctorId,
}: {
  services?: Option[];
  doctors: Option[];
  fixedServiceId?: string;
  defaultDoctorId?: string;
}) {
  const [serviceId, setServiceId] = useState(fixedServiceId ?? "");
  const [doctorId, setDoctorId] = useState(defaultDoctorId ?? "");
  const [date, setDate] = useState(limaDateKey());
  const [slots, setSlots] = useState<{ doctor_id: string; starts_at: string }[] | null>(null);
  const [picked, setPicked] = useState<{ doctor_id: string; starts_at: string } | null>(null);
  const [pending, start] = useTransition();
  const name = (id: string) => doctors.find((d) => d.id === id)?.label ?? "";

  const search = () =>
    start(async () => {
      setPicked(null);
      const res = await fetchStaffSlots(serviceId, doctorId || null, date);
      setSlots(res.ok ? res.slots : []);
    });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {services ? (
          <Field id="sp-service" label="Servicio" required>
            {(a) => (
              <Select {...a} name="service_id" value={serviceId} onChange={(e) => { setServiceId(e.target.value); setSlots(null); }}>
                <option value="">Elegir…</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </Select>
            )}
          </Field>
        ) : (
          <input type="hidden" name="service_id" value={serviceId} />
        )}
        <Field id="sp-doctor" label="Profesional">
          {(a) => (
            <Select {...a} value={doctorId} onChange={(e) => { setDoctorId(e.target.value); setSlots(null); }}>
              <option value="">Cualquiera</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field id="sp-date" label="Fecha">
          {(a) => <Input {...a} type="date" value={date} onChange={(e) => { setDate(e.target.value); setSlots(null); }} />}
        </Field>
      </div>
      <Button type="button" variant="secondary" onClick={search} disabled={!serviceId || pending}>
        {pending ? "Buscando…" : "Ver horarios disponibles"}
      </Button>
      {slots ? (
        slots.length ? (
          <fieldset>
            <legend className="mb-2 font-semibold">Horarios (hora de Lima)</legend>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {slots.map((s) => {
                const on = picked?.starts_at === s.starts_at && picked.doctor_id === s.doctor_id;
                return (
                  <li key={`${s.doctor_id}-${s.starts_at}`}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => setPicked(s)}
                      className={cn("w-full rounded-xl border px-2 py-2 text-sm", on ? "border-plum bg-plum text-ivory" : "border-line bg-paper text-plum hover:border-plum")}
                    >
                      <span className="block font-semibold tabular-nums">{formatLimaTime(s.starts_at)}</span>
                      {!doctorId ? <span className="block truncate text-xs">{name(s.doctor_id)}</span> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        ) : (
          <p className="text-muted">No hay horarios disponibles ese día con los filtros elegidos.</p>
        )
      ) : null}
      <input type="hidden" name="doctor_id" value={picked?.doctor_id ?? ""} />
      <input type="hidden" name="starts_at" value={picked?.starts_at ?? ""} />
      {picked ? (
        <p role="status" className="font-semibold text-plum">
          Elegido: {formatLimaTime(picked.starts_at)} · {name(picked.doctor_id)} ({limaDateKey(picked.starts_at)})
        </p>
      ) : null}
    </div>
  );
}
