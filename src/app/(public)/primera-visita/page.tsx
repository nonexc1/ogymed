import { CmsPage, cmsPageMetadata } from "@/components/site/cms-page";
import { ContactActions } from "@/components/site/blocks";
import { getSettings } from "@/features/cms/queries";

export const revalidate = 3600;
export const generateMetadata = () => cmsPageMetadata("first_visit", "/primera-visita", "Primera visita");

export default async function FirstVisitPage() {
  const settings = await getSettings();
  return (
    <CmsPage kind="first_visit" path="/primera-visita">
      <ContactActions
        settings={settings}
        bookingLabel={settings.booking_mode === "off" ? "Solicitar cita" : "Reservar cita"}
        position="section"
        className="mt-12"
      />
    </CmsPage>
  );
}
