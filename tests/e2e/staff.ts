import { createHmac, randomBytes } from "node:crypto";

import type { Page } from "@playwright/test";

import { sql } from "./db";

const API = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";

/** TOTP RFC 6238 (SHA-1, 30 s, 6 dígitos) para completar el MFA en las pruebas. */
export function totp(base32Secret: string, at = Date.now()): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = base32Secret.replace(/=+$/, "").toUpperCase();
  let bits = "";
  for (const c of clean) bits += alphabet.indexOf(c).toString(2).padStart(5, "0");
  const bytes = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 1000 / 30)));
  const hmac = createHmac("sha1", bytes).update(counter).digest();
  const offset = hmac[hmac.length - 1]! & 0xf;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return code.toString().padStart(6, "0");
}

/** Crea un usuario de personal con contraseña aleatoria vía Admin API (clave secreta local). */
export async function createStaffUser(roles: string[], opts: { doctorId?: string; canReviewMedical?: boolean } = {}) {
  const email = `staff-${Date.now()}-${randomBytes(3).toString("hex")}@example.test`;
  const password = `Prueba-${randomBytes(9).toString("base64url")}9a`;
  const res = await fetch(`${API}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: process.env.SUPABASE_SECRET_KEY!, Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!res.ok) throw new Error(`No se pudo crear el usuario: ${res.status}`);
  const user = (await res.json()) as { id: string };
  await sql("insert into public.staff_profiles (user_id, display_name, doctor_id, can_review_medical) values ($1, $2, $3, $4)", [
    user.id, `Personal ${roles.join("+")}`, opts.doctorId ?? null, opts.canReviewMedical ?? false,
  ]);
  for (const r of roles) await sql("insert into public.staff_roles (user_id, role) values ($1, $2)", [user.id, r]);
  return { id: user.id, email, password };
}

/** Inicia sesión y completa el alta de MFA (primera vez) o la verificación. Devuelve el secreto TOTP. */
export async function loginWithMfa(page: Page, user: { email: string; password: string }, secret?: string) {
  await page.goto("/admin/login");
  await page.getByLabel("Correo").fill(user.email);
  await page.getByLabel("Contraseña").fill(user.password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.getByRole("heading", { name: "Verificación en dos pasos" }).waitFor();
  let key = secret;
  if (!key) {
    key = (await page.getByTestId("totp-secret").textContent())!.trim();
  } else {
    await page.getByText("Escribe el código actual").waitFor();
  }
  await page.getByLabel("Código de 6 dígitos").fill(totp(key));
  await page.getByRole("button", { name: "Verificar" }).click();
  await page.waitForURL(/\/admin$/);
  return key;
}
