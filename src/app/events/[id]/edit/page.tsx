import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { type EventType, type Pace } from "@/lib/events";
import { createClient } from "@/lib/supabase/server";
import { EditEventForm } from "./edit-event-form";

export const metadata = { title: "Edit event · Roll Call" };

type EventRow = {
  id: string;
  group_id: string;
  name: string;
  type: EventType;
  start_date: string;
  end_date: string;
  pace: Pace;
  host_member_id: string | null;
  honoree_member_id: string | null;
  hunt_word?: string | null;
  revealed: boolean;
};

// The host's form for an event they've already made. Before the reveal
// everything can change; after it, only the name.
export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) redirect(`/sign-in?next=${encodeURIComponent(`/events/${id}/edit`)}`);

  const { data: row } = await supabase.from("event_details").select("*").eq("id", id).maybeSingle();
  if (!row) notFound();
  const ev = row as EventRow;

  const [{ data: members }, { data: coming }, { data: counts }] = await Promise.all([
    supabase.from("group_members").select("id, display_name, user_id").eq("group_id", ev.group_id).order("created_at"),
    supabase.from("event_members").select("member_id").eq("event_id", id),
    supabase.rpc("event_shot_counts", { p_event_id: id }),
  ]);
  const host = (members ?? []).find((m) => m.id === ev.host_member_id);
  if (!host || host.user_id !== auth.claims.sub) redirect(`/events/${id}/details`);
  const shots = new Map(((counts ?? []) as { member_id: string; shots: number }[]).map((c) => [c.member_id, c.shots]));

  return (
    <>
      <div className="top">
        <Link className="link" href={`/events/${id}/details`}>← Details</Link>
      </div>
      <section className="hero">
        <h1>Edit event</h1>
      </section>
      <EditEventForm
        ev={{ ...ev, hunt_word: ev.hunt_word ?? null }}
        members={(members ?? []).map((m) => ({ id: m.id, name: m.display_name, shots: shots.get(m.id) ?? 0 }))}
        coming={(coming ?? []).map((c) => c.member_id)}
      />
    </>
  );
}
