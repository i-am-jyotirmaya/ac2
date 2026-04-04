import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { redirectIfAuthenticated } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Register",
};

export default async function RegisterPage() {
  await redirectIfAuthenticated();

  return (
    <AuthShell
      eyebrow="Workspace Setup"
      title="Create an AC2 account for template operations."
      description="Choose a plan, decide whether MFA should be active, and let the API issue the session that carries you into the dashboard."
      footer={
        <p>
          Already registered?{" "}
          <Link className="font-medium text-foreground underline underline-offset-4" href="/login">
            Sign in
          </Link>
          .
        </p>
      }
      spotlight={
        <div className="rounded-[2rem] border border-border/70 bg-background/72 p-6 backdrop-blur">
          <p className="text-sm font-semibold text-foreground">What happens next</p>
          <div className="mt-5 flex flex-col gap-4">
            <TimelineStep number="01" title="Create credentials" description="The registration request goes to the Fastify auth module through a Next server action." />
            <TimelineStep number="02" title="Issue access token" description="A successful signup returns the shared auth token response and stores it in a secure cookie." />
            <TimelineStep number="03" title="Open dashboard" description="You arrive inside the template dashboard with creation and management controls ready." />
          </div>
        </div>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}

function TimelineStep({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="grid grid-cols-[56px_minmax(0,1fr)] gap-4 rounded-[1.5rem] bg-secondary/55 p-4">
      <div className="flex size-14 items-center justify-center rounded-[1.25rem] bg-primary text-sm font-semibold text-primary-foreground">
        {number}
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
