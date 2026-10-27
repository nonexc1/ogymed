import type { Metadata } from "next";

import { Card, Container } from "@/components/ui/surface";
import { AccessRedeem } from "@/features/booking/access-redeem";
import { privateMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = privateMetadata("Acceso a tu cita");

export default function AccessPage() {
  return (
    <Container className="py-16">
      <Card className="mx-auto max-w-xl space-y-4">
        <h1 className="text-3xl">Gestionar tu cita</h1>
        <AccessRedeem />
        <noscript>
          <p className="text-muted">Para continuar necesitas activar JavaScript o comunicarte con recepción.</p>
        </noscript>
      </Card>
    </Container>
  );
}
