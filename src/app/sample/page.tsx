import Link from "next/link";
import { SampleView } from "./sample-view";

export const metadata = { title: "Sample trip · Roll Call" };

export default function SamplePage() {
  return (
    <>
      <div className="top">
        <Link className="link" href="/">← Home</Link>
        <span className="pill lime">Revealed</span>
      </div>
      <section className="hero">
        <h1>Rome</h1>
        <p className="muted">Trip · 12–13 Sep · The Rome lot</p>
      </section>
      <SampleView />
    </>
  );
}
