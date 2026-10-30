import Link from "next/link";
import { BookCover } from "@/components/book-cover";
import { RepresentationPanel } from "@/components/representation-panel";
import type { Author } from "@/lib/author";
import { copyList } from "@/lib/copy-labels";
import { hostOf } from "@/lib/representation";

const ROLE: Record<string, string> = {
  author: "",
  writer: "Writer",
  artist: "Artist",
  editor: "Editor",
  translator: "Translator",
  narrator: "Narrator",
};
const STATUS = { read: "✓ Read", partly_read: "Partly read", unread: "Unread" } as const;

// readOnly: the view-only link (no editing; links stay under base).
export function AuthorDetail({ author: a, readOnly = false, base = "" }: { author: Author; readOnly?: boolean; base?: string }) {
  const read = a.books.filter((b) => b.readStatus === "read").length;
  const owner = readOnly ? "Alexandra owns" : "You own";
  return (
    <article className="mt-4">
      <h1 className="font-serif text-3xl font-semibold leading-tight">{a.name}</h1>
      <p className="mt-1 text-muted">
        {owner} {a.books.length} {a.books.length === 1 ? "book" : "books"}
        {a.books.length > 0 && ` · ${read} read`}
      </p>
      {a.website && (
        <p className="mt-1 text-sm">
          <a href={a.website} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2">
            {hostOf(a.website) ?? "Website"}
          </a>
        </p>
      )}

      <section className="mt-8">
        <h2 className="font-serif text-xl font-semibold">In their own words</h2>
        <p className="mb-3 mt-1 text-sm text-muted">
          {readOnly
            ? "Only what the author has said publicly about themselves, with a link to where they said it. Anything else is unknown."
            : "Only what the author has said publicly about themselves, with the link and their words. Anything else stays unknown: nothing is guessed from a name, photo or nationality."}
        </p>
        <RepresentationPanel kind="author" targetId={a.id} values={a.identities} readOnly={readOnly} />
        <p className="mt-2 text-xs text-muted">
          {a.checkedAt
            ? `Last looked up ${new Date(a.checkedAt).toLocaleDateString("en-CA", { dateStyle: "medium" })}.`
            : "Not looked up yet."}
        </p>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-serif text-xl font-semibold">Books</h2>
        {a.books.length ? (
          <ul className="space-y-2">
            {a.books.map((b) => (
              <li key={b.id}>
                <Link href={`${base}/books/${b.id}`} className="flex gap-3 rounded-2xl border border-border bg-surface p-3 hover:bg-accent-soft">
                  <BookCover title={b.title} authors={[]} url={b.coverUrl} className="w-12 shrink-0 !rounded-lg !p-1 [&_p]:hidden" />
                  <span className="min-w-0">
                    <span className="block font-medium leading-snug">
                      {b.title}
                      {ROLE[b.role] && <span className="text-sm font-normal text-muted"> ({ROLE[b.role]})</span>}
                    </span>
                    {b.series && (
                      <span className="block text-sm text-muted">
                        {b.series}
                        {b.seriesNumber != null && ` #${Number(b.seriesNumber)}`}
                      </span>
                    )}
                    <span className="block text-xs text-muted">
                      {STATUS[b.readStatus]} · {copyList(b)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No books in the library right now.</p>
        )}
      </section>
    </article>
  );
}
