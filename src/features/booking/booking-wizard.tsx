"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarCheck, CheckCircle2, Clock, MessageCircle, Phone, UserRound } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/field";
import { Alert, Card } from "@/components/ui/surface";
import { formatPhone, telUrl, whatsappUrl } from "@/lib/contact-links";
import { formatLimaDate, formatLimaTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";

import { HoldTimer } from "./hold-timer";
import { bookingMessage } from "./messages";
import { bookingContactSchema, type BookingContactInput, type BookingContactOutput } from "./schema";
import { SlotPicker } from "./slot-picker";
import { api, type BookingDoctor, type BookingService, type Hold, type Offering, type Slot } from "./types";

type Step = "service" | "doctor" | "time" | "contact" | "code" | "review" | "done";
const STEPS: { id: Step; label: string }[] = [
  { id: "service", label: "Servicio" },
  { id: "doctor", label: "Profesional" },
  { id: "time", label: "Fecha y hora" },
  { id: "contact", label: "Tus datos" },
  { id: "review", label: "Confirmar" },
];

type Props = {
  mode: "reception" | "automatic";
  services: BookingService[];
  doctors: BookingDoctor[];
  offerings: Offering[];
  initialServiceId?: string | null;
  initialDoctorId?: string | null;
  whatsapp: string | null;
  phone: string | null;
};

const idemKey = (holdId: string) => `ogymed-idem-${holdId}`;

function newIdempotencyKey(holdId: string): string {
  try {
    const existing = sessionStorage.getItem(idemKey(holdId));
    if (existing) return existing;
    const key = crypto.randomUUID();
    sessionStorage.setItem(idemKey(holdId), key);
    return key;
  } catch {
    return crypto.randomUUID();
  }
}

export function BookingWizard(props: Props) {
  const { services, doctors, offerings, mode } = props;
  const initialService = services.find((s) => s.id === props.initialServiceId) ?? null;
  const [step, setStep] = useState<Step>(initialService ? "doctor" : "service");
  const [serviceId, setServiceId] = useState<string | null>(initialService?.id ?? null);
  const [doctorChoice, setDoctorChoice] = useState<string | "any" | null>(
    props.initialDoctorId && initialService && offerings.some((o) => o.doctor_id === props.initialDoctorId && o.service_id === initialService.id)
      ? props.initialDoctorId
      : null,
  );
  const [hold, setHold] = useState<Hold | null>(null);
  const [skewMs, setSkewMs] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "danger" | "warning" | "info"; text: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [contact, setContact] = useState<BookingContactOutput | null>(null);
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [result, setResult] = useState<Hold | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const service = services.find((s) => s.id === serviceId) ?? null;
  const serviceDoctors = doctors.filter((d) => offerings.some((o) => o.service_id === serviceId && o.doctor_id === d.id));
  const doctorName = (id: string | undefined) => doctors.find((d) => d.id === id)?.name ?? "Profesional de OGYMED";

  // Foco al título de cada paso (navegación por teclado y lectores de pantalla).
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const syncSkew = (serverNow?: string) => {
    if (serverNow) setSkewMs(Date.parse(serverNow) - Date.now());
  };

  const go = (next: Step) => {
    setMessage(null);
    setStep(next);
  };

  const chooseSlot = useCallback(
    async (slot: Slot) => {
      if (!serviceId) return;
      setBusy(true);
      setMessage(null);
      const res = await api<{ hold: Hold; serverNow: string }>("/api/booking/hold", {
        json: { serviceId, doctorId: slot.doctor_id, startsAt: slot.starts_at },
      }).catch(() => null);
      setBusy(false);
      if (!res?.ok) {
        const code = res && !res.ok ? res.code : "unavailable";
        setMessage({ tone: code === "slot_taken" || code === "slot_unavailable" ? "warning" : "danger", text: bookingMessage(code) });
        setRefreshKey((k) => k + 1);
        return;
      }
      syncSkew(res.serverNow);
      setHold(res.hold);
      go(verifiedEmail ? "review" : "contact");
    },
    [serviceId, verifiedEmail],
  );

  const onHoldExpired = useCallback(() => {
    setHold(null);
    setRefreshKey((k) => k + 1);
    setStep("time");
    setMessage({ tone: "warning", text: bookingMessage("hold_expired") });
  }, []);

  const progressIndex = STEPS.findIndex((s) => s.id === (step === "code" ? "contact" : step));

  return (
    <div className="mx-auto max-w-3xl">
      {step !== "done" ? (
        <ol className="mb-8 flex flex-wrap gap-x-4 gap-y-2 text-sm" aria-label="Pasos de la reserva">
          {STEPS.map((s, i) => (
            <li key={s.id} aria-current={i === progressIndex ? "step" : undefined} className={cn("flex items-center gap-2", i <= progressIndex ? "text-plum" : "text-muted")}>
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-7 items-center justify-center rounded-full border text-xs font-semibold",
                  i < progressIndex ? "border-plum bg-plum text-ivory" : i === progressIndex ? "border-plum" : "border-line",
                )}
              >
                {i + 1}
              </span>
              <span className={i === progressIndex ? "font-semibold" : undefined}>{s.label}</span>
            </li>
          ))}
        </ol>
      ) : null}

      {hold && step !== "done" && step !== "time" && hold.hold_expires_at ? (
        <div className="mb-6 space-y-3">
          <HoldTimer expiresAt={hold.hold_expires_at} skewMs={skewMs} onExpire={onHoldExpired} />
          <p className="text-muted">
            <Clock aria-hidden="true" className="mr-1 inline size-4" />
            {service?.name} · {formatLimaDate(hold.starts_at)}, {formatLimaTime(hold.starts_at)} · {doctorName(hold.doctor_id)}
          </p>
        </div>
      ) : null}

      {message ? (
        <Alert tone={message.tone} role="alert" className="mb-6">
          {message.text}
        </Alert>
      ) : null}

      {step === "service" ? (
        <section aria-labelledby="step-title">
          <h2 id="step-title" ref={headingRef} tabIndex={-1} className="text-3xl outline-none">
            ¿Qué servicio necesitas?
          </h2>
          <fieldset className="mt-6">
            <legend className="sr-only">Servicio</legend>
            <ul className="grid gap-3">
              {services.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setServiceId(s.id);
                      setDoctorChoice(null);
                      setHold(null);
                      go("doctor");
                    }}
                    className="w-full rounded-2xl border border-line bg-paper p-5 text-left hover:border-plum"
                  >
                    <span className="block font-display text-xl text-plum-strong">{s.name}</span>
                    {s.summary ? <span className="mt-1 block text-muted">{s.summary}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          </fieldset>
        </section>
      ) : null}

      {step === "doctor" && service ? (
        <section aria-labelledby="step-title">
          <h2 id="step-title" ref={headingRef} tabIndex={-1} className="text-3xl outline-none">
            ¿Con quién quieres atenderte?
          </h2>
          <p className="mt-2 text-muted">{service.name}</p>
          <ul className="mt-6 grid gap-3">
            <li>
              <button
                type="button"
                onClick={() => {
                  setDoctorChoice("any");
                  go("time");
                }}
                className="flex w-full items-center gap-4 rounded-2xl border border-line bg-paper p-5 text-left hover:border-plum"
              >
                <CalendarCheck aria-hidden="true" className="size-7 text-sage-strong" />
                <span>
                  <span className="block font-semibold text-ink">Primera disponibilidad</span>
                  <span className="block text-muted">Te mostramos los horarios libres de cualquier profesional.</span>
                </span>
              </button>
            </li>
            {serviceDoctors.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => {
                    setDoctorChoice(d.id);
                    go("time");
                  }}
                  className="flex w-full items-center gap-4 rounded-2xl border border-line bg-paper p-5 text-left hover:border-plum"
                >
                  <UserRound aria-hidden="true" className="size-7 text-sage-strong" />
                  <span>
                    <span className="block font-display text-xl text-plum-strong">{d.name}</span>
                    {d.specialty ? <span className="block text-muted">{d.specialty}</span> : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <Button variant="link" className="mt-6" onClick={() => go("service")}>
            Cambiar servicio
          </Button>
        </section>
      ) : null}

      {step === "time" && service && doctorChoice ? (
        <section aria-labelledby="step-title">
          <h2 id="step-title" ref={headingRef} tabIndex={-1} className="text-3xl outline-none">
            Elige fecha y hora
          </h2>
          <p className="mt-2 text-muted">
            {service.name} · {doctorChoice === "any" ? "Primera disponibilidad" : doctorName(doctorChoice)} · Hora de Lima
          </p>
          <p className="mt-2 text-sm text-muted">
            Al elegir un horario lo apartamos unos minutos mientras completas tus datos. Aún no es una cita confirmada.
          </p>
          <div className="mt-6">
            <SlotPicker
              serviceId={service.id}
              doctorId={doctorChoice === "any" ? null : doctorChoice}
              doctors={serviceDoctors}
              selected={hold}
              busy={busy}
              refreshKey={refreshKey}
              onSelect={chooseSlot}
            />
          </div>
          <Button variant="link" className="mt-6" onClick={() => go("doctor")}>
            Cambiar profesional
          </Button>
        </section>
      ) : null}

      {step === "contact" && hold ? (
        <ContactStep
          headingRef={headingRef}
          defaultValues={contact}
          whatsapp={props.whatsapp}
          phone={props.phone}
          onBack={() => go("time")}
          onDone={(values, alreadyVerified) => {
            setContact(values);
            if (alreadyVerified) {
              setVerifiedEmail(values.email);
              go("review");
            } else {
              go("code");
            }
          }}
        />
      ) : null}

      {step === "code" && hold && contact ? (
        <CodeStep
          headingRef={headingRef}
          contact={contact}
          onBack={() => go("contact")}
          onVerified={() => {
            setVerifiedEmail(contact.email);
            go("review");
          }}
        />
      ) : null}

      {step === "review" && hold && service ? (
        <ReviewStep
          headingRef={headingRef}
          mode={mode}
          hold={hold}
          serviceName={service.name}
          doctor={doctorName(hold.doctor_id)}
          email={verifiedEmail ?? contact?.email ?? ""}
          marketing={contact?.marketing ?? false}
          onChangeTime={() => go("time")}
          onResult={(appointment) => {
            setResult(appointment);
            setHold(null);
            go("done");
          }}
          onError={(code) => {
            if (code === "hold_expired" || code === "hold_not_found" || code === "session_invalid") {
              setHold(null);
              setRefreshKey((k) => k + 1);
              setStep("time");
            }
            if (code === "contact_unverified") setStep("contact");
            setMessage({ tone: "danger", text: bookingMessage(code) });
          }}
        />
      ) : null}

      {step === "done" && result ? (
        <section aria-labelledby="step-title">
          <Card className="space-y-4">
            <CheckCircle2 aria-hidden="true" className="size-10 text-success" />
            <h2 id="step-title" ref={headingRef} tabIndex={-1} className="text-3xl outline-none">
              {result.status === "confirmed" ? "Tu cita está confirmada" : "Solicitud recibida, pendiente de confirmación"}
            </h2>
            <p className="text-lg">
              {service?.name} con {doctorName(result.doctor_id)}
              <br />
              <strong className="capitalize">{formatLimaDate(result.starts_at)}</strong>, a las{" "}
              <strong>{formatLimaTime(result.starts_at)}</strong> (hora de Lima)
            </p>
            <p className="text-muted">
              {result.status === "confirmed"
                ? "Te enviamos la confirmación por correo con un enlace seguro para cambiar o cancelar."
                : "Recepción revisará tu solicitud y te confirmará por correo. Hasta entonces, la cita no está confirmada."}
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="/cita/gestionar" className={buttonVariants({ variant: "secondary" })}>
                Ver o gestionar mi cita
              </a>
              <a href="/" className={buttonVariants({ variant: "ghost" })}>
                Volver al inicio
              </a>
            </div>
          </Card>
        </section>
      ) : null}
    </div>
  );
}

