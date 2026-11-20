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
const GENERIC_KEY_VALUE_REGEX = /((?:["']?(?:api[_-]?key|secret|token|password|passwd|auth)["']?\s*[:=]\s*)(["']?))(?!\[REDACTED)([^"'\s;&]+)(\2)/gi;

// Database Connection URIs with credentials (postgres, mysql, mongodb, redis, etc.)
const DB_URI_CREDENTIALS_REGEX = /((?:postgres|postgresql|mysql|mariadb|mongodb(?:\+srv)?|redis|rediss|amqp|mssql|http|https|ftp|git|ssh|neo4j|clickhouse|elasticsearch):\/\/[^\s:@/]*:)([^\s@/]+)(@)/gi;

// Well-known vendor token patterns
const GITHUB_TOKEN_REGEX = /\b(?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36}\b|\bgithub_pat_[a-zA-Z0-9_]{20,}\b/g;
const ANTHROPIC_KEY_REGEX = /\bsk-ant-[a-zA-Z0-9_\-]{20,}\b/g;
const OPENAI_KEY_REGEX = /\bsk-(?!ant-)(?:proj-)?[a-zA-Z0-9_\-]{20,}\b/g;
const GEMINI_KEY_REGEX = /\bAIzaSy[0-9A-Za-z_-]{33}\b/g;
const AWS_ACCESS_KEY_REGEX = /\bAKIA[0-9A-Z]{16}\b/g;
const SLACK_TOKEN_REGEX = /\bxox[baprs]-[0-9a-zA-Z-]{10,}\b/g;

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
    .replace(DB_URI_CREDENTIALS_REGEX, '$1[REDACTED]$3')
    .replace(GITHUB_TOKEN_REGEX, '[REDACTED GITHUB TOKEN]')
    .replace(ANTHROPIC_KEY_REGEX, '[REDACTED ANTHROPIC KEY]')
    .replace(OPENAI_KEY_REGEX, '[REDACTED OPENAI KEY]')
    .replace(GEMINI_KEY_REGEX, '[REDACTED GEMINI KEY]')
    .replace(AWS_ACCESS_KEY_REGEX, '[REDACTED AWS KEY ID]')
    .replace(SLACK_TOKEN_REGEX, '[REDACTED SLACK TOKEN]')
    .replace(GENERIC_KEY_VALUE_REGEX, '$1[REDACTED]$4');
}
