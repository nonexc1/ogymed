import { CalendarDays, MessageCircle, Phone } from "lucide-react";

import { TrackedLink } from "@/components/analytics/tracked-link";
import { telUrl, whatsappUrl } from "@/lib/contact-links";

/**
 * Barra inferior móvil. El layout reserva su altura (pb-20) para no tapar formularios, y se oculta
 * mientras el banner de cookies está abierto.
 */
export function MobileCtaBar({ whatsapp, phone, bookingLabel }: { whatsapp: string | null; phone: string | null; bookingLabel: string }) {
  const item = "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-sm font-semibold";
  return (
    <nav aria-label="Acciones rápidas" className="mobile-cta-bar fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper sm:hidden">
      <div className="flex">
        <TrackedLink event="click_book" position="mobile_bar" href="/reservar" className={`${item} bg-plum text-ivory`}>
          <CalendarDays aria-hidden="true" className="size-5" />
          {bookingLabel}
        </TrackedLink>
        {whatsapp ? (
          <TrackedLink
            event="click_whatsapp"
            position="mobile_bar"
            href={whatsappUrl(whatsapp)}
            target="_blank"
            rel="noopener noreferrer"
            className={`${item} text-sage-strong`}
          >
            <MessageCircle aria-hidden="true" className="size-5" />
            WhatsApp
          </TrackedLink>
        ) : null}
        {phone ? (
          <TrackedLink event="click_call" position="mobile_bar" href={telUrl(phone)} className={`${item} text-plum`}>
            <Phone aria-hidden="true" className="size-5" />
            Llamar
          </TrackedLink>
        ) : null}
      </div>
    </nav>
  );
}
