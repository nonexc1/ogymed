import { z } from "zod";

import { emailSchema, nameSchema, optionalPhoneSchema } from "@/lib/validation";

export const contactSchema = z
  .object({
    full_name: nameSchema,
    email: z.union([emailSchema, z.literal("")]).optional(),
    phone: optionalPhoneSchema,
    topic: z.enum(["cita", "informacion", "otro"], { error: "Elige un motivo" }),
    message: z.string().trim().max(1000, "Máximo 1000 caracteres").default(""),
    privacy: z.literal(true, { error: "Necesitamos tu autorización para responderte" }),
    // Honeypot: debe llegar vacío.
    website: z.string().max(0).optional(),
  })
  .refine((v) => Boolean(v.email) || Boolean(v.phone), {
    message: "Indica un correo o un teléfono",
    path: ["email"],
  });

export type ContactInput = z.input<typeof contactSchema>;
export type ContactOutput = z.output<typeof contactSchema>;
