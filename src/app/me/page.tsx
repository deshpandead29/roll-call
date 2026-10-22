import Link from "next/link";
import { redirect } from "next/navigation";
import { AddEmailForm } from "@/components/add-email-form";
import { AlertsSetup } from "@/components/alerts-setup";
import { AwayCard } from "@/components/away-card";
import { createClient } from "@/lib/supabase/server";
import { AwayForm } from "./away-form";
import { NameForm } from "./name-form";

export const metadata = { title: "Profile · Roll Call" };

// You, across every group: your name, your away card, alerts, your account.
export default async function MePage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) redirect("/sign-in?next=%2Fme");
  const claims = auth.claims;

  const { data: profile } = await supabase.from("profiles").select("display_name, away_card_path").eq("user_id", claims.sub).maybeSingle();
  const name = profile?.display_name ?? "";
  let card: string | null = null;
  if (profile?.away_card_path) {
    const { data } = await supabase.storage.from("away-cards").createSignedUrl(profile.away_card_path, 60 * 60);
    card = data?.signedUrl ?? null;
  }

  return (
    <>
      <div className="top">
        <Link className="link" href="/">← Groups</Link>
      </div>
      <section className="hero">
        <h1>Profile</h1>
        {name && <p className="muted">{name}</p>}
      </section>

      <section className="card">
        <h2>Your name</h2>
        <p className="muted small">What your groups see. Changing it changes it in all of them.</p>
        <NameForm current={name} />
      </section>

      <section className="card t-lime" id="away">
        <h2>Away card</h2>
        <p className="muted small">A selfie that fills your slot when you miss a Roll Call, in all your groups. Shown greyscale, marked away.</p>
        <div className="aways">
          <AwayCard name={name || "You"} url={card} reason="you" />
        </div>
        <AwayForm userId={claims.sub} hasCard={!!card} />
      </section>

      <AlertsSetup isAnonymous={!!claims.is_anonymous} />

      <section className="card t-blue">
        {claims.is_anonymous ? (
          <>
            <h2>Add your email</h2>
            <p className="muted">So you can sign in on another phone, or from the home screen app. Your groups and photos come with you.</p>
            <AddEmailForm />
          </>
        ) : (
          <>
            <h2>Account</h2>
            <p className="muted">Signed in as {claims.email}</p>
          </>
        )}
      </section>

      <section className="stack">
        <form action="/auth/sign-out" method="post">
          <button type="submit" className="link">Sign out</button>
        </form>
        {claims.is_anonymous && <p className="muted small">Signing out without an email loses this account.</p>}
      </section>
    </>
  );
}
