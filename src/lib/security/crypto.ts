import "server-only";

import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

/** Token opaco de alta entropía (256 bits) codificado en base64url. */
export const randomToken = () => randomBytes(32).toString("base64url");

export const sha256Hex = (value: string) => createHash("sha256").update(value).digest("hex");

export const hmacHex = (secret: string, value: string) => createHmac("sha256", secret).update(value).digest("hex");

/** Código numérico de 6 dígitos con distribución uniforme. */
export const sixDigitCode = () => randomInt(0, 1_000_000).toString().padStart(6, "0");

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
