import { redirect } from "next/navigation";
import { safeNext } from "@/lib/next-path";
import { getClaims } from "@/lib/supabase/server";
import { SignInForm } from "./sign-in-form";

export const metadata = { title: "Sign in · Roll Call" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);
  if (await getClaims()) redirect(next);

  return (
    <>
      <section className="hero">
        <h1>Sign in</h1>
        <p className="lede muted">We&apos;ll email you a code. No password.</p>
      </section>
      <SignInForm next={next} linkFailed={params.error === "link"} />
    </>
  );
}
