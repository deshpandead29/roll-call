import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AddNamesForm } from "../add-names-form";
import { InviteLink } from "../invite-link";
import { LeaveGroup } from "../leave-group";

export const metadata = { title: "People · Roll Call" };

type Member = { id: string; display_name: string; user_id: string | null; away_card_path: string | null };

export default async function PeoplePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) redirect(`/sign-in?next=${encodeURIComponent(`/groups/${id}/people`)}`);

  const [{ data: group }, { data: members }] = await Promise.all([
    supabase.from("groups").select("id, name, invite_code").eq("id", id).maybeSingle(),
    supabase.from("group_members").select("id, display_name, user_id, away_card_path").eq("group_id", id).order("created_at"),
  ]);
  if (!group || !members) notFound();
  const people = members as Member[];
  const me = people.find((m) => m.user_id === auth.claims.sub);
  if (!me) notFound();

  const awayPaths = people.map((m) => m.away_card_path).filter((p): p is string => !!p);
  const awayUrls = new Map<string, string>();
  if (awayPaths.length) {
    const { data } = await supabase.storage.from("away-cards").createSignedUrls(awayPaths, 60 * 60);
    data?.forEach((d) => d.path && d.signedUrl && awayUrls.set(d.path, d.signedUrl));
  }
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const notJoined = people.filter((m) => !m.user_id).map((m) => m.display_name);

  // Up top while people still need to join; below the list once everyone has.
  const invite = (
    <section className="card t-blue">
      <h2>Invite</h2>
      <p className="muted small">
        Anyone with this link can join {group.name}.
        {notJoined.length > 0 && ` Not joined yet: ${notJoined.join(", ")}.`}
      </p>
      <InviteLink url={`${origin}/join/${group.invite_code}`} groupName={group.name} />
      <AddNamesForm groupId={group.id} />
    </section>
  );

  return (
    <>
      <div className="top">
        <Link className="link" href={`/groups/${group.id}`}>← {group.name}</Link>
      </div>
      <section className="hero">
        <h1>People</h1>
        <p className="muted">
          {people.length - notJoined.length} of {people.length} joined
        </p>
      </section>

      {notJoined.length > 0 && invite}

      <section className="card" id="away">
        <h2>Everyone</h2>
        <ul className="people">
          {people.map((m) => {
            const url = m.away_card_path ? awayUrls.get(m.away_card_path) : null;
            return (
              <li key={m.id}>
                <span className="avatar" aria-hidden="true">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {url ? <img src={url} alt="" /> : (m.display_name[0] ?? "?").toUpperCase()}
                </span>
                <span>{m.display_name}</span>
                <span className="muted small">
                  {m.id === me.id ? "you" : !m.user_id ? "not joined" : !m.away_card_path ? "no away card" : ""}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="muted small">
          Away cards fill someone&apos;s slot when they miss a Roll Call.{" "}
          <Link className="link" href="/me#away">{me.away_card_path ? "Change yours" : "Add yours"}</Link>
        </p>
      </section>

      {notJoined.length === 0 && invite}

      <LeaveGroup groupId={group.id} groupName={group.name} last={people.filter((m) => m.user_id).length === 1} />
    </>
  );
}
