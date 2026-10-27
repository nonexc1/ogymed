"use client";

import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import type { NavItem } from "./header";
import { SiteLink } from "./site-link";

export function MobileMenu({ items }: { items: NavItem[] }) {
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
        className="inline-flex size-11 items-center justify-center rounded-full border border-line bg-paper text-plum"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpenAt(open ? null : pathname)}
      >
        {open ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
        <span className="sr-only">{open ? "Cerrar menú" : "Abrir menú"}</span>
      </button>
      <nav
        id={panelId}
        aria-label="Menú principal"
        hidden={!open}
        className="absolute inset-x-0 top-full border-b border-line bg-paper px-5 pb-6 pt-2 shadow-lg"
      >
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.href}>
              <SiteLink
                href={item.href}
                className="block rounded-xl px-3 py-3 text-lg font-medium text-ink hover:bg-plum-soft"
                aria-current={pathname === item.href ? "page" : undefined}
              >
                {item.label}
              </SiteLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
