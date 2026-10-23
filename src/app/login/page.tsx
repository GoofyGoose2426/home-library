import { Suspense } from "react";
import { AuthCard } from "@/components/auth-ui";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in · Home Library" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <AuthCard icon="🔒" title="Home Library" intro="This library is private.">
      <Suspense fallback={<LoginForm linkProblem={false} />}>
        <LoginFormWithParams searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}

async function LoginFormWithParams({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { error } = await searchParams;
  return <LoginForm linkProblem={error === "link"} />;
}
