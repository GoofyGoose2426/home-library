import Link from "next/link";
import { ViewModeProvider } from "@/components/view-mode";

export function SharedFrame({ code, children }: { code: string; children: React.ReactNode }) {
  return <ViewModeProvider mode={{ readOnly: true, base: `/s/${code}` }}>{children}</ViewModeProvider>;
}

export function LinkOff() {
  return (
    <div className="mt-10 rounded-3xl border border-border bg-surface p-6 text-center">
      <p className="font-serif text-xl font-semibold">This link isn&apos;t working</p>
      <p className="mt-2 text-muted">It may have been turned off or replaced. Ask Alexandra for the current link.</p>
    </div>
  );
}

export function SharedHeader({ code }: { code: string }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <h1 className="font-serif text-2xl font-semibold">Alexandra&apos;s library</h1>
      <nav className="flex items-center gap-1 text-sm">
        <Link href={`/s/${code}/lookup`} className="rounded-full bg-accent px-4 py-2 font-medium text-on-accent">
          Does she own it?
        </Link>
      </nav>
    </header>
  );
}
