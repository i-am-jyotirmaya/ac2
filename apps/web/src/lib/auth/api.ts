import "server-only";

import {
  AuthTokenResponseSchema,
  type AuthTokenResponse,
  type LoginRequest,
  type MfaChallengeResponse,
  MfaChallengeResponseSchema,
  type MfaChallengeRequest,
  type MfaVerifyRequest,
  type RegisterRequest,
} from "@ac2/contracts";
import { z } from "zod";

const ApiErrorSchema = z.object({
  error: z.string().optional(),
  message: z.string().optional(),
  details: z.unknown().optional(),
});

export class Ac2ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "Ac2ApiError";
  }
}

const apiBaseUrl = process.env.AC2_API_BASE_URL ?? "http://127.0.0.1:4000";

const createApiUrl = (path: string): string => new URL(path, apiBaseUrl).toString();

const parseApiError = async (response: Response): Promise<Ac2ApiError> => {
  try {
    const payload = ApiErrorSchema.parse(await response.json());
    return new Ac2ApiError(
      payload.message ?? "The AC2 API rejected the request.",
      response.status,
      payload.details,
    );
  } catch {
    return new Ac2ApiError("The AC2 API is currently unavailable.", response.status);
  }
};

const postJson = async <TOutput>(
  path: string,
  body: unknown,
  schema: z.ZodType<TOutput>,
): Promise<TOutput> => {
  let response: Response;

  try {
    response = await fetch(createApiUrl(path), {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new Ac2ApiError(
      "Unable to reach the AC2 API. Start the backend or set AC2_API_BASE_URL.",
      503,
    );
  }

  if (!response.ok) {
    throw await parseApiError(response);
  }

  return schema.parse(await response.json());
};

export const loginWithPassword = async (
  payload: LoginRequest,
): Promise<AuthTokenResponse> =>
  postJson("/auth/login", payload, AuthTokenResponseSchema);

export const registerWithPassword = async (
  payload: RegisterRequest,
): Promise<AuthTokenResponse> =>
  postJson("/auth/register", payload, AuthTokenResponseSchema);

export const beginMfaChallenge = async (
  payload: MfaChallengeRequest,
): Promise<MfaChallengeResponse> =>
  postJson("/auth/mfa/challenge", payload, MfaChallengeResponseSchema);

export const completeMfaChallenge = async (
  payload: MfaVerifyRequest,
): Promise<AuthTokenResponse> =>
  postJson("/auth/mfa/verify", payload, AuthTokenResponseSchema);
