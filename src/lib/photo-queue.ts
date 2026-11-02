import { develop, handDate, loadImage, negativeCanvas, toJpeg } from "@/lib/develop";
import { createClient } from "@/lib/supabase/client";

import { enqueue, persist, removePending, queueChanged, type CaptureOptions, type PhotoAction, type PendingPhoto } from "@/lib/photo-store";
export { pendingPhotos, removePending, subscribeQueue, type PendingPhoto } from "@/lib/photo-store";
const active = new Set<string>();

// `owner` is the signed-in user's id from the server-rendered page. Asking the
// auth client instead can wait on the network to renew an expired token, and
// the photo must reach the device first, signal or not.
export async function saveCapture(file: File, options: CaptureOptions, action: PhotoAction, owner: string) {
  const photo: PendingPhoto = { id: crypto.randomUUID(), owner, file, options, action, createdAt: Date.now() };
  try { return await enqueue(photo); }
  catch { throw new Error("Couldn't save this photo on your device. Keep it in your camera roll and try again."); }
}

export function autoRetry(photo: PendingPhoto) {
  return photo.action.type !== "call" && !photo.blocked;
}
function permanent(error: { code?: string; statusCode?: string | number }) {
  return ["P0001", "P0002", "42501", "23503", "23505", "23514", "22023"].includes(error.code ?? "");
}
class RejectedPhoto extends Error {}
// Refused for now, not for good: a call within a minute of another (RC429).
class RetryLater extends Error {}
function check(error: { message: string; code?: string; statusCode?: string | number } | null) {
  if (!error) return;
  if (error.code === "RC429") throw new RetryLater(error.message);
  if (permanent(error)) throw new RejectedPhoto(error.message);
  if (["403", "404", "413"].includes(String(error.statusCode))) {
    throw new RejectedPhoto("This photo couldn't be added to the event. Keep a copy before discarding it.");
  }
  throw new Error(error.message);
}

export async function sendPending(photo: PendingPhoto): Promise<boolean> {
  if (active.has(photo.id)) return false;
  active.add(photo.id);
  queueChanged();
  const supabase = createClient();
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user.id !== photo.owner) return false;
    const o = photo.options;
    // Reconcile a committed save whose response was lost before doing more work.
    const { data: existing, error: readError } = await supabase.from("photos").select("id, roll_call_id").eq("id", photo.id).maybeSingle();
    check(readError);
    if (existing) {
      if (photo.action.type === "call" && existing.roll_call_id) await notifyCall(existing.roll_call_id);
      await removePending(photo.id);
      return true;
    }
    if (photo.action.type === "call" && Date.now() - photo.createdAt > 5 * 60_000) {
      throw new RejectedPhoto("This unsent call is more than five minutes old. Keep the photo, then start a fresh call.");
    }
    if (photo.action.type === "answer") {
      const { error } = await supabase.rpc("begin_roll_answer", { p_roll_call_id: photo.action.callId, p_photo_id: photo.id });
      check(error);
    }
    let image: HTMLImageElement;
    try { image = await loadImage(photo.file); }
    catch { throw new RejectedPhoto("This browser couldn't read the photo. Keep a copy and try a supported image format."); }
    const canvas = await develop(image, { W: 1080, frame: o.frame, who: o.who, date: handDate(o.today), time: o.time,
      mission: o.mission, accent: o.accent, seed: parseInt(photo.id.slice(0, 5), 16) });
    const blob = await toJpeg(canvas);
    const path = `${o.eventId}/${o.memberId}/${photo.id}.jpg`;
    const upload = await supabase.storage.from("photos").upload(path, blob, { contentType: "image/jpeg" });
    // A previous attempt may have uploaded successfully before losing its response.
    if (upload.error && String(upload.error.statusCode) !== "409" && upload.error.message !== "The resource already exists") check(upload.error);
    const negative = await new Promise<Blob | null>((resolve) => negativeCanvas(image).toBlob(resolve, "image/jpeg", 0.7));
    if (negative) await supabase.storage.from("negatives").upload(path, negative, { contentType: "image/jpeg" }).catch(() => {});
    if (photo.action.type === "photo") {
      const { error } = await supabase.from("photos").insert({ ...photo.action.row, id: photo.id,
        event_id: o.eventId, member_id: o.memberId, frame: o.frame, storage_path: path });
      if (error?.code === "23505") {
        const { data, error: verifyError } = await supabase.from("photos").select("id").eq("id", photo.id).maybeSingle();
        check(verifyError);
        if (!data) check(error);
      } else check(error);
    } else if (photo.action.type === "call") {
      const { data, error } = await supabase.rpc("call_roll", { p_event_id: o.eventId, p_photo_id: photo.id,
        p_storage_path: path, p_frame: o.frame, p_recipients: photo.action.recipients });
      check(error);
      await notifyCall(data);
    } else {
      const { error } = await supabase.rpc("answer_roll", { p_roll_call_id: photo.action.callId,
        p_photo_id: photo.id, p_storage_path: path, p_frame: o.frame });
      check(error);
    }
    await removePending(photo.id);
    return true;
  } catch (error) {
    await persist({ ...photo, blocked: error instanceof RejectedPhoto,
      error: error instanceof RejectedPhoto || error instanceof RetryLater ? error.message
        : "Couldn't send yet. Your photo is saved on this device." });
    return false;
  } finally {
    active.delete(photo.id);
    queueChanged();
  }
}
async function notifyCall(rollCallId: string) {
  // Sending is best effort; never claim delivery to a phone.
  await fetch("/api/push/roll-call", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rollCallId }) }).catch(() => {});
}
export function isSending(id: string) { return active.has(id); }
