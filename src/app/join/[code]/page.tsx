import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { JoinForm, type OpenName } from "./join-form";

export const metadata = { title: "Join · Roll Call" };

type Preview = { group_id: string; name: string; member_count: number; open_names: OpenName[] };

export default async function JoinPage({ params, searchParams }: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ event?: string }>;
}) {
  const { code } = await params;
  const { event: requestedEvent } = await searchParams;
  const eventId = requestedEvent && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestedEvent) ? requestedEvent : null;
  const supabase = await createClient();
  const [{ data: claimsData }, { data: rows }] = await Promise.all([
    supabase.auth.getClaims(),
    supabase.rpc("group_preview", { p_code: code }),
  ]);
  const group = (rows as Preview[] | null)?.[0];

  if (!group) {
    return (
      <section className="card">
        <h2>That link doesn&apos;t work</h2>
        <p className="muted">Ask whoever sent it for a new one.</p>
        <div className="row">
          <Link className="button ghost" href="/">Home</Link>
        </div>
      </section>
    );
  }

  const { data: eventRows } = eventId
    ? await supabase.rpc("event_invite_preview", { p_code: code, p_event_id: eventId })
    : { data: null };
  const event = (eventRows as { id: string; name: string; reveal_at: string; timezone: string; revealed: boolean }[] | null)?.[0];
  if (requestedEvent && !event) return <section className="card"><h2>That event invite doesn&apos;t work</h2><p>Ask the host to send a new link.</p></section>;

  const signedIn = !!claimsData?.claims;
  let alreadyIn = false;
  let alreadyOnEvent = false;
  let myName = "";
  if (signedIn) {
    const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", claimsData!.claims.sub).maybeSingle();
    myName = profile?.display_name ?? "";
    const { count } = await supabase
      .from("group_members")
      .select("id", { count: "exact", head: true })
      .eq("group_id", group.group_id)
      .eq("user_id", claimsData!.claims.sub);
    alreadyIn = !!count;
    if (event && alreadyIn) {
      const { data: member } = await supabase.from("group_members").select("id").eq("group_id", group.group_id).eq("user_id", claimsData!.claims.sub).single();
      if (member) {
        const { count: onEvent } = await supabase.from("event_members").select("member_id", { count: "exact", head: true }).eq("event_id", event.id).eq("member_id", member.id);
        alreadyOnEvent = !!onEvent;
      }
    }
  }

  return (
    <>
      <section className="hero">
        <span className="label">Join</span>
        <h1>{event?.name ?? group.name}</h1>
        <p className="lede">Join your friends, answer a Roll Call, and see everyone&apos;s photos together at the reveal.</p>
        {event && <p className="muted">{group.name} · Reveals {new Date(event.reveal_at).toLocaleString("en-GB", { timeZone: event.timezone, dateStyle: "medium", timeStyle: "short" })} ({event.timezone})</p>}
        <p className="muted">
          {group.member_count} {group.member_count === 1 ? "person" : "people"}
        </p>
      </section>
      {(event ? alreadyOnEvent || (alreadyIn && event.revealed) : alreadyIn) ? (
        <section className="card">
          <h2>You&apos;re in</h2>
          <div className="row">
            <Link className="button" href={event ? `/events/${event.id}` : `/groups/${group.group_id}`}>Open</Link>
          </div>
        </section>
      ) : event?.revealed ? (
        <section className="card"><h2>This event has revealed</h2><p>Ask the host for a group invite to view the album.</p></section>
      ) : (
        <JoinForm code={code} signedIn={signedIn} openNames={group.open_names} defaultName={myName} eventId={event?.id} alreadyInGroup={alreadyIn} />
      )}
    </>
  );
}
