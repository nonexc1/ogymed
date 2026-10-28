import type { Metadata } from "next";
import Link from "next/link";

import { ClinicView } from "@/components/site/clinic-view";
import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import { HomeView } from "@/components/site/home/home-view";
import { DEMO_NAV, getDemoClinic, getDemoHomeData } from "@/features/cms/demo-home";
import { requireStaff } from "@/lib/auth/staff";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Vista de demostración" };

/**
 * Vista de demostración PRIVADA (sólo personal con sesión y MFA; noindex y no-store por estar bajo
 * /admin). Muestra la composición completa con datos ficticios de src/features/cms/demo-home.ts y huecos
 * de fotografía rotulados. No escribe ni publica nada.
 */
export default async function DemoPage({ searchParams }: PageProps<"/admin/demo">) {
  await requireStaff(["admin", "editor"]);
  const vista = (await searchParams).vista === "la-clinica" ? "la-clinica" : "portada";
  const data = getDemoHomeData();
  const clinic = vista === "la-clinica" ? await getDemoClinic() : null;
  const tab = (href: string, label: string, active: boolean) => (
    <Link href={href} aria-current={active ? "page" : undefined} className={cn("rounded-md px-2 py-0.5 font-semibold underline-offset-2", active ? "bg-warning text-paper" : "underline")}>
      {label}
    </Link>
  );
  return (
    <>
      <div role="note" className="relative z-50 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-warning-soft px-5 py-2.5 text-center text-sm text-warning shadow-sm">
        <span>
          <strong>Vista de demostración privada</strong> · Servicios, profesionales, horario y fotografías son de ejemplo y no están publicados.
        </span>
        <span className="flex gap-2">
          {tab("/admin/demo", "Portada", vista === "portada")}
          {tab("/admin/demo?vista=la-clinica", "La clínica", vista === "la-clinica")}
          <Link href="/admin/contenido" className="font-semibold underline underline-offset-2">
            Volver al panel
          </Link>
        </span>
      </div>
      <Header items={DEMO_NAV} whatsapp={data.settings.whatsapp_e164} bookingLabel={data.bookingLabel} />
      <main id="contenido">
        {clinic ? (
          <ClinicView
            page={clinic.page}
            settings={clinic.settings}
            facts={clinic.facts}
            bookingLabel={data.bookingLabel}
            canRequest
            photo={{ kind: "pending", label: "Sala de espera, recepción o consultorio REAL de la sede (4:5)" }}
          />
        ) : (
          <HomeView data={data} />
        )}
      </main>
      <Footer settings={data.settings} legal={[]} />
    </>
  );
}
