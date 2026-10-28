"use client";

import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import type { NavItem } from "./header";
import { SiteLink } from "./site-link";

/** Navegación de escritorio: marca la sección actual (aria-current) sin depender del color. */
export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <ul className="flex items-center gap-1 xl:gap-2">
      {items.map((item) => {
        const current = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <li key={item.href}>
            <SiteLink
              href={item.href}
              aria-current={current ? "page" : undefined}
              className={cn(
                "relative rounded-md px-3 py-2 text-[0.97rem] font-medium text-ink transition-colors hover:text-plum",
                "after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-plum after:opacity-0 after:transition-opacity",
                current && "text-plum after:opacity-100",
              )}
            >
              {item.label}
            </SiteLink>
          </li>
        );
      })}
    </ul>
  );
}
