import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { redirectIfAuthenticated } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Login",
};

export default async function LoginPage() {
  await redirectIfAuthenticated();

  return (
    <AuthShell
      eyebrow="Control Room Access"
      title="Sign in and move straight into the AC2 dashboard."
      description="This auth flow is wired to the existing Fastify module in the monorepo, so login, registration, and MFA all follow the shared contracts package."
      footer={
        <p>
          Need an account?{" "}
          <Link className="font-medium text-foreground underline underline-offset-4" href="/register">
            Create one now
          </Link>
          .
        </p>
      }
      spotlight={
        <div className="rounded-[2rem] border border-border/70 bg-background/72 p-6 backdrop-blur">
          <p className="text-sm font-semibold text-foreground">Built for operators</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <SpotlightItem title="Shared schemas" description="Login and registration validate against the same Zod contracts used by the API." />
            <SpotlightItem title="Optional MFA" description="Accounts can opt into the second-factor challenge during registration." />
            <SpotlightItem title="Template-first dashboard" description="Successful sign-in lands on a workspace for creating and managing templates." />
          </div>
        </div>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}

function SpotlightItem({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.5rem] bg-secondary/55 p-4">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}
