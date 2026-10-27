import { CmsPage, cmsPageMetadata } from "@/components/site/cms-page";

export const revalidate = 3600;
export const generateMetadata = () => cmsPageMetadata("booking_policy", "/politica-de-citas", "Política de citas");

export default function BookingPolicyPage() {
  return <CmsPage kind="booking_policy" path="/politica-de-citas" />;
}
