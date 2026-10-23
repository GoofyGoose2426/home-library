// Public Supabase settings. Both values are safe in the browser: Row Level
// Security, not secrecy, is what protects the data.
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

// The only account allowed in. Checked on every request, on top of
// sign-ups being switched off in Supabase.
export function isOwnerEmail(email: unknown): boolean {
  const owner = process.env.OWNER_EMAIL?.trim().toLowerCase();
  return (
    !!owner && typeof email === "string" && email.toLowerCase() === owner
  );
}
