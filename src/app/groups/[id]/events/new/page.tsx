import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewEventForm } from "../../new-event-form";

export const metadata = { title: "New event · Roll Call" };

export default async function NewEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) redirect(`/sign-in?next=${encodeURIComponent(`/groups/${id}/events/new`)}`);

  const [{ data: group }, { data: members }] = await Promise.all([
    supabase.from("groups").select("id, name, timezone").eq("id", id).maybeSingle(),
    supabase.from("group_members").select("id, display_name").eq("group_id", id).order("created_at"),
  ]);
  if (!group || !members) notFound();

  return (
    <>
      <div className="top">
        <Link className="link" href={`/groups/${group.id}`}>← {group.name}</Link>
      </div>
      <section className="hero">
        <h1>New event</h1>
      </section>
      <NewEventForm groupId={group.id} timeZone={group.timezone} members={members.map((m) => ({ id: m.id, name: m.display_name }))} />
    </>
  );
}
