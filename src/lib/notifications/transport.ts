import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { Resend } from "resend";

import { emailTransport, serverEnv } from "@/lib/env.server";

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** Misma clave en reintentos → el proveedor no duplica el envío. */
  idempotencyKey?: string;
  attachments?: { filename: string; content: string; contentType: string }[];
};

export type SendResult = { ok: true; id: string } | { ok: false; retryable: boolean; error: string };

let resend: Resend | null = null;

/**
 * Envía un correo. Transportes:
 *  - resend: proveedor real (seguimiento de aperturas/clics desactivado a nivel de dominio).
 *  - dev-file: SÓLO desarrollo/pruebas; guarda el mensaje en .dev-mail/ (nunca sale a internet).
 *  - disabled: no envía y lo informa como error no reintentable. Nunca se finge un «enviado».
 */
export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  if (emailTransport === "disabled") {
    return { ok: false, retryable: false, error: "email_not_configured" };
  }
  if (emailTransport === "dev-file") {
    const dir = path.join(process.cwd(), ".dev-mail");
    await mkdir(dir, { recursive: true });
    const id = `dev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await writeFile(path.join(dir, `${id}.json`), JSON.stringify({ id, at: new Date().toISOString(), ...message }, null, 2));
    return { ok: true, id };
  }
  resend ??= new Resend(serverEnv.RESEND_API_KEY);
  try {
    const { data, error } = await resend.emails.send(
      {
        from: serverEnv.EMAIL_FROM!,
        to: [message.to],
        replyTo: serverEnv.EMAIL_REPLY_TO,
        subject: message.subject,
        text: message.text,
        html: message.html,
        attachments: message.attachments?.map((a) => ({
          filename: a.filename,
          content: Buffer.from(a.content).toString("base64"),
          contentType: a.contentType,
        })),
      },
      message.idempotencyKey ? { idempotencyKey: message.idempotencyKey } : undefined,
    );
    if (error || !data) {
      const name = error?.name ?? "unknown";
      // Errores de validación/credenciales no se arreglan reintentando.
      const retryable = !["validation_error", "missing_api_key", "invalid_api_key", "invalid_from_address"].includes(name);
      return { ok: false, retryable, error: `resend:${name}` };
    }
    return { ok: true, id: data.id };
  } catch {
    return { ok: false, retryable: true, error: "resend:network" };
  }
}
