import "server-only";
import { createHash, createHmac } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabasePublishableKey, supabaseUrl } from "./env";

// The secret view-only link (docs/sharing-plan.md). A link's code is worked
// out from the link's id and SHARE_LINK_SECRET, so it never has to be stored;
// the database only keeps a hash of it. Viewers' requests send that hash in
// the x-share-key header, which the database rules check.

const CODE = /^[A-Za-z0-9_-]{43}$/;

export function shareSecret() {
  const secret = process.env.SHARE_LINK_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

export function codeForLink(linkId: string) {
  const secret = shareSecret();
  if (!secret) throw new Error("SHARE_LINK_SECRET isn't set up yet.");
  return createHmac("sha256", secret).update(linkId).digest("base64url");
}

export function hashOfCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

// A read-only client for a viewer, or null when the link is wrong or off.
export async function sharedClient(code: string): Promise<SupabaseClient | null> {
  if (!CODE.test(code)) return null;
  const supabase = createClient(supabaseUrl, supabasePublishableKey, {
    global: { headers: { "x-share-key": hashOfCode(code) } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.rpc("shared_owner");
  if (error || !data) return null;
  return supabase;
}
