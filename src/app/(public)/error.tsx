"use client";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/surface";

export default function PublicError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Container className="py-24">
      <h1 className="text-4xl">Algo no salió bien</h1>
      <p className="mt-3 max-w-prose text-lg text-muted">
        No pudimos mostrar esta página. Inténtalo de nuevo en unos segundos o vuelve a la portada.
      </p>
      <Button className="mt-8" onClick={reset}>
        Reintentar
      </Button>
    </Container>
  );
}
