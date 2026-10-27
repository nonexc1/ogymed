import { z } from "zod";

/** Esquemas tolerantes para los snapshots publicados (la base garantiza la forma; aquí se valida igual). */
export const mediaSchema = z
  .object({
    bucket: z.string(),
    path: z.string(),
    alt: z.string(),
    width: z.number().nullable().optional(),
    height: z.number().nullable().optional(),
  })
  .nullable()
  .optional();

const seoSchema = z
  .object({
    title: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    og: mediaSchema,
  })
  .optional()
  .default({});

const faqItem = z.object({ q: z.string(), a: z.string() });

export const serviceSchema = z.object({
  slug: z.string(),
  name: z.string(),
  category: z.string().nullable().optional(),
  summary: z.string().default(""),
  body_md: z.string().default(""),
  audience_md: z.string().default(""),
  what_to_expect_md: z.string().default(""),
  preparation_md: z.string().default(""),
  faqs: z.array(faqItem).default([]),
  price_pen: z.number().nullable().optional(),
  duration: z.object({ min: z.number().nullable(), max: z.number().nullable() }).nullable().optional(),
  hero: mediaSchema,
  medical_reviewed_at: z.string().nullable().optional(),
  medical_reviewer: z.string().nullable().optional(),
  seo: seoSchema,
  is_demo: z.boolean().default(false),
});

export const doctorSchema = z.object({
  slug: z.string(),
  honorific: z.string().nullable().optional(),
  full_name: z.string(),
  display_name: z.string(),
  specialty: z.string().nullable().optional(),
  cmp_number: z.string().nullable().optional(),
  rne_number: z.string().nullable().optional(),
  credentials_verified_at: z.string().nullable().optional(),
  bio_md: z.string().default(""),
  background_md: z.string().default(""),
  photo: mediaSchema,
  seo: seoSchema,
  is_demo: z.boolean().default(false),
});

const personRef = z.object({ id: z.string().optional(), slug: z.string().optional(), name: z.string().nullable() }).nullable();

export const postSchema = z.object({
  slug: z.string(),
  title: z.string(),
  excerpt: z.string().default(""),
  body_md: z.string().default(""),
  cover: mediaSchema,
  author: personRef,
  reviewer: personRef,
  medical_reviewed_at: z.string().nullable().optional(),
  references: z
    .array(z.object({ title: z.string(), url: z.string().optional(), publisher: z.string().optional(), year: z.number().optional() }))
    .default([]),
  related_service_ids: z.array(z.string()).default([]),
  seo: seoSchema,
  is_demo: z.boolean().default(false),
});

export const pageSchema = z.object({
  kind: z.string(),
  title: z.string(),
  intro: z.string().default(""),
  body_md: z.string().default(""),
  sections: z.record(z.string(), z.unknown()).default({}),
  document_version: z.string().nullable().optional(),
  medical_reviewed_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
  seo: seoSchema,
  is_demo: z.boolean().default(false),
});

export const faqSchema = z.object({
  question: z.string(),
  answer_md: z.string(),
  category: z.string(),
  is_demo: z.boolean().default(false),
});

/** Secciones estructuradas de la portada (validadas también al guardar en el panel). */
export const homeSectionsSchema = z.object({
  hero_kicker: z.string().max(80).optional(),
  hero_title: z.string().max(140).optional(),
  hero_text: z.string().max(400).optional(),
  highlights: z.array(z.object({ title: z.string().max(80), text: z.string().max(240) })).max(4).optional(),
  facilities_text: z.string().max(800).optional(),
});

export type Media = z.infer<typeof mediaSchema>;
export type Service = z.infer<typeof serviceSchema> & { id: string; path: string; updatedAt: string };
export type Doctor = z.infer<typeof doctorSchema> & { id: string; path: string; updatedAt: string };
export type Post = z.infer<typeof postSchema> & { id: string; path: string; publishedAt: string; updatedAt: string };
export type Page = z.infer<typeof pageSchema> & { id: string; path: string; updatedAt: string };
export type Faq = z.infer<typeof faqSchema> & { id: string };

export const openingHoursSchema = z.array(
  z.object({
    days: z.array(z.number().int().min(1).max(7)).min(1),
    opens: z.string().regex(/^\d{2}:\d{2}$/),
    closes: z.string().regex(/^\d{2}:\d{2}$/),
  }),
);

export const socialLinksSchema = z
  .object({
    instagram: z.url().optional(),
    facebook: z.url().optional(),
    tiktok: z.url().optional(),
    youtube: z.url().optional(),
    linkedin: z.url().optional(),
  })
  .partial();

export const publicSettingsSchema = z.object({
  clinic_name: z.string(),
  legal_name: z.string().nullable(),
  ruc: z.string().nullable(),
  address_line: z.string().nullable(),
  address_reference: z.string().nullable(),
  district: z.string(),
  city: z.string(),
  region: z.string(),
  postal_code: z.string().nullable(),
  country_code: z.string(),
  latitude: z.coerce.number().nullable(),
  longitude: z.coerce.number().nullable(),
  phone_e164: z.string().nullable(),
  whatsapp_e164: z.string().nullable(),
  public_email: z.string().nullable(),
  opening_hours: openingHoursSchema.catch([]),
  opening_hours_note: z.string().nullable(),
  social_links: socialLinksSchema.catch({}),
  google_maps_url: z.string().nullable(),
  ga4_measurement_id: z.string().nullable(),
  gsc_verification_token: z.string().nullable(),
  booking_mode: z.enum(["off", "reception", "automatic"]),
  complaints_book_enabled: z.boolean(),
  privacy_policy_version: z.string().nullable(),
});

export type PublicSettings = z.infer<typeof publicSettingsSchema>;

export const EMPTY_SETTINGS: PublicSettings = {
  clinic_name: "OGYMED",
  legal_name: null,
  ruc: null,
  address_line: null,
  address_reference: null,
  district: "Santiago de Surco",
  city: "Lima",
  region: "Lima",
  postal_code: null,
  country_code: "PE",
  latitude: null,
  longitude: null,
  phone_e164: null,
  whatsapp_e164: null,
  public_email: null,
  opening_hours: [],
  opening_hours_note: null,
  social_links: {},
  google_maps_url: null,
  ga4_measurement_id: null,
  gsc_verification_token: null,
  booking_mode: "off",
  complaints_book_enabled: false,
  privacy_policy_version: null,
};
