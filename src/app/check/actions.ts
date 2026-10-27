"use server";

import { revalidatePath } from "next/cache";
import { REVIEW_FIELDS } from "@/lib/review-fields";
import { ownerClient } from "@/lib/supabase/owner";

type Result = { ok: true } | { ok: false; error: string };
const UUID = /^[0-9a-f-]{36}$/i;
const KEYS = new Set(REVIEW_FIELDS.map((f) => f.key));

async function asResult(work: () => Promise<void>): Promise<Result> {
  try {
    await work();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't save that." };
  }
}

// Confirm, edit or reject one waiting value.
export async function reviewItem(
  action: "confirm" | "edit" | "reject",
  key: string,
  id: string,
  titleId: string,
  value: string | null,
): Promise<Result> {
  return asResult(async () => {
    if (!KEYS.has(key) || !UUID.test(id) || !UUID.test(titleId) || !["confirm", "edit", "reject"].includes(action)) {
      throw new Error("That request isn't valid.");
    }
    if (value !== null && (typeof value !== "string" || value.length > 5000)) throw new Error("That's too long.");
    const [table, field] = key.split(".");
    const { supabase } = await ownerClient();
    const { error } =
      table === "tags"
        ? await supabase.rpc("review_tag", { p_action: action, p_title_id: titleId, p_tag_id: id })
        : await supabase.rpc("review_value", { p_action: action, p_table: table, p_id: id, p_field: field, p_value: value });
    if (error) throw new Error(error.message);
    revalidatePath(`/books/${titleId}`);
  });
}

export async function confirmAll(key: string): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  try {
    if (!KEYS.has(key)) throw new Error("That request isn't valid.");
    const { supabase } = await ownerClient();
    const { data, error } = await supabase.rpc("confirm_all", { p_field: key });
    if (error) throw new Error(error.message);
    revalidatePath("/check");
    revalidatePath("/", "layout");
    return { ok: true, count: data as number };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't confirm those." };
  }
}
