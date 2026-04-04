import Fastify from "fastify";
import { RenderRequestSchema } from "@ac2/contracts";
import { JwtAuthProvider } from "@ac2/auth";
import { createDatabase } from "@ac2/db";
import { registerAuthRoutes } from "./modules/auth/routes.js";
import { registerWorkspaceRoutes } from "./modules/workspaces/routes.js";

const start = async (): Promise<void> => {
  const app = Fastify({ logger: true });
  const database = await createDatabase();
  const authRepository = database.authRepository;
  const mfaProvider = database.mfaProvider;
  const workspaceRepository = database.workspaceRepository;
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

  app.addHook("onClose", async () => {
    await database.close();
  });

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
    workspaceRepository,
  });

  app.get("/health", async (request, reply) => {
    try {
      await database.ping();
      return { ok: true };
    } catch (error) {
      request.log.error(error);
      return reply.status(503).send({
        ok: false,
        error: "DatabaseUnavailable",
      });
    }
  });

  await app.listen({ port: 4000, host: "0.0.0.0" });
};

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
