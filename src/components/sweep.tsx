"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { sweep } from "@/lib/sweep";

// Once per app load, for signed-in people: clear your leftover files, and
// announce any reveal in your groups that nobody has announced yet.
export function Sweep() {
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      sweep(supabase).catch(() => {});
      fetch("/api/push/reveals", { method: "POST" }).catch(() => {});
    });
  }, []);
  return null;
}
