// Shared cleanup for photos deliberately deleted by their owner.

import { createClient } from "@/lib/supabase/client";

export async function discard(path: string) {
  const supabase = createClient();
  await Promise.all([supabase.storage.from("photos").remove([path]), supabase.storage.from("negatives").remove([path])]);
}

export { hhmm } from "@/lib/events";
