"use client";

import { CalendarClock, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Input } from "@/components/ui/field";
import { Alert, Badge, Card } from "@/components/ui/surface";
import { formatLimaDate, formatLimaTime } from "@/lib/datetime";

import { bookingMessage } from "./messages";
import { SlotPicker } from "./slot-picker";
import { api, type BookingDoctor, type Slot } from "./types";

export type ManagedAppointment = {
  appointment_id: string;
  status: "pending_confirmation" | "confirmed";
  starts_at: string;
  ends_at: string;
  doctor_id: string;
  service_id: string;
  can_change: boolean;
  serviceName: string;
  doctorName: string;
  bookableDoctors: BookingDoctor[];
};

export function ManageAppointments({
  appointments,
  windowHours,
  contactHref,
}: {
  appointments: ManagedAppointment[];
  windowHours: number;
  contactHref: string;
}) {
  const [items, setItems] = useState(appointments);
  const [message, setMessage] = useState<{ tone: "success" | "danger" | "warning"; text: string } | null>(null);
  const [rescheduling, setRescheduling] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const cancel = async (a: ManagedAppointment) => {
    setBusy(true);
    const res = await api("/api/manage/cancel", { json: { appointmentId: a.appointment_id } }).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      setItems((list) => list.filter((x) => x.appointment_id !== a.appointment_id));
      setMessage({ tone: "success", text: "Tu cita fue cancelada. Te enviamos una confirmación por correo." });
    } else setMessage({ tone: "danger", text: bookingMessage(res && !res.ok ? res.code : "unavailable") });
  };

  const reschedule = async (a: ManagedAppointment, slot: Slot) => {
    setBusy(true);
    const res = await api<{ appointment: { starts_at: string; ends_at: string; doctor_id: string } }>("/api/manage/reschedule", {
      json: { appointmentId: a.appointment_id, doctorId: slot.doctor_id, startsAt: slot.starts_at },
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      setItems((list) =>
        list.map((x) =>
          x.appointment_id === a.appointment_id
            ? { ...x, ...res.appointment, doctorName: a.bookableDoctors.find((d) => d.id === slot.doctor_id)?.name ?? x.doctorName }
            : x,
        ),
      );
      setRescheduling(null);
      setMessage({ tone: "success", text: "Tu cita fue reprogramada. Te enviamos el nuevo horario por correo." });
    } else {
      // Si el nuevo horario falló, la cita original sigue igual.
      setMessage({ tone: "warning", text: `${bookingMessage(res && !res.ok ? res.code : "unavailable")} Tu cita original no cambió.` });
      setRefreshKey((k) => k + 1);
    }
  };

  return (
    <div className="space-y-6">
      {message ? (
        <Alert tone={message.tone} role={message.tone === "success" ? "status" : "alert"}>
          {message.text}
        </Alert>
      ) : null}
      {items.length === 0 ? <p className="text-muted">No tienes citas próximas.</p> : null}
      {items.map((a) => (
        <Card key={a.appointment_id} className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-display text-2xl capitalize text-plum-strong">{formatLimaDate(a.starts_at)}</p>
              <p className="text-lg">
                {formatLimaTime(a.starts_at)} (hora de Lima) · {a.serviceName} · {a.doctorName}
              </p>
            </div>
            <Badge tone={a.status === "confirmed" ? "success" : "warning"}>
              {a.status === "confirmed" ? "Confirmada" : "Pendiente de confirmación"}
            </Badge>
          </div>
          {a.can_change ? (
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" disabled={busy} onClick={() => setRescheduling(rescheduling === a.appointment_id ? null : a.appointment_id)} aria-expanded={rescheduling === a.appointment_id}>
                <CalendarClock aria-hidden="true" /> Cambiar fecha u hora
              </Button>
              <ConfirmDialog
                title="¿Cancelar esta cita?"
                description={`Se liberará el horario del ${formatLimaDate(a.starts_at)} a las ${formatLimaTime(a.starts_at)}.`}
                confirmLabel="Sí, cancelar cita"
                onConfirm={() => void cancel(a)}
                trigger={
                  <Button variant="ghost" disabled={busy}>
                    <XCircle aria-hidden="true" /> Cancelar cita
                  </Button>
                }
              />
            </div>
          ) : (
            <Alert tone="info">
              Faltan menos de {windowHours} horas para tu cita: los cambios se coordinan con recepción.{" "}
              <a href={contactHref} className="text-plum underline underline-offset-4">
                Contactar a recepción
              </a>
            </Alert>
          )}
          {rescheduling === a.appointment_id ? (
            <div className="border-t border-line pt-4">
              <h2 className="mb-4 font-sans text-lg font-semibold">Elige el nuevo horario</h2>
              <SlotPicker
                serviceId={a.service_id}
                doctorId={a.doctor_id}
                doctors={a.bookableDoctors}
                busy={busy}
                refreshKey={refreshKey}
                onSelect={(slot) => void reschedule(a, slot)}
              />
            </div>
          ) : null}
        </Card>
      ))}
    </div>
  );
}

export function RequestLinkForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("busy");
    const res = await api("/api/manage/request-link", { json: { email } }).catch(() => null);
    setState(res?.ok ? "sent" : "error");
  };
  if (state === "sent") {
    return (
      <Alert tone="success" role="status" title="Revisa tu correo">
        Si hay citas próximas asociadas a ese correo, te enviaremos un enlace para gestionarlas en unos minutos.
      </Alert>
    );
  }
  return (
    <form noValidate onSubmit={submit} className="max-w-md space-y-4">
      {state === "error" ? (
        <Alert tone="danger" role="alert">
          No pudimos procesar la solicitud. Revisa el correo e inténtalo nuevamente.
        </Alert>
      ) : null}
      <Field id="m-email" label="Correo con el que reservaste" required>
        {(a) => <Input {...a} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
      </Field>
      <Button type="submit" disabled={state === "busy"}>
        Enviarme un enlace
      </Button>
    </form>
  );
}

export function LogoutButton() {
  const router = useRouter();
  return (
    <Button
      variant="link"
      onClick={async () => {
        await api("/api/manage/logout", { json: {} }).catch(() => null);
        router.refresh();
      }}
    >
      Cerrar sesión de gestión
    </Button>
  );
}
