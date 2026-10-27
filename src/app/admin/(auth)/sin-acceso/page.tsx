import type { Metadata } from "next";

import { Card } from "@/components/ui/surface";

export const metadata: Metadata = { title: "Sin acceso" };

export default function NoAccessPage() {
  return (
    <Card className="space-y-4">
      <h1 className="text-3xl">Sin acceso a esta sección</h1>
      <p className="text-muted">Tu usuario no tiene un perfil activo o el rol necesario. Si crees que es un error, contacta a un administrador.</p>
      <div className="flex gap-4">
        <a href="/admin" className="font-semibold text-plum underline underline-offset-4">
          Ir al inicio del panel
        </a>
        <form action="/admin/auth/logout" method="post">
          <button type="submit" className="font-semibold text-plum underline underline-offset-4">
            Cerrar sesión
          </button>
        </form>
      </div>
    </Card>
  );
}
