import { z } from "zod";

import { emailSchema, nameSchema, optionalPhoneSchema } from "@/lib/validation";

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const slotsQuerySchema = z
  .object({
    service: z.uuid(),
    doctor: z.uuid().optional(),
    from: dateKey,
    to: dateKey,
  })
  .refine((q) => q.from <= q.to && Date.parse(q.to) - Date.parse(q.from) <= 31 * 86_400_000, { message: "rango inválido" });

/** El cliente sólo elige servicio, profesional e inicio; duración, fin y estado los decide el servidor. */
export const holdSchema = z.object({
  serviceId: z.uuid(),
  doctorId: z.uuid(),
  startsAt: z.iso.datetime({ offset: true }),
});

export const bookingContactSchema = z.object({
  full_name: nameSchema,
  email: emailSchema,
  phone: optionalPhoneSchema,
  privacy: z.literal(true, { error: "Necesitamos tu autorización para gestionar la cita" }),
  marketing: z.boolean().default(false),
});

export const codeSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, "El código tiene 6 dígitos"),
});

export const confirmSchema = z.object({
  holdId: z.uuid(),
  idempotencyKey: z.uuid(),
  marketing: z.boolean().default(false),
});

export const manageActionSchema = z.object({ appointmentId: z.uuid() });

export const rescheduleSchema = z.object({
  appointmentId: z.uuid(),
  doctorId: z.uuid(),
  startsAt: z.iso.datetime({ offset: true }),
});

export const requestLinkSchema = z.object({ email: emailSchema });

export type BookingContactInput = z.input<typeof bookingContactSchema>;
export type BookingContactOutput = z.output<typeof bookingContactSchema>;
