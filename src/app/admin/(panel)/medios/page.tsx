import type { Metadata } from "next";
import Image from "next/image";

import { ActionForm } from "@/components/admin/action-form";
import { DemoBadge, PageHeader, Panel } from "@/components/admin/ui";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/surface";
import { mediaUrl, skipImageOptimization } from "@/features/cms/media";
import { requireStaff } from "@/lib/auth/staff";

import { deleteMedia, updateMedia, uploadMedia } from "./actions";

export const metadata: Metadata = { title: "Medios" };

export default async function MediaPage() {
  const { supabase } = await requireStaff(["admin", "editor"]);
  const { data } = await supabase.from("media_assets").select("*").order("created_at", { ascending: false }).limit(200);
  return (
    <>
      <PageHeader title="Medios" description="Fotografías reales y autorizadas. Sin bancos de imágenes que simulen instalaciones o personal." />
      <Panel title="Subir imagen" className="mb-6">
        <ActionForm action={uploadMedia} submitLabel="Subir">
          <Field id="file" label="Archivo (JPG, PNG, WebP o AVIF; máx. 4 MB)" required>
            {(a) => <input {...a} name="file" type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="block w-full text-base" />}
          </Field>
          <Field id="alt_text" label="Texto alternativo" description="Describe la imagen para quien no puede verla. Obligatorio para publicar.">{(a) => <Input {...a} name="alt_text" maxLength={300} />}</Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="rights_holder" label="Titular de derechos / autor">{(a) => <Input {...a} name="rights_holder" />}</Field>
            <Field id="rights_note" label="Nota de autorización">{(a) => <Input {...a} name="rights_note" placeholder="Ej. autorización firmada el …" />}</Field>
          </div>
          <Checkbox id="rights_confirmed" name="rights_confirmed" label="Confirmo que OGYMED tiene derechos de uso y, si aparecen personas, su autorización." />
        </ActionForm>
      </Panel>
      <ul className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {(data ?? []).map((m) => (
          <li key={m.id}>
            <Panel>
              <Image src={mediaUrl(m)} alt={m.alt_text || "Sin texto alternativo"} width={m.width ?? 600} height={m.height ?? 400} sizes="(min-width: 1280px) 30vw, 90vw" unoptimized={skipImageOptimization} className="mb-3 aspect-[4/3] w-full rounded-xl object-cover" />
              <div className="mb-3 flex flex-wrap gap-2">
                {m.rights_confirmed ? <Badge tone="success">Derechos confirmados</Badge> : <Badge tone="warning">Derechos sin confirmar</Badge>}
                {!m.alt_text ? <Badge tone="warning">Falta texto alternativo</Badge> : null}
                <DemoBadge demo={m.is_demo} />
                <Badge>{m.width}×{m.height}</Badge>
              </div>
              <ActionForm action={updateMedia} submitLabel="Guardar" submitVariant="secondary">
                <input type="hidden" name="id" value={m.id} />
                <Field id={`alt-${m.id}`} label="Texto alternativo">{(a) => <Textarea {...a} name="alt_text" rows={2} defaultValue={m.alt_text} />}</Field>
                <Field id={`holder-${m.id}`} label="Titular de derechos">{(a) => <Input {...a} name="rights_holder" defaultValue={m.rights_holder ?? ""} />}</Field>
                <input type="hidden" name="rights_note" value={m.rights_note ?? ""} />
                <Checkbox id={`rights-${m.id}`} name="rights_confirmed" label="Derechos de uso confirmados" defaultChecked={m.rights_confirmed} />
              </ActionForm>
              <div className="mt-3">
                <ActionForm action={deleteMedia} submitLabel="Eliminar" submitVariant="ghost" inline>
                  <input type="hidden" name="id" value={m.id} />
                </ActionForm>
              </div>
            </Panel>
          </li>
        ))}
      </ul>
    </>
  );
}
