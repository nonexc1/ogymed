import { ActionForm } from "@/components/admin/action-form";
import { ContentStatus, Panel } from "@/components/admin/ui";

import { transitionContent } from "./actions";

type Entity = "service" | "doctor" | "page" | "post" | "faq";

/**
 * Panel de flujo editorial: muestra el estado de la copia de trabajo, si hay una versión publicada en
 * línea y sólo los botones que tiene sentido ofrecer (la base vuelve a validar todo).
 */
export function WorkflowPanel({
  entity,
  id,
  status,
  live,
  requiresReview,
  canReview,
  canPublishDirect,
  back,
  previewHref,
  livePath,
}: {
  entity: Entity;
  id: string;
  status: string;
  live: boolean;
  requiresReview: boolean;
  canReview: boolean;
  canPublishDirect: boolean;
  back: string;
  previewHref?: string;
  livePath?: string | null;
}) {
  const button = (action: string, label: string, variant: "primary" | "secondary" | "danger" = "secondary") => (
    <ActionForm key={action} action={transitionContent} submitLabel={label} submitVariant={variant} inline>
      <input type="hidden" name="entity" value={entity} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="action" value={action} />
      <input type="hidden" name="back" value={back} />
    </ActionForm>
  );
  const buttons = [];
  if (status === "draft" && requiresReview) buttons.push(button("submit", "Enviar a revisión médica", "primary"));
  if (status === "draft" && !requiresReview && canPublishDirect) buttons.push(button("publish", "Publicar", "primary"));
  if (status === "medical_review" && requiresReview && canReview) buttons.push(button("publish", "Aprobar revisión médica y publicar", "primary"));
  if (status === "medical_review" && !requiresReview && canPublishDirect) buttons.push(button("publish", "Publicar", "primary"));
  if (live) buttons.push(button("unpublish", "Retirar de la web"));
  if (status !== "archived") buttons.push(button("archive", "Archivar", "danger"));
  if (status === "archived") buttons.push(button("restore_draft", "Restaurar como borrador"));

  return (
    <Panel title="Publicación">
      {/* Región viva: el cambio de estado se anuncia aunque el botón usado desaparezca. */}
      <div role="status" aria-live="polite" data-testid="content-status">
        <ContentStatus status={status} live={live} />
      </div>
      {requiresReview ? (
        <p className="mt-3 text-sm text-muted">
          Requiere revisión médica: un revisor habilitado debe aprobarla. Cualquier cambio posterior vuelve a borrador; la
          versión publicada sigue en línea hasta la nueva aprobación.
        </p>
      ) : null}
      {status === "medical_review" && requiresReview && !canReview ? (
        <p className="mt-2 text-sm text-warning">Pendiente de un revisor médico habilitado.</p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">{buttons}</div>
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        {previewHref ? (
          <a href={previewHref} className="text-plum underline underline-offset-4">Previsualizar borrador</a>
        ) : null}
        {live && livePath ? (
          <a href={livePath} className="text-plum underline underline-offset-4" target="_blank" rel="noopener">Ver versión publicada</a>
        ) : null}
      </div>
    </Panel>
  );
}
