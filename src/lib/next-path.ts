// Only same-site paths are allowed as a post-sign-in destination, so a
// crafted link can't bounce someone to another site.
export function safeNext(value: string | null | undefined, origin?: string): string {
  if (!value) return "/";
  if (origin && value.startsWith(origin)) value = value.slice(origin.length) || "/";
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  return value;
}

// Where sign-in emails send people back to. Supabase's default templates
// redirect here with a `code`; ours pass this whole URL as `next`, which
// unwrapNext() undoes.
export function confirmUrl(origin: string, next: string): string {
  return `${origin}/auth/confirm?next=${encodeURIComponent(next)}`;
}

export function unwrapNext(next: string): string {
  const url = new URL(next, "http://x");
  return url.pathname === "/auth/confirm" ? safeNext(url.searchParams.get("next")) : next;
}
