import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";

// Called once a day by Vercel Cron (see vercel.json) so the free Supabase
// plan never pauses the database for inactivity. Vercel sends
// "Authorization: Bearer $CRON_SECRET"; anything else is turned away.
// The ping itself reads no data.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  }
  const supabase = createClient(supabaseUrl, supabasePublishableKey, { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc("keepalive");
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 502 });
  return NextResponse.json({ ok: true, at: data }, { headers: { "Cache-Control": "no-store" } });
}
