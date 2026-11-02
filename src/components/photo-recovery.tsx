"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PendingPhotos } from "./pending-photos";

// Recovery stays accessible even when an event is deleted or the user leaves it.
export function PhotoRecovery() {
  const [owner, setOwner] = useState<string | null>(null);
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return;
    let closed = false;
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!closed) setOwner(session?.user.id ?? null);
    });
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!closed) setOwner(session?.user.id ?? null);
    });
    return () => { closed = true; subscription.unsubscribe(); };
  }, []);
  return owner ? <PendingPhotos key={owner} owner={owner} /> : null;
}
