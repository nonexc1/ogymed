import type { SupabaseClient } from "@supabase/supabase-js";

import { Field, Select } from "@/components/ui/field";

export type MediaOption = { id: string; alt_text: string; path: string; rights_confirmed: boolean };

export async function listMediaOptions(db: SupabaseClient): Promise<MediaOption[]> {
  const { data } = await db.from("media_assets").select("id, alt_text, path, rights_confirmed").order("created_at", { ascending: false }).limit(300);
  return (data ?? []) as MediaOption[];
}

export function MediaSelect({ id, name, label, value, media }: { id: string; name: string; label: string; value: string | null; media: MediaOption[] }) {
  return (
    <Field id={id} label={label} description="Sube imágenes en «Medios». Sólo se publican con derechos confirmados y texto alternativo.">
      {(a) => (
        <Select {...a} name={name} defaultValue={value ?? ""}>
          <option value="">Sin imagen</option>
          {media.map((m) => (
            <option key={m.id} value={m.id}>
              {(m.alt_text || m.path).slice(0, 70)}
              {m.rights_confirmed ? "" : " (derechos sin confirmar)"}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}
