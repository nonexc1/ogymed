"use client";

import { MapPin } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

/** El mapa (Google, con cookies de terceros) sólo se carga si la persona lo pide. */
export function VoluntaryMap({ latitude, longitude, label }: { latitude: number; longitude: number; label: string }) {
  const [show, setShow] = useState(false);
  if (!show) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border border-dashed border-line bg-paper p-6 text-center">
        <MapPin aria-hidden="true" className="size-8 text-sage-strong" />
        <p className="max-w-sm text-muted">El mapa lo provee Google y puede usar cookies propias. Se carga sólo si lo solicitas.</p>
        <Button variant="secondary" onClick={() => setShow(true)}>
          Mostrar mapa
        </Button>
      </div>
    );
  }
  return (
    <iframe
      title={`Mapa: ${label}`}
      src={`https://www.google.com/maps?q=${latitude},${longitude}&z=16&output=embed`}
      className="h-80 w-full rounded-[var(--radius-card)] border border-line"
      loading="lazy"
      referrerPolicy="no-referrer"
    />
  );
}
