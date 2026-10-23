"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/supabase/env";
import { MIN_PASSWORD_LENGTH } from "./rules";

export type FormState = { error?: string; sent?: boolean } | undefined;

const WRONG_LOGIN = "That email and password don't match. Try again?";

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  // Only the owner can get in, whatever Supabase would allow.
  if (!isOwnerEmail(email)) return { error: WRONG_LOGIN };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return {
      error:
        error.status === 429
          ? "Too many tries. Wait a few minutes, then try again."
          : WRONG_LOGIN,
    };
  }
  redirect("/");
}

export async function requestPasswordReset(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter your email." };

  // Same answer either way, so the page never reveals who has an account.
  if (isOwnerEmail(email)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${await siteOrigin()}/auth/confirm?next=/reset-password`,
    });
    if (error?.status === 429) {
      return { error: "A link was sent recently. Check your inbox, or try again in an hour." };
    }
  }
  return { sent: true };
}

export async function updatePassword(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Use at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  if (password !== confirm) return { error: "The two passwords don't match." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return {
      error:
        error.code === "same_password"
          ? "That's your current password. Choose a new one."
          : "Couldn't save the new password. Ask for a fresh reset link and try again.",
    };
  }
  redirect("/");
}

// The address this request came in on (the Vercel site, or localhost).
async function siteOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
