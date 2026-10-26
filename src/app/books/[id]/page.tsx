import { Suspense } from "react";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { BookDetail } from "@/components/book-detail";
import { loadBook } from "@/lib/book";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Book · Home Library" };

export default function BookPage({ params }: PageProps<"/books/[id]">) {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-16 pt-6">
      <BackLink />
      <Suspense fallback={<p className="mt-8 text-muted">Opening the book…</p>}>
        <BookData params={params} />
      </Suspense>
    </main>
  );
}

async function BookData({ params }: Pick<PageProps<"/books/[id]">, "params">) {
  const { id } = await params;
  const supabase = await createClient();
  const book = await loadBook(supabase, id);
  if (!book) notFound();
  return <BookDetail book={book} />;
}
