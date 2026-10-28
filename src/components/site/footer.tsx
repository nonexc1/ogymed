import { CookieSettingsButton } from "@/components/analytics/consent-banner";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { Container } from "@/components/ui/surface";
import type { PublicSettings } from "@/features/cms/types";
import { formatPhone, telUrl, whatsappUrl } from "@/lib/contact-links";

import { Logo } from "./logo";
import { addressText, OpeningHours } from "./opening-hours";
import { SiteLink } from "./site-link";

const SOCIAL_LABELS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
  linkedin: "LinkedIn",
};

export function Footer({ settings, legal }: { settings: PublicSettings; legal: { href: string; label: string }[] }) {
  const address = addressText(settings);
  const socials = Object.entries(settings.social_links).filter(([, url]) => Boolean(url));
  return (
    <footer className="mt-24 border-t border-line bg-paper pb-24 sm:pb-0">
      <Container className="grid gap-10 py-14 md:grid-cols-4">
        <div className="space-y-3 md:col-span-1">
          <Logo name={settings.clinic_name} descriptor />
          <p className="text-muted">Clínica ginecológica en Santiago de Surco, Lima.</p>
        </div>
        <div>
          <h2 className="font-sans text-base font-semibold text-ink">Ubicación</h2>
          <address className="mt-2 not-italic text-muted">
            {address ?? `${settings.district}, ${settings.city}`}
            {settings.address_reference ? <span className="block text-sm">{settings.address_reference}</span> : null}
          </address>
          {settings.google_maps_url ? (
            <TrackedLink
              event="click_directions"
              position="footer"
              href={settings.google_maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-plum underline underline-offset-4"
            >
              Cómo llegar<span className="sr-only"> (abre Google Maps en una pestaña nueva)</span>
            </TrackedLink>
          ) : null}
        </div>
        {settings.phone_e164 || settings.whatsapp_e164 || settings.public_email || settings.opening_hours.length ? (
        <div>
          <h2 className="font-sans text-base font-semibold text-ink">Contacto y horarios</h2>
          <ul className="mt-2 space-y-1 text-muted">
            {settings.phone_e164 ? (
              <li>
                <TrackedLink event="click_call" position="footer" href={telUrl(settings.phone_e164)} className="text-plum underline-offset-4 hover:underline">
                  {formatPhone(settings.phone_e164)}
                </TrackedLink>
              </li>
            ) : null}
            {settings.whatsapp_e164 ? (
              <li>
                <TrackedLink
                  event="click_whatsapp"
                  position="footer"
                  href={whatsappUrl(settings.whatsapp_e164)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-plum underline-offset-4 hover:underline"
                >
                  WhatsApp<span className="sr-only"> (se abre en una pestaña nueva)</span>
                </TrackedLink>
              </li>
            ) : null}
            {settings.public_email ? (
              <li>
                <a href={`mailto:${settings.public_email}`} className="text-plum underline-offset-4 hover:underline">
                  {settings.public_email}
                </a>
              </li>
            ) : null}
          </ul>
          <div className="mt-3 text-muted">
            <OpeningHours settings={settings} />
          </div>
        </div>
        ) : null}
        <div>
          <h2 className="font-sans text-base font-semibold text-ink">Información</h2>
          <ul className="mt-2 space-y-1">
            {legal.map((l) => (
              <li key={l.href}>
                <SiteLink href={l.href} className="text-muted underline-offset-4 hover:text-plum hover:underline">
                  {l.label}
                </SiteLink>
              </li>
            ))}
            <li>
              <CookieSettingsButton className="text-muted underline-offset-4 hover:text-plum hover:underline" />
            </li>
          </ul>
          {socials.length ? (
            <ul className="mt-4 flex flex-wrap gap-3" aria-label="Redes sociales">
              {socials.map(([key, url]) => (
                <li key={key}>
                  <a href={url} target="_blank" rel="noopener noreferrer me" className="text-plum underline underline-offset-4">
                    {SOCIAL_LABELS[key] ?? key}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </Container>
      <Container className="flex flex-col gap-2 border-t border-line py-6 text-sm text-muted sm:flex-row sm:justify-between">
        <p>
          © {new Date().getFullYear()} {settings.legal_name ?? settings.clinic_name}
          {settings.ruc ? ` · RUC ${settings.ruc}` : ""}
        </p>
        <a href="/admin" className="text-muted hover:text-plum" rel="nofollow">
          Acceso del personal
        </a>
      </Container>
    </footer>
  );
}
