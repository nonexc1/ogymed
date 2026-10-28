import { ArrowRight } from "lucide-react";

import { TrackedLink } from "@/components/analytics/tracked-link";
import { buttonVariants } from "@/components/ui/button";
import { renderMarkdown } from "@/features/cms/markdown";
import type { Page, PublicSettings } from "@/features/cms/types";
import { cn } from "@/lib/utils";

import { Breadcrumbs } from "./breadcrumbs";
import { type Fact, HomeFacts, HOME_WIDTH } from "./home/hero";
import { HomeLocation } from "./home/more-sections";
import { Photo, type PhotoSource } from "./photo";
import { Prose } from "./prose";
import { SiteLink } from "./site-link";

type Section = { title: string; md: string };
type Pillar = { title: string; text: string };

/** Divide el Markdown de la página por encabezados «## » para darle a cada parte su composición. */
export function splitSections(md: string): { preamble: string; sections: Section[] } {
  const parts = md.split(/^## +(.+)$/m);
  const preamble = (parts[0] ?? "").trim();
  const sections: Section[] = [];
  for (let i = 1; i < parts.length; i += 2) sections.push({ title: parts[i]!.trim(), md: (parts[i + 1] ?? "").trim() });
  return { preamble, sections };
}

/** Lista con entradas «- **Título.** texto» → pilares numerados; si no tiene esa forma, null. */
export function asPillars(md: string): Pillar[] | null {
  const lines = md.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2 || lines.length > 6) return null;
  const items = lines.map((l) => /^[-*] +\*\*(.+?)\*\*\s*(.*)$/.exec(l));
  if (items.some((m) => !m)) return null;
  return items.map((m) => ({ title: m![1]!.replace(/[.:]\s*$/, ""), text: m![2]! }));
}

const isLocation = (title: string) => /d[oó]nde|ubicaci[oó]n|c[oó]mo llegar/i.test(title);

/**
 * «La clínica» con estructura editorial: cabecera con fotografía, banda de datos reales, declaración
 * destacada, pilares numerados, bloques título/texto y ubicación con mapa voluntario.
 */
export function ClinicView({
  page,
  settings,
  facts,
  bookingLabel,
  canRequest,
  photo,
}: {
  page: Page;
  settings: PublicSettings;
  facts: Fact[];
  bookingLabel: string;
  canRequest: boolean;
  photo: PhotoSource | null;
}) {
  const { preamble, sections } = splitSections(page.body_md);
  const location = sections.find((s) => isLocation(s.title));
  const body = sections.filter((s) => s !== location);
  // La primera sección de texto corrido es la declaración destacada; el resto conserva su orden.
  const lead = body.find((s) => !asPillars(s.md));
  const rest = body.filter((s) => s !== lead);
  return (
    <>
      <section aria-labelledby="clinica-h1" className="relative overflow-hidden bg-sand">
        {photo ? null : (
          <div aria-hidden="true" className="pointer-events-none absolute -right-40 -top-24 size-[32rem] rounded-full bg-rose/60 blur-3xl" />
        )}
        <div className={cn(HOME_WIDTH, "relative pt-8 sm:pt-10")}>
          <Breadcrumbs
            items={[
              { name: "Inicio", href: "/" },
              { name: page.title, href: "/la-clinica" },
            ]}
          />
        </div>
        <div className={cn(HOME_WIDTH, "relative grid items-center gap-10 pb-14 pt-10 lg:pb-20", photo && "lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-16")}>
          <div>
            <p className="text-[0.8rem] font-semibold uppercase tracking-[0.18em] text-sage-strong">Ginecología en Surco, Lima</p>
            <h1 id="clinica-h1" className="mt-4 text-[2.8rem] leading-[1.04] tracking-[-0.02em] sm:text-[4rem]">
              {page.title}
            </h1>
            {page.intro ? <p className="mt-6 max-w-2xl font-display text-[1.45rem] leading-snug text-plum-strong sm:text-[1.8rem]">{page.intro}</p> : null}
            {preamble ? <Prose html={renderMarkdown(preamble)} className="mt-6 text-lg text-muted" /> : null}
          </div>
          {photo ? (
            <Photo source={photo} priority sizes="(min-width: 1024px) 520px, 100vw" className="aspect-[4/3] rounded-[1.75rem] lg:aspect-[4/5]" />
          ) : null}
        </div>
      </section>
      <HomeFacts facts={facts} />

      {lead ? (
        <section aria-labelledby="clinica-lead" className={cn(HOME_WIDTH, "grid gap-6 py-20 lg:grid-cols-12 lg:gap-16 lg:py-24")}>
          <h2 id="clinica-lead" className="text-[0.8rem] font-sans font-semibold uppercase tracking-[0.18em] text-sage-strong lg:col-span-3 lg:pt-3">
            {lead.title}
          </h2>
          <Prose
            html={renderMarkdown(lead.md)}
            className="max-w-none font-display text-[1.6rem] leading-snug text-plum-strong sm:text-[2.1rem] lg:col-span-9 [&_p+p]:mt-6"
          />
        </section>
      ) : null}

      {rest.map((s, i) => {
        const pillars = asPillars(s.md);
        const id = `clinica-s${i}`;
        if (pillars) {
          return (
            <section key={s.title} aria-labelledby={id} className="border-y border-line bg-paper">
              <div className={cn(HOME_WIDTH, "py-20 lg:py-24")}>
                <h2 id={id} className="text-[2.2rem] leading-[1.08] sm:text-5xl">
                  {s.title}
                </h2>
                <ol className={cn("mt-12 grid gap-10", pillars.length >= 3 ? "md:grid-cols-3" : "md:grid-cols-2")}>
                  {pillars.map((p, n) => (
                    <li key={p.title} className="border-t-2 border-plum pt-6">
                      <span aria-hidden="true" className="font-display text-5xl leading-none text-plum/30">
                        {String(n + 1).padStart(2, "0")}
                      </span>
                      <h3 className="mt-5 text-[1.55rem]">{p.title}</h3>
                      <p className="mt-3 text-muted">{p.text}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </section>
          );
        }
        return (
          <section key={s.title} aria-labelledby={id} className={cn(HOME_WIDTH, "grid gap-6 py-16 lg:grid-cols-12 lg:gap-16")}>
            <h2 id={id} className="text-[2rem] leading-[1.1] lg:col-span-4">
              {s.title}
            </h2>
            <Prose html={renderMarkdown(s.md)} className="text-lg lg:col-span-8" />
          </section>
        );
      })}

      <HomeLocation
        settings={settings}
        photo={null}
        title={location?.title ?? `Te esperamos en ${settings.district}`}
        intro={location ? <Prose html={renderMarkdown(location.md)} /> : undefined}
        className={canRequest ? undefined : "pb-4 lg:pb-6"}
      />

      {canRequest ? (
        <section aria-label="Pedir una cita" className="bg-plum text-ivory">
          <div className={cn(HOME_WIDTH, "flex flex-col gap-6 py-14 sm:flex-row sm:items-center sm:justify-between")}>
            <p className="font-display text-[1.8rem] leading-snug text-ivory sm:text-[2.2rem]">¿Quieres conocernos?</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
              <TrackedLink event="click_book" position="section" href="/reservar" className={buttonVariants({ variant: "secondary", size: "lg" })}>
                {bookingLabel} <ArrowRight aria-hidden="true" />
              </TrackedLink>
              <SiteLink href="/contacto" className="font-semibold text-rose underline underline-offset-4">
                Ver contacto
              </SiteLink>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