function ContactStep({
  headingRef,
  defaultValues,
  whatsapp,
  phone,
  onBack,
  onDone,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  defaultValues: BookingContactOutput | null;
  whatsapp: string | null;
  phone: string | null;
  onBack: () => void;
  onDone: (values: BookingContactOutput, alreadyVerified: boolean) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BookingContactInput, unknown, BookingContactOutput>({
    resolver: zodResolver(bookingContactSchema),
    defaultValues: defaultValues
      ? { ...defaultValues, phone: defaultValues.phone ?? "", privacy: true }
      : { full_name: "", email: "", phone: "", marketing: false },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const res = await api<{ alreadyVerified: boolean }>("/api/booking/verify", { json: { ...values, phone: values.phone ?? "" } }).catch(() => null);
    if (!res?.ok) {
      setError(bookingMessage(res && !res.ok ? res.code : "unavailable"));
      return;
    }
    onDone(values, res.alreadyVerified);
  });

  return (
    <section aria-labelledby="step-title">
      <h2 id="step-title" ref={headingRef} tabIndex={-1} className="text-3xl outline-none">
        Tus datos de contacto
      </h2>
      <p className="mt-2 text-muted">
        Sólo pedimos lo necesario para gestionar tu cita. No incluyas información médica.
      </p>
      {error ? (
        <Alert tone="danger" role="alert" className="mt-4">
          {error}
        </Alert>
      ) : null}
      <form noValidate onSubmit={onSubmit} className="mt-6 space-y-5">
        <Field id="b-name" label="Nombre y apellido" required error={errors.full_name?.message}>
          {(a) => <Input {...a} autoComplete="name" {...register("full_name")} />}
        </Field>
        <Field id="b-email" label="Correo electrónico" required error={errors.email?.message} description="Te enviaremos un código para verificarlo.">
          {(a) => <Input {...a} type="email" autoComplete="email" inputMode="email" {...register("email")} />}
        </Field>
        <Field id="b-phone" label="Teléfono (opcional)" error={errors.phone?.message} description="Para que recepción pueda coordinar contigo si hace falta.">
          {(a) => <Input {...a} type="tel" autoComplete="tel" inputMode="tel" {...register("phone")} />}
        </Field>
        <Checkbox
          id="b-privacy"
          error={errors.privacy?.message}
          label={
            <>
              Autorizo el tratamiento de mis datos para gestionar mi cita, según la{" "}
              <a href="/privacidad" target="_blank" rel="noopener" className="text-plum underline underline-offset-4">
                política de privacidad
              </a>
              . <span className="text-danger">*</span>
            </>
          }
          {...register("privacy")}
        />
        <Checkbox
          id="b-marketing"
          label="Quiero recibir información de OGYMED por correo (opcional)."
          description="Puedes retirar esta autorización cuando quieras. No afecta tu cita."
          {...register("marketing")}
        />
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Enviando código…" : "Continuar"}
          </Button>
          <Button type="button" variant="ghost" onClick={onBack}>
            Cambiar horario
          </Button>
        </div>
      </form>
      {whatsapp || phone ? (
        <div className="mt-8 rounded-2xl border border-line bg-paper p-4">
          <p className="font-semibold">¿No tienes correo electrónico?</p>
          <p className="text-muted">Recepción puede registrar tu cita directamente.</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {whatsapp ? (
              <a href={whatsappUrl(whatsapp)} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "secondary", size: "sm" })}>
                <MessageCircle aria-hidden="true" /> WhatsApp
              </a>
            ) : null}
            {phone ? (
              <a href={telUrl(phone)} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                <Phone aria-hidden="true" /> {formatPhone(phone)}
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function CodeStep({
  headingRef,
  contact,
  onBack,
  onVerified,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  contact: BookingContactOutput;
  onBack: () => void;
  onVerified: () => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(60);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError("Escribe los 6 dígitos del código.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await api("/api/booking/verify-code", { json: { code } }).catch(() => null);
    setBusy(false);
    if (res?.ok) onVerified();
    else setError(bookingMessage(res && !res.ok ? res.code : "unavailable"));
  };

  const resend = async () => {
    setInfo(null);
    setError(null);
    const res = await api("/api/booking/verify", { json: { ...contact, phone: contact.phone ?? "" } }).catch(() => null);
    if (res?.ok) {
      setInfo("Te enviamos un código nuevo.");
      setCooldown(60);
    } else setError(bookingMessage(res && !res.ok ? res.code : "unavailable"));
  };

  return (
    <section aria-labelledby="step-title">
      <h2 id="step-title" ref={headingRef} tabIndex={-1} className="text-3xl outline-none">
        Verifica tu correo
      </h2>
      <p className="mt-2 text-muted">
        Enviamos un código de 6 dígitos a <strong>{contact.email}</strong>. Revisa también la carpeta de correo no deseado.
      </p>
      {error ? (
        <Alert tone="danger" role="alert" className="mt-4">
          {error}
        </Alert>
      ) : null}
      {info ? (
        <Alert tone="success" role="status" className="mt-4">
          {info}
        </Alert>
      ) : null}
      <form noValidate onSubmit={submit} className="mt-6 max-w-xs space-y-4">
        <Field id="b-code" label="Código de verificación" required>
          {(a) => (
            <Input
              {...a}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              className="text-center text-2xl tracking-[0.4em] tabular-nums"
            />
          )}
        </Field>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Verificando…" : "Verificar"}
        </Button>
      </form>
      <div className="mt-6 flex flex-wrap gap-4">
        <Button variant="link" disabled={cooldown > 0} onClick={resend}>
          {cooldown > 0 ? `Reenviar código (${cooldown} s)` : "Reenviar código"}
        </Button>
        <Button variant="link" onClick={onBack}>
          Cambiar correo
        </Button>
      </div>
    </section>
  );
}

function ReviewStep({
  headingRef,
  mode,
  hold,
  serviceName,
  doctor,
  email,
  marketing,
  onChangeTime,
  onResult,
  onError,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  mode: "reception" | "automatic";
  hold: Hold;
  serviceName: string;
  doctor: string;
  email: string;
  marketing: boolean;
  onChangeTime: () => void;
  onResult: (appointment: Hold) => void;
  onError: (code: string | undefined) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [networkIssue, setNetworkIssue] = useState(false);

  const confirm = async () => {
    setBusy(true);
    setNetworkIssue(false);
    const key = newIdempotencyKey(hold.appointment_id);
    try {
      const res = await api<{ appointment: Hold }>("/api/booking/confirm", { json: { holdId: hold.appointment_id, idempotencyKey: key, marketing } });
      if (res.ok) onResult(res.appointment);
      else onError(res.code);
    } catch {
      // Fallo de red: consultar si la confirmación llegó antes de volver a intentar.
      const check = await api<{ appointment: Hold }>(`/api/booking/result?key=${key}`).catch(() => null);
      if (check?.ok) onResult(check.appointment);
      else setNetworkIssue(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="step-title">
      <h2 id="step-title" ref={headingRef} tabIndex={-1} className="text-3xl outline-none">
        Revisa y confirma
      </h2>
      <Card className="mt-6">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted">Servicio</dt>
            <dd className="font-semibold">{serviceName}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Profesional</dt>
            <dd className="font-semibold">{doctor}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Fecha y hora (Lima)</dt>
            <dd className="font-semibold capitalize">
              {formatLimaDate(hold.starts_at)}, {formatLimaTime(hold.starts_at)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Correo verificado</dt>
            <dd className="font-semibold break-all">{email}</dd>
          </div>
        </dl>
      </Card>
      <p className="mt-4 text-muted">
        Al confirmar aceptas la{" "}
        <a href="/politica-de-citas" target="_blank" rel="noopener" className="text-plum underline underline-offset-4">
          política de citas
        </a>
        .{" "}
        {mode === "reception"
          ? "Tu solicitud quedará pendiente hasta que recepción la confirme."
          : "La cita quedará confirmada de inmediato."}
      </p>
      {networkIssue ? (
        <Alert tone="warning" role="alert" className="mt-4" title="No pudimos comprobar la confirmación">
          Revisa tu conexión y vuelve a intentarlo: si la cita ya se registró, no se duplicará.
        </Alert>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-3">
        <Button size="lg" onClick={confirm} disabled={busy}>
          {busy ? "Confirmando…" : mode === "reception" ? "Enviar solicitud de cita" : "Confirmar cita"}
        </Button>
        <Button variant="ghost" onClick={onChangeTime} disabled={busy}>
          Cambiar horario
        </Button>
      </div>
    </section>
  );
}
