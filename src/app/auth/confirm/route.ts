import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/next-path";
import { createClient } from "@/lib/supabase/server";

const OTP_TYPES: EmailOtpType[] = ["email", "magiclink", "signup", "email_change", "invite"];

// Where email links land. The templates in supabase/templates send a
// token_hash, which works even when the link opens in a different browser
// from the one that asked for it (an iPhone home-screen app, say). A PKCE
// `code` is handled too, for links sent with the default templates.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("next"), origin);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  const supabase = await createClient();
  let ok = false;

  if (tokenHash && type && OTP_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  if (ok) return NextResponse.redirect(new URL(next, origin));

  const retry = new URL("/sign-in", origin);
  retry.searchParams.set("error", "link");
  if (next !== "/") retry.searchParams.set("next", next);
  return NextResponse.redirect(retry);
}
