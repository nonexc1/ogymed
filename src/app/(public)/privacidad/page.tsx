import { CmsPage, cmsPageMetadata } from "@/components/site/cms-page";
import { Card } from "@/components/ui/surface";
import { PrivacyRequestForm } from "@/features/privacy/privacy-request-form";

export const revalidate = 3600;
export const generateMetadata = () => cmsPageMetadata("privacy", "/privacidad", "Privacidad");

export default function PrivacyPage() {
  return (
    <CmsPage kind="privacy" path="/privacidad">
      <Card className="mt-12 max-w-2xl">
        <h2 id="ejercer-derechos" className="text-2xl">Ejercer tus derechos</h2>
        <p className="mt-2 text-muted">Acceso, rectificación, cancelación, oposición o revocación del consentimiento sobre tus datos personales.</p>
        <div className="mt-4">
          <PrivacyRequestForm />
        </div>
      </Card>
    </CmsPage>
  );
}
