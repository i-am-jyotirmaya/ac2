import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { MfaForm } from "@/components/auth/mfa-form";
import { redirectIfAuthenticated } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "MFA Verification",
};

export default async function MfaPage({
  searchParams,
}: {
  searchParams: Promise<{
    challengeId?: string;
    email?: string;
    debugCode?: string;
  }>;
}) {
  await redirectIfAuthenticated();

  const params = await searchParams;
  const challengeId = params.challengeId;
  const email = params.email;

  if (!challengeId || !email) {
    redirect("/login");
  }

  return (
    <AuthShell
      eyebrow="Step-Up Security"
      title="Finish sign-in with the second factor."
      description="AC2 can route eligible accounts through the API&apos;s MFA challenge before exposing the dashboard or template management surfaces."
      footer={
        <p>
          Need a fresh challenge?{" "}
          <Link className="font-medium text-foreground underline underline-offset-4" href="/login">
            Go back to login
          </Link>
          .
        </p>
      }
      spotlight={
        <div className="rounded-[2rem] border border-border/70 bg-background/72 p-6 backdrop-blur">
          <p className="text-sm font-semibold text-foreground">Why this step exists</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.5rem] bg-secondary/55 p-4">
              <p className="text-sm font-semibold text-foreground">Protect operator access</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Template launch workflows often gate campaign assets and workspace access, so step-up verification helps limit blast radius.
              </p>
            </div>
            <div className="rounded-[1.5rem] bg-secondary/55 p-4">
              <p className="text-sm font-semibold text-foreground">Keep the flow local</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                During development the API emits a debug OTP, which keeps the journey testable before real delivery channels are added.
              </p>
            </div>
          </div>
        </div>
      }
    >
      <MfaForm email={email} challengeId={challengeId} debugCode={params.debugCode} />
    </AuthShell>
  );
}
