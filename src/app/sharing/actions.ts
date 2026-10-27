"use server";

import { revalidatePath } from "next/cache";
import { codeForLink, hashOfCode, shareSecret } from "@/lib/supabase/shared";
import { ownerClient } from "@/lib/supabase/owner";

type Result = { ok: true } | { ok: false; error: string };

async function run(work: (supabase: Awaited<ReturnType<typeof ownerClient>>["supabase"]) => Promise<void>): Promise<Result> {
  try {
    if (!shareSecret()) throw new Error("Sharing isn't set up yet: SHARE_LINK_SECRET is missing in Vercel.");
    const { supabase } = await ownerClient();
    await work(supabase);
    revalidatePath("/sharing");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't change sharing." };
  }
}

async function turnOffLive(supabase: Awaited<ReturnType<typeof ownerClient>>["supabase"]) {
  const { error } = await supabase.from("share_links").update({ turned_off_at: new Date().toISOString() }).is("turned_off_at", null);
  if (error) throw new Error(error.message);
}

async function addLink(supabase: Awaited<ReturnType<typeof ownerClient>>["supabase"]) {
  const id = crypto.randomUUID();
  const { error } = await supabase.from("share_links").insert({ id, token_hash: hashOfCode(codeForLink(id)) });
  if (error) throw new Error(error.message);
}

// Turns sharing on with a new link (or replaces the live one).
export async function newShareLink() {
  return run(async (supabase) => {
    await turnOffLive(supabase);
    await addLink(supabase);
  });
}

export async function turnOffSharing() {
  return run(turnOffLive);
}
