import type { FastifyInstance } from "fastify";
import type { AuthProvider, AuthRepository } from "@ac2/auth";
import type { WorkspaceRepository } from "@ac2/db";
import {
  AddWorkspaceMemberRequestSchema,
  CreateWorkspaceRequestSchema,
  WorkspaceSchema,
} from "@ac2/contracts";
import { requireRole } from "./authorization.js";
import { authenticate } from "../auth/plugin.js";

const validationError = (details: unknown) => ({
  error: "ValidationError",
  message: "Invalid request payload",
  details,
});

export const registerWorkspaceRoutes = (
  app: FastifyInstance,
  dependencies: {
    authProvider: AuthProvider;
    authRepository: AuthRepository;
    workspaceRepository: WorkspaceRepository;
  },
): void => {
  const authHook = authenticate(dependencies.authProvider);

  app.post("/workspaces", { preHandler: authHook }, async (request, reply) => {
    const parsed = CreateWorkspaceRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(validationError(parsed.error.flatten()));
    }

    if (!request.authIdentity) {
      return reply.status(401).send({ error: "Unauthorized", message: "Authentication required" });
    }

    if (request.authIdentity.plan === "free") {
      const ownerWorkspaceCount = await dependencies.workspaceRepository.countByOwner(
        request.authIdentity.userId,
      );
      if (ownerWorkspaceCount >= 1) {
        return reply.status(403).send({
          error: "PlanLimitExceeded",
          message: "Free plan is limited to one workspace",
        });
      }
    }

    const workspace = await dependencies.workspaceRepository.createWorkspace({
      name: parsed.data.name,
      ownerUserId: request.authIdentity.userId,
    });

    return WorkspaceSchema.parse(workspace);
  });

  app.get("/workspaces", { preHandler: authHook }, async (request, reply) => {
    if (!request.authIdentity) {
      return reply.status(401).send({ error: "Unauthorized", message: "Authentication required" });
    }

    const workspaces = await dependencies.workspaceRepository.listByUser(
      request.authIdentity.userId,
    );
    return workspaces.map((workspace) => WorkspaceSchema.parse(workspace));
  });

  app.post("/workspaces/:workspaceId/members", { preHandler: authHook }, async (request, reply) => {
    const parsed = AddWorkspaceMemberRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(validationError(parsed.error.flatten()));
    }

    if (!request.authIdentity) {
      return reply.status(401).send({ error: "Unauthorized", message: "Authentication required" });
    }

    const workspaceId = (request.params as { workspaceId: string }).workspaceId;
    const actorRole = await dependencies.workspaceRepository.getMemberRole(
      workspaceId,
      request.authIdentity.userId,
    );
    if (!requireRole(actorRole, "admin", reply)) {
      return;
    }

    const invitee = await dependencies.authRepository.findUserByEmail(parsed.data.email);
    if (!invitee) {
      return reply.status(404).send({ error: "NotFound", message: "User not found" });
    }

    const workspace = await dependencies.workspaceRepository.addMember(
      workspaceId,
      invitee.id,
      parsed.data.role,
    );
    return WorkspaceSchema.parse(workspace);
  });
};
