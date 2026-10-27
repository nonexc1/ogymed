/** Tipos de página editables y si requieren revisión médica o validación legal. */
export const PAGE_KINDS: Record<string, { title: string; review: boolean; legal: boolean }> = {
  home: { title: "Portada", review: false, legal: false },
  clinic: { title: "La clínica", review: false, legal: false },
  first_visit: { title: "Primera visita", review: true, legal: false },
  faq: { title: "Preguntas frecuentes (introducción)", review: false, legal: false },
  contact: { title: "Contacto", review: false, legal: false },
  services_index: { title: "Servicios (índice)", review: false, legal: false },
  team_index: { title: "Equipo (índice)", review: false, legal: false },
  blog_index: { title: "Blog (índice)", review: false, legal: false },
  privacy: { title: "Política de privacidad", review: false, legal: true },
  cookies: { title: "Política de cookies", review: false, legal: true },
  terms: { title: "Términos y condiciones", review: false, legal: true },
  booking_policy: { title: "Política de citas", review: false, legal: true },
  complaints: { title: "Libro de reclamaciones (texto)", review: false, legal: true },
};
