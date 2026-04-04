import Fastify from "fastify";
import { RenderRequestSchema } from "@ac2/contracts";
import { JwtAuthProvider } from "@ac2/auth";
import { InMemoryAuthRepository } from "./modules/auth/store.js";
import { InMemoryOtpMfaProvider } from "./modules/auth/mfa-provider.js";
import { registerAuthRoutes } from "./modules/auth/routes.js";
import { WorkspaceStore } from "./modules/workspaces/store.js";
import { registerWorkspaceRoutes } from "./modules/workspaces/routes.js";

const app = Fastify({ logger: true });

const authRepository = new InMemoryAuthRepository();
const mfaProvider = new InMemoryOtpMfaProvider();
const authProvider = new JwtAuthProvider({
  repository: authRepository,
  mfaProvider,
  jwt: {
    issuer: "ac2-api",
    audience: "ac2-clients",
    secret: process.env.JWT_SECRET ?? "dev-secret-change-in-production",
    expiresInSeconds: 60 * 60,
  },
  flags: {
    mfaEnabled: true,
    customMfaRequired: false,
  },
});
const workspaceStore = new WorkspaceStore();

app.post("/render", async (request, reply) => {
  const parsed = RenderRequestSchema.safeParse(request.body);

  if (!parsed.success) {
    return reply.status(400).send({
      error: "ValidationError",
      message: "Invalid request payload",
      details: parsed.error.flatten(),
    });
  }

  return {
    ok: true,
    received: parsed.data,
  };
});

registerAuthRoutes(app, {
  authProvider,
  mfaProvider,
});

registerWorkspaceRoutes(app, {
  authProvider,
  authRepository,
  workspaceStore,
});

app.get("/health", async () => ({ ok: true }));

app.listen({ port: 4000, host: "0.0.0.0" });
