import crypto from "node:crypto";

export interface PairingState {
  code: string;
  expiresAt: number;
}

interface TokenRecord {
  hash: string;
  expiresAt: number;
}

export class AuthService {
  private pairing: PairingState;
  private tokens = new Map<string, TokenRecord>();

  constructor(
    private readonly tokenTtlMs: number,
    private readonly pairingCodeTtlMs: number,
  ) {
    this.pairing = this.createPairingCode();
  }

  getPairingState(): PairingState {
    return this.pairing;
  }

  rotatePairingCode(): PairingState {
    this.pairing = this.createPairingCode();
    return this.pairing;
  }

  pair(code: string): { token: string; expiresAt: number } {
    const now = Date.now();
    if (now > this.pairing.expiresAt || code !== this.pairing.code) {
      throw new Error("Invalid or expired pairing code");
    }

    const token = crypto.randomBytes(32).toString("base64url");
    const hash = this.hashToken(token);
    const expiresAt = now + this.tokenTtlMs;
    this.tokens.set(hash, { hash, expiresAt });
    this.rotatePairingCode();
    return { token, expiresAt };
  }

  verifyBearer(header: string | undefined): boolean {
    const token = this.extractBearer(header);
    if (!token) return false;

    const hash = this.hashToken(token);
    const record = this.tokens.get(hash);
    if (!record) return false;
    if (Date.now() > record.expiresAt) {
      this.tokens.delete(hash);
      return false;
    }
    return true;
  }

  revokeAll(): void {
    this.tokens.clear();
    this.rotatePairingCode();
  }

  private extractBearer(header: string | undefined): string | null {
    if (!header) return null;
    const match = header.match(/^Bearer\s+(.+)$/i);
    return match?.[1] ?? null;
  }

  private createPairingCode(): PairingState {
    return {
      code: String(crypto.randomInt(100000, 1000000)),
      expiresAt: Date.now() + this.pairingCodeTtlMs,
    };
  }

  private hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }
}
