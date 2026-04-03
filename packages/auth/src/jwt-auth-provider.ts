import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type {
  AuthFeatureFlags,
  AuthIdentity,
  AuthProvider,
  AuthRepository,
  AuthTokenPayload,
  MfaProvider,
  PasswordHasher,
  TokenService,
} from "./interfaces.js";

const toBase64Url = (value: string): string => Buffer.from(value, "utf8").toString("base64url");
const parseBase64Url = (value: string): string => Buffer.from(value, "base64url").toString("utf8");

class Sha256PasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    return createHash("sha256").update(password).digest("hex");
  }

  async verify(password: string, hash: string): Promise<boolean> {
    const hashedInput = await this.hash(password);
    const actual = Buffer.from(hash, "utf8");
    const expected = Buffer.from(hashedInput, "utf8");

    if (actual.length !== expected.length) {
      return false;
    }

    return timingSafeEqual(actual, expected);
  }
}

class JwtTokenService implements TokenService {
  constructor(
    private readonly issuer: string,
    private readonly audience: string,
    private readonly expiresInSeconds: number,
    private readonly secret: string,
  ) {}

  async sign(payload: AuthTokenPayload): Promise<string> {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const header = toBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const body = toBase64Url(
      JSON.stringify({
        ...payload,
        iss: this.issuer,
        aud: this.audience,
        sub: payload.userId,
        iat: nowSeconds,
        exp: nowSeconds + this.expiresInSeconds,
        jti: payload.tokenId,
      }),
    );

    const unsigned = `${header}.${body}`;
    const signature = createHmac("sha256", this.secret).update(unsigned).digest("base64url");
    return `${unsigned}.${signature}`;
  }

  async verify(token: string): Promise<AuthTokenPayload> {
    const [headerPart, bodyPart, signaturePart] = token.split(".");
    if (!headerPart || !bodyPart || !signaturePart) {
      throw new Error("Malformed token");
    }

    const unsigned = `${headerPart}.${bodyPart}`;
    const expectedSignature = createHmac("sha256", this.secret).update(unsigned).digest("base64url");

    const actualBuffer = Buffer.from(signaturePart, "utf8");
    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
      throw new Error("Invalid token signature");
    }

    const header = JSON.parse(parseBase64Url(headerPart)) as { alg?: string; typ?: string };
    if (header.alg !== "HS256" || header.typ !== "JWT") {
      throw new Error("Unsupported token format");
    }

    const payload = JSON.parse(parseBase64Url(bodyPart)) as Partial<AuthTokenPayload> & {
      iss?: string;
      aud?: string;
      exp?: number;
    };

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (payload.iss !== this.issuer || payload.aud !== this.audience) {
      throw new Error("Invalid token issuer or audience");
    }
    if (!payload.exp || payload.exp <= nowSeconds) {
      throw new Error("Token expired");
    }

    if (
      !payload.userId ||
      !payload.email ||
      !payload.plan ||
      payload.mfaEnabled === undefined ||
      !payload.tokenId
    ) {
      throw new Error("Invalid token payload");
    }

    return {
      userId: payload.userId,
      email: payload.email,
      plan: payload.plan,
      mfaEnabled: payload.mfaEnabled,
      tokenId: payload.tokenId,
    };
  }
}

export interface JwtAuthProviderOptions {
  repository: AuthRepository;
  mfaProvider?: MfaProvider;
  jwt: {
    issuer: string;
    audience: string;
    secret: string;
    expiresInSeconds: number;
  };
  flags?: Partial<AuthFeatureFlags>;
  passwordHasher?: PasswordHasher;
}

export class JwtAuthProvider implements AuthProvider {
  public readonly flags: AuthFeatureFlags;
  private readonly pendingMfa = new Map<string, AuthIdentity>();
  private readonly tokenService: TokenService;
  private readonly passwordHasher: PasswordHasher;

  constructor(private readonly options: JwtAuthProviderOptions) {
    this.flags = {
      mfaEnabled: options.flags?.mfaEnabled ?? true,
      customMfaRequired: options.flags?.customMfaRequired ?? false,
    };

    this.tokenService = new JwtTokenService(
      options.jwt.issuer,
      options.jwt.audience,
      options.jwt.expiresInSeconds,
      options.jwt.secret,
    );
    this.passwordHasher = options.passwordHasher ?? new Sha256PasswordHasher();
  }

  async register(input: {
    email: string;
    password: string;
    plan: AuthIdentity["plan"];
    mfaEnabled: boolean;
  }): Promise<AuthIdentity> {
    const existing = await this.options.repository.findUserByEmail(input.email);
    if (existing) {
      throw new Error("User already exists");
    }

    const passwordHash = await this.passwordHasher.hash(input.password);
    const user = await this.options.repository.createUser({
      email: input.email,
      passwordHash,
      plan: input.plan,
      mfaEnabled: input.mfaEnabled,
    });

    return {
      userId: user.id,
      email: user.email,
      plan: user.plan,
      mfaEnabled: user.mfaEnabled,
    };
  }

  async beginLogin(input: { email: string; password: string }): Promise<{ requiresMfa: boolean; challengeId?: string; user?: AuthIdentity }> {
    const user = await this.options.repository.findUserByEmail(input.email);
    if (!user) {
      throw new Error("Invalid credentials");
    }

    const matches = await this.passwordHasher.verify(input.password, user.passwordHash);
    if (!matches) {
      throw new Error("Invalid credentials");
    }

    const identity: AuthIdentity = {
      userId: user.id,
      email: user.email,
      plan: user.plan,
      mfaEnabled: user.mfaEnabled,
    };

    const shouldRunMfa = this.flags.mfaEnabled && user.mfaEnabled;
    if (!shouldRunMfa) {
      return { requiresMfa: false, user: identity };
    }

    if (!this.options.mfaProvider) {
      if (this.flags.customMfaRequired) {
        throw new Error("MFA provider is required but not configured");
      }
      return { requiresMfa: false, user: identity };
    }

    const challenge = await this.options.mfaProvider.createChallenge(user);
    this.pendingMfa.set(challenge.challengeId, identity);

    return {
      requiresMfa: true,
      challengeId: challenge.challengeId,
    };
  }

  async completeLogin(input: { challengeId: string; code: string }): Promise<AuthIdentity> {
    if (!this.options.mfaProvider) {
      throw new Error("MFA provider not configured");
    }

    const identity = this.pendingMfa.get(input.challengeId);
    if (!identity) {
      throw new Error("MFA challenge not found");
    }

    const verified = await this.options.mfaProvider.verifyChallenge(input.challengeId, input.code);
    if (!verified) {
      throw new Error("Invalid MFA code");
    }

    this.pendingMfa.delete(input.challengeId);
    return identity;
  }

  async issueAccessToken(identity: AuthIdentity): Promise<{ token: string; expiresInSeconds: number }> {
    const token = await this.tokenService.sign({
      ...identity,
      tokenId: randomUUID(),
    });

    return {
      token,
      expiresInSeconds: this.options.jwt.expiresInSeconds,
    };
  }

  async verifyAccessToken(token: string): Promise<AuthIdentity> {
    const payload = await this.tokenService.verify(token);
    return {
      userId: payload.userId,
      email: payload.email,
      plan: payload.plan,
      mfaEnabled: payload.mfaEnabled,
    };
  }
}
