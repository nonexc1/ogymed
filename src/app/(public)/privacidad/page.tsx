import { CmsPage, cmsPageMetadata } from "@/components/site/cms-page";

export const revalidate = 3600;
export const generateMetadata = () => cmsPageMetadata("privacy", "/privacidad", "Privacidad");

export default function PrivacyPage() {
  return <CmsPage kind="privacy" path="/privacidad" />;
}
