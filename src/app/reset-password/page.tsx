"use client";

import { useActionState } from "react";
import { updatePassword } from "@/app/auth/actions";
import { MIN_PASSWORD_LENGTH } from "@/app/auth/rules";
import { AuthCard, Field, FormMessage, SubmitButton } from "@/components/auth-ui";

// Reached from the reset email. The proxy only lets a signed-in owner in.
export default function ResetPasswordPage() {
  const [state, action, pending] = useActionState(updatePassword, undefined);

  return (
    <AuthCard
      icon="🔑"
      title="Choose a new password"
      intro={`At least ${MIN_PASSWORD_LENGTH} characters. Your password manager can make one for you.`}
    >
      <form action={action} className="space-y-4">
        <FormMessage error={state?.error} />
        <Field
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
        />
        <Field
          label="Type it again"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
        />
        <SubmitButton pending={pending}>Save new password</SubmitButton>
      </form>
    </AuthCard>
  );
}
