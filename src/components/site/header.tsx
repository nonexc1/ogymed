import { MessageCircle } from "lucide-react";

import { TrackedLink } from "@/components/analytics/tracked-link";
import { buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/ui/surface";
import { whatsappUrl } from "@/lib/contact-links";
import { cn } from "@/lib/utils";

import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";
import { SiteLink } from "./site-link";

export type NavItem = { href: string; label: string };

export function Header({
  items,
  whatsapp,
  bookingLabel,
}: {
  items: NavItem[];
  whatsapp: string | null;
  bookingLabel: string;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-ivory/95 backdrop-blur">
      <Container className="relative flex h-18 items-center justify-between gap-4 py-3">
        <SiteLink href="/" className="rounded-lg">
          <Logo />
          <span className="sr-only">, ir a la portada</span>
        </SiteLink>
        <nav aria-label="Principal" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {items.map((item) => (
              <li key={item.href}>
                <SiteLink href={item.href} className="rounded-full px-3 py-2 font-medium text-ink hover:bg-plum-soft hover:text-plum">
                  {item.label}
                </SiteLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2">
          {whatsapp ? (
            <TrackedLink
              event="click_whatsapp"
              position="header"
              href={whatsappUrl(whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "hidden sm:inline-flex")}
            >
              <MessageCircle aria-hidden="true" />
              WhatsApp<span className="sr-only"> (se abre en una pestaña nueva)</span>
            </TrackedLink>
          ) : null}
          <TrackedLink event="click_book" position="header" href="/reservar" className={cn(buttonVariants({ size: "sm" }), "hidden sm:inline-flex")}>
            {bookingLabel}
          </TrackedLink>
          <MobileMenu items={items} />
        </div>
      </Container>
    </header>
  );
}
