import type { FastifyReply } from "fastify";
import type { WorkspaceRole } from "@ac2/contracts";

const roleWeight: Record<WorkspaceRole, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
};

export const requireRole = (
  userRole: WorkspaceRole | null,
  minimumRole: WorkspaceRole,
  reply: FastifyReply,
): boolean => {
  if (!userRole) {
    reply.status(403).send({ error: "Forbidden", message: "Workspace membership required" });
    return false;
  }

  if (roleWeight[userRole] < roleWeight[minimumRole]) {
    reply.status(403).send({ error: "Forbidden", message: `Requires ${minimumRole} role` });
    return false;
  }

  return true;
};
