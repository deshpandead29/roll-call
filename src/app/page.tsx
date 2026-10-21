import Link from "next/link";
import { AddEmailForm } from "@/components/add-email-form";
import { NewGroupForm } from "@/components/new-group-form";
import { createClient } from "@/lib/supabase/server";

type GroupRow = { id: string; name: string; group_members: { count: number }[] };

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
          <a className="button ghost" href="/prototype">Try the prototype</a>
        </div>
      </section>
    );
  }

  const [{ data: groups }, { data: lastMe }] = await Promise.all([
    supabase.from("groups").select("id, name, group_members(count)").order("created_at", { ascending: false }),
    supabase
      .from("group_members")
      .select("display_name")
      .eq("user_id", claims.sub)
      .order("joined_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <>
      <section className="hero">
        <p className="wordmark">Roll Call</p>
      </section>

      <section className="card">
        <div className="top">
          <h2>Your groups</h2>
          <a className="link" href="/prototype">See a sample</a>
        </div>
        {groups?.length ? (
          <div className="trips">
            {(groups as GroupRow[]).map((g) => {
              const n = g.group_members[0]?.count ?? 0;
              return (
                <Link key={g.id} className="trip" href={`/groups/${g.id}`}>
                  <span>
                    <strong>{g.name}</strong>
                    <span className="muted small">{n} {n === 1 ? "person" : "people"}</span>
                  </span>
                  <span className="hand ink" aria-hidden="true">→</span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="empty">No groups yet. Make one below, or open a friend&apos;s invite link.</div>
        )}
      </section>

      <NewGroupForm defaultName={lastMe?.display_name ?? ""} />

      <section className="card t-blue">
        <h2>You</h2>
        {claims.is_anonymous ? (
          <details className="stack">
            <summary className="link">Add your email</summary>
            <p className="muted small">So you can sign in on another phone. Your groups and photos come with you.</p>
            <AddEmailForm />
          </details>
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
