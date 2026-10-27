import { z } from "zod";

import { emailSchema, nameSchema } from "@/lib/validation";

export const privacyRequestSchema = z.object({
  kind: z.enum(["acceso", "rectificacion", "cancelacion", "oposicion", "revocacion", "otro"]),
  requester_name: nameSchema,
  email: emailSchema,
  detail: z.string().trim().max(2000).default(""),
  // Honeypot (ver features/contact/schema.ts).
  website: z.string().max(200).optional(),
});

export type PrivacyRequestInput = z.input<typeof privacyRequestSchema>;
export type PrivacyRequestOutput = z.output<typeof privacyRequestSchema>;
