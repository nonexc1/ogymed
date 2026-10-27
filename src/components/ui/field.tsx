import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

const control =
  "block w-full rounded-xl border border-line bg-paper px-4 py-3 text-base text-ink placeholder:text-muted/80 shadow-sm aria-[invalid=true]:border-danger focus-visible:border-plum disabled:bg-ivory";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, "min-h-12", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-28", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(control, "min-h-12 pr-10", className)} {...props} />;
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("mb-1.5 block font-semibold text-ink", className)} {...props} />;
}

/**
 * Campo con etiqueta, descripción y error asociados por aria-describedby (WCAG 1.3.1 / 3.3.1).
 * `children` recibe los props de accesibilidad que debe aplicar al control.
 */
export function Field({
  id,
  label,
  description,
  error,
  required,
  className,
  children,
}: {
  id: string;
  label: ReactNode;
  description?: ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  children: (a11y: { id: string; "aria-invalid": boolean; "aria-describedby"?: string; required?: boolean }) => ReactNode;
}) {
  const descId = description ? `${id}-desc` : undefined;
  const errId = error ? `${id}-error` : undefined;
  const describedBy = [descId, errId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <Label htmlFor={id}>
        {label}
        {required ? <span className="text-danger" aria-hidden="true"> *</span> : null}
      </Label>
      {description ? (
        <p id={descId} className="mb-2 text-sm text-muted">
          {description}
        </p>
      ) : null}
      {children({ id, "aria-invalid": Boolean(error), "aria-describedby": describedBy, required })}
      {error ? (
        <p id={errId} className="mt-1.5 text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Checkbox({
  id,
  label,
  description,
  error,
  ...props
}: ComponentProps<"input"> & { id: string; label: ReactNode; description?: ReactNode; error?: string }) {
  const errId = error ? `${id}-error` : undefined;
  const descId = description ? `${id}-desc` : undefined;
  return (
    <div>
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          className="mt-1 size-5 shrink-0 accent-plum"
          aria-invalid={Boolean(error)}
          aria-describedby={[descId, errId].filter(Boolean).join(" ") || undefined}
          {...props}
        />
        <label htmlFor={id} className="text-base">
          {label}
        </label>
      </div>
      {description ? (
        <p id={descId} className="ml-8 mt-1 text-sm text-muted">
          {description}
        </p>
      ) : null}
      {error ? (
        <p id={errId} className="ml-8 mt-1 text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
