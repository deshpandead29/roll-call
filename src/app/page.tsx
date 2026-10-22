import Link from "next/link";
import { AlertsSetup } from "@/components/alerts-setup";
import { HeroCollage } from "@/components/hero-collage";
import { createClient } from "@/lib/supabase/server";

type GroupRow = { id: string; name: string; group_members: { count: number }[] };

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims) {
    return (
      <section className="hero">
        <p className="wordmark">Roll Call</p>
        <h1>Every angle, all at once.</h1>
        <p className="lede">Call roll and everyone shoots the same moment. You see it all the next day.</p>
        <HeroCollage />
        <div className="row">
          <Link className="button shutter" href="/sign-in">Get started</Link>
          <Link className="button ghost" href="/try">Try the look</Link>
          <Link className="link" href="/sample">See a sample</Link>
        </div>
      </section>
    );
  }

  const { data: groups } = await supabase
    .from("groups")
    .select("id, name, group_members(count)")
    .order("created_at", { ascending: false });

  return (
    <>
      <div className="top">
        <h1 className="wordmark">Roll Call</h1>
        <Link className="link" href="/me">You</Link>
      </div>

      <AlertsSetup isAnonymous={!!claims.is_anonymous} />

      <section className="card">
        <h2>Your groups</h2>
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
          <div className="empty">No groups yet. Make one, or open the invite link a friend sent you.</div>
        )}
        <div className="row">
          <Link className="button shutter" href="/groups/new">New group</Link>
          <Link className="link" href="/sample">See a sample</Link>
        </div>
      </section>
    </>
  );
}
