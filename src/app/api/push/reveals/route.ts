import { createClient as createAnon } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";

// Sends "Lisbon is out" once per event, to everyone on it. Two ways in:
// POST from the app (any group member opening it after a reveal, or the host
// pressing Reveal now) and GET from the Vercel cron, which needs CRON_SECRET
// set in Vercel and the same value in private.secrets.

type Target = { endpoint: string; keys: { p256dh: string; auth: string }; event_id: string; event_name: string };

async function send(request: NextRequest, targets: Target[]) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return NextResponse.json({ sent: 0, reason: "push not configured" }, { status: 503 });
  const origin = request.nextUrl.origin;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || (origin.startsWith("https://") ? origin : "mailto:dev@example.com"), publicKey, privateKey);
  const results = await Promise.allSettled(
    targets.map((t) =>
      webpush.sendNotification(
        { endpoint: t.endpoint, keys: t.keys },
        JSON.stringify({ title: `${t.event_name} is out`, body: "Everyone's shots, side by side.", tag: `reveal-${t.event_id}`, url: `/events/${t.event_id}` }),
        { TTL: 24 * 60 * 60 },
      ),
    ),
  );
  return NextResponse.json({ sent: results.filter((r) => r.status === "fulfilled").length, failed: results.filter((r) => r.status === "rejected").length });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reveal_push_targets");
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return send(request, (data ?? []) as Target[]);
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ sent: 0, reason: "cron not configured" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const supabase = createAnon(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc("due_reveal_push_targets", { p_secret: secret });
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return send(request, (data ?? []) as Target[]);
}
