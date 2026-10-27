"use client";

import { Timer } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * Cuenta regresiva de la retención con la expiración REAL del servidor (corrigiendo el desfase del
 * reloj local). El número visible se actualiza cada segundo pero sólo se anuncia a lectores de
 * pantalla en hitos (cada minuto y a los 30 s) para no saturar.
 */
export function HoldTimer({ expiresAt, skewMs, onExpire }: { expiresAt: string; skewMs: number; onExpire: () => void }) {
  const remaining = () => Math.max(0, Date.parse(expiresAt) - (Date.now() + skewMs));
  const [ms, setMs] = useState(remaining);
  const [announce, setAnnounce] = useState("");
  const lastMilestone = useRef<number | null>(null);
  const expired = useRef(false);

  useEffect(() => {
    expired.current = false;
    const tick = () => {
      const r = remaining();
      setMs(r);
      const secs = Math.ceil(r / 1000);
      const milestone = secs <= 30 ? 30 : Math.ceil(secs / 60) * 60;
      if (lastMilestone.current !== milestone && (secs % 60 === 0 || secs === 30)) {
        lastMilestone.current = milestone;
        setAnnounce(secs === 30 ? "Quedan 30 segundos para confirmar el horario." : `Quedan ${secs / 60} minutos para confirmar el horario.`);
      }
      if (r <= 0 && !expired.current) {
        expired.current = true;
        onExpire();
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt, skewMs]);

  const mm = Math.floor(ms / 60000);
  const ss = Math.floor((ms % 60000) / 1000)
    .toString()
    .padStart(2, "0");
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-warning/30 bg-warning-soft px-4 py-3 text-warning">
      <Timer aria-hidden="true" className="size-5" />
      <p>
        Horario reservado temporalmente. Tiempo para completar:{" "}
        <span className="font-semibold tabular-nums" aria-hidden="true">
          {mm}:{ss}
        </span>
        <span className="sr-only">{mm} minutos y {Number(ss)} segundos</span>
      </p>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}
