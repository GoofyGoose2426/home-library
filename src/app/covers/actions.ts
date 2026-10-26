"use server";

import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/supabase/env";

// Removes a wrong best-guess cover from every copy of a title, and records
// that Alexandra removed it so a later cover lookup never puts it back.
export async function removeCover(titleId: string) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims || !isOwnerEmail(data.claims.email)) throw new Error("Not signed in.");

  const { data: copies, error } = await supabase
    .from("copies")
    .update({ cover_url: null, cover_confirmed: false })
    .eq("title_id", titleId)
    .is("cover_path", null)
    .select("id");
  if (error) throw new Error(error.message);

  const { error: sourceError } = await supabase.from("field_sources").upsert(
    (copies ?? []).map((c) => ({
      entity_table: "copies",
      entity_id: c.id,
      field: "cover_url",
      source: "alexandra",
      confirmed: true,
    })),
    { onConflict: "entity_table,entity_id,field" },
  );
  if (sourceError) throw new Error(sourceError.message);
}
