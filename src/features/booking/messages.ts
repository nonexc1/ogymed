/** Mensajes para cada código de error del servidor (sin revelar datos internos). */
export const BOOKING_MESSAGES: Record<string, string> = {
  slot_taken: "Ese horario acaba de ser reservado por otra persona. Elige otro de la lista actualizada.",
  slot_unavailable: "Ese horario ya no está disponible. Elige otro de la lista actualizada.",
  session_invalid: "Tu sesión de reserva venció. Vuelve a elegir un horario.",
  booking_disabled: "Las reservas en línea no están disponibles en este momento. Puedes solicitar tu cita a recepción.",
  hold_expired: "El tiempo para confirmar ese horario terminó y se liberó. Elige un horario nuevamente.",
  hold_not_found: "No encontramos el horario retenido. Elige un horario nuevamente.",
  contact_unverified: "Primero verifica tu correo con el código que te enviamos.",
  consent_required: "Necesitamos tu autorización de tratamiento de datos.",
  privacy_unpublished: "La reserva en línea se habilitará cuando la política de privacidad esté publicada.",
  too_many_codes: "Enviamos demasiados códigos para esta reserva. Espera un momento o contacta a recepción.",
  too_many_attempts: "Superaste los intentos permitidos. Solicita un código nuevo.",
  code_invalid: "El código no es correcto. Revisa el correo más reciente.",
  code_expired: "El código venció. Solicita uno nuevo.",
  email_failed: "No pudimos enviar el correo. Revisa la dirección o inténtalo en unos minutos.",
  rate_limited: "Demasiados intentos seguidos. Espera un momento y vuelve a intentarlo.",
  idempotency_conflict: "No pudimos completar la operación. Vuelve a intentarlo.",
  outside_window: "Esta cita ya está dentro del plazo en que no se puede cambiar en línea. Comunícate con recepción.",
  not_found: "No encontramos esa cita.",
  invalid_or_expired: "El enlace no es válido o ya venció.",
  unavailable: "El servicio no está disponible en este momento. Inténtalo en unos minutos o contáctanos.",
  validation: "Revisa los datos ingresados.",
  bad_origin: "La solicitud no es válida. Recarga la página.",
};

export const bookingMessage = (code: string | undefined) => BOOKING_MESSAGES[code ?? ""] ?? BOOKING_MESSAGES.unavailable!;
