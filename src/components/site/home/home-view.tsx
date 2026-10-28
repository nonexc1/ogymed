import type { HomeData } from "@/features/cms/home";

import { HomeFacts, HomeHero } from "./hero";
import { HomeClinic, HomeFaq, HomeLocation, HomeVisit } from "./more-sections";
import { HomeServices, HomeTeam } from "./services-team";

/**
 * Composición de la portada (la usan la web pública con datos aprobados y la vista de demostración
 * privada). Cada sección se omite si no tiene contenido real: nunca se rellenan huecos en producción.
 */
export function HomeView({ data }: { data: HomeData }) {
  return (
    <>
      <HomeHero {...data.hero} bookingLabel={data.bookingLabel} whatsapp={data.settings.whatsapp_e164} />
      <HomeFacts facts={data.facts} />
      <HomeServices services={data.services.items} intro={data.services.intro} photo={data.services.photo} />
      <HomeTeam doctors={data.team.items} intro={data.team.intro} pendingPhotos={data.team.pendingPhotos} />
      <HomeClinic clinic={data.clinic} />
      <HomeVisit data={data} />
      <HomeFaq faqs={data.faqs} />
      <HomeLocation settings={data.settings} photo={data.location.photo} className="pb-4 lg:pb-6" />
    </>
  );
}
