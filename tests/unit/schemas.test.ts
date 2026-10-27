import { describe, expect, it } from "vitest";

import { bookingContactSchema, holdSchema } from "@/features/booking/schema";
import { contactSchema } from "@/features/contact/schema";

describe("esquemas compartidos cliente/servidor", () => {
  it("el contacto de reserva exige consentimiento de privacidad y deja el comercial desmarcado por defecto", () => {
    const base = { full_name: "Paciente Ficticia", email: "p@example.test" };
    expect(bookingContactSchema.safeParse(base).success).toBe(false);
    const ok = bookingContactSchema.parse({ ...base, privacy: true });
    expect(ok.marketing).toBe(false);
    expect(ok.phone).toBeNull();
  });

  it("la retención no acepta duración, fin, precio ni estado del cliente", () => {
    const parsed = holdSchema.parse({
      serviceId: "00000000-0000-4000-8000-00000000a001",
      doctorId: "00000000-0000-4000-8000-00000000d001",
      startsAt: "2026-11-02T15:00:00.000Z",
      endsAt: "2026-11-02T18:00:00.000Z",
      status: "confirmed",
      price: 0,
    });
    expect(Object.keys(parsed).sort()).toEqual(["doctorId", "serviceId", "startsAt"]);
  });

  it("el formulario de contacto exige correo o teléfono y expone el honeypot al servidor", () => {
    expect(contactSchema.safeParse({ full_name: "Ana", topic: "cita", privacy: true }).success).toBe(false);
    expect(contactSchema.safeParse({ full_name: "Ana", phone: "987654321", topic: "cita", privacy: true }).success).toBe(true);
    // El servidor descarta silenciosamente si el honeypot llega completado.
    expect(contactSchema.parse({ full_name: "Ana", phone: "987654321", topic: "cita", privacy: true, website: "spam" }).website).toBe("spam");
  });
});
