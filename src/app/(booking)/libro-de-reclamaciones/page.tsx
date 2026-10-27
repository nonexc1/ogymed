import type { Metadata } from "next";

import { Prose } from "@/components/site/prose";
import { Alert, Container } from "@/components/ui/surface";
import { renderMarkdown } from "@/features/cms/markdown";
import { getPage, getPrivacyVersion, getSettings } from "@/features/cms/queries";
import { ComplaintForm } from "@/features/complaints/complaint-form";
import { privateMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = privateMetadata("Libro de reclamaciones");

export default async function ComplaintsPage() {
  const [settings, page, privacy] = await Promise.all([getSettings(), getPage("complaints"), getPrivacyVersion()]);
  const enabled = settings.complaints_book_enabled && Boolean(privacy) && Boolean(settings.legal_name && settings.ruc);
  const providerLine = [settings.legal_name, settings.ruc ? `RUC ${settings.ruc}` : null, settings.address_line].filter(Boolean).join(" · ");
  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl">Libro de reclamaciones</h1>
        {providerLine ? <p className="mt-2 text-muted">{providerLine}</p> : null}
        {page ? <Prose html={renderMarkdown(page.body_md)} className="mt-6" /> : null}
        <div className="mt-8">
          {enabled ? (
            <ComplaintForm providerLine={providerLine} />
          ) : (
            <Alert tone="info" title="Registro en línea no disponible todavía">
              Para presentar un reclamo o queja, comunícate directamente con la clínica a través de la página de{" "}
              <a href="/contacto" className="text-plum underline underline-offset-4">
                contacto
              </a>
              .
            </Alert>
          )}
        </div>
      </div>
    </Container>
  );
}
