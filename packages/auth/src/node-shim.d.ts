declare module "node:crypto" {
  export function createHash(algorithm: string): {
    update(data: string): { digest(encoding: "hex"): string };
  };

  export function createHmac(algorithm: string, key: string): {
    update(data: string): { digest(encoding: "base64url"): string };
  };

  export function randomUUID(): string;

  export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean;
}

declare class Buffer extends Uint8Array {
  static from(data: string, encoding: "utf8" | "base64url"): Buffer;
  toString(encoding?: "base64url" | "utf8"): string;
}
