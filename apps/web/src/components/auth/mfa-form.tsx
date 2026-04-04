"use client";

import Link from "next/link";
import { useActionState } from "react";
import { verifyMfaAction } from "@/actions/auth";
import { AuthField } from "@/components/auth/auth-field";
import { Button } from "@/components/ui/button";
import { EMPTY_FORM_STATE } from "@/lib/auth/form-state";

interface MfaFormProps {
  email: string;
  challengeId: string;
  debugCode?: string;
}

export function MfaForm({ email, challengeId, debugCode }: MfaFormProps) {
  const [state, formAction, pending] = useActionState(verifyMfaAction, {
    ...EMPTY_FORM_STATE,
    values: {
      email,
      challengeId,
      debugCode: debugCode ?? "",
    },
  });

  const resolvedEmail = state.values?.email ?? email;
  const resolvedChallengeId = state.values?.challengeId ?? challengeId;
  const resolvedDebugCode = state.values?.debugCode ?? debugCode ?? "";

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="email" value={resolvedEmail} />
      <input type="hidden" name="challengeId" value={resolvedChallengeId} />
      <input type="hidden" name="debugCode" value={resolvedDebugCode} />

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
          Multi-Factor Check
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
          Verify the second factor for {resolvedEmail}.
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          This page is powered by the existing Fastify MFA flow. In local development the API exposes a debug code so you can finish the sign-in without external delivery.
        </p>
      </div>

      {resolvedDebugCode && (
        <div className="rounded-[1.25rem] border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-foreground">
          Debug code: <span className="font-mono font-semibold">{resolvedDebugCode}</span>
        </div>
      )}

      {state.message && (
        <div className="rounded-[1.25rem] border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.message}
        </div>
      )}

      <AuthField
        id="code"
        name="code"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        label="Verification code"
        placeholder="6-digit code"
        defaultValue={state.values?.code ?? ""}
        error={state.errors?.code?.[0]}
        description="Paste the OTP delivered by your MFA provider or use the debug code above in local dev."
        required
      />

      <div className="flex items-center justify-between gap-4 text-sm">
        <Link className="text-muted-foreground transition-colors hover:text-foreground" href="/login">
          Start over
        </Link>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Verifying..." : "Verify code"}
        </Button>
      </div>
    </form>
  );
}
