import type { InputHTMLAttributes, ReactNode } from "react";

export function AuthCard({
  icon,
  title,
  intro,
  children,
}: {
  icon: string;
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-surface p-8 shadow-sm">
        <p className="text-center text-4xl" aria-hidden>
          {icon}
        </p>
        <h1 className="mt-3 text-center font-serif text-2xl font-semibold">{title}</h1>
        {intro && <p className="mt-2 text-center text-muted">{intro}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}

export function Field({
  label,
  ...input
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        {...input}
        className="mt-1 block w-full rounded-2xl border border-border bg-background px-4 py-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
      />
    </label>
  );
}

export function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-2xl bg-accent px-4 py-3 font-medium text-white transition hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "One moment…" : children}
    </button>
  );
}

export function FormMessage({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-2xl bg-accent-soft px-4 py-3 text-sm">
      {error}
    </p>
  );
}
