import { z } from "zod";

import { emailSchema, nameSchema, optionalPhoneSchema } from "@/lib/validation";

/**
 * Campos del libro de reclamaciones virtual. PENDIENTE DE VALIDACIÓN LEGAL: la lista de campos, los
 * textos y los plazos deben confirmarse con asesoría local antes de habilitarlo en producción.
 */
export const complaintSchema = z
  .object({
    kind: z.enum(["reclamo", "queja"], { error: "Elige reclamo o queja" }),
    consumer_name: nameSchema,
    document_type: z.enum(["DNI", "CE", "PASAPORTE", "OTRO"]),
    document_number: z.string().trim().min(4, "Documento inválido").max(20).regex(/^[A-Za-z0-9-]+$/, "Documento inválido"),
    address: z.string().trim().max(250).optional().default(""),
    phone_e164: optionalPhoneSchema,
    email: emailSchema,
    is_minor: z.boolean().default(false),
    guardian_name: z.string().trim().max(160).optional().default(""),
    service_description: z.string().trim().min(2, "Describe el servicio").max(500),
    amount_pen: z
      .string()
      .trim()
      .optional()
      .default("")
      .refine((v) => v === "" || /^\d{1,7}(\.\d{1,2})?$/.test(v), "Monto inválido"),
    detail: z.string().trim().min(10, "Describe el detalle (mínimo 10 caracteres)").max(3000),
    consumer_request: z.string().trim().min(2, "Indica tu pedido").max(1500),
    privacy: z.literal(true, { error: "Necesitamos tu autorización para registrar el reclamo" }),
    // Honeypot (ver features/contact/schema.ts).
    website: z.string().max(200).optional(),
  })
  .refine((v) => !v.is_minor || v.guardian_name.length >= 2, { message: "Indica el nombre del padre, madre o apoderado", path: ["guardian_name"] });

export type ComplaintInput = z.input<typeof complaintSchema>;
export type ComplaintOutput = z.output<typeof complaintSchema>;
