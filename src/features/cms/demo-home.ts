import "server-only";

import { homeFacts, HOME_DEFAULTS, type HomeData } from "./home";
import { getPage } from "./queries";
import { type Doctor, EMPTY_SETTINGS, type Faq, type Page, type PublicSettings, type Service } from "./types";

/**
 * DATOS FICTICIOS para la vista de demostración privada (/admin/demo). Nunca se publican ni se guardan
 * en la base. Los servicios son los candidatos del encargo con sus borradores pendientes de revisión;
 * los profesionales, el horario y el número son ejemplos evidentes («Ejemplo», «00000», número inválido).
 */
const settings: PublicSettings = {
  ...EMPTY_SETTINGS,
  // Número inválido a propósito (prefijo 0): el enlace de ejemplo no llega a nadie.
  whatsapp_e164: "+51000000000",
  opening_hours: [{ days: [1, 2, 3, 4, 5], opens: "09:00", closes: "19:00" }],
};

const service = (slug: string, name: string, category: string, summary: string): Service =>
  ({ id: `demo-${slug}`, slug, name, category, summary, path: "#servicios", faqs: [], updatedAt: "", is_demo: true }) as unknown as Service;

const SERVICES: Service[] = [
  service("consulta-ginecologica", "Consulta ginecológica", "Consultas", "Una consulta para hablar de tu salud ginecológica, resolver tus dudas y, si hace falta, realizar un examen o indicar pruebas."),
  service("prevencion-y-controles", "Prevención y controles", "Prevención", "Controles periódicos para cuidar tu salud ginecológica, incluidas las pruebas de tamizaje de cáncer de cuello uterino."),
  service("ecografia-ginecologica", "Ecografía ginecológica", "Diagnóstico", "Una prueba de imagen que permite ver el útero y los ovarios para estudiar síntomas o hacer seguimiento."),
  service("colposcopia", "Colposcopia", "Diagnóstico", "Un examen del cuello uterino con un instrumento de aumento, que suele indicarse tras un resultado anormal de Papanicolaou o de VPH."),
  service("planificacion-familiar", "Planificación familiar", "Consultas", "Orientación para elegir el método anticonceptivo que mejor se adapte a tu salud, tus planes y tus preferencias."),
  service("menopausia", "Menopausia", "Consultas", "Acompañamiento durante la perimenopausia y la menopausia: síntomas, salud a largo plazo y opciones de tratamiento."),
];

const doctor = (slug: string, honorific: string, name: string): Doctor =>
  ({
    id: `demo-${slug}`,
    slug,
    honorific,
    full_name: name,
    display_name: `${honorific} ${name}`,
    specialty: "Ginecología (ejemplo)",
    cmp_number: "00000",
    rne_number: null,
    bio_md: "",
    background_md: "",
    path: "#equipo",
    updatedAt: "",
    is_demo: true,
  }) as unknown as Doctor;

const DOCTORS: Doctor[] = [
  doctor("ejemplo-a", "Dra.", "Ana Ejemplo"),
  doctor("ejemplo-b", "Dra.", "Carla Ejemplo"),
  doctor("ejemplo-c", "Dr.", "Luis Ejemplo"),
];

const faq = (id: string, question: string, answer_md: string, category: string): Faq => ({ id, question, answer_md, category, is_demo: true });

const FAQS: Faq[] = [
  faq("d1", "¿Necesito crear una cuenta para pedir una cita?", "No. Solo te pedimos tu nombre y tus datos de contacto.", "reservas"),
  faq("d2", "¿Cómo sé que mi cita está confirmada?", "Recepción te confirma la fecha y la hora por el medio de contacto que indiques.", "reservas"),
  faq("d3", "¿Puedo cambiar o cancelar mi cita?", "Sí, comunicándote con recepción dentro del plazo de nuestra política de citas.", "reservas"),
  faq("d4", "¿Qué datos me piden para agendar?", "Tu nombre y un medio de contacto. No te pedimos síntomas ni documentos por la web.", "general"),
];

export function getDemoHomeData(): HomeData {
  const bookingLabel = "Solicitar cita";
  return {
    settings,
    bookingLabel,
    requestKind: "form",
    hero: { ...HOME_DEFAULTS, photo: { kind: "pending", label: "Retrato editorial con luz natural, sin batas ni consultorio (4:3)" } },
    facts: homeFacts(settings, "form", bookingLabel),
    services: {
      items: SERVICES,
      intro: "Atención ginecológica en Santiago de Surco. Elige un servicio para saber en qué consiste, qué esperar y cómo pedir tu cita.",
      photo: { kind: "pending", label: "Detalle cálido o bodegón vertical (4:5)" },
    },
    team: {
      items: DOCTORS,
      intro: "Conoce a los profesionales que te atienden en OGYMED: su especialidad, sus credenciales verificadas y los servicios que realizan.",
      pendingPhotos: true,
    },
    clinic: {
      title: "La clínica",
      intro: "OGYMED es una clínica dedicada a la salud ginecológica, ubicada en Santiago de Surco, Lima.",
      photo: { kind: "pending", label: "Sala de espera o recepción real de la sede (16:9)" },
    },
    visit: { firstVisitPublished: true, photo: { kind: "pending", label: "Detalle de preparación: libreta, manos, luz natural (4:3)" } },
    faqs: FAQS,
    location: { photo: { kind: "pending", label: "Fachada o acceso de la sede (4:3)" } },
  };
}

export const DEMO_NAV = [
  { href: "#servicios", label: "Servicios" },
  { href: "#equipo", label: "Equipo médico" },
  { href: "#clinica", label: "La clínica" },
  { href: "#visita", label: "Primera visita" },
  { href: "#contacto", label: "Contacto" },
];

/** «La clínica» para la demostración: el texto PUBLICADO si existe (o el de la carga inicial) con fotografía rotulada. */
export async function getDemoClinic(): Promise<{ page: Page; settings: PublicSettings; facts: HomeData["facts"] }> {
  const published = await getPage("clinic");
  const page: Page =
    published ??
    ({
      id: "demo-clinic",
      kind: "clinic",
      title: "La clínica",
      intro: "OGYMED es una clínica dedicada a la salud ginecológica, ubicada en Santiago de Surco, Lima.",
      body_md: [
        "## Nuestro enfoque",
        "",
        "En OGYMED nos dedicamos a la ginecología. Queremos que cada visita sea clara desde el primer contacto: que sepas qué esperar, cómo pedir tu cita y cómo cambiarla si lo necesitas.",
        "",
        "## Cómo trabajamos",
        "",
        "- **Citas sencillas.** Puedes pedir tu cita en línea en pocos pasos. Todos los horarios se muestran en hora de Lima.",
        "- **Privacidad desde el inicio.** Para agendar solo pedimos tus datos de contacto. No solicitamos síntomas, diagnósticos ni historia clínica por la web.",
        "- **Información revisada.** Los contenidos de salud que publicamos pasan antes por la revisión de un profesional de nuestro equipo.",
        "",
        "## Dónde estamos",
        "",
        "Atendemos en Santiago de Surco, Lima.",
      ].join("\n"),
      sections: {},
      seo: {},
      path: "/la-clinica",
      updatedAt: "",
      is_demo: true,
    } as unknown as Page);
  return { page, settings, facts: homeFacts(settings, "form", "Solicitar cita") };
}
