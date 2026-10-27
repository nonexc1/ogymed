import { SiteLink } from "@/components/site/site-link";
import { Container } from "@/components/ui/surface";

export default function NotFound() {
  return (
    <Container className="py-24">
      <h1 className="text-4xl">No encontramos esta página</h1>
      <p className="mt-3 max-w-prose text-lg text-muted">Puede que la dirección haya cambiado o que el contenido ya no esté publicado.</p>
      <div className="mt-8 flex gap-4">
        <SiteLink href="/" className="font-semibold text-plum underline underline-offset-4">
          Ir a la portada
        </SiteLink>
        <SiteLink href="/contacto" className="font-semibold text-plum underline underline-offset-4">
          Contacto
        </SiteLink>
      </div>
    </Container>
  );
}
