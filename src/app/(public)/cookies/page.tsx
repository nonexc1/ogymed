import { CookieSettingsButton } from "@/components/analytics/consent-banner";
import { CmsPage, cmsPageMetadata } from "@/components/site/cms-page";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/surface";
import { CONSENT_COOKIE, CONSENT_MAX_AGE_DAYS } from "@/lib/analytics/policy";

export const revalidate = 3600;
export const generateMetadata = () => cmsPageMetadata("cookies", "/cookies", "Cookies");

/** Tabla técnica generada desde el código (fuente de verdad de lo que realmente se usa). */
export default function CookiesPage() {
  return (
    <CmsPage kind="cookies" path="/cookies">
      <Card className="mt-12 max-w-3xl space-y-4">
        <h2 className="text-2xl">Cookies que usa este sitio</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-base">
            <caption className="sr-only">Cookies por categoría</caption>
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="py-2 pr-4">Nombre</th>
                <th scope="col" className="py-2 pr-4">Categoría</th>
                <th scope="col" className="py-2 pr-4">Finalidad</th>
                <th scope="col" className="py-2">Duración</th>
              </tr>
            </thead>
            <tbody className="align-top text-muted">
              <tr className="border-b border-line">
                <td className="py-2 pr-4 font-mono text-sm">{CONSENT_COOKIE}</td>
                <td className="py-2 pr-4">Necesaria</td>
                <td className="py-2 pr-4">Recordar tu elección sobre cookies.</td>
                <td className="py-2">{CONSENT_MAX_AGE_DAYS} días</td>
              </tr>
              <tr className="border-b border-line">
                <td className="py-2 pr-4 font-mono text-sm">ogymed_booking</td>
                <td className="py-2 pr-4">Necesaria</td>
                <td className="py-2 pr-4">Mantener de forma segura tu reserva en curso.</td>
                <td className="py-2">Hasta 6 horas</td>
              </tr>
              <tr className="border-b border-line">
                <td className="py-2 pr-4 font-mono text-sm">ogymed_manage</td>
                <td className="py-2 pr-4">Necesaria</td>
                <td className="py-2 pr-4">Sesión temporal para gestionar tu cita.</td>
                <td className="py-2">30 minutos</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-sm">_ga, _ga_*</td>
                <td className="py-2 pr-4">Analítica (opcional)</td>
                <td className="py-2 pr-4">Google Analytics 4, sólo si la aceptas y sólo en páginas generales.</td>
                <td className="py-2">Según configuración de la propiedad GA4</td>
              </tr>
            </tbody>
          </table>
        </div>
        <CookieSettingsButton className={buttonVariants({ variant: "secondary" })} />
      </Card>
    </CmsPage>
  );
}
