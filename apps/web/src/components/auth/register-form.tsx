"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAction } from "@/actions/auth";
import { AuthField } from "@/components/auth/auth-field";
import { Button } from "@/components/ui/button";
import { EMPTY_FORM_STATE } from "@/lib/auth/form-state";
import { cn } from "@/lib/utils";

const planOptions = [
  {
    value: "free",
    label: "Free",
    description: "One workspace, enough to validate the flow and start authoring.",
  },
  {
    value: "pro",
    label: "Pro",
    description: "More workspace capacity for teams running multiple template lines.",
  },
] as const;

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, EMPTY_FORM_STATE);
  const selectedPlan = state.values?.plan ?? "free";
  const mfaEnabled = state.values?.mfaEnabled === "true";

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
          Create Account
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
          Stand up a workspace for template operations.
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Registration issues a real API token immediately, so you land straight in the dashboard once the account is created.
        </p>
      </div>

      {state.message && (
        <div className="rounded-[1.25rem] border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.message}
        </div>
      )}

      <div className="flex flex-col gap-4">
        <AuthField
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          label="Work email"
          placeholder="team@ac2.app"
          defaultValue={state.values?.email ?? ""}
          error={state.errors?.email?.[0]}
          required
        />
        <AuthField
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          label="Password"
          placeholder="Use 8 or more characters"
          error={state.errors?.password?.[0]}
          description="The demo auth module enforces the shared minimum length from the contracts package."
          required
        />
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium text-foreground">Plan</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {planOptions.map((option) => (
            <label
              key={option.value}
              className={cn(
                "flex cursor-pointer flex-col gap-2 rounded-[1.5rem] border px-4 py-4 transition-colors",
                selectedPlan === option.value
                  ? "border-primary bg-primary/8"
                  : "border-border bg-background/70 hover:bg-secondary/70",
              )}
            >
              <input
                type="radio"
                name="plan"
                value={option.value}
                defaultChecked={selectedPlan === option.value}
                className="sr-only"
              />
              <span className="text-sm font-semibold text-foreground">{option.label}</span>
              <span className="text-sm leading-6 text-muted-foreground">{option.description}</span>
            </label>
          ))}
        </div>
        {state.errors?.plan?.[0] && (
          <p className="text-sm text-destructive">{state.errors.plan[0]}</p>
        )}
      </fieldset>

      <label className="flex items-start gap-3 rounded-[1.5rem] border border-border bg-background/70 px-4 py-4 text-sm leading-6 text-muted-foreground">
        <input
          type="checkbox"
          name="mfaEnabled"
          defaultChecked={mfaEnabled}
          className="mt-1 size-4 rounded border-border text-primary focus:ring-ring"
        />
        <span>
          <span className="block font-medium text-foreground">Enable MFA challenge</span>
          New accounts can be routed through the API&apos;s debug OTP verification screen during sign-in.
        </span>
      </label>

      <div className="flex items-center justify-between gap-4 text-sm">
        <Link className="text-muted-foreground transition-colors hover:text-foreground" href="/login">
          Already have an account?
        </Link>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Creating..." : "Create account"}
        </Button>
      </div>
    </form>
  );
}
