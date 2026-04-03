import { randomInt, randomUUID } from "node:crypto";
import type { AuthUser, MfaChallenge, MfaProvider } from "@ac2/auth";

interface StoredChallenge {
  challenge: MfaChallenge;
  code: string;
}

export class InMemoryOtpMfaProvider implements MfaProvider {
  private readonly challenges = new Map<string, StoredChallenge>();

  async createChallenge(user: AuthUser): Promise<MfaChallenge> {
    const code = String(randomInt(100_000, 999_999));
    const challenge: MfaChallenge = {
      challengeId: randomUUID(),
      userId: user.id,
      expiresAt: new Date(Date.now() + 5 * 60_000),
      metadata: {
        // Demo-only channel. In production this would be sent over sms/email/totp device.
        delivery: "debug",
      },
    };

    this.challenges.set(challenge.challengeId, {
      challenge,
      code,
    });

    return challenge;
  }

  async verifyChallenge(challengeId: string, code: string): Promise<boolean> {
    const stored = this.challenges.get(challengeId);
    if (!stored) {
      return false;
    }

    if (stored.challenge.expiresAt.getTime() < Date.now()) {
      this.challenges.delete(challengeId);
      return false;
    }

    const valid = stored.code === code;
    if (valid) {
      this.challenges.delete(challengeId);
    }

    return valid;
  }

  getDebugCode(challengeId: string): string | null {
    return this.challenges.get(challengeId)?.code ?? null;
  }
}
