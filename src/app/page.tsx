import Link from "next/link";
import { AddEmailForm } from "@/components/add-email-form";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims) {
    return (
      <section className="hero">
        <h1>Every angle, all at once.</h1>
        <p className="lede">Call roll and everyone shoots the same moment. You see it all the next day.</p>
        <div className="row">
          <Link className="button" href="/sign-in">Sign in</Link>
        </div>
      </section>
    );
  }

  const { data: groups } = await supabase.from("groups").select("id, name").order("created_at");

  return (
    <>
      <section className="hero">
        <h1>Roll Call</h1>
      </section>

      <section className="card">
        <h2>Your groups</h2>
        {groups?.length ? (
          <ul className="list">
            {groups.map((g) => (
              <li key={g.id}>{g.name}</li>
            ))}
          </ul>
        ) : (
          <p className="muted">No groups yet. Open a friend&apos;s invite link to join theirs.</p>
        )}
      </section>

      <section className="card t-blue">
        <h2>You</h2>
        {claims.is_anonymous ? (
          <>
            <p className="muted">Add your email so you can sign in on another phone. Your groups and photos come with you.</p>
            <AddEmailForm />
          </>
        ) : (
          <p className="muted">Signed in as {claims.email}</p>
        )}
        <form action="/auth/sign-out" method="post">
          <button type="submit" className="link">Sign out</button>
        </form>
        {claims.is_anonymous && (
          <p className="muted small">Signing out without an email loses this account.</p>
        )}
      </section>
    </>
  );
}
