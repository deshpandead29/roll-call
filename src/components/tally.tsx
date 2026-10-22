import { rng } from "@/lib/missions";

// Hand-drawn tally marks, in fives, from the prototype's tally().
export function Tally({ n, seed }: { n: number; seed: number }) {
  const r = rng(seed || 7);
  const line = (x1: number, y1: number, x2: number, y2: number) => {
    const mx = (x1 + x2) / 2 + (r() - 0.5) * 2.2;
    const my = (y1 + y2) / 2 + (r() - 0.5) * 2.2;
    return `M${x1.toFixed(1)} ${y1.toFixed(1)}Q${mx.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  };
  const group = (k: number, slash: boolean) => {
    let d = "";
    for (let i = 0; i < k; i++) {
      const x = 3 + i * 5 + (r() - 0.5) * 1.2;
      d += line(x, 2 + r() * 1.5, x + (r() - 0.5) * 1.4, 19 + r() * 1.5);
    }
    if (slash) d += line(0, 16 + r() * 2, 24, 4 + r() * 2);
    return { d, w: slash ? 26 : Math.max(6, k * 5 + 2) };
  };
  const marks = [...Array.from({ length: Math.floor(n / 5) }, () => group(4, true)), ...(n % 5 ? [group(n % 5, false)] : [])];
  return (
    <span className="tally">
      {marks.map((m, i) => (
        <svg key={i} width={m.w} height="22" viewBox={`0 0 ${m.w} 22`} aria-hidden="true">
          <path d={m.d} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ))}
    </span>
  );
}
