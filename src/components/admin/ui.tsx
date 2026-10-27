import type { ComponentProps, ReactNode } from "react";

import { Badge } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl sm:text-4xl">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Panel({ title, children, className, actions }: { title?: string; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={cn("rounded-[var(--radius-card)] border border-line bg-paper p-5 sm:p-6", className)}>
      {title || actions ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title ? <h2 className="font-sans text-lg font-semibold text-ink">{title}</h2> : <span />}
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Tabla (desplazable)">
      <table className={cn("w-full min-w-[36rem] border-collapse text-left text-sm [&_td]:border-b [&_td]:border-line [&_td]:px-3 [&_td]:py-2.5 [&_th]:border-b [&_th]:border-line [&_th]:px-3 [&_th]:py-2 [&_th]:font-semibold [&_th]:text-muted", className)} {...props} />
    </div>
  );
}

const APPT_STATUS: Record<string, { label: string; tone: "neutral" | "plum" | "sage" | "success" | "warning" | "danger" }> = {
  hold: { label: "Retenida", tone: "neutral" },
  pending_confirmation: { label: "Pendiente", tone: "warning" },
  confirmed: { label: "Confirmada", tone: "success" },
  cancelled: { label: "Cancelada", tone: "danger" },
  completed: { label: "Atendida", tone: "sage" },
  no_show: { label: "No asistió", tone: "danger" },
  expired: { label: "Vencida", tone: "neutral" },
};

export const APPOINTMENT_STATUS_LABELS = Object.fromEntries(Object.entries(APPT_STATUS).map(([k, v]) => [k, v.label]));

export function AppointmentStatus({ status }: { status: string }) {
  const s = APPT_STATUS[status] ?? { label: status, tone: "neutral" as const };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

const CONTENT_STATUS: Record<string, { label: string; tone: "neutral" | "plum" | "sage" | "success" | "warning" | "danger" }> = {
  draft: { label: "Borrador", tone: "neutral" },
  medical_review: { label: "En revisión médica", tone: "warning" },
  published: { label: "Publicado", tone: "success" },
  archived: { label: "Archivado", tone: "danger" },
};

export function ContentStatus({ status, live }: { status: string; live?: boolean }) {
  const s = CONTENT_STATUS[status] ?? { label: status, tone: "neutral" as const };
  return (
    <span className="inline-flex flex-wrap gap-1">
      <Badge tone={s.tone}>{s.label}</Badge>
      {live && status !== "published" ? <Badge tone="plum">Versión anterior en línea</Badge> : null}
    </span>
  );
}

export const ORIGIN_LABELS: Record<string, string> = {
  web: "Web",
  phone: "Teléfono",
  whatsapp: "WhatsApp",
  in_person: "Presencial",
  other: "Otro",
};

export const OUTBOX_STATUS: Record<string, string> = {
  pending: "Pendiente",
  sending: "Enviando",
  sent: "Enviado",
  failed: "Fallido",
  skipped: "Omitido",
  cancelled: "Anulado",
};

export function DemoBadge({ demo }: { demo: boolean }) {
  return demo ? <Badge tone="warning">DEMO</Badge> : null;
}
