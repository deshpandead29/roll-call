"use client";

import { useEffect, useState } from "react";
import { develop, handDate, loadImage } from "@/lib/develop";
import { todayIn } from "@/lib/events";
import { ACCENT } from "@/lib/missions";

// Three sample prints, tilted and taped, as in the prototype's hero.
const SPECS = [
  ["DzGCdUlNJTU", "Something pink", "mei", "hunt"],
  ["5jySMpqi6xk", "Mei's best portrait", "priya", "wild"],
  ["TmTYtJ5RiN8", "Stock photo pose", "sam", "wild"],
] as const;

export function HeroCollage() {
  const [cards, setCards] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const out: string[] = [];
      for (let i = 0; i < SPECS.length; i++) {
        const [id, mission, who, kind] = SPECS[i];
        try {
          const img = await loadImage(await (await fetch(`/prototype/samples/${id}.jpg`)).blob());
          const c = await develop(img, { W: 480, seed: i + 3, frame: i * 3 + 2, who, date: handDate(todayIn()), mission, accent: ACCENT[kind] });
          out.push(c.toDataURL("image/jpeg", 0.86));
        } catch {}
      }
      if (!cancelled) setCards(out);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="collage" role="img" aria-label="Three example prints">
      {cards.map((u, i) => (
        <div key={i} className="pc">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={u} alt="" />
        </div>
      ))}
    </div>
  );
}
