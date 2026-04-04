import type { AuthRepository, MfaChallenge, MfaProvider } from "@ac2/auth";
import type { Workspace, WorkspaceRole } from "@ac2/contracts";

export interface WorkspaceRepository {
  createWorkspace(input: {
    name: string;
    ownerUserId: string;
  }): Promise<Workspace>;
  findById(workspaceId: string): Promise<Workspace | null>;
  listByUser(userId: string): Promise<Workspace[]>;
  countByOwner(ownerUserId: string): Promise<number>;
  addMember(
    workspaceId: string,
    userId: string,
    role: Exclude<WorkspaceRole, "owner">,
  ): Promise<Workspace>;
  getMemberRole(workspaceId: string, userId: string): Promise<WorkspaceRole | null>;
}

export interface StoredMfaChallenge extends MfaChallenge {
  code: string;
  consumedAt: Date | null;
}

export interface MfaChallengeRepository {
  createChallenge(input: {
    challengeId: string;
    userId: string;
    code: string;
    expiresAt: Date;
    metadata?: Record<string, string>;
  }): Promise<MfaChallenge>;
  findChallenge(challengeId: string): Promise<StoredMfaChallenge | null>;
  consumeChallenge(challengeId: string): Promise<void>;
}

export interface DebuggableMfaProvider extends MfaProvider {
  getDebugCode(challengeId: string): Promise<string | null>;
}

export interface Ac2Database {
  authRepository: AuthRepository;
  workspaceRepository: WorkspaceRepository;
  mfaChallengeRepository: MfaChallengeRepository;
  mfaProvider: DebuggableMfaProvider;
  ping(): Promise<void>;
  close(): Promise<void>;
}

export interface PostgresDatabaseOptions {
  connectionString?: string;
}
