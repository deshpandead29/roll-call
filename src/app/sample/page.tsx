import Link from "next/link";
import { SampleView } from "./sample-view";

export const metadata = { title: "Example · Roll Call" };

// The only place the stock sample photos load. Reached from "See an example"
// on the signed-out landing page, never pushed during the real journey.
export default function SamplePage() {
  return (
    <>
      <div className="top">
        <Link className="link" href="/">← Back</Link>
        <span className="pill">Example</span>
      </div>
      <section className="hero">
        <h1>Rome</h1>
        <p className="muted">An example trip, after the reveal</p>
      </section>
      <SampleView />
      <p className="muted small">
        Want to see the print on one of your own photos? <Link className="link" href="/try">Try the look</Link>
      </p>
    </>
  );
}
