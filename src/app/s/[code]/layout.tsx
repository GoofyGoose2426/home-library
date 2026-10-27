import type { Metadata } from "next";

// The view-only link. Search engines are asked not to list it, and pages
// never pass their address (which holds the link's code) on to other sites.
export const metadata: Metadata = {
  title: "Alexandra's library",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function SharedLayout({ children }: LayoutProps<"/s/[code]">) {
  return children;
}
