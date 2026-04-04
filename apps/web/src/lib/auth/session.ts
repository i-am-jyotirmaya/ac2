import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { AuthTokenResponseSchema } from "@ac2/contracts";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

const SESSION_COOKIE_NAME = "ac2_session";
const SESSION_SECRET =
  process.env.SESSION_SECRET ??
  process.env.JWT_SECRET ??
  "dev-session-secret-change-in-production";

const SessionCookieSchema = z.object({
  accessToken: z.string(),
  expiresAt: z.number().int().positive(),
  user: AuthTokenResponseSchema.shape.user,
});

export type AuthSession = z.infer<typeof SessionCookieSchema>;

const encodeSession = (payload: AuthSession): string =>
  Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");

const decodeSession = (value: string): AuthSession | null => {
  try {
    return SessionCookieSchema.parse(
      JSON.parse(Buffer.from(value, "base64url").toString("utf8")),
    );
  } catch {
    return null;
  }
};

const signSession = (value: string): string =>
  createHmac("sha256", SESSION_SECRET).update(value).digest("base64url");

const serializeSession = (payload: AuthSession): string => {
  const encoded = encodeSession(payload);
  const signature = signSession(encoded);
  return `${encoded}.${signature}`;
};

const parseSessionCookie = (value: string): AuthSession | null => {
  const [encoded, signature] = value.split(".");
  if (!encoded || !signature) {
    return null;
  }

  const expectedSignature = signSession(encoded);
  const actualBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  const session = decodeSession(encoded);
  if (!session || session.expiresAt <= Date.now()) {
    return null;
  }

  return session;
};

export const setSession = async (
  payload: z.infer<typeof AuthTokenResponseSchema>,
): Promise<void> => {
  const cookieStore = await cookies();
  const session: AuthSession = {
    accessToken: payload.accessToken,
    expiresAt: Date.now() + payload.expiresInSeconds * 1000,
    user: payload.user,
  };

  cookieStore.set(SESSION_COOKIE_NAME, serializeSession(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: payload.expiresInSeconds,
  });
};

export const clearSession = async (): Promise<void> => {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
};

export const getSession = async (): Promise<AuthSession | null> => {
  const cookieStore = await cookies();
  const encodedSession = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!encodedSession) {
    return null;
  }

  const session = parseSessionCookie(encodedSession);
  if (!session) {
    cookieStore.delete(SESSION_COOKIE_NAME);
    return null;
  }

  return session;
};

export const requireSession = async (): Promise<AuthSession> => {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return session;
};

export const redirectIfAuthenticated = async (): Promise<void> => {
  const session = await getSession();

  if (session) {
    redirect("/dashboard");
  }
};
