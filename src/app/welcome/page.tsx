import { redirect } from "next/navigation";
import { safeNext } from "@/lib/next-path";
import { createClient } from "@/lib/supabase/server";
import { WelcomeFlow } from "./welcome-flow";

export const metadata = { title: "Welcome · Roll Call" };

// First run: your name, then an optional away-card selfie. Anyone who's
// already set up passes straight through to where they were going.
export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ next?: string; step?: string }> }) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) redirect(`/sign-in?next=${encodeURIComponent(next)}`);

  const { data: profile } = await supabase.from("profiles").select("display_name, away_card_path").eq("user_id", auth.claims.sub).maybeSingle();
  const hasName = !!profile?.display_name;
  if (hasName && (params.step !== "card" || profile?.away_card_path)) redirect(next);

  return <WelcomeFlow userId={auth.claims.sub} next={next} name={profile?.display_name ?? ""} startAt={hasName ? "card" : "name"} />;
}
