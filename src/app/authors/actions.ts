"use server";

import { revalidatePath } from "next/cache";
import { isCategory, type IdentityCategory } from "@/lib/representation";
import { ownerClient } from "@/lib/supabase/owner";

type Result = { ok: true } | { ok: false; error: string };
const UUID = /^[0-9a-f-]{36}$/i;

async function asResult(work: () => Promise<void>): Promise<Result> {
  try {
    await work();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't save that." };
  }
}

function text(v: unknown, max: number) {
  if (v == null) return null;
  if (typeof v !== "string" || v.length > max) throw new Error("That's too long.");
  return v;
}

// Alexandra adds an identity value to an author. A link and quote are optional.
export async function addAuthorIdentity(
  personId: string,
  category: IdentityCategory,
  value: string,
  url: string | null,
  quote: string | null,
): Promise<Result> {
  return asResult(async () => {
    if (!UUID.test(personId) || !isCategory(category)) throw new Error("That request isn't valid.");
    const { supabase } = await ownerClient();
    const { error } = await supabase.rpc("add_author_identity", {
      p_person: personId,
      p_category: category,
      p_value: text(value, 120),
      p_url: text(url, 2000),
      p_quote: text(quote, 600),
    });
    if (error) throw new Error(error.message);
    revalidatePath(`/authors/${personId}`);
  });
}

// The same for a book's characters.
export async function addCharacterRep(
  titleId: string,
  category: IdentityCategory,
  value: string,
  character: string | null,
  url: string | null,
  quote: string | null,
): Promise<Result> {
  return asResult(async () => {
    if (!UUID.test(titleId) || !isCategory(category)) throw new Error("That request isn't valid.");
    const { supabase } = await ownerClient();
    const { error } = await supabase.rpc("add_character_rep", {
      p_title: titleId,
      p_category: category,
      p_value: text(value, 120),
      p_character: text(character, 120),
      p_url: text(url, 2000),
      p_quote: text(quote, 600),
    });
    if (error) throw new Error(error.message);
    revalidatePath(`/books/${titleId}`);
  });
}

// Confirm a suggested value, or remove one (remembered, so it isn't
// suggested again).
export async function reviewIdentity(action: "confirm" | "reject", kind: "author" | "character", id: string): Promise<Result> {
  return asResult(async () => {
    if (!UUID.test(id) || !["confirm", "reject"].includes(action) || !["author", "character"].includes(kind)) {
      throw new Error("That request isn't valid.");
    }
    const { supabase } = await ownerClient();
    const { error } = await supabase.rpc("review_identity", { p_action: action, p_kind: kind, p_id: id });
    if (error) throw new Error(error.message);
    revalidatePath("/authors/[id]", "page");
    revalidatePath("/books/[id]", "page");
  });
}

export async function setOwnVoices(titleId: string, value: boolean | null): Promise<Result> {
  return asResult(async () => {
    if (!UUID.test(titleId) || ![true, false, null].includes(value)) throw new Error("That request isn't valid.");
    const { supabase } = await ownerClient();
    const { error } = await supabase.rpc("set_own_voices", { p_title: titleId, p_value: value });
    if (error) throw new Error(error.message);
    revalidatePath(`/books/${titleId}`);
  });
}
