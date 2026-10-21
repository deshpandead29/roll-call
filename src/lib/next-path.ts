// Only same-site paths are allowed as a post-sign-in destination, so a
// crafted link can't bounce someone to another site.
export function safeNext(value: string | null | undefined, origin?: string): string {
  if (!value) return "/";
  if (origin && value.startsWith(origin)) value = value.slice(origin.length) || "/";
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  return value;
}
