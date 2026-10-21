import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { JoinForm, type OpenName } from "./join-form";

export const metadata = { title: "Join · Roll Call" };

type Preview = { group_id: string; name: string; member_count: number; open_names: OpenName[] };

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
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

  const signedIn = !!claimsData?.claims;
  let alreadyIn = false;
  if (signedIn) {
    const { count } = await supabase
      .from("group_members")
      .select("id", { count: "exact", head: true })
      .eq("group_id", group.group_id)
      .eq("user_id", claimsData!.claims.sub);
    alreadyIn = !!count;
  }

  return (
    <>
      <section className="hero">
        <span className="label">Join</span>
        <h1>{group.name}</h1>
        <p className="lede muted">
          {group.member_count} {group.member_count === 1 ? "person" : "people"}
        </p>
      </section>
      {alreadyIn ? (
        <section className="card">
          <h2>You&apos;re in</h2>
          <div className="row">
            <Link className="button" href="/">Open</Link>
          </div>
        </section>
      ) : (
        <JoinForm code={code} signedIn={signedIn} openNames={group.open_names} />
      )}
    </>
  );
}
