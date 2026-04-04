import { randomInt, randomUUID } from "node:crypto";
import { and, count, eq, inArray, sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { AuthRepository, AuthUser, MfaChallenge } from "@ac2/auth";
import type { Workspace, WorkspaceMember, WorkspaceRole } from "@ac2/contracts";
import type {
  Ac2Database,
  DebuggableMfaProvider,
  MfaChallengeRepository,
  PostgresDatabaseOptions,
  StoredMfaChallenge,
  WorkspaceRepository,
} from "../interfaces.js";
import * as schema from "./schema.js";

type DrizzleDatabase = PostgresJsDatabase<typeof schema>;

const buildLocalDatabaseUrl = (): string => {
  const host = process.env.POSTGRES_HOST ?? "127.0.0.1";
  const port = process.env.POSTGRES_PORT ?? "5432";
  const database = process.env.POSTGRES_DB ?? "ac2";
  const user = process.env.POSTGRES_USER ?? "postgres";
  const password = process.env.POSTGRES_PASSWORD;
  const credentials = password
    ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}@`
    : `${encodeURIComponent(user)}@`;

  return `postgresql://${credentials}${host}:${port}/${database}`;
};

export const DEFAULT_DATABASE_URL = process.env.DATABASE_URL ?? buildLocalDatabaseUrl();

const mapAuthUser = (row: typeof schema.users.$inferSelect): AuthUser => ({
  id: row.id,
  email: row.email,
  passwordHash: row.passwordHash,
  plan: row.plan,
  mfaEnabled: row.mfaEnabled,
});

const mapMfaChallenge = (
  row: typeof schema.mfaChallenges.$inferSelect,
): StoredMfaChallenge => ({
  challengeId: row.id,
  userId: row.userId,
  code: row.code,
  expiresAt: row.expiresAt,
  consumedAt: row.consumedAt,
  metadata: Object.keys(row.metadata).length > 0 ? row.metadata : undefined,
});

const toWorkspace = (
  workspace: typeof schema.workspaces.$inferSelect,
  members: WorkspaceMember[],
): Workspace => ({
  id: workspace.id,
  name: workspace.name,
  ownerUserId: workspace.ownerUserId,
  members,
});

const loadMembersByWorkspaceId = async (
  db: DrizzleDatabase,
  workspaceIds: string[],
): Promise<Map<string, WorkspaceMember[]>> => {
  if (workspaceIds.length === 0) {
    return new Map<string, WorkspaceMember[]>();
  }

  const rows = await db
    .select({
      workspaceId: schema.workspaceMembers.workspaceId,
      userId: schema.workspaceMembers.userId,
      role: schema.workspaceMembers.role,
    })
    .from(schema.workspaceMembers)
    .where(inArray(schema.workspaceMembers.workspaceId, workspaceIds));

  const membersByWorkspaceId = new Map<string, WorkspaceMember[]>();

  for (const row of rows) {
    const members = membersByWorkspaceId.get(row.workspaceId) ?? [];
    members.push({
      userId: row.userId,
      role: row.role,
    });
    membersByWorkspaceId.set(row.workspaceId, members);
  }

  return membersByWorkspaceId;
};

class DrizzleAuthRepository implements AuthRepository {
  constructor(private readonly db: DrizzleDatabase) {}

  async createUser(input: {
    email: string;
    passwordHash: string;
    plan: AuthUser["plan"];
    mfaEnabled: boolean;
  }): Promise<AuthUser> {
    const id = randomUUID();
    const [user] = await this.db
      .insert(schema.users)
      .values({
        id,
        email: input.email,
        passwordHash: input.passwordHash,
        plan: input.plan,
        mfaEnabled: input.mfaEnabled,
      })
      .returning();

    if (!user) {
      throw new Error("Unable to create user");
    }

    return mapAuthUser(user);
  }

  async findUserByEmail(email: string): Promise<AuthUser | null> {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    return user ? mapAuthUser(user) : null;
  }

  async findUserById(id: string): Promise<AuthUser | null> {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);

    return user ? mapAuthUser(user) : null;
  }
}

class DrizzleMfaChallengeRepository implements MfaChallengeRepository {
  constructor(private readonly db: DrizzleDatabase) {}

