"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPasswordAction } from "@/actions/auth";
import { AuthField } from "@/components/auth/auth-field";
import { Button } from "@/components/ui/button";
import { EMPTY_FORM_STATE } from "@/lib/auth/form-state";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    forgotPasswordAction,
    EMPTY_FORM_STATE,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
          Password Recovery
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
          Start a reset without exposing which accounts exist.
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          The UI is wired and ready. Connect the backend reset endpoint later without changing the form contract here.
        </p>
      </div>

      {state.message && (
        <div className="rounded-[1.25rem] border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.message}
        </div>
      )}

      {state.success && (
        <div className="rounded-[1.25rem] border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-foreground">
          {state.success}
        </div>
      )}

      <AuthField
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        label="Email"
        placeholder="operator@ac2.app"
        defaultValue={state.values?.email ?? ""}
        error={state.errors?.email?.[0]}
        description="We always return the same confirmation message for privacy."
        required
      />

      <div className="flex items-center justify-between gap-4 text-sm">
        <Link className="text-muted-foreground transition-colors hover:text-foreground" href="/login">
          Back to sign in
        </Link>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Sending..." : "Send reset link"}
        </Button>
      </div>
    </form>
  );
}
