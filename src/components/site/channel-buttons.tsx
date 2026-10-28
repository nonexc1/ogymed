import { Mail, MessageCircle, Phone } from "lucide-react";

import { TrackedLink } from "@/components/analytics/tracked-link";
import { buttonVariants } from "@/components/ui/button";
import type { ContactChannel } from "@/features/cms/request-state";
import type { AnalyticsPosition } from "@/lib/analytics/policy";
import { cn } from "@/lib/utils";

const ICONS = { whatsapp: MessageCircle, phone: Phone, email: Mail } as const;

/** Botones sólo para los canales configurados (WhatsApp, teléfono, correo). Sin canales, no renderiza nada. */
export function ChannelButtons({ channels, position, className }: { channels: ContactChannel[]; position: AnalyticsPosition; className?: string }) {
  if (!channels.length) return null;
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:flex-wrap", className)}>
      {channels.map((c) => {
        const Icon = ICONS[c.kind];
        const cls = buttonVariants({ variant: "secondary", size: "lg" });
        if (c.kind === "email") {
          return (
            <a key={c.kind} href={c.href} className={cls}>
              <Icon aria-hidden="true" /> {c.label}
            </a>
          );
        }
        return (
          <TrackedLink
            key={c.kind}
            event={c.kind === "whatsapp" ? "click_whatsapp" : "click_call"}
            position={position}
            href={c.href}
            {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className={cls}
          >
            <Icon aria-hidden="true" /> {c.label}
            {c.external ? <span className="sr-only"> (se abre en una pestaña nueva)</span> : null}
          </TrackedLink>
        );
      })}
    </div>
  );
}