  async createChallenge(input: {
    challengeId: string;
    userId: string;
    code: string;
    expiresAt: Date;
    metadata?: Record<string, string>;
  }): Promise<MfaChallenge> {
    await this.db.insert(schema.mfaChallenges).values({
      id: input.challengeId,
      userId: input.userId,
      code: input.code,
      expiresAt: input.expiresAt,
      metadata: input.metadata ?? {},
    });

    return {
      challengeId: input.challengeId,
      userId: input.userId,
      expiresAt: input.expiresAt,
      metadata: input.metadata,
    };
  }

  async findChallenge(challengeId: string): Promise<StoredMfaChallenge | null> {
    const [challenge] = await this.db
      .select()
      .from(schema.mfaChallenges)
      .where(eq(schema.mfaChallenges.id, challengeId))
      .limit(1);

    return challenge ? mapMfaChallenge(challenge) : null;
  }

  async consumeChallenge(challengeId: string): Promise<void> {
    await this.db
      .update(schema.mfaChallenges)
      .set({
        consumedAt: new Date(),
      })
      .where(eq(schema.mfaChallenges.id, challengeId));
  }
}

class PostgresOtpMfaProvider implements DebuggableMfaProvider {
  constructor(private readonly challengeRepository: MfaChallengeRepository) {}

  async createChallenge(user: AuthUser): Promise<MfaChallenge> {
    return this.challengeRepository.createChallenge({
      challengeId: randomUUID(),
      userId: user.id,
      code: String(randomInt(100_000, 999_999)),
      expiresAt: new Date(Date.now() + 5 * 60_000),
      metadata: {
        delivery: "debug",
      },
    });
  }

  async verifyChallenge(challengeId: string, code: string): Promise<MfaChallenge | null> {
    const storedChallenge = await this.challengeRepository.findChallenge(challengeId);
    if (!storedChallenge || storedChallenge.consumedAt) {
      return null;
    }

    if (storedChallenge.expiresAt.getTime() < Date.now()) {
      await this.challengeRepository.consumeChallenge(challengeId);
      return null;
    }

    if (storedChallenge.code !== code) {
      return null;
    }

    await this.challengeRepository.consumeChallenge(challengeId);

    return {
      challengeId: storedChallenge.challengeId,
      userId: storedChallenge.userId,
      expiresAt: storedChallenge.expiresAt,
      metadata: storedChallenge.metadata,
    };
  }

  async getDebugCode(challengeId: string): Promise<string | null> {
    const storedChallenge = await this.challengeRepository.findChallenge(challengeId);
    if (!storedChallenge || storedChallenge.consumedAt) {
      return null;
    }

    if (storedChallenge.expiresAt.getTime() < Date.now()) {
      return null;
    }

    return storedChallenge.code;
  }
}

class DrizzleWorkspaceRepository implements WorkspaceRepository {
  constructor(private readonly db: DrizzleDatabase) {}

  async createWorkspace(input: {
    name: string;
    ownerUserId: string;
  }): Promise<Workspace> {
    const workspaceId = randomUUID();

    await this.db.transaction(async (tx) => {
      await tx.insert(schema.workspaces).values({
        id: workspaceId,
        name: input.name,
        ownerUserId: input.ownerUserId,
      });

      await tx.insert(schema.workspaceMembers).values({
        workspaceId,
        userId: input.ownerUserId,
        role: "owner",
      });
    });

    const workspace = await this.findById(workspaceId);
    if (!workspace) {
      throw new Error("Unable to create workspace");
    }

    return workspace;
  }

  async findById(workspaceId: string): Promise<Workspace | null> {
    const [workspace] = await this.db
      .select()
      .from(schema.workspaces)
      .where(eq(schema.workspaces.id, workspaceId))
      .limit(1);

    if (!workspace) {
      return null;
    }

    const membersByWorkspaceId = await loadMembersByWorkspaceId(this.db, [workspace.id]);
    return toWorkspace(workspace, membersByWorkspaceId.get(workspace.id) ?? []);
  }

