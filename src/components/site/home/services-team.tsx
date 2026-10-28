import { ArrowRight, BadgeCheck } from "lucide-react";

import { plainText } from "@/features/cms/markdown";
import type { Doctor, Service } from "@/features/cms/types";
import { cn } from "@/lib/utils";

import { Photo, photoFrom, type PhotoSource } from "../photo";
import { SiteLink } from "../site-link";
import { Eyebrow, HOME_WIDTH } from "./hero";

/** Filas editoriales (número, categoría, nombre, resumen): sólo servicios aprobados y publicados. */
export function ServiceRows({ services }: { services: Service[] }) {
  return (
    <ol className="border-t border-line">
      {services.map((s, i) => (
        <li key={s.id} className="border-b border-line">
          <SiteLink href={s.path} className="group grid grid-cols-[2.25rem_1fr_auto] items-start gap-x-4 py-6 sm:grid-cols-[3rem_1fr_auto] sm:gap-x-6 sm:py-7">
            <span aria-hidden="true" className="pt-1 font-display text-lg tabular-nums text-sage-strong">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span>
              {s.category ? (
                <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-sage-strong">{s.category}</span>
              ) : null}
              <span className="mt-1 block font-display text-[1.5rem] leading-tight text-plum-strong group-hover:text-plum sm:text-[1.7rem]">
                {s.name}
              </span>
              {s.summary ? <span className="mt-2 block max-w-xl text-muted">{s.summary}</span> : null}
            </span>
            <span
              aria-hidden="true"
              className="mt-1 flex size-10 items-center justify-center rounded-full border border-line text-plum transition-colors group-hover:border-plum group-hover:bg-plum group-hover:text-ivory"
            >
              <ArrowRight className="size-5" />
            </span>
          </SiteLink>
        </li>
      ))}
    </ol>
  );
}

/** Servicios: fotografía amplia + filas de texto. Sin servicios aprobados, la sección no se muestra. */
export function HomeServices({ services, intro, photo }: { services: Service[]; intro?: string; photo: PhotoSource | null }) {
  if (!services.length) return null;
  const shown = services.slice(0, 6);
  return (
    <section id="servicios" aria-labelledby="servicios-title" className={cn(HOME_WIDTH, "scroll-mt-24 py-20 lg:py-28")}>
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <div className={cn(photo && "lg:sticky lg:top-28")}>
            <Eyebrow>Servicios</Eyebrow>
            <h2 id="servicios-title" className="mt-4 text-[2.2rem] leading-[1.08] sm:text-5xl">
              Un espacio para cuidar de ti.
            </h2>
            {intro ? <p className="mt-5 max-w-md text-lg text-muted">{intro}</p> : null}
            {photo ? (
              <Photo source={photo} sizes="(min-width: 1024px) 420px, 0px" className="mt-10 hidden aspect-[4/5] rounded-[1.5rem] lg:block" />
            ) : null}
          </div>
        </div>
        <div className="lg:col-span-7">
          <ServiceRows services={shown} />
          <SiteLink href="/servicios" className="mt-8 inline-flex items-center gap-2 font-semibold text-plum underline underline-offset-4">
            Ver todos los servicios <ArrowRight aria-hidden="true" className="size-4" />
          </SiteLink>
          {photo ? <Photo source={photo} sizes="100vw" className="mt-10 aspect-[4/3] rounded-2xl lg:hidden" /> : null}
        </div>
      </div>
    </section>
  );
}

function Initials({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(" ")
    .filter((p) => p && !p.endsWith("."))
    .slice(0, 2)
    .map((p) => p[0])
    .join("");
  return (
    <div aria-hidden="true" className={cn("flex items-center justify-center bg-rose/60", className)}>
      <span className="font-display text-5xl text-plum">{initials}</span>
    </div>
  );
}

function doctorPhoto(doctor: Doctor, pending: boolean): PhotoSource | null {
  return photoFrom(doctor.photo) ?? (pending ? { kind: "pending", label: `Retrato de ${doctor.display_name}` } : null);
}

function Credentials({ doctor }: { doctor: Doctor }) {
  if (!doctor.cmp_number) return null;
  return (
    <p className="mt-2 flex items-start gap-1.5 text-sm text-sage-strong">
      <BadgeCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>
        CMP {doctor.cmp_number}
        {doctor.rne_number ? ` · RNE ${doctor.rne_number}` : ""}
        <span className="sr-only"> (verificado)</span>
      </span>
    </p>
  );
}

/** Ficha de profesional: retrato, nombre, especialidad y credenciales verificadas. */
export function DoctorProfileCard({ doctor, pendingPhoto = false }: { doctor: Doctor; pendingPhoto?: boolean }) {
  const photo = doctorPhoto(doctor, pendingPhoto);
  return (
    <SiteLink href={doctor.path} className="group block">
      {photo ? (
        <Photo source={photo} sizes="(min-width: 1024px) 270px, 45vw" className="aspect-[4/5] rounded-2xl" />
      ) : (
        <Initials name={doctor.full_name} className="aspect-[4/5] rounded-2xl" />
      )}
      <p className="mt-4 font-display text-[1.35rem] leading-snug text-plum-strong group-hover:text-plum">{doctor.display_name}</p>
      {doctor.specialty ? <p className="mt-1 text-muted">{doctor.specialty}</p> : null}
      <Credentials doctor={doctor} />
    </SiteLink>
  );
}

/** Equipo: fichas de profesionales publicados (CMP/RNE verificados). Con uno solo, ficha destacada horizontal. */
export function HomeTeam({ doctors, intro, pendingPhotos = false }: { doctors: Doctor[]; intro?: string; pendingPhotos?: boolean }) {
  if (!doctors.length) return null;
  const single = doctors.length === 1 ? doctors[0]! : null;
  return (
    <section id="equipo" aria-labelledby="equipo-title" className="scroll-mt-24 border-y border-line bg-paper">
      <div className={cn(HOME_WIDTH, "py-20 lg:py-24")}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Eyebrow>Equipo médico</Eyebrow>
            <h2 id="equipo-title" className="mt-4 text-[2.2rem] leading-[1.08] sm:text-5xl">
              Profesionales que te acompañan
            </h2>
            {intro ? <p className="mt-5 text-lg text-muted">{intro}</p> : null}
          </div>
          <SiteLink href="/equipo" className="inline-flex shrink-0 items-center gap-2 font-semibold text-plum underline underline-offset-4">
            Conoce al equipo <ArrowRight aria-hidden="true" className="size-4" />
          </SiteLink>
        </div>
        {single ? (
          <div className="mt-12 grid items-center gap-8 sm:grid-cols-[minmax(0,18rem)_1fr] sm:gap-12">
            <DoctorProfileCard doctor={single} pendingPhoto={pendingPhotos} />
            {single.bio_md ? <p className="max-w-xl text-lg text-muted">{plainText(single.bio_md, 320)}</p> : null}
          </div>
        ) : (
          <ul className={cn("mt-12 grid grid-cols-2 gap-x-5 gap-y-10 sm:gap-x-8", doctors.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4")}>
            {doctors.slice(0, 4).map((d) => (
              <li key={d.id}>
                <DoctorProfileCard doctor={d} pendingPhoto={pendingPhotos} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
