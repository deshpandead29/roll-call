// Shared by challenges and Roll Calls: decode the picked photo, print it with
// the Roll Call look, upload it to the private photos bucket. The caller then
// records the row (directly, or through a Roll Call function).

import { develop, handDate, loadImage, toJpeg } from "@/lib/develop";
import { createClient } from "@/lib/supabase/client";

export type Printed = { id: string; path: string };

export async function printAndUpload(
  file: File,
  o: { eventId: string; memberId: string; frame: number; who: string; today: string; mission: string; accent: string; time?: string },
): Promise<Printed> {
  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch {
    throw new Error("Couldn't read that photo.");
  }
  const id = crypto.randomUUID();
  const canvas = await develop(img, {
    W: 1080,
    frame: o.frame,
    who: o.who,
    date: handDate(o.today),
    time: o.time,
    mission: o.mission,
    accent: o.accent,
    seed: parseInt(id.slice(0, 5), 16),
  });
  const blob = await toJpeg(canvas);
  const path = `${o.eventId}/${o.memberId}/${id}.jpg`;
  const up = await createClient().storage.from("photos").upload(path, blob, { contentType: "image/jpeg" });
  if (up.error) throw new Error("Couldn't upload it. Check your signal and try again.");
  return { id, path };
}

export async function discard(path: string) {
  await createClient().storage.from("photos").remove([path]);
}

export function hhmm(iso: string | number | Date, timeZone: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone });
}
