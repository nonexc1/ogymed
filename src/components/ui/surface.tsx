import type { ComponentProps, ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export function Container({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-6xl px-5 sm:px-8", className)} {...props} />;
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-[var(--radius-card)] border border-line bg-paper p-6 shadow-sm", className)} {...props} />;
}

const badgeTones = {
  neutral: "bg-ivory text-muted border-line",
  plum: "bg-plum-soft text-plum border-plum/20",
  sage: "bg-sage-soft text-sage-strong border-sage/30",
  success: "bg-success-soft text-success border-success/20",
  warning: "bg-warning-soft text-warning border-warning/20",
  danger: "bg-danger-soft text-danger border-danger/20",
} as const;

export function Badge({ tone = "neutral", className, ...props }: ComponentProps<"span"> & { tone?: keyof typeof badgeTones }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-sm font-semibold", badgeTones[tone], className)}
      {...props}
    />
  );
}

const alertTones = {
  info: { cls: "border-plum/20 bg-plum-soft text-plum-strong", Icon: Info },
  success: { cls: "border-success/25 bg-success-soft text-success", Icon: CheckCircle2 },
  warning: { cls: "border-warning/25 bg-warning-soft text-warning", Icon: AlertTriangle },
  danger: { cls: "border-danger/25 bg-danger-soft text-danger", Icon: XCircle },
} as const;

export function Alert({
  tone = "info",
  title,
  children,
  className,
  role,
}: {
  tone?: keyof typeof alertTones;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
  role?: "alert" | "status";
}) {
  const { cls, Icon } = alertTones[tone];
  return (
    <div role={role} className={cn("flex gap-3 rounded-2xl border p-4", cls, className)}>
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="space-y-1 text-base">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="text-ink">{children}</div> : null}
      </div>
    </div>
  );
}

export function SectionHeading({ eyebrow, title, intro, id }: { eyebrow?: string; title: string; intro?: ReactNode; id?: string }) {
  return (
    <div className="mb-8 max-w-2xl">
      {eyebrow ? <p className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-sage-strong">{eyebrow}</p> : null}
      <h2 id={id} className="text-3xl sm:text-4xl">
        {title}
      </h2>
      {intro ? <div className="mt-3 text-lg text-muted">{intro}</div> : null}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-line bg-paper/60 p-8 text-center">
      <p className="font-display text-xl text-plum-strong">{title}</p>
      {children ? <div className="mx-auto mt-2 max-w-prose text-muted">{children}</div> : null}
    </div>
  );
}
