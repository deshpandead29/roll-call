import { tilt } from "@/lib/events";

export function AwayCard({ name, url, reason }: { name: string; url?: string | null; reason?: string }) {
  return (
    <div
      className="away"
      style={{ "--r": `${tilt(name + "aw", 4).toFixed(1)}deg` } as React.CSSProperties}
      role="img"
      aria-label={`${name}'s away card${reason ? `: ${reason}` : ""}`}
    >
      <span className="pill away-pill">away</span>
      {url ? (
        // Signed Storage URLs; next/image would need the Supabase host configured.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" />
      ) : (
        <div className="away-blank">{(name[0] || "?").toUpperCase()}</div>
      )}
      <p className="hand ink">
        {name}
        {reason ? ` · ${reason}` : ""}
      </p>
    </div>
  );
}
