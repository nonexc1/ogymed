/** Traduce errores de PostgREST/PostgreSQL a mensajes para el personal (sin exponer detalles internos). */
export function dbErrorMessage(error: { code?: string; message?: string } | null | undefined): string {
  const msg = error?.message ?? "";
  const known: [RegExp, string][] = [
    [/mfa_required/, "Esta acción requiere verificación en dos pasos (MFA)."],
    [/forbidden|permission denied|42501/, "No tienes permisos para esta acción."],
    [/medical_review_required/, "Primero envía el contenido a revisión médica."],
    [/revisor médico/, "Sólo un revisor médico habilitado puede aprobar y publicar este contenido."],
    [/reviewer_required/, "Indica un profesional revisor con perfil publicado."],
    [/author_unpublished/, "El perfil del autor no está publicado."],
    [/credentials_unverified/, "Verifica CMP/RNE antes de publicar el perfil."],
    [/media_rights_unconfirmed/, "Confirma los derechos de uso de las imágenes antes de publicar."],
    [/media_alt_missing/, "Las imágenes necesitan texto alternativo antes de publicar."],
    [/redirect_loop/, "La redirección formaría un bucle."],
    [/redirect_chain_too_long/, "La cadena de redirecciones es demasiado larga."],
    [/last_admin/, "Debe quedar al menos un administrador activo."],
    [/invalid_transition|invalid_status_transition/, "Ese cambio de estado no está permitido."],
    [/duplicate key|23505/, "Ya existe un registro con ese valor (por ejemplo, el slug)."],
    [/violates check constraint|23514/, "Algún valor no tiene el formato permitido."],
    [/violates foreign key|23503/, "El registro está en uso y no puede eliminarse."],
  ];
  for (const [re, text] of known) if (re.test(msg) || re.test(error?.code ?? "")) return text;
  if (error) console.error("admin_db_error", { code: error.code ?? "unknown" });
  return "No se pudo guardar. Inténtalo de nuevo.";
}

export const SLOT_ERRORS: Record<string, string> = {
  slot_taken: "Ese horario ya está ocupado (otra cita o retención). Elige otro.",
  slot_unavailable: "Ese horario no es válido según la agenda (horario, excepción o capacidad).",
  not_found: "No se encontró la cita o no está en un estado que permita este cambio.",
  invalid_transition: "Ese cambio de estado no está permitido.",
  not_started: "No se puede marcar asistencia de una cita que aún no empieza.",
  contact_required: "Indica al menos un teléfono o un correo.",
  doctor_required: "El rol profesional requiere vincular un profesional de la agenda.",
  user_not_found: "El usuario no existe.",
  has_future_appointments: "El contacto tiene citas futuras activas.",
};
