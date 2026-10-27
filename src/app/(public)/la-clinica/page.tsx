import { CmsPage, cmsPageMetadata } from "@/components/site/cms-page";
import { LocationCard } from "@/components/site/blocks";
import { getSettings } from "@/features/cms/queries";

export const revalidate = 3600;
export const generateMetadata = () => cmsPageMetadata("clinic", "/la-clinica", "La clínica");

export default async function ClinicPage() {
  const settings = await getSettings();
  return (
    <CmsPage kind="clinic" path="/la-clinica">
      <div className="mt-12 max-w-xl">
        <LocationCard settings={settings} position="section" />
      </div>
    </CmsPage>
  );
}
