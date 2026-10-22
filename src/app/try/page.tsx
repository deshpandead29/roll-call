import Link from "next/link";
import { TryLook } from "./try-look";

export const metadata = { title: "Try the look · Roll Call" };

export default function TryPage() {
  return (
    <>
      <div className="top">
        <Link className="link" href="/">← Home</Link>
      </div>
      <section className="hero">
        <h1>Try the look</h1>
        <p className="lede muted">Every Roll Call photo prints like this, with its challenge written underneath. Your photo stays on your phone.</p>
      </section>
      <TryLook />
    </>
  );
}
