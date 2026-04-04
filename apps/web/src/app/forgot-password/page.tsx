import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { redirectIfAuthenticated } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Forgot Password",
};

export default async function ForgotPasswordPage() {
  await redirectIfAuthenticated();

  return (
    <AuthShell
      eyebrow="Recovery"
      title="Start a password reset flow without leaking account state."
      description="The UI is in place now so the backend reset endpoint can be attached later without revisiting the layout or form ergonomics."
      footer={
        <p>
          Remembered it?{" "}
          <Link className="font-medium text-foreground underline underline-offset-4" href="/login">
            Return to sign in
          </Link>
          .
        </p>
      }
      spotlight={
        <div className="rounded-[2rem] border border-border/70 bg-background/72 p-6 backdrop-blur">
          <p className="text-sm font-semibold text-foreground">Recovery principles</p>
          <ul className="mt-5 flex flex-col gap-3 text-sm leading-6 text-muted-foreground">
            <li className="rounded-[1.25rem] bg-secondary/55 px-4 py-3">
              Every response uses the same confirmation language so account existence is never exposed.
            </li>
            <li className="rounded-[1.25rem] bg-secondary/55 px-4 py-3">
              The final reset route can be wired to an email token without changing the page structure.
            </li>
            <li className="rounded-[1.25rem] bg-secondary/55 px-4 py-3">
              Recovery sits alongside the login and MFA views as part of one consistent auth surface.
            </li>
          </ul>
        </div>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
