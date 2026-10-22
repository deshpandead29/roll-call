"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { sweep } from "@/lib/sweep";

// Once per app load, for signed-in people.
export function Sweep() {
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) sweep(supabase).catch(() => {});
    });
  }, []);
  return null;
}
