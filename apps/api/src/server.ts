import Fastify from "fastify";
import { RenderRequestSchema } from "@ac2/contracts";

const app = Fastify({ logger: true });

app.post("/render", async (request, reply) => {
  const parsed = RenderRequestSchema.safeParse(request.body);

  if (!parsed.success) {
    return reply.status(400).send({
      error: "ValidationFailed",
      details: parsed.error.flatten(),
    });
  }

  return {
    ok: true,
    received: parsed.data,
  };
});

app.get("/health", async () => ({ ok: true }));

app.listen({ port: 4000, host: "0.0.0.0" });
