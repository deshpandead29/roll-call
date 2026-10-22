import type { SupabaseClient } from "@supabase/supabase-js";

// Removes your files that no row points at any more: photos from a deleted
// event or a removed shot, replaced away cards, everything after leaving a
// group. Storage only lets the uploader delete them (deleting needs read
// access, and other people's photos stay sealed), so each person's app
// cleans up its own.
export async function sweep(supabase: SupabaseClient) {
  const { data } = await supabase.rpc("my_orphaned_files");
  const files = (data ?? []) as { bucket: string; path: string }[];
  for (const bucket of new Set(files.map((f) => f.bucket))) {
    await supabase.storage.from(bucket).remove(files.filter((f) => f.bucket === bucket).map((f) => f.path));
  }
}
