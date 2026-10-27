import type { Metadata } from "next";

import { ActionForm } from "@/components/admin/action-form";
import { PageHeader, Panel } from "@/components/admin/ui";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/surface";
import { requireStaff } from "@/lib/auth/staff";

import { savePrivateSettings, savePublicSettings } from "./actions";

export const metadata: Metadata = { title: "Configuración" };

type Hours = { days: number[]; opens: string; closes: string }[];
const hoursText = (h: Hours) =>
  h.map((r) => `${r.days.length > 1 && r.days.at(-1)! - r.days[0]! === r.days.length - 1 ? `${r.days[0]}-${r.days.at(-1)}` : r.days.join(",")} ${r.opens}-${r.closes}`).join("\n");

export default async function SettingsPage() {
  const { supabase } = await requireStaff(["admin"]);
  const [{ data: pub }, { data: priv }] = await Promise.all([
    supabase.from("clinic_settings_public").select("*").single(),
    supabase.from("clinic_settings_private").select("*").single(),
  ]);
  const s = pub ?? {};
  const social = (s.social_links ?? {}) as Record<string, string>;
  const text = (name: string, label: string, opts: { description?: string; type?: string; placeholder?: string } = {}) => (
    <Field id={name} label={label} description={opts.description}>
      {(a) => <Input {...a} name={name} type={opts.type ?? "text"} placeholder={opts.placeholder} defaultValue={s[name] ?? ""} />}
    </Field>
  );
  return (
    <>
      <PageHeader title="Configuración" description="Datos públicos validados e identificadores de integraciones. Los secretos (claves de API) nunca se guardan aquí: van en variables de entorno." />
      <div className="space-y-6">
        <Panel title="Datos públicos (NAP, horarios, redes)">
          <Alert tone="info" className="mb-4">Nombre, dirección y teléfono deben coincidir exactamente con Google Business Profile y directorios.</Alert>
          <ActionForm action={savePublicSettings} submitLabel="Guardar datos públicos">
            <div className="grid gap-4 sm:grid-cols-2">
              {text("clinic_name", "Nombre comercial")}
              {text("legal_name", "Razón social")}
              {text("ruc", "RUC")}
              {text("address_line", "Dirección (calle y número)")}
              {text("address_reference", "Referencia")}
              {text("district", "Distrito")}
              {text("city", "Ciudad")}
              {text("region", "Región")}
              {text("postal_code", "Código postal")}
              {text("latitude", "Latitud", { description: "Verificada en el mapa (ej. -12.1)" })}
              {text("longitude", "Longitud")}
              {text("phone_e164", "Teléfono", { placeholder: "+51 …" })}
              {text("whatsapp_e164", "WhatsApp oficial", { placeholder: "+51 9…" })}
              {text("public_email", "Correo público", { type: "email" })}
              {text("google_maps_url", "Enlace de Google Maps", { type: "url" })}
            </div>
            <Field id="opening_hours" label="Horario de atención" description="Una línea por bloque: días (1=lunes … 7=domingo) y horas. Ej.: 1-5 09:00-19:00 · 6 09:00-13:00">
              {(a) => <Textarea {...a} name="opening_hours" rows={3} defaultValue={hoursText((s.opening_hours ?? []) as Hours)} />}
            </Field>
            <Field id="opening_hours_note" label="Nota de horario (feriados, horarios especiales)">{(a) => <Input {...a} name="opening_hours_note" defaultValue={s.opening_hours_note ?? ""} />}</Field>
            <fieldset className="grid gap-4 rounded-2xl border border-line p-4 sm:grid-cols-2">
              <legend className="px-1 font-semibold">Redes verificadas</legend>
              {["instagram", "facebook", "tiktok", "youtube", "linkedin"].map((k) => (
                <Field key={k} id={k} label={k[0]!.toUpperCase() + k.slice(1)}>{(a) => <Input {...a} name={k} type="url" defaultValue={social[k] ?? ""} />}</Field>
              ))}
            </fieldset>
            <fieldset className="grid gap-4 rounded-2xl border border-line p-4 sm:grid-cols-2">
              <legend className="px-1 font-semibold">Integraciones (identificadores públicos, no secretos)</legend>
              {text("ga4_measurement_id", "GA4 · ID de medición", { description: "Sólo se carga con consentimiento y en rutas permitidas." })}
              {text("gsc_verification_token", "Search Console · token de etiqueta HTML (opcional)", { description: "Sólo para propiedad de prefijo. La propiedad de dominio usa TXT en DNS." })}
            </fieldset>
            <fieldset className="space-y-4 rounded-2xl border border-line p-4">
              <legend className="px-1 font-semibold">Reservas y formularios</legend>
              <Field id="booking_mode" label="Modo de reserva web" description="«Automático» confirma al instante; «Recepción» deja la cita pendiente; «Desactivado» muestra «Solicitar cita».">
                {(a) => (
                  <Select {...a} name="booking_mode" defaultValue={s.booking_mode}>
                    <option value="off">Desactivado: «Solicitar cita»</option>
                    <option value="reception">Con confirmación de recepción</option>
                    <option value="automatic">Automático</option>
                  </Select>
                )}
              </Field>
              <Checkbox
                id="complaints_book_enabled"
                name="complaints_book_enabled"
                label="Habilitar el libro de reclamaciones virtual"
                description="Sólo con texto y campos validados legalmente, razón social/RUC cargados y un responsable de atención."
                defaultChecked={s.complaints_book_enabled}
              />
            </fieldset>
          </ActionForm>
        </Panel>
        <Panel title="Parámetros de agenda">
          <ActionForm action={savePrivateSettings} submitLabel="Guardar parámetros">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {(
                [
                  ["hold_minutes", "Retención de horario (min)"],
                  ["min_notice_minutes", "Antelación mínima (min)"],
                  ["max_horizon_days", "Horizonte máximo (días)"],
                  ["pending_expiry_hours", "Vencimiento de solicitudes (h)"],
                  ["cancellation_window_hours", "Plazo de cambios en línea (h)"],
                  ["reminder_hours_before", "Recordatorio antes de la cita (h)"],
                  ["access_link_ttl_hours", "Vigencia del enlace de gestión (h)"],
                ] as const
              ).map(([name, label]) => (
                <Field key={name} id={name} label={label}>{(a) => <Input {...a} name={name} type="number" defaultValue={priv?.[name]} />}</Field>
              ))}
            </div>
            <Field id="reception_notification_email" label="Correo de recepción para avisos internos">
              {(a) => <Input {...a} name="reception_notification_email" type="email" defaultValue={priv?.reception_notification_email ?? ""} />}
            </Field>
          </ActionForm>
        </Panel>
      </div>
    </>
  );
}
