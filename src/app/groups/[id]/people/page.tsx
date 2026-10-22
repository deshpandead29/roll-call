import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { AwayCard } from "@/components/away-card";
import { createClient } from "@/lib/supabase/server";
import { AddNamesForm } from "../add-names-form";
import { AwayUpload } from "../away-upload";
import { InviteLink } from "../invite-link";

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

      <section className="card t-blue">
        <h2>Invite</h2>
        <p className="muted small">Anyone with this link can join {group.name}.</p>
        <InviteLink url={`${origin}/join/${group.invite_code}`} groupName={group.name} />
        {notJoined.length > 0 && <p className="muted small">Not joined yet: {notJoined.join(", ")}.</p>}
        <AddNamesForm groupId={group.id} />
      </section>

      <section className="card" id="away">
        <h2>Away cards</h2>
        <p className="muted small">Your selfie fills your slot when you miss a Roll Call. Greyscale, marked away.</p>
        <div className="aways">
          {people.map((m) => (
            <AwayCard
              key={m.id}
              name={m.display_name}
              url={m.away_card_path ? awayUrls.get(m.away_card_path) : null}
              reason={m.id === me.id ? "you" : undefined}
            />
          ))}
        </div>
        <AwayUpload groupId={group.id} memberId={me.id} oldPath={me.away_card_path} />
      </section>
    </>
  );
}
