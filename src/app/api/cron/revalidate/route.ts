import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";

import { CONTENT_TAG, SETTINGS_TAG } from "@/features/cms/queries";
import { fail, json } from "@/lib/api";
import { isAuthorizedCron } from "@/lib/security/cron";

/**
 * Invalida la caché de contenido y configuración. Uso operativo (p. ej. tras restaurar un backup o
 * editar datos directamente en la base) y en pruebas. Protegido con CRON_SECRET; no está en vercel.json.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) return fail("unauthorized", 401);
  revalidateTag(CONTENT_TAG, { expire: 0 });
  revalidateTag(SETTINGS_TAG, { expire: 0 });
  return json({ ok: true });
}
