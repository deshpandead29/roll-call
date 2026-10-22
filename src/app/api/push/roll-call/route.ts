import { NextResponse, type NextRequest } from "next/server";
import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";

// Sends "Priya called roll" to everyone a call was for. The caller's app
// posts here straight after calling; roll_call_push_targets() checks it's
// their call, under a minute old, and not already sent, and leaves out
// anyone snoozed or home.

type Target = { endpoint: string; keys: { p256dh: string; auth: string }; caller_name: string; event_id: string; event_name: string };

export async function POST(request: NextRequest) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return NextResponse.json({ sent: 0, reason: "push not configured" }, { status: 503 });

  const { rollCallId } = (await request.json().catch(() => ({}))) as { rollCallId?: string };
  if (!rollCallId) return NextResponse.json({ error: "rollCallId" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("roll_call_push_targets", { p_roll_call_id: rollCallId });
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  const targets = (data ?? []) as Target[];

  // The subject must be an https URL or mailto. Local dev runs on http.
  const origin = request.nextUrl.origin;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || (origin.startsWith("https://") ? origin : "mailto:dev@example.com"), publicKey, privateKey);
  const gone: string[] = [];
  const results = await Promise.allSettled(
    targets.map((t) =>
      webpush
        .sendNotification(
          { endpoint: t.endpoint, keys: t.keys },
          JSON.stringify({
            title: `${t.caller_name} called roll`,
            body: `${t.event_name}. Shoot the same moment.`,
            tag: `roll-${rollCallId}`,
            url: `/events/${t.event_id}`,
          }),
          // Late answers count for 15 minutes, so the push is worth delivering until then.
          { TTL: 15 * 60, urgency: "high" },
        )
        .catch((e: { statusCode?: number }) => {
          if (e.statusCode === 404 || e.statusCode === 410) gone.push(t.endpoint);
          throw e;
        }),
    ),
  );
  if (gone.length) await supabase.rpc("forget_push_subscriptions", { p_roll_call_id: rollCallId, p_endpoints: gone });

  return NextResponse.json({ sent: results.filter((r) => r.status === "fulfilled").length, failed: results.filter((r) => r.status === "rejected").length });
}
