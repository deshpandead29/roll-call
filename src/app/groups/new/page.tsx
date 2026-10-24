import Link from "next/link";
import { redirect } from "next/navigation";
import { NewGroupForm } from "@/components/new-group-form";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "New group · Roll Call" };

export default async function NewGroupPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) redirect("/sign-in?next=%2Fgroups%2Fnew");

  const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", auth.claims.sub).maybeSingle();

  return (
    <>
      <div className="top">
        <Link className="link" href="/">← Groups</Link>
      </div>
      <section className="hero">
        <h1>New group</h1>
        <p className="lede muted">The people you go out with. Events live inside it.</p>
      </section>
      <NewGroupForm defaultName={profile?.display_name ?? ""} />
    </>
  );
}
