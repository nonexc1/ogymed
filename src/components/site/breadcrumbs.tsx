import { ChevronRight } from "lucide-react";

import { SiteLink } from "./site-link";

export type Crumb = { name: string; href: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Ruta de navegación" className="text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((c, i) => (
          <li key={c.href} className="flex items-center gap-1">
            {i > 0 ? <ChevronRight aria-hidden="true" className="size-4" /> : null}
            {i === items.length - 1 ? (
              <span aria-current="page">{c.name}</span>
            ) : (
              <SiteLink href={c.href} className="underline-offset-4 hover:text-plum hover:underline">
                {c.name}
              </SiteLink>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
