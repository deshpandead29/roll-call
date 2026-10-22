import Link from "next/link";
import { redirect } from "next/navigation";
import { AddEmailForm } from "@/components/add-email-form";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "You · Roll Call" };

export default async function MePage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) redirect("/sign-in?next=%2Fme");
  const claims = auth.claims;

  return (
    <>
      <div className="top">
        <Link className="link" href="/">← Groups</Link>
      </div>
      <section className="hero">
        <h1>You</h1>
      </section>
      <section className="card">
        {claims.is_anonymous ? (
          <>
            <h2>Add your email</h2>
            <p className="muted">So you can sign in on another phone, or from the home screen app. Your groups and photos come with you.</p>
            <AddEmailForm />
          </>
        ) : (
          <>
            <h2>Signed in</h2>
            <p className="muted">{claims.email}</p>
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
