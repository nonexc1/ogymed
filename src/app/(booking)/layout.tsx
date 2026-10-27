import type { Metadata, Viewport } from "next";

import "../globals.css";

import { Logo } from "@/components/site/logo";
import { Container } from "@/components/ui/surface";
import { getSettings } from "@/features/cms/queries";
import { siteUrl } from "@/lib/env";

import { fontVariables } from "../fonts";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Reserva · OGYMED", template: "%s · OGYMED" },
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export const viewport: Viewport = { themeColor: "#faf8f5", width: "device-width", initialScale: 1 };

/**
 * Root layout de reservas, autogestión y reclamaciones: SIN analítica ni scripts de terceros.
 * Al ser un root layout distinto, entrar aquí desde la web pública fuerza una carga completa.
 */
export default async function BookingLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <html lang="es-PE" className={fontVariables}>
      <body className="min-h-dvh">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-plum focus:px-4 focus:py-2 focus:text-ivory"
        >
          Saltar al contenido
        </a>
        <header className="border-b border-line bg-paper">
          <Container className="flex h-16 items-center justify-between">
            <a href="/" aria-label={`${settings.clinic_name}, volver a la portada`} className="rounded-lg">
              <Logo name={settings.clinic_name} />
            </a>
            <p className="text-sm text-muted">Horarios en hora de Lima</p>
          </Container>
        </header>
        <main id="contenido" tabIndex={-1} className="outline-none">
          {children}
        </main>
        <footer className="mt-16 border-t border-line">
          <Container className="flex flex-wrap gap-x-6 gap-y-2 py-6 text-sm text-muted">
            <a href="/privacidad" className="underline-offset-4 hover:underline">
              Privacidad
            </a>
            <a href="/politica-de-citas" className="underline-offset-4 hover:underline">
              Política de citas
            </a>
            <a href="/contacto" className="underline-offset-4 hover:underline">
              Contacto
            </a>
          </Container>
        </footer>
      </body>
    </html>
  );
}
