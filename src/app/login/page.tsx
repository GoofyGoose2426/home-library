export const metadata = { title: "Sign in · Home Library" };

// Placeholder until step 4 adds the email + password form.
export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-surface p-8 text-center shadow-sm">
        <p className="text-4xl" aria-hidden>
          🔒
        </p>
        <h1 className="mt-3 font-serif text-2xl font-semibold">
          Home Library
        </h1>
        <p className="mt-2 text-muted">This library is private.</p>
        <p className="mt-6 rounded-2xl bg-accent-soft px-4 py-3 text-sm">
          Sign-in is coming soon.
        </p>
      </div>
    </main>
  );
}
