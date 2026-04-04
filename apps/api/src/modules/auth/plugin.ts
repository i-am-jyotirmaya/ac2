import type { FastifyReply, FastifyRequest } from "fastify";
import type { AuthProvider } from "@ac2/auth";

export interface RequestAuthIdentity {
  userId: string;
  email: string;
  plan: "free" | "pro";
  mfaEnabled: boolean;
}

declare module "fastify" {
  interface FastifyRequest {
    authIdentity?: RequestAuthIdentity;
  }
}

export const authenticate = (authProvider: AuthProvider) => {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      reply.status(401).send({ error: "Unauthorized", message: "Missing Bearer token" });
      return;
    }

    const token = authHeader.replace("Bearer ", "").trim();

    try {
      request.authIdentity = await authProvider.verifyAccessToken(token);
    } catch {
      reply.status(401).send({ error: "Unauthorized", message: "Invalid token" });
    }
  };
};
