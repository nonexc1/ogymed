import type { Metadata } from "next";

import { MfaForm } from "./mfa-form";

export const metadata: Metadata = { title: "Verificación en dos pasos" };

export default function MfaPage() {
  return <MfaForm />;
}
