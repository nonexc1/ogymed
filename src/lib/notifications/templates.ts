import "server-only";

import type { PublicSettings } from "@/features/cms/types";
import { formatLimaDate, formatLimaTime } from "@/lib/datetime";
import { siteUrl } from "@/lib/env";
import { formatPhone } from "@/lib/contact-links";

export type RenderedEmail = {
  subject: string;
  text: string;
  html: string;
  attachments?: { filename: string; content: string; contentType: string }[];
};

type AppointmentInfo = { starts_at: string; ends_at: string; status: string; doctorName: string | null };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(settings: PublicSettings, paragraphs: string[], action?: { label: string; url: string }) {
  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#faf8f5;font-family:Arial,Helvetica,sans-serif;color:#27232a">
<div style="max-width:560px;margin:0 auto;padding:32px 24px">
<p style="font-family:Georgia,serif;font-size:22px;letter-spacing:2px;color:#3e2030;margin:0 0 24px">${esc(settings.clinic_name)}</p>
${paragraphs.map((p) => `<p style="font-size:16px;line-height:1.6;margin:0 0 16px">${p}</p>`).join("\n")}
${action ? `<p style="margin:24px 0"><a href="${esc(action.url)}" style="background:#51283f;color:#faf8f5;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:bold;display:inline-block">${esc(action.label)}</a></p>` : ""}
<p style="font-size:13px;color:#5c5560;line-height:1.5;margin-top:32px">${footerLines(settings).map(esc).join("<br>")}</p>
</div></body></html>`;
  return html;
}

function footerLines(s: PublicSettings) {
  return [
    s.legal_name ?? s.clinic_name,
    s.address_line ? `${s.address_line}, ${s.district}` : `${s.district}, ${s.city}`,
    s.phone_e164 ? `Teléfono: ${formatPhone(s.phone_e164)}` : null,
    "Este es un mensaje automático sobre tu cita. No respondas con información médica.",
  ].filter((x): x is string => Boolean(x));
}

function plain(settings: PublicSettings, lines: string[], action?: { label: string; url: string }) {
  return [...lines, ...(action ? ["", `${action.label}: ${action.url}`] : []), "", "—", ...footerLines(settings)].join("\n");
}

function when(a: AppointmentInfo) {
  return `${formatLimaDate(a.starts_at)} a las ${formatLimaTime(a.starts_at)} (hora de Lima)`;
}

/** ICS con título genérico (los calendarios pueden estar compartidos). */
function ics(a: AppointmentInfo, uid: string, settings: PublicSettings, cancelled = false) {
  const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const location = settings.address_line ? `${settings.address_line}, ${settings.district}` : `${settings.district}, ${settings.city}`;
  const content = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//OGYMED//Citas//ES",
    `METHOD:${cancelled ? "CANCEL" : "PUBLISH"}`,
    "BEGIN:VEVENT",
    `UID:${uid}@ogymed`,
    // Fijo por cita para que los reintentos produzcan el mismo contenido.
    `DTSTAMP:${stamp(a.starts_at)}`,
    `DTSTART:${stamp(a.starts_at)}`,
    `DTEND:${stamp(a.ends_at)}`,
    `SUMMARY:Cita en ${settings.clinic_name}`,
    `LOCATION:${location.replace(/[,;]/g, (c) => `\\${c}`)}`,
    `STATUS:${cancelled ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return { filename: "cita-ogymed.ics", content, contentType: "text/calendar; charset=utf-8" };
}

const ICS_NOTE = "Adjuntamos un evento de calendario con un título genérico. Si compartes tu calendario, otras personas podrían verlo.";

export function verificationCodeEmail(settings: PublicSettings, code: string, ttlMinutes: number): RenderedEmail {
  const lines = [
    `Tu código para confirmar tu correo en ${settings.clinic_name} es: ${code}`,
    `Vence en ${ttlMinutes} minutos. Si no solicitaste este código, puedes ignorar este mensaje.`,
  ];
  return {
    subject: `Tu código de verificación de ${settings.clinic_name}`,
    text: plain(settings, lines),
    html: layout(settings, [
      `Tu código para confirmar tu correo es:`,
      `<strong style="font-size:28px;letter-spacing:6px">${esc(code)}</strong>`,
      esc(lines[1]!),
    ]),
  };
}

export function patientEmail(
  kind: string,
  settings: PublicSettings,
  firstName: string | null,
  appointment: AppointmentInfo | null,
  manageUrl: string | null,
  appointmentId: string | null,
): RenderedEmail | null {
  const hello = firstName ? `Hola, ${firstName}:` : "Hola:";
  const action = manageUrl ? { label: "Ver o gestionar mi cita", url: manageUrl } : undefined;
  const withWho = (a: AppointmentInfo) => `${when(a)}${a.doctorName ? `, con ${a.doctorName}` : ""}`;
  const name = settings.clinic_name;
  switch (kind) {
    case "booking_confirmed": {
      if (!appointment) return null;
      const lines = [hello, `Tu cita en ${name} está confirmada para el ${withWho(appointment)}.`, ICS_NOTE];
      return {
        subject: `Tu cita en ${name} está confirmada`,
        text: plain(settings, lines, action),
        html: layout(settings, lines.map(esc), action),
        attachments: [ics(appointment, appointmentId ?? "cita", settings)],
      };
    }
    case "booking_received": {
      if (!appointment) return null;
      const lines = [
        hello,
        `Recibimos tu solicitud de cita para el ${withWho(appointment)}.`,
        "Aún no está confirmada: recepción la revisará y te escribiremos para confirmarla.",
      ];
      return { subject: `Recibimos tu solicitud de cita en ${name}`, text: plain(settings, lines, action), html: layout(settings, lines.map(esc), action) };
    }
    case "booking_rescheduled": {
      if (!appointment) return null;
      const lines = [hello, `Tu cita en ${name} cambió. Nuevo horario: ${withWho(appointment)}.`, ICS_NOTE];
      return {
        subject: `Cambio en tu cita en ${name}`,
        text: plain(settings, lines, action),
        html: layout(settings, lines.map(esc), action),
        attachments: appointment.status === "confirmed" ? [ics(appointment, appointmentId ?? "cita", settings)] : undefined,
      };
    }
    case "booking_cancelled": {
      if (!appointment) return null;
      const lines = [hello, `Tu cita del ${when(appointment)} fue cancelada.`, "Si deseas una nueva cita, puedes reservar en nuestra web o contactar a recepción."];
      const book = { label: "Reservar una nueva cita", url: `${siteUrl}/reservar` };
      return {
        subject: `Tu cita en ${name} fue cancelada`,
        text: plain(settings, lines, book),
        html: layout(settings, lines.map(esc), book),
        attachments: [ics(appointment, appointmentId ?? "cita", settings, true)],
      };
    }
    case "booking_reminder": {
      if (!appointment) return null;
      const lines = [hello, `Te recordamos tu cita en ${name} el ${withWho(appointment)}.`];
      return { subject: `Recordatorio de tu cita en ${name}`, text: plain(settings, lines, action), html: layout(settings, lines.map(esc), action) };
    }
    case "booking_pending_expired": {
      if (!appointment) return null;
      const lines = [
        hello,
        `No pudimos confirmar tu solicitud de cita del ${when(appointment)} y ya no está reservada.`,
        "Por favor elige otro horario o comunícate con recepción.",
      ];
      const book = { label: "Elegir otro horario", url: `${siteUrl}/reservar` };
      return { subject: `Tu solicitud de cita en ${name}`, text: plain(settings, lines, book), html: layout(settings, lines.map(esc), book) };
    }
    case "access_link": {
      const lines = [hello, `Solicitaste un enlace para gestionar tus citas en ${name}.`, "El enlace es personal, de un solo uso y vence pronto."];
      return { subject: `Enlace para gestionar tu cita en ${name}`, text: plain(settings, lines, action), html: layout(settings, lines.map(esc), action) };
    }
    default:
      return null;
  }
}

/** Avisos a recepción: sin datos de pacientes; el detalle se consulta en el panel con MFA. */
export function receptionEmail(kind: string, settings: PublicSettings, appointment: AppointmentInfo | null): RenderedEmail | null {
  const panel = { label: "Abrir el panel", url: `${siteUrl}/admin` };
  const text = {
    staff_new_booking: appointment ? `Nueva cita o solicitud web para el ${when(appointment)}.` : "Nueva cita o solicitud web.",
    staff_booking_cancelled: appointment ? `Una paciente canceló su cita del ${when(appointment)}.` : "Una cita fue cancelada.",
    staff_contact_request: "Nueva solicitud en el formulario de contacto.",
    staff_complaint: "Nuevo registro en el libro de reclamaciones.",
  }[kind];
  if (!text) return null;
  return { subject: `[${settings.clinic_name}] Aviso del sitio web`, text: plain(settings, [text], panel), html: layout(settings, [esc(text)], panel) };
}
