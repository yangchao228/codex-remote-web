const ANSI_PATTERN =
  // eslint-disable-next-line no-control-regex
  /[\u001B\u009B][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[a-zA-Z\d]*)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g;

const SECRET_PATTERNS: RegExp[] = [
  /\bsk-[A-Za-z0-9_-]{12,}\b/g,
  /\bsk-or-v1-[A-Za-z0-9_-]{12,}\b/g,
  /\bAIza[0-9A-Za-z_-]{20,}\b/g,
  /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g,
];

const NAMED_SECRET_PATTERN = /\b((?:api[_-]?key|token|secret|password)\s*[:=]\s*["']?)[^"'\s]{8,}/gi;

export function sanitizeTerminalText(input: string): string {
  return input.replace(ANSI_PATTERN, "");
}

export function redactSecrets(input: string): string {
  const namedSecretsRedacted = input.replace(NAMED_SECRET_PATTERN, "$1[REDACTED]");
  return SECRET_PATTERNS.reduce((text, pattern) => text.replace(pattern, "[REDACTED]"), namedSecretsRedacted);
}

export function sanitizeForBrowser(input: string): string {
  return redactSecrets(sanitizeTerminalText(input));
}

export function summarizePrompt(prompt: string): string {
  const compact = prompt.replace(/\s+/g, " ").trim();
  if (compact.length <= 120) return compact;
  return `${compact.slice(0, 117)}...`;
}
