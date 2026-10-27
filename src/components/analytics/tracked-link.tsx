"use client";

import type { ComponentProps } from "react";

import type { AnalyticsEvent, AnalyticsPosition } from "@/lib/analytics/policy";

import { trackEvent } from "./analytics";

/** Enlace con evento de analítica genérico (sin datos del destino). Navegación siempre completa. */
export function TrackedLink({
  event,
  position,
  onClick,
  ...props
}: ComponentProps<"a"> & { event: AnalyticsEvent; position: AnalyticsPosition }) {
  return (
    <a
      {...props}
      onClick={(e) => {
        trackEvent(event, position);
        onClick?.(e);
      }}
    />
  );
}
