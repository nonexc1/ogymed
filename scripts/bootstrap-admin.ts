/**
 * Alta del PRIMER administrador (bootstrap). Uso:
 *   pnpm bootstrap:admin --email persona@dominio --name "Nombre Apellido"
 * Requiere NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY y NEXT_PUBLIC_SITE_URL en el entorno.
 * Envía una invitación (el usuario define contraseña y MFA) y le asigna el rol admin sólo si
 * todavía no existe ningún administrador. Las siguientes altas se hacen desde el panel.
 */
import { createClient } from "@supabase/supabase-js";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  const name = arg("name")?.trim();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  if (!email || !name) throw new Error("Uso: pnpm bootstrap:admin --email correo --name \"Nombre\"");
  if (!url || !key) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY");

  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  let userId: string | undefined;
  const invited = await db.auth.admin.inviteUserByEmail(email, { redirectTo: `${site}/admin/confirmar` });
  if (invited.data.user) {
    userId = invited.data.user.id;
  } else {
    // Puede existir ya (invitación previa): buscarlo.
    for (let page = 1; page <= 20 && !userId; page++) {
      const { data } = await db.auth.admin.listUsers({ page, perPage: 200 });
      userId = data.users.find((u) => u.email?.toLowerCase() === email)?.id;
      if (!data.users.length) break;
    }
    if (!userId) throw new Error(`No se pudo invitar: ${invited.error?.message ?? "error desconocido"}`);
  }
  const { data, error } = await db.rpc("bootstrap_first_admin", { p_user_id: userId, p_display_name: name });
  if (error) throw new Error(`bootstrap_first_admin falló: ${error.code}`);
  if (!(data as { ok: boolean }).ok) {
    console.info("Ya existe un administrador: usa el panel (Usuarios) para invitar más personal.");
    return;
  }
  console.info(`Invitación enviada a ${email}. Rol admin asignado. Debe abrir el correo, definir contraseña y MFA.`);
}

main().catch((e: Error) => {
  console.error(e.message);
  process.exit(1);
});
