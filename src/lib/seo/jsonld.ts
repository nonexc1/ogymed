import { mediaUrl } from "@/features/cms/media";
import type { Doctor, Post, PublicSettings } from "@/features/cms/types";
import { siteUrl } from "@/lib/env";

const CLINIC_ID = `${siteUrl}/#clinica`;
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/**
 * MedicalClinic sólo con propiedades confirmadas en la configuración (nada inventado:
 * sin AggregateRating, reseñas, ni datos ausentes).
 */
export function clinicJsonLd(s: PublicSettings) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "MedicalClinic",
    "@id": CLINIC_ID,
    name: s.clinic_name,
    url: siteUrl,
    medicalSpecialty: "Gynecologic",
    address: {
      "@type": "PostalAddress",
      ...(s.address_line ? { streetAddress: s.address_line } : {}),
      addressLocality: s.district,
      addressRegion: s.region,
      ...(s.postal_code ? { postalCode: s.postal_code } : {}),
      addressCountry: s.country_code,
    },
  };
  if (s.legal_name) data.legalName = s.legal_name;
  if (s.phone_e164) data.telephone = s.phone_e164;
  if (s.public_email) data.email = s.public_email;
  if (s.latitude !== null && s.longitude !== null) {
    data.geo = { "@type": "GeoCoordinates", latitude: s.latitude, longitude: s.longitude };
  }
  if (s.google_maps_url) data.hasMap = s.google_maps_url;
  if (s.opening_hours.length) {
    data.openingHoursSpecification = s.opening_hours.map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: h.days.map((d) => `https://schema.org/${DAY_NAMES[d - 1]}`),
      opens: h.opens,
      closes: h.closes,
    }));
  }
  const sameAs = Object.values(s.social_links).filter(Boolean);
  if (sameAs.length) data.sameAs = sameAs;
  return data;
}

export function breadcrumbJsonLd(items: { name: string; href: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: `${siteUrl}${c.href}`,
    })),
  };
}

export function doctorJsonLd(d: Doctor) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${siteUrl}${d.path}#persona`,
    name: d.full_name,
    url: `${siteUrl}${d.path}`,
    worksFor: { "@id": CLINIC_ID },
  };
  if (d.honorific) data.honorificPrefix = d.honorific;
  if (d.specialty) data.jobTitle = d.specialty;
  if (d.photo) data.image = mediaUrl(d.photo);
  const ids = [
    d.cmp_number ? { "@type": "PropertyValue", propertyID: "CMP", value: d.cmp_number } : null,
    d.rne_number ? { "@type": "PropertyValue", propertyID: "RNE", value: d.rne_number } : null,
  ].filter(Boolean);
  if (ids.length) data.identifier = ids;
  return data;
}

export function articleJsonLd(p: Post, settings: PublicSettings) {
  const url = `${siteUrl}${p.path}`;
  const author =
    p.author?.slug ? { "@type": "Person", name: p.author.name, url: `${siteUrl}/equipo/${p.author.slug}` } : { "@type": "Organization", name: p.author?.name ?? settings.clinic_name };
  const article: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: p.title,
    description: p.excerpt || undefined,
    datePublished: p.publishedAt,
    dateModified: p.updatedAt,
    mainEntityOfPage: url,
    author,
    publisher: { "@id": CLINIC_ID },
  };
  if (p.cover) article.image = mediaUrl(p.cover);
  const page: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    url,
    name: p.title,
  };
  if (p.medical_reviewed_at) page.lastReviewed = p.medical_reviewed_at.slice(0, 10);
  if (p.reviewer?.slug) page.reviewedBy = { "@type": "Person", name: p.reviewer.name, url: `${siteUrl}/equipo/${p.reviewer.slug}` };
  return [article, page];
}

export function faqJsonLd(items: { question: string; answerText: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({
      "@type": "Question",
      name: i.question,
      acceptedAnswer: { "@type": "Answer", text: i.answerText },
    })),
  };
}
