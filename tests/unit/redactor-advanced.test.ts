import { describe, it, expect } from 'vitest';
import { redactString } from '../../src/core/redactor.js';

describe('Strict-Guard Advanced Secret Redactor', () => {
  it('masks database passwords in PostgreSQL, MongoDB, Redis, and MySQL connection URIs', () => {
    const postgres = 'Failed to connect: postgres://postgres:superSecretPassword123@db.internal.net:5432/prod_db';
    const cleanPg = redactString(postgres);
    expect(cleanPg).toBe('Failed to connect: postgres://postgres:[REDACTED]@db.internal.net:5432/prod_db');
    expect(cleanPg).not.toContain('superSecretPassword123');

    const mongo = 'MongoServerSelectionError: mongodb+srv://admin_user:myClusterPass99@cluster0.mongodb.net/test';
    const cleanMongo = redactString(mongo);
    expect(cleanMongo).toBe('MongoServerSelectionError: mongodb+srv://admin_user:[REDACTED]@cluster0.mongodb.net/test');
    expect(cleanMongo).not.toContain('myClusterPass99');

    const redis = 'Redis error connecting to redis://default:redisAuthPassword@redis-host:6379/0';
    const cleanRedis = redactString(redis);
    expect(cleanRedis).toBe('Redis error connecting to redis://default:[REDACTED]@redis-host:6379/0');
    expect(cleanRedis).not.toContain('redisAuthPassword');

    const redisNoUser = 'Connecting to redis://:mypassword@localhost:6379';
    const cleanRedisNoUser = redactString(redisNoUser);
    expect(cleanRedisNoUser).toBe('Connecting to redis://:[REDACTED]@localhost:6379');
    expect(cleanRedisNoUser).not.toContain('mypassword');
  });

  it('masks inline secrets across colon, whitespace-equal, and JSON key-value formats', () => {
    const colon = 'Config value api_key: secretKey123 in settings.yaml';
    const cleanColon = redactString(colon);
    expect(cleanColon).toContain('api_key: [REDACTED]');
    expect(cleanColon).not.toContain('secretKey123');

    const spaceEqual = 'Loaded password = mySecretPassword from .env';
    const cleanSpaceEqual = redactString(spaceEqual);
    expect(cleanSpaceEqual).toContain('password = [REDACTED]');
    expect(cleanSpaceEqual).not.toContain('mySecretPassword');

    const json = JSON.stringify({ token: 'bearerSecretToken999', status: 'active' });
    const cleanJson = redactString(json);
    expect(cleanJson).toContain('"token":"[REDACTED]"');
    expect(cleanJson).not.toContain('bearerSecretToken999');
  });

  it('masks Google / Gemini API keys', () => {
    const gemini = 'Failed calling Gemini API with key AIzaSyD1234567890abcdefghijklmnopqrstuv';
    const cleanGemini = redactString(gemini);
    expect(cleanGemini).toContain('[REDACTED GEMINI KEY]');
    expect(cleanGemini).not.toContain('AIzaSyD1234567890abcdefghijklmnopqrstuv');
  });

  it('masks GitHub Personal Access Tokens (classic and fine-grained)', () => {
    const classic = 'Using git token: ghp_111122223333444455556666777788889999 for repo sync';
    const cleanClassic = redactString(classic);
    expect(cleanClassic).toContain('[REDACTED GITHUB TOKEN]');
    expect(cleanClassic).not.toContain('ghp_111122223333444455556666777788889999');

    const fineGrained = 'PAT authentication github_pat_11AAAAAAA_BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';
    const cleanFine = redactString(fineGrained);
    expect(cleanFine).toContain('[REDACTED GITHUB TOKEN]');
    expect(cleanFine).not.toContain('github_pat_');
  });

  it('masks OpenAI, Anthropic, AWS, and Slack credentials', () => {
    const openai = 'OpenAI Request error with key sk-proj-abcdefghijklmnopqrstuvwxyz0123456789_APIKEY';
    const cleanOai = redactString(openai);
    expect(cleanOai).toContain('[REDACTED OPENAI KEY]');
    expect(cleanOai).not.toContain('abcdefghijklmnopqrstuvwxyz');

    const anthropic = 'Anthropic client init with sk-ant-api03-abcdef1234567890abcdef1234567890';
    const cleanAnt = redactString(anthropic);
    expect(cleanAnt).toContain('[REDACTED ANTHROPIC KEY]');
    expect(cleanAnt).not.toContain('sk-ant-api03');

    const mockAws = ['AKIA', '0000000000000000'].join('');
    const aws = `AWS S3 Access Denied for Key ID ${mockAws}`;
    const cleanAws = redactString(aws);
    expect(cleanAws).toContain('[REDACTED AWS KEY ID]');
    expect(cleanAws).not.toContain(mockAws);

    const mockSlack = ['xoxb', '000000000000', '000000000000', 'mockslacktokenstring'].join('-');
    const slack = `Webhook post failed with bot token: ${mockSlack}`;
    const cleanSlack = redactString(slack);
    expect(cleanSlack).toContain('[REDACTED SLACK TOKEN]');
    expect(cleanSlack).not.toContain(mockSlack);
  });
});
