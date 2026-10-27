"use client";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/surface";

/** Si la agenda falla, se ofrece contacto directo: nunca se pierde la vía para pedir cita. */
export default function BookingError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Container className="py-24">
      <h1 className="text-4xl">La reserva en línea no está disponible ahora</h1>
      <p className="mt-3 max-w-prose text-lg text-muted">
        Puedes intentarlo de nuevo en unos minutos o comunicarte con recepción desde la página de contacto.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button onClick={reset}>Reintentar</Button>
        <a href="/contacto" className="inline-flex min-h-11 items-center rounded-full border border-plum/30 px-5 font-semibold text-plum">
          Contacto
        </a>
      </div>
    </Container>
  );
}
