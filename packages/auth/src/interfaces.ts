export interface AuthUser {
  id: string;
  email: string;
  passwordHash: string;
  plan: "free" | "pro";
  mfaEnabled: boolean;
}

export interface AuthIdentity {
  userId: string;
  email: string;
  plan: "free" | "pro";
  mfaEnabled: boolean;
}

export interface AuthTokenPayload extends AuthIdentity {
  tokenId: string;
}

export interface MfaChallenge {
  challengeId: string;
  userId: string;
  expiresAt: Date;
  // Optional metadata allows concrete MFA providers (TOTP, SMS, WebAuthn) to include extra context.
  metadata?: Record<string, string>;
}

export interface MfaProvider {
  createChallenge(user: AuthUser): Promise<MfaChallenge>;
  verifyChallenge(challengeId: string, code: string): Promise<MfaChallenge | null>;
}

export interface AuthRepository {
  createUser(input: {
    email: string;
    passwordHash: string;
    plan: "free" | "pro";
    mfaEnabled: boolean;
  }): Promise<AuthUser>;
  findUserByEmail(email: string): Promise<AuthUser | null>;
  findUserById(id: string): Promise<AuthUser | null>;
}

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}

export interface TokenService {
  sign(payload: AuthTokenPayload): Promise<string>;
  verify(token: string): Promise<AuthTokenPayload>;
}

export interface AuthFeatureFlags {
  mfaEnabled: boolean;
  customMfaRequired: boolean;
}

export interface AuthProvider {
  flags: AuthFeatureFlags;
  register(input: {
    email: string;
    password: string;
    plan: "free" | "pro";
    mfaEnabled: boolean;
  }): Promise<AuthIdentity>;
  beginLogin(input: {
    email: string;
    password: string;
  }): Promise<{ requiresMfa: boolean; challengeId?: string; user?: AuthIdentity }>;
  completeLogin(input: { challengeId: string; code: string }): Promise<AuthIdentity>;
  issueAccessToken(identity: AuthIdentity): Promise<{ token: string; expiresInSeconds: number }>;
  verifyAccessToken(token: string): Promise<AuthIdentity>;
}
