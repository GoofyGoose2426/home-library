import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Where links in Supabase emails land. The free plan's standard email sends
// `?code=…` (exchanged with the cookie set when the link was requested);
// a custom email template would send `?token_hash=…&type=…` instead.
const ALLOWED_NEXT = ["/", "/reset-password"];

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next") ?? "/";
  const next = ALLOWED_NEXT.includes(nextParam) ? nextParam : "/";

  const supabase = await createClient();
  let ok = false;

  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type === "recovery") {
    ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  }

  const target = ok ? (type === "recovery" ? "/reset-password" : next) : "/login?error=link";
  return NextResponse.redirect(new URL(target, request.url));
}
