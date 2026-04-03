import type { FastifyInstance } from "fastify";
import type { JwtAuthProvider } from "@ac2/auth";
import {
  AuthTokenResponseSchema,
  LoginRequestSchema,
  MfaChallengeRequestSchema,
  MfaVerifyRequestSchema,
  RegisterRequestSchema,
} from "@ac2/contracts";
import { InMemoryOtpMfaProvider } from "./mfa-provider.js";

const validationError = (details: unknown) => ({
  error: "ValidationError",
  message: "Invalid request payload",
  details,
});

const authError = (message: string) => ({
  error: "AuthError",
  message,
});

export const registerAuthRoutes = (
  app: FastifyInstance,
  dependencies: {
    authProvider: JwtAuthProvider;
    mfaProvider: InMemoryOtpMfaProvider;
  },
): void => {
  app.post("/auth/register", async (request, reply) => {
    const parsed = RegisterRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(validationError(parsed.error.flatten()));
    }

    try {
      const identity = await dependencies.authProvider.register(parsed.data);
      const token = await dependencies.authProvider.issueAccessToken(identity);
      return AuthTokenResponseSchema.parse({
        accessToken: token.token,
        tokenType: "Bearer",
        expiresInSeconds: token.expiresInSeconds,
        user: {
          id: identity.userId,
          email: identity.email,
          plan: identity.plan,
          mfaEnabled: identity.mfaEnabled,
        },
      });
    } catch (error) {
      return reply.status(409).send(authError(error instanceof Error ? error.message : "Unable to register"));
    }
  });

  app.post("/auth/mfa/challenge", async (request, reply) => {
    const parsed = MfaChallengeRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(validationError(parsed.error.flatten()));
    }

    try {
      const login = await dependencies.authProvider.beginLogin(parsed.data);
      return {
        requiresMfa: login.requiresMfa,
        challengeId: login.challengeId,
        debugCode: login.challengeId ? dependencies.mfaProvider.getDebugCode(login.challengeId) : null,
      };
    } catch (error) {
      return reply.status(401).send(authError(error instanceof Error ? error.message : "Invalid credentials"));
    }
  });

  app.post("/auth/mfa/verify", async (request, reply) => {
    const parsed = MfaVerifyRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(validationError(parsed.error.flatten()));
    }

    try {
      const identity = await dependencies.authProvider.completeLogin(parsed.data);
      const token = await dependencies.authProvider.issueAccessToken(identity);
      return AuthTokenResponseSchema.parse({
        accessToken: token.token,
        tokenType: "Bearer",
        expiresInSeconds: token.expiresInSeconds,
        user: {
          id: identity.userId,
          email: identity.email,
          plan: identity.plan,
          mfaEnabled: identity.mfaEnabled,
        },
      });
    } catch (error) {
      return reply.status(401).send(authError(error instanceof Error ? error.message : "Invalid MFA code"));
    }
  });

  app.post("/auth/login", async (request, reply) => {
    const parsed = LoginRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(validationError(parsed.error.flatten()));
    }

    try {
      const login = await dependencies.authProvider.beginLogin(parsed.data);
      if (login.requiresMfa) {
        return reply.status(401).send(authError("MFA required. Call /auth/mfa/verify to complete login."));
      }

      if (!login.user) {
        return reply.status(500).send(authError("Login failed"));
      }

      const token = await dependencies.authProvider.issueAccessToken(login.user);
      return AuthTokenResponseSchema.parse({
        accessToken: token.token,
        tokenType: "Bearer",
        expiresInSeconds: token.expiresInSeconds,
        user: {
          id: login.user.userId,
          email: login.user.email,
          plan: login.user.plan,
          mfaEnabled: login.user.mfaEnabled,
        },
      });
    } catch (error) {
      return reply.status(401).send(authError(error instanceof Error ? error.message : "Invalid credentials"));
    }
  });
};
