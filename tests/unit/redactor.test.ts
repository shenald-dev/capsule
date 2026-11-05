import { describe, it, expect } from 'vitest';
import { redactEnvironment, redactString } from '../../src/core/redactor.js';

describe('Secret Redactor Engine', () => {
  it('masks sensitive environment variables', () => {
    const rawEnv = {
      NODE_ENV: 'development',
      PORT: '3000',
      OPENAI_API_KEY: 'sk-proj-1234567890abcdef1234567890',
      STRIPE_SECRET_KEY: 'sk_live_abcdef1234567890',
      DATABASE_URL: 'postgres://user:supersecretpass@localhost:5432/mydb',
      JWT_SECRET: 'super_secret_jwt_key',
      USER_ID: 'user_999'
    };

    const sanitized = redactEnvironment(rawEnv);

    expect(sanitized.NODE_ENV).toBe('development');
    expect(sanitized.PORT).toBe('3000');
    expect(sanitized.USER_ID).toBe('user_999');

    expect(sanitized.OPENAI_API_KEY).toBe('[REDACTED]');
    expect(sanitized.STRIPE_SECRET_KEY).toBe('[REDACTED]');
    expect(sanitized.DATABASE_URL).toBe('[REDACTED]');
    expect(sanitized.JWT_SECRET).toBe('[REDACTED]');
  });

  it('redacts JWT tokens in raw string logs', () => {
    const log = 'Authorization failed for token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThisSignature';
    const clean = redactString(log);
    expect(clean).toContain('[REDACTED JWT]');
    expect(clean).not.toContain('doNotLeakThisSignature');
  });

  it('redacts Bearer tokens in headers', () => {
    const log = 'Sending request with header: Bearer abc12345678xyz_token';
    const clean = redactString(log);
    expect(clean).toBe('Sending request with header: Bearer [REDACTED TOKEN]');
  });

  it('redacts private keys', () => {
    const log = `Error with key:
-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0Y1234567890abcdef
-----END RSA PRIVATE KEY-----`;
    const clean = redactString(log);
    expect(clean).toContain('[REDACTED PRIVATE KEY]');
    expect(clean).not.toContain('MIIEowIBAAKCAQEA0Y1234567890abcdef');
  });
});
