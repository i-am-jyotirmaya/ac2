"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction } from "@/actions/auth";
import { AuthField } from "@/components/auth/auth-field";
import { Button } from "@/components/ui/button";
import { EMPTY_FORM_STATE } from "@/lib/auth/form-state";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, EMPTY_FORM_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
          Sign In
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
          Continue into the template dashboard.
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Use the credentials you registered with the API. If MFA is enabled we will move you into the verification step automatically.
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
          label="Email"
          placeholder="operator@ac2.app"
          defaultValue={state.values?.email ?? ""}
          error={state.errors?.email?.[0]}
          description="Your workspace and dashboard are tied to this identity."
          required
        />
        <AuthField
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          label="Password"
          placeholder="At least 8 characters"
          error={state.errors?.password?.[0]}
          required
        />
      </div>

      <div className="flex items-center justify-between gap-4 text-sm">
        <Link
          className="text-muted-foreground transition-colors hover:text-foreground"
          href="/forgot-password"
        >
          Forgot your password?
        </Link>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Signing in..." : "Sign in"}
        </Button>
      </div>
    </form>
  );
}
