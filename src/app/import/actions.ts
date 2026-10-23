"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/supabase/env";
import { IMPORT_BATCH } from "@/lib/import/data";
import type { Decision } from "@/lib/import/decisions";
import { saveImport, type SaveResult } from "@/lib/import/save";

async function ownerClient() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims || !isOwnerEmail(data.claims.email)) throw new Error("Not signed in.");
  return { supabase, ownerId: data.claims.sub as string };
}

function isValid(d: Decision): boolean {
  const v = d.value as Record<string, unknown>;
  if (d.decision === "skipped") return v.skip === true;
  if (d.decision === "edited") {
    return (
      typeof v.title === "string" &&
      v.title.trim().length > 0 &&
      Array.isArray(v.authors) &&
      v.authors.every((a) => typeof a === "string")
    );
  }
  return (
    v.read_status === "read" ||
    v.read_status === "unread" ||
    v.keep_flagged === true ||
    typeof v.merge === "boolean"
  );
}

export async function decide(itemKeys: string[], d: Decision | null) {
  if (d && !isValid(d)) throw new Error("That choice isn't valid.");
  const { supabase } = await ownerClient();
  const value =
    d?.decision === "edited"
      ? {
          title: d.value.title.trim(),
          authors: d.value.authors.map((a) => a.trim()).filter(Boolean),
        }
      : d?.value ?? null;
  const { error } = await supabase
    .from("import_items")
    .update({ decision: d?.decision ?? "pending", decided_value: value })
    .eq("batch", IMPORT_BATCH)
    .in("item_key", itemKeys);
  if (error) throw new Error(error.message);
}

export async function saveLibrary(): Promise<{ ok: true; result: SaveResult } | { ok: false; error: string }> {
  const { supabase, ownerId } = await ownerClient();
  try {
    const result = await saveImport(supabase, ownerId);
    revalidatePath("/", "layout");
    return { ok: true, result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}
