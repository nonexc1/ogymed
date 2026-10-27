import type { Metadata, Viewport } from "next";

import "../globals.css";

import { Analytics } from "@/components/analytics/analytics";
import { ConsentBanner } from "@/components/analytics/consent-banner";
import { DevNotice } from "@/components/site/dev-notice";
import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import { MobileCtaBar } from "@/components/site/mobile-cta-bar";
import { getSiteShell } from "@/features/cms/site-shell";
import { isValidMeasurementId } from "@/lib/analytics/policy";
import { siteUrl } from "@/lib/env";

import { fontVariables } from "../fonts";

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getSiteShell();
  return {
    metadataBase: new URL(siteUrl),
    title: { default: `${settings.clinic_name} · Clínica ginecológica en Surco`, template: `%s · ${settings.clinic_name}` },
    applicationName: settings.clinic_name,
    formatDetection: { telephone: false, email: false, address: false },
    // Verificación HTML opcional (propiedad de prefijo). La propiedad de dominio usa TXT DNS.
    verification: settings.gsc_verification_token ? { google: settings.gsc_verification_token } : undefined,
  };
}

export const viewport: Viewport = {
  themeColor: "#faf8f5",
  width: "device-width",
  initialScale: 1,
};

/**
 * Root layout de la web pública: el único que puede cargar GA4 (con consentimiento y sólo en rutas
 * permitidas). Reservas, autogestión y admin tienen root layouts propios sin trackers.
 */
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const { settings, nav, legalLinks, missing, bookingLabel } = await getSiteShell();
  const gaId = isValidMeasurementId(settings.ga4_measurement_id) ? settings.ga4_measurement_id : null;
  return (
    <html lang="es-PE" className={fontVariables}>
      <body className="min-h-dvh pb-20 sm:pb-0">
        <a
          href="#contenido"
          className="sr-only z-50 rounded-full bg-plum px-4 py-2 text-ivory focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Saltar al contenido
        </a>
        <DevNotice missing={missing} />
        <Header items={nav} whatsapp={settings.whatsapp_e164} bookingLabel={bookingLabel} />
        <main id="contenido" tabIndex={-1} className="outline-none">
          {children}
        </main>
        <Footer settings={settings} legal={legalLinks} />
        <MobileCtaBar whatsapp={settings.whatsapp_e164} phone={settings.phone_e164} bookingLabel={bookingLabel} />
        <ConsentBanner analyticsAvailable={Boolean(gaId)} />
        <Analytics measurementId={gaId} />
      </body>
    </html>
  );
}
