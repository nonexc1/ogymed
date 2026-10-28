"use client";

import { ArrowRight, Menu, MessageCircle, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { TrackedLink } from "@/components/analytics/tracked-link";
import { buttonVariants } from "@/components/ui/button";
import { whatsappUrl } from "@/lib/contact-links";

import type { NavItem } from "./header";
import { SiteLink } from "./site-link";

export function MobileMenu({ items, bookingLabel, whatsapp }: { items: NavItem[]; bookingLabel: string; whatsapp: string | null }) {
  const pathname = usePathname();
  // El menú queda abierto sólo para la ruta en que se abrió: al navegar se cierra solo.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenAt(null);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        className="inline-flex size-11 items-center justify-center rounded-lg text-plum-strong hover:bg-plum-soft"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpenAt(open ? null : pathname)}
      >
        {open ? <X aria-hidden="true" className="size-6" /> : <Menu aria-hidden="true" className="size-6" />}
        <span className="sr-only">{open ? "Cerrar menú" : "Abrir menú"}</span>
      </button>
      <nav
        id={panelId}
        aria-label="Menú principal"
        hidden={!open}
        className="absolute inset-x-0 top-full border-b border-line bg-ivory px-5 pb-6 pt-2 shadow-lg"
      >
        <ul className="divide-y divide-line">
          {items.map((item) => (
            <li key={item.href}>
              <SiteLink
                href={item.href}
                className="flex items-center justify-between py-4 font-display text-2xl text-plum-strong"
                aria-current={pathname === item.href ? "page" : undefined}
              >
                {item.label}
                <ArrowRight aria-hidden="true" className="size-5 text-sage-strong" />
              </SiteLink>
            </li>
          ))}
        </ul>
        <div className="mt-5 grid gap-3">
          <TrackedLink event="click_book" position="header" href="/reservar" className={buttonVariants({ size: "lg" })}>
            {bookingLabel}
          </TrackedLink>
          {whatsapp ? (
            <TrackedLink
              event="click_whatsapp"
              position="header"
              href={whatsappUrl(whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "secondary", size: "lg" })}
            >
              <MessageCircle aria-hidden="true" /> WhatsApp<span className="sr-only"> (se abre en una pestaña nueva)</span>
            </TrackedLink>
          ) : null}
        </div>
      </nav>
    </div>
  );
}
