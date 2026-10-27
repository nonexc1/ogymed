import { notFound } from "next/navigation";

import { FaqList } from "@/components/site/blocks";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/site/json-ld";
import { Container } from "@/components/ui/surface";
import { plainText } from "@/features/cms/markdown";
import { getPage, listFaqs } from "@/features/cms/queries";
import { breadcrumbJsonLd, faqJsonLd } from "@/lib/seo/jsonld";
import { pageMetadata } from "@/lib/seo/metadata";

export const revalidate = 3600;

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  reservas: "Reservas y cambios",
  visita: "Tu visita",
  pagos: "Pagos",
  ubicacion: "Ubicación",
};

export async function generateMetadata() {
  const page = await getPage("faq");
  return pageMetadata({
    title: page?.seo.title ?? "Preguntas frecuentes",
    description: page?.seo.description ?? page?.intro ?? "Respuestas sobre reservas, visitas y atención en OGYMED.",
    path: "/preguntas-frecuentes",
  });
}

export default async function FaqPage() {
  const [page, faqs] = await Promise.all([getPage("faq"), listFaqs()]);
  if (!page && faqs.length === 0) notFound();
  const crumbs = [
    { name: "Inicio", href: "/" },
    { name: "Preguntas frecuentes", href: "/preguntas-frecuentes" },
  ];
  const categories = [...new Set(faqs.map((f) => f.category))];
  return (
    <Container className="py-12 sm:py-16">
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs),
          ...(faqs.length ? [faqJsonLd(faqs.map((f) => ({ question: f.question, answerText: plainText(f.answer_md, 1000) })))] : []),
        ]}
      />
      <Breadcrumbs items={crumbs} />
      <header className="mt-6 max-w-3xl">
        <h1 className="text-4xl sm:text-5xl">{page?.title ?? "Preguntas frecuentes"}</h1>
        {page?.intro ? <p className="mt-4 text-lg text-muted">{page.intro}</p> : null}
      </header>
      <div className="mt-12 max-w-3xl space-y-12">
        {categories.map((c) => (
          <section key={c} aria-labelledby={`faq-${c}`}>
            <h2 id={`faq-${c}`} className="mb-4 text-2xl">
              {CATEGORY_LABELS[c] ?? c}
            </h2>
            <FaqList faqs={faqs.filter((f) => f.category === c)} />
          </section>
        ))}
      </div>
    </Container>
  );
}
