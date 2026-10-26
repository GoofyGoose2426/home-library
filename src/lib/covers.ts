import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Alexandra's own cover photos live in the private "covers" bucket. Pages
// show them through signed links that stop working after a day.
const SIGNED_FOR_SECONDS = 60 * 60 * 24;

export async function signCoverPaths(supabase: SupabaseClient, paths: string[]) {
  const urls = new Map<string, string>();
  const unique = [...new Set(paths)];
  for (let i = 0; i < unique.length; i += 500) {
    const { data, error } = await supabase.storage
      .from("covers")
      .createSignedUrls(unique.slice(i, i + 500), SIGNED_FOR_SECONDS);
    if (error) throw new Error(error.message);
    for (const d of data ?? []) if (d.path && d.signedUrl) urls.set(d.path, d.signedUrl);
  }
  return urls;
}
