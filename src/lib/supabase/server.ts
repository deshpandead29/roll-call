import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// One per request. Server Components can't write cookies, so setAll is a
// no-op there; the proxy refreshes the session before rendering.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component.
          }
        },
      },
    },
  );
}

// The signed-in user's claims, verified against the project's signing keys.
export async function getClaims() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims ?? null;
}
