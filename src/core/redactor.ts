const SENSITIVE_KEY_PATTERNS = [
  /key/i,
  /secret/i,
  /token/i,
  /pass/i,
  /pwd/i,
  /auth/i,
  /cred/i,
  /private/i,
  /cert/i,
  /aws/i,
  /stripe/i,
  /openai/i,
  /anthropic/i,
  /gemini/i,
  /github/i,
  /database_url/i,
  /conn/i,
  /session/i,
  /cookie/i,
  /signature/i
];

const BEARER_REGEX = /Bearer\s+([a-zA-Z0-9_.\-~+/=]{8,})/gi;
const JWT_REGEX = /eyJ[a-zA-Z0-9_.\-]{10,}\.eyJ[a-zA-Z0-9_.\-]{10,}\.[a-zA-Z0-9_.\-~+/=]*/gi;
const PRIVATE_KEY_REGEX = /-----BEGIN [A-Z ]+PRIVATE KEY-----[^-]+-----END [A-Z ]+PRIVATE KEY-----/gis;
const GENERIC_KEY_VALUE_REGEX = /(?:api[_-]?key|secret|token|password|passwd|auth)=(['"]?)([^\s'";&]+)\1/gi;

export function redactEnvironment(env: Record<string, string | undefined>): Record<string, string> {
  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) continue;

    const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = redactString(value);
    }
  }

  return sanitized;
}

export function redactString(content: string): string {
  if (!content) return content;

  return content
    .replace(PRIVATE_KEY_REGEX, '[REDACTED PRIVATE KEY]')
    .replace(JWT_REGEX, '[REDACTED JWT]')
    .replace(BEARER_REGEX, 'Bearer [REDACTED TOKEN]')
    .replace(GENERIC_KEY_VALUE_REGEX, '$1=[REDACTED]');
}
