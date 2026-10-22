import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// Your away card as a small round photo, or your initial, linking to /me.
export async function ProfileLink({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("display_name, away_card_path").eq("user_id", userId).maybeSingle();
  let url: string | null = null;
  if (profile?.away_card_path) {
    const { data } = await supabase.storage.from("away-cards").createSignedUrl(profile.away_card_path, 60 * 60);
    url = data?.signedUrl ?? null;
  }
  return (
    <Link className="me-link" href="/me">
      <span className="avatar" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url ? <img src={url} alt="" /> : (profile?.display_name?.[0] ?? "?").toUpperCase()}
      </span>
      Profile
    </Link>
  );
}
