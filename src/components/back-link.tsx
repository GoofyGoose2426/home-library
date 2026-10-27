"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useViewMode } from "@/components/view-mode";

// Goes back to the library as it was (search, filters, scroll) when the
// reader came from there; otherwise opens the library fresh.
export function BackLink() {
  const router = useRouter();
  const { base } = useViewMode();
  return (
    <Link
      href={base || "/"}
      onClick={(e) => {
        const ref = document.referrer ? new URL(document.referrer) : null;
        if (window.history.length > 1 && (!ref || ref.origin === window.location.origin)) {
          e.preventDefault();
          router.back();
        }
      }}
      className="text-sm text-accent underline-offset-4 hover:underline"
    >
      ← Library
    </Link>
  );
}