  async listByUser(userId: string): Promise<Workspace[]> {
    const membershipRows = await this.db
      .select({
        workspaceId: schema.workspaceMembers.workspaceId,
      })
      .from(schema.workspaceMembers)
      .where(eq(schema.workspaceMembers.userId, userId));

    const workspaceIds = membershipRows.map((row) => row.workspaceId);
    if (workspaceIds.length === 0) {
      return [];
    }

    const workspaceRows = await this.db
      .select()
      .from(schema.workspaces)
      .where(inArray(schema.workspaces.id, workspaceIds));

    const membersByWorkspaceId = await loadMembersByWorkspaceId(this.db, workspaceIds);

    return workspaceRows.map((workspace) =>
      toWorkspace(workspace, membersByWorkspaceId.get(workspace.id) ?? []),
    );
  }

  async countByOwner(ownerUserId: string): Promise<number> {
    const [result] = await this.db
      .select({
        value: count(),
      })
      .from(schema.workspaces)
      .where(eq(schema.workspaces.ownerUserId, ownerUserId));

    return result?.value ?? 0;
  }

  async addMember(
    workspaceId: string,
    userId: string,
    role: Exclude<WorkspaceRole, "owner">,
  ): Promise<Workspace> {
    const existingWorkspace = await this.findById(workspaceId);
    if (!existingWorkspace) {
      throw new Error("Workspace not found");
    }

    await this.db
      .insert(schema.workspaceMembers)
      .values({
        workspaceId,
        userId,
        role,
      })
      .onConflictDoUpdate({
        target: [schema.workspaceMembers.workspaceId, schema.workspaceMembers.userId],
        set: {
          role,
        },
      });

    const workspace = await this.findById(workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    return workspace;
  }

  async getMemberRole(workspaceId: string, userId: string): Promise<WorkspaceRole | null> {
    const [membership] = await this.db
      .select({
        role: schema.workspaceMembers.role,
      })
      .from(schema.workspaceMembers)
      .where(
        and(
          eq(schema.workspaceMembers.workspaceId, workspaceId),
          eq(schema.workspaceMembers.userId, userId),
        ),
      )
      .limit(1);

    return membership?.role ?? null;
  }
}

const ensureSchema = async (db: DrizzleDatabase): Promise<void> => {
  await db.execute(sql`
    create table if not exists users (
      id uuid primary key,
      email text not null unique,
      password_hash text not null,
      plan text not null check (plan in ('free', 'pro')),
      mfa_enabled boolean not null default false,
      created_at timestamptz not null default now()
    )
  `);

  await db.execute(sql`
    create table if not exists workspaces (
      id uuid primary key,
      name text not null,
      owner_user_id uuid not null references users(id) on delete cascade,
      created_at timestamptz not null default now()
    )
  `);
  await db.execute(sql`
    create index if not exists workspaces_owner_user_id_idx on workspaces(owner_user_id)
  `);

  await db.execute(sql`
    create table if not exists workspace_members (
      workspace_id uuid not null references workspaces(id) on delete cascade,
      user_id uuid not null references users(id) on delete cascade,
      role text not null check (role in ('owner', 'admin', 'member', 'viewer')),
      created_at timestamptz not null default now(),
      primary key (workspace_id, user_id)
    )
  `);
  await db.execute(sql`
    create index if not exists workspace_members_user_id_idx on workspace_members(user_id)
  `);

  await db.execute(sql`
    create table if not exists mfa_challenges (
      id uuid primary key,
      user_id uuid not null references users(id) on delete cascade,
      code text not null,
      expires_at timestamptz not null,
      consumed_at timestamptz,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    )
  `);
  await db.execute(sql`
    create index if not exists mfa_challenges_user_id_idx on mfa_challenges(user_id)
  `);
};

export const createPostgresDatabase = async (
  options: PostgresDatabaseOptions = {},
): Promise<Ac2Database> => {
  const client = postgres(options.connectionString ?? DEFAULT_DATABASE_URL, {
    max: 10,
  });
  const db = drizzle(client, { schema });

  await ensureSchema(db);

  const authRepository = new DrizzleAuthRepository(db);
  const workspaceRepository = new DrizzleWorkspaceRepository(db);
  const mfaChallengeRepository = new DrizzleMfaChallengeRepository(db);
  const mfaProvider = new PostgresOtpMfaProvider(mfaChallengeRepository);

  return {
    authRepository,
    workspaceRepository,
    mfaChallengeRepository,
    mfaProvider,
    async ping(): Promise<void> {
      await db.execute(sql`select 1`);
    },
    async close(): Promise<void> {
      await client.end();
    },
  };
};

export const createDatabase = createPostgresDatabase;
