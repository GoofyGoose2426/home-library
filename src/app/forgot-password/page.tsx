"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset } from "@/app/auth/actions";
import { AuthCard, Field, FormMessage, SubmitButton } from "@/components/auth-ui";

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);

  if (state?.sent) {
    return (
      <AuthCard
        icon="📬"
        title="Check your email"
        intro="If that's your address, a link to choose a new password is on its way. Open it in this same browser. It works once, for one hour."
      >
        <BackToSignIn />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      icon="🔑"
      title="Forgot your password?"
      intro="Enter your email and we'll send you a link to choose a new one."
    >
      <form action={action} className="space-y-4">
        <FormMessage error={state?.error} />
        <Field label="Email" name="email" type="email" autoComplete="username" inputMode="email" required />
        <SubmitButton pending={pending}>Send the link</SubmitButton>
        <BackToSignIn />
      </form>
    </AuthCard>
  );
}

function BackToSignIn() {
  return (
    <p className="text-center text-sm">
      <Link href="/login" className="text-accent underline-offset-4 hover:underline">
        Back to sign in
      </Link>
    </p>
  );
}
