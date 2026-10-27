import type { Metadata } from "next";

import { Alert, Card } from "@/components/ui/surface";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function LoginPage() {
  if (!isSupabaseConfigured) {
    // Sólo nombres de variables, nunca valores: ayuda a diagnosticar un despliegue sin base de datos.
    const missing = [
      !publicEnv.NEXT_PUBLIC_SUPABASE_URL && "NEXT_PUBLIC_SUPABASE_URL",
      !publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    ].filter(Boolean);
    return (
      <Card>
        <h1 className="text-3xl">Iniciar sesión</h1>
        <Alert tone="warning" title="Este despliegue no está conectado a la base de datos" className="mt-6">
          <p>
            Falta configurar en el entorno: <code className="text-sm">{missing.join(", ")}</code>. Sin base de datos
            no hay acceso del personal y la web pública no muestra servicios, profesionales ni páginas. Tras añadir las
            variables, vuelve a desplegar. Pasos en <code className="text-sm">docs/DEPLOYMENT.md</code>.
          </p>
        </Alert>
      </Card>
    );
  }
  return <LoginForm />;
}
