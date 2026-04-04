"use server";

import { LoginRequestSchema, MfaVerifyRequestSchema, RegisterRequestSchema } from "@ac2/contracts";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  Ac2ApiError,
  beginMfaChallenge,
  completeMfaChallenge,
  loginWithPassword,
  registerWithPassword,
} from "@/lib/auth/api";
import type { FormState } from "@/lib/auth/form-state";
import { clearSession, setSession } from "@/lib/auth/session";

const EmailOnlySchema = z.object({
  email: z.email(),
});

const buildFieldErrors = (
  errors: Record<string, string[] | undefined>,
  values: Record<string, string>,
  message?: string,
): FormState => ({
  message,
  errors,
  values,
});

export const loginAction = async (
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> => {
  const values = {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };

  const parsed = LoginRequestSchema.safeParse(values);
  if (!parsed.success) {
    return buildFieldErrors(parsed.error.flatten().fieldErrors, {
      email: values.email,
    });
  }

  try {
    const payload = await loginWithPassword(parsed.data);
    await setSession(payload);
    redirect("/dashboard");
  } catch (error) {
    if (
      error instanceof Ac2ApiError &&
      error.status === 401 &&
      error.message.toLowerCase().includes("mfa required")
    ) {
      try {
        const challenge = await beginMfaChallenge({
          email: parsed.data.email,
          password: parsed.data.password,
        });

        if (challenge.requiresMfa && challenge.challengeId) {
          const searchParams = new URLSearchParams({
            challengeId: challenge.challengeId,
            email: parsed.data.email,
          });

          if (challenge.debugCode) {
            searchParams.set("debugCode", challenge.debugCode);
          }

          redirect(`/auth/mfa?${searchParams.toString()}`);
        }
      } catch (challengeError) {
        if (challengeError instanceof Ac2ApiError) {
          return {
            message: challengeError.message,
            values: {
              email: values.email,
            },
          };
        }
      }
    }

    return {
      message: error instanceof Ac2ApiError ? error.message : "Unable to sign you in right now.",
      values: {
        email: values.email,
      },
    };
  }
};

export const registerAction = async (
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> => {
  const values = {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    plan: String(formData.get("plan") ?? "free"),
    mfaEnabled: formData.get("mfaEnabled") === "on",
  };

  const parsed = RegisterRequestSchema.safeParse(values);
  if (!parsed.success) {
    return buildFieldErrors(parsed.error.flatten().fieldErrors, {
      email: values.email,
      plan: values.plan,
      mfaEnabled: String(values.mfaEnabled),
    });
  }

  try {
    const payload = await registerWithPassword(parsed.data);
    await setSession(payload);
    redirect("/dashboard");
  } catch (error) {
    return {
      message: error instanceof Ac2ApiError ? error.message : "Unable to create your account.",
      values: {
        email: values.email,
        plan: values.plan,
        mfaEnabled: String(values.mfaEnabled),
      },
    };
  }
};

export const verifyMfaAction = async (
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> => {
  const values = {
    challengeId: String(formData.get("challengeId") ?? ""),
    code: String(formData.get("code") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    debugCode: String(formData.get("debugCode") ?? "").trim(),
  };

  const parsed = MfaVerifyRequestSchema.safeParse({
    challengeId: values.challengeId,
    code: values.code,
  });

  if (!parsed.success) {
    return buildFieldErrors(parsed.error.flatten().fieldErrors, values);
  }

  try {
    const payload = await completeMfaChallenge(parsed.data);
    await setSession(payload);
    redirect("/dashboard");
  } catch (error) {
    return {
      message: error instanceof Ac2ApiError ? error.message : "Unable to verify the MFA code.",
      values,
    };
  }
};

export const forgotPasswordAction = async (
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> => {
  const values = {
    email: String(formData.get("email") ?? "").trim(),
  };

  const parsed = EmailOnlySchema.safeParse(values);
  if (!parsed.success) {
    return buildFieldErrors(parsed.error.flatten().fieldErrors, values);
  }

  return {
    success:
      "If an account exists for that email, a recovery link will be sent. The final reset endpoint can plug into the API module later.",
  };
};

export const logoutAction = async (): Promise<void> => {
  await clearSession();
  redirect("/login");
};
