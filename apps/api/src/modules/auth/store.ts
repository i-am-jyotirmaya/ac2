import { randomUUID } from "node:crypto";
import type { AuthRepository, AuthUser } from "@ac2/auth";
import type { UserPlan } from "@ac2/contracts";

export class InMemoryAuthRepository implements AuthRepository {
  private readonly usersById = new Map<string, AuthUser>();
  private readonly usersByEmail = new Map<string, AuthUser>();

  async createUser(input: {
    email: string;
    passwordHash: string;
    plan: UserPlan;
    mfaEnabled: boolean;
  }): Promise<AuthUser> {
    const user: AuthUser = {
      id: randomUUID(),
      email: input.email,
      passwordHash: input.passwordHash,
      plan: input.plan,
      mfaEnabled: input.mfaEnabled,
    };

    this.usersById.set(user.id, user);
    this.usersByEmail.set(user.email, user);
    return user;
  }

  async findUserByEmail(email: string): Promise<AuthUser | null> {
    return this.usersByEmail.get(email) ?? null;
  }

  async findUserById(id: string): Promise<AuthUser | null> {
    return this.usersById.get(id) ?? null;
  }
}
