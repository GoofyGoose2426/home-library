import { createBrowserClient } from "@supabase/ssr";
import { supabasePublishableKey, supabaseUrl } from "./env";

// Supabase client for the browser, used to upload cover photos straight to
// storage. It carries the same login cookie, so storage rules still apply.
export function createClient() {
  return createBrowserClient(supabaseUrl, supabasePublishableKey);
}
