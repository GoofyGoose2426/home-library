import "server-only";
import { createClient } from "./server";
import { isOwnerEmail } from "./env";

// Supabase client for Server Actions that change data. Throws unless the
// signed-in user is Alexandra; RLS limits every write to her rows as well.
export async function ownerClient() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims || !isOwnerEmail(data.claims.email)) throw new Error("Not signed in.");
  return { supabase, ownerId: data.claims.sub as string };
}
