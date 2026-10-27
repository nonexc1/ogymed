import { CmsPage, cmsPageMetadata } from "@/components/site/cms-page";

export const revalidate = 3600;
export const generateMetadata = () => cmsPageMetadata("terms", "/terminos", "Términos y condiciones");

export default function TermsPage() {
  return <CmsPage kind="terms" path="/terminos" />;
}
