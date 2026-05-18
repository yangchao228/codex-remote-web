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
  private pairingFailures = new Map<string, number[]>();

  constructor(
    private readonly tokenTtlMs: number,
    private readonly pairingCodeTtlMs: number,
    private readonly pairingCodeLength = 6,
    private readonly pairingFailureLimit = 5,
    private readonly pairingFailureWindowMs = 60_000,
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

  pair(code: string, attemptKey = "global"): { token: string; expiresAt: number } {
    const now = Date.now();
    if (this.isPairingRateLimited(attemptKey, now)) {
      throw new Error("Too many invalid pairing attempts. Wait before trying again");
    }

    if (now > this.pairing.expiresAt || code !== this.pairing.code) {
      this.recordPairingFailure(attemptKey, now);
      throw new Error("Invalid or expired pairing code");
    }

    const token = crypto.randomBytes(32).toString("base64url");
    const hash = this.hashToken(token);
    const expiresAt = now + this.tokenTtlMs;
    this.tokens.set(hash, { hash, expiresAt });
    this.pairingFailures.delete(attemptKey);
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
      code: this.randomNumericCode(this.pairingCodeLength),
      expiresAt: Date.now() + this.pairingCodeTtlMs,
    };
  }

  private randomNumericCode(length: number): string {
    let code = "";
    for (let index = 0; index < length; index += 1) {
      code += String(crypto.randomInt(0, 10));
    }
    return code;
  }

  private isPairingRateLimited(attemptKey: string, now: number): boolean {
    const recent = this.recentFailures(attemptKey, now);
    return recent.length >= this.pairingFailureLimit;
  }

  private recordPairingFailure(attemptKey: string, now: number): void {
    const recent = this.recentFailures(attemptKey, now);
    recent.push(now);
    this.pairingFailures.set(attemptKey, recent);
  }

  private recentFailures(attemptKey: string, now: number): number[] {
    const windowStart = now - this.pairingFailureWindowMs;
    const recent = (this.pairingFailures.get(attemptKey) ?? []).filter((at) => at >= windowStart);
    this.pairingFailures.set(attemptKey, recent);
    return recent;
  }

  private hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }
}
