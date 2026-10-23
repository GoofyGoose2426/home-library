"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn } from "@/app/auth/actions";
import { Field, FormMessage, SubmitButton } from "@/components/auth-ui";

export function LoginForm({ linkProblem }: { linkProblem: boolean }) {
  const [state, action, pending] = useActionState(signIn, undefined);

  return (
    <form action={action} className="space-y-4">
      <FormMessage
        error={
          state?.error ??
          (linkProblem
            ? "That link has expired or was already used. Ask for a new one below."
            : undefined)
        }
      />
      <Field label="Email" name="email" type="email" autoComplete="username" inputMode="email" required />
      <Field label="Password" name="password" type="password" autoComplete="current-password" required />
      <SubmitButton pending={pending}>Sign in</SubmitButton>
      <p className="text-center text-sm">
        <Link href="/forgot-password" className="text-accent underline-offset-4 hover:underline">
          Forgot your password?
        </Link>
      </p>
    </form>
  );
}
