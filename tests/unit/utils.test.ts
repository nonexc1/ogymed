import { describe, expect, it } from "vitest";

import { formatPhone, whatsappUrl, WHATSAPP_MESSAGE } from "@/lib/contact-links";
import { addDaysToKey, formatLimaTime, isDateKey, limaDateKey } from "@/lib/datetime";
import { normalizePhone } from "@/lib/validation";

describe("teléfonos", () => {
  it("normaliza móviles peruanos a E.164", () => {
    expect(normalizePhone("987 654 321")).toBe("+51987654321");
    expect(normalizePhone("+51 987-654-321")).toBe("+51987654321");
    expect(normalizePhone("01 2345678")).toBe("+5112345678");
    expect(normalizePhone("123")).toBeNull();
  });

  it("formatea para mostrar", () => {
    expect(formatPhone("+51987654321")).toBe("+51 987 654 321");
  });
});

describe("WhatsApp", () => {
  it("usa un mensaje genérico sin datos sensibles", () => {
    const url = whatsappUrl("+51 987 654 321");
    expect(url.startsWith("https://wa.me/51987654321?text=")).toBe(true);
    expect(decodeURIComponent(url.split("text=")[1]!)).toBe(WHATSAPP_MESSAGE);
    expect(WHATSAPP_MESSAGE).toBe("Hola, quisiera coordinar una cita en OGYMED");
  });
});

describe("fechas en hora de Lima", () => {
  it("convierte instantes UTC a hora de Lima", () => {
    // 15:00 UTC = 10:00 en Lima (UTC−5).
    expect(formatLimaTime("2026-11-02T15:00:00Z")).toBe("10:00");
    // 03:00 UTC del día 3 sigue siendo el día 2 en Lima.
    expect(limaDateKey("2026-11-03T03:00:00Z")).toBe("2026-11-02");
  });

  it("suma días a claves de fecha sin desfases", () => {
    expect(addDaysToKey("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysToKey("2026-03-01", -1)).toBe("2026-02-28");
    expect(isDateKey("2026-02-30")).toBe(true); // forma válida; el servidor valida el resto
    expect(isDateKey("26-02-01")).toBe(false);
  });
});
