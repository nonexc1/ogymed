import type { Metadata } from "next";

import { ConfirmForm } from "./confirm-form";

export const metadata: Metadata = { title: "Activar acceso" };

export default function ConfirmPage() {
  return <ConfirmForm />;
}
