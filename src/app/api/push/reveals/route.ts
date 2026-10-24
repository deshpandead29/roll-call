import { createClient as createAnon } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";

// Sends "Lisbon is out" once per event when it reveals, and "Lisbon starts
// today" once on its first day, to everyone on it. Two ways in:
// POST from the app (any group member opening it after a reveal, or the host
// pressing Reveal now) and GET from the Vercel cron, which needs CRON_SECRET
// set in Vercel and the same value in private.secrets.

type Target = { endpoint: string; keys: { p256dh: string; auth: string }; event_id: string; event_name: string };

const configured = () => !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY;
const notConfigured = () => NextResponse.json({ sent: 0, reason: "push not configured" }, { status: 503 });

const MESSAGES = {
  reveal: (t: Target) => ({ title: `${t.event_name} is out`, body: "Everyone's shots, side by side.", tag: `reveal-${t.event_id}` }),
  start: (t: Target) => ({ title: `${t.event_name} is today`, body: "Your challenge is ready.", tag: `start-${t.event_id}` }),
};

async function send(request: NextRequest, batches: { kind: keyof typeof MESSAGES; targets: Target[] }[]) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
  const privateKey = process.env.VAPID_PRIVATE_KEY!;
  const origin = request.nextUrl.origin;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || (origin.startsWith("https://") ? origin : "mailto:dev@example.com"), publicKey, privateKey);
  const results = await Promise.allSettled(
    batches.flatMap(({ kind, targets }) =>
      targets.map((t) =>
        webpush.sendNotification(
          { endpoint: t.endpoint, keys: t.keys },
          JSON.stringify({ ...MESSAGES[kind](t), url: `/events/${t.event_id}` }),
          { TTL: 12 * 60 * 60 },
        ),
      ),
    ),
  );
  return NextResponse.json({ sent: results.filter((r) => r.status === "fulfilled").length, failed: results.filter((r) => r.status === "rejected").length });
}

// Checked before claiming, so a reveal is never marked as announced unsent.
export async function POST(request: NextRequest) {
  if (!configured()) return notConfigured();
  const supabase = await createClient();
  const [reveal, start] = await Promise.all([supabase.rpc("reveal_push_targets"), supabase.rpc("start_push_targets")]);
  if (reveal.error) return NextResponse.json({ error: reveal.error.message }, { status: 403 });
  return send(request, [
    { kind: "reveal", targets: (reveal.data ?? []) as Target[] },
    // Start alerts need the newer migration; skip them quietly if it isn't there.
    { kind: "start", targets: start.error ? [] : ((start.data ?? []) as Target[]) },
  ]);
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ sent: 0, reason: "cron not configured" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  if (!configured()) return notConfigured();
  const supabase = createAnon(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
  const [reveal, start] = await Promise.all([
    supabase.rpc("due_reveal_push_targets", { p_secret: secret }),
    supabase.rpc("due_start_push_targets", { p_secret: secret }),
  ]);
  if (reveal.error) return NextResponse.json({ error: reveal.error.message }, { status: 403 });
  return send(request, [
    { kind: "reveal", targets: (reveal.data ?? []) as Target[] },
    { kind: "start", targets: start.error ? [] : ((start.data ?? []) as Target[]) },
  ]);
}
