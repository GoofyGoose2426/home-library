/* eslint-disable @next/next/no-img-element -- covers are hotlinked as-is so
   they don't use up Vercel's free image-optimisation allowance */

// Warm palette for books without a cover, picked from the title so each
// book always gets the same colour.
const PLACEHOLDERS = [
  ["#c0573e", "#f6e1d6"],
  ["#8a5a44", "#f3e3d3"],
  ["#5f7a61", "#e5efe1"],
  ["#4f6d8a", "#e1eaf3"],
  ["#8b5e83", "#f1e2ee"],
  ["#b07d2b", "#f6ead0"],
] as const;

function hash(text: string) {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

export function BookCover({
  title,
  authors,
  url,
  unconfirmed = false,
  className = "",
}: {
  title: string;
  authors: string[];
  url: string | null;
  unconfirmed?: boolean;
  className?: string;
}) {
  if (url) {
    return (
      <div className={`relative aspect-[2/3] overflow-hidden rounded-xl bg-accent-soft shadow-sm ${className}`}>
        <img
          src={url}
          alt={`Cover of ${title}`}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
        {unconfirmed && (
          <span className="absolute bottom-1 left-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] text-white">
            unconfirmed
          </span>
        )}
      </div>
    );
  }

  const [ink, paper] = PLACEHOLDERS[hash(title) % PLACEHOLDERS.length];
  return (
    <div
      className={`flex aspect-[2/3] flex-col justify-between overflow-hidden rounded-xl p-3 shadow-sm ${className}`}
      style={{ backgroundColor: paper, color: ink, borderLeft: `6px solid ${ink}` }}
      role="img"
      aria-label={`${title} (no cover yet)`}
    >
      <p className="line-clamp-5 font-serif text-sm font-semibold leading-snug">{title}</p>
      {authors.length > 0 && <p className="line-clamp-2 text-[11px] opacity-80">{authors.join(", ")}</p>}
    </div>
  );
}
