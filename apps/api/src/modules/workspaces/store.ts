import { randomUUID } from "node:crypto";
import type { Workspace, WorkspaceRole } from "@ac2/contracts";

export class WorkspaceStore {
  private readonly workspaces = new Map<string, Workspace>();

  async createWorkspace(input: { name: string; ownerUserId: string }): Promise<Workspace> {
    const workspace: Workspace = {
      id: randomUUID(),
      name: input.name,
      ownerUserId: input.ownerUserId,
      members: [
        {
          userId: input.ownerUserId,
          role: "owner",
        },
      ],
    };

    this.workspaces.set(workspace.id, workspace);
    return workspace;
  }

  async findById(workspaceId: string): Promise<Workspace | null> {
    return this.workspaces.get(workspaceId) ?? null;
  }

  async listByUser(userId: string): Promise<Workspace[]> {
    return [...this.workspaces.values()].filter((workspace) =>
      workspace.members.some((member) => member.userId === userId),
    );
  }

  async countByOwner(ownerUserId: string): Promise<number> {
    return [...this.workspaces.values()].filter((workspace) => workspace.ownerUserId === ownerUserId).length;
  }

  async addMember(workspaceId: string, userId: string, role: Exclude<WorkspaceRole, "owner">): Promise<Workspace> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    const existing = workspace.members.find((member) => member.userId === userId);
    if (existing) {
      existing.role = role;
      return workspace;
    }

    workspace.members.push({ userId, role });
    return workspace;
  }

  getMemberRole(workspaceId: string, userId: string): WorkspaceRole | null {
    const workspace = this.workspaces.get(workspaceId);
    return workspace?.members.find((member) => member.userId === userId)?.role ?? null;
  }
}
