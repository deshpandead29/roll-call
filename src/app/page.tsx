import Link from "next/link";
import { AlertsSetup } from "@/components/alerts-setup";
import { HeroCollage } from "@/components/hero-collage";
import { ProfileLink } from "@/components/profile-link";
import { eventStatus, type EventType } from "@/lib/events";
import { createClient } from "@/lib/supabase/server";

type GroupRow = { id: string; name: string; group_members: { count: number }[] };
type NowRow = { id: string; name: string; type: EventType; start_date: string; end_date: string; revealed: boolean; timezone: string; group_id: string };

const clock = () => Date.now();

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

  const [{ data: groups }, { data: eventRows }] = await Promise.all([
    supabase.from("groups").select("id, name, group_members(count)").order("created_at", { ascending: false }),
    // Live now, or revealed in the last three days: the ones worth one tap.
    supabase
      .from("event_details")
      .select("id, name, type, start_date, end_date, revealed, reveal_at, timezone, group_id")
      .gte("reveal_at", new Date(clock() - 3 * 864e5).toISOString())
      .order("start_date", { ascending: false }),
  ]);
  const groupName = (id: string) => (groups as GroupRow[] | null)?.find((g) => g.id === id)?.name ?? "";
  const now = ((eventRows ?? []) as NowRow[])
    .map((e) => ({ ...e, status: eventStatus(e, e.timezone) }))
    .filter((e) => e.status.label !== "Upcoming");

  return (
    <>
      <div className="top">
        <h1 className="wordmark">Roll Call</h1>
        <ProfileLink userId={claims.sub} />
      </div>

      <AlertsSetup isAnonymous={!!claims.is_anonymous} />

      {now.length > 0 && (
        <section className="card t-blue">
          <h2>Now</h2>
          <div className="trips">
            {now.map((e) => (
              <Link key={e.id} className="trip" href={`/events/${e.id}`}>
                <span>
                  <strong>{e.name}</strong>
                  <span className="muted small">
                    {groupName(e.group_id)}
                    {e.status.sub ? ` · ${e.status.sub}` : ""}
                  </span>
                </span>
                <span className={`pill ${e.status.tone}`}>{e.status.label}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

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
