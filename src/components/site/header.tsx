import { TrackedLink } from "@/components/analytics/tracked-link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";
import { NavLinks } from "./nav-links";
import { SiteLink } from "./site-link";

export type NavItem = { href: string; label: string };

/**
 * Cabecera: marca, navegación sólo hacia secciones con contenido publicado y una única acción principal
 * cuyo texto refleja el estado real de las citas («Solicitar» salvo reserva automática operativa).
 * WhatsApp vive en el hero, la barra móvil y el pie (sólo si está configurado).
 */
export function Header({ items, whatsapp, bookingLabel }: { items: NavItem[]; whatsapp: string | null; bookingLabel: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-ivory/95 backdrop-blur">
      <div className="relative mx-auto flex h-16 w-full max-w-[76rem] items-center justify-between gap-6 px-5 sm:h-[4.75rem] sm:px-8">
        <SiteLink href="/" className="rounded-md">
          <Logo />
          <span className="sr-only">, ir a la portada</span>
        </SiteLink>
        <nav aria-label="Principal" className="hidden lg:block">
          <NavLinks items={items} />
        </nav>
        <div className="flex items-center gap-2">
          <TrackedLink event="click_book" position="header" href="/reservar" className={cn(buttonVariants(), "hidden sm:inline-flex")}>
            {bookingLabel}
          </TrackedLink>
          <MobileMenu items={items} bookingLabel={bookingLabel} whatsapp={whatsapp} />
        </div>
      </div>
    </header>
  );
}
