import type { Metadata } from "next";
import { cookies } from "next/headers";

import { Alert, Card, Container } from "@/components/ui/surface";
import { LogoutButton, ManageAppointments, RequestLinkForm, type ManagedAppointment } from "@/features/booking/manage-appointments";
import { MANAGE_COOKIE } from "@/features/booking/session";
import { getOfferings, listDoctors, listServices } from "@/features/cms/queries";
import { sha256Hex } from "@/lib/security/crypto";
import { privateMetadata } from "@/lib/seo/metadata";
import { getServiceClient } from "@/lib/supabase/service";

export const metadata: Metadata = privateMetadata("Gestionar cita");

const STATUS_MESSAGES: Record<string, string> = {
  "enlace-invalido": "El enlace no es válido, ya se usó o venció. Solicita uno nuevo abajo.",
  "demasiados-intentos": "Demasiados intentos seguidos. Espera unos minutos.",
  "no-disponible": "El servicio no está disponible en este momento.",
};

type Overview = {
  ok: boolean;
  cancellation_window_hours?: number;
  appointments?: Omit<ManagedAppointment, "serviceName" | "doctorName" | "bookableDoctors">[];
};

export default async function ManagePage({ searchParams }: PageProps<"/cita/gestionar">) {
  const sp = await searchParams;
  const estado = typeof sp.estado === "string" ? STATUS_MESSAGES[sp.estado] : undefined;
  const raw = (await cookies()).get(MANAGE_COOKIE)?.value;
  const db = getServiceClient();
  let overview: Overview | null = null;
  if (raw && db && /^[A-Za-z0-9_-]{40,}$/.test(raw)) {
    const { data } = await db.rpc("manage_overview", { p_session_hash: sha256Hex(raw) });
    overview = data as Overview;
  }

  if (!overview?.ok) {
    return (
      <Container className="py-16">
        <Card className="mx-auto max-w-xl space-y-5">
          <h1 className="text-3xl">Gestionar tu cita</h1>
          {estado ? <Alert tone="warning" role="alert">{estado}</Alert> : null}
          <p className="text-muted">
            Para ver, cambiar o cancelar tu cita, usa el enlace de tu correo de confirmación. Si venció o no lo encuentras, te
            enviamos uno nuevo.
          </p>
          <RequestLinkForm />
        </Card>
      </Container>
    );
  }

  const [services, doctors, offerings] = await Promise.all([listServices(), listDoctors(), getOfferings()]);
  const appointments: ManagedAppointment[] = (overview.appointments ?? []).map((a) => ({
    ...a,
    serviceName: services.find((s) => s.id === a.service_id)?.name ?? "Cita",
    doctorName: doctors.find((d) => d.id === a.doctor_id)?.display_name ?? "Profesional de OGYMED",
    bookableDoctors: doctors
      .filter((d) => offerings.some((o) => o.online_booking && o.service_id === a.service_id && o.doctor_id === d.id))
      .map((d) => ({ id: d.id, slug: d.slug, name: d.display_name, specialty: d.specialty ?? null })),
  }));

  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-4xl">Tus citas</h1>
          <LogoutButton />
        </div>
        <p className="mt-2 text-muted">
          Puedes cambiar o cancelar en línea hasta {overview.cancellation_window_hours} horas antes. Esta sesión se cierra sola
          en unos minutos.
        </p>
        <div className="mt-8">
          <ManageAppointments appointments={appointments} windowHours={overview.cancellation_window_hours ?? 24} contactHref="/contacto" />
        </div>
      </div>
    </Container>
  );
}
