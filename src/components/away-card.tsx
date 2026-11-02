// Someone's away card: their own selfie, greyscale with stripes, used where
// they missed a moment. `small` is the reveal's version: a chip under the
// photos, so missing people don't take a photo-sized slot.
export function AwayCard({ name, url, reason, small = false }: { name: string; url?: string | null; reason?: string; small?: boolean }) {
  const face = url ? (
    // Signed Storage URLs; next/image would need the Supabase host configured.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" />
  ) : (
    <div className="away-blank">{(name[0] || "?").toUpperCase()}</div>
  );
  if (small) {
    return (
      <span className="away-sm">
        <span className="avatar">{face}</span>
        <span>
          {name}
          {reason ? <span className="muted"> · {reason}</span> : null}
        </span>
      </span>
    );
  }
  return (
    <div className="away" role="img" aria-label={`${name}'s away card${reason ? `: ${reason}` : ""}`}>
      <span className="pill away-pill">away</span>
      {face}
      <p>
        {name}
        {reason ? ` · ${reason}` : ""}
      </p>
    </div>
  );
}
