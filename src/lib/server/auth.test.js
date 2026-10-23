import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import {
  hashPassword,
  verifyPassword,
  passwordNeedsRehash,
  createSignedSession,
  verifySession,
  getKolkataMonthYear,
  getKolkataDateString
} from './db.js';

describe('passwords', () => {
  it('verifies new-format hashes and rejects wrong passwords', () => {
    const hash = hashPassword('secret123');
    expect(verifyPassword('secret123', hash)).toBe(true);
    expect(verifyPassword('wrong', hash)).toBe(false);
    expect(passwordNeedsRehash(hash)).toBe(false);
  });

  it('uses a different salt for every hash', () => {
    expect(hashPassword('same')).not.toBe(hashPassword('same'));
  });

  it('still accepts legacy AUTH_SALT hashes and flags them for rehash', () => {
    const legacy = crypto.pbkdf2Sync('oldpw', process.env.AUTH_SALT, 1000, 64, 'sha512').toString('hex');
    expect(verifyPassword('oldpw', legacy)).toBe(true);
    expect(passwordNeedsRehash(legacy)).toBe(true);
  });

  it('rejects empty input', () => {
    expect(verifyPassword('', hashPassword('x'))).toBe(false);
    expect(verifyPassword('x', '')).toBe(false);
  });
});

describe('sessions', () => {
  it('accepts a freshly signed session', () => {
    const token = createSignedSession({ email: 'a@b.c', role: 'admin' });
    expect(verifySession(token)?.email).toBe('a@b.c');
  });

  it('rejects unsigned (legacy) tokens', () => {
    const forged = Buffer.from(JSON.stringify({ email: 'x' })).toString('base64');
    expect(verifySession(forged)).toBeNull();
  });

  it('rejects a payload swapped under a valid signature', () => {
    const [, sig] = createSignedSession({ email: 'a@b.c', role: 'admin' }).split('.');
    const evil = Buffer.from(JSON.stringify({ email: 'evil', exp: Date.now() + 1e9 })).toString('base64url');
    expect(verifySession(`${evil}.${sig}`)).toBeNull();
  });

  it('rejects expired sessions', () => {
    const payload = Buffer.from(JSON.stringify({ email: 'a@b.c', exp: Date.now() - 1000 })).toString('base64url');
    const secret = process.env.SESSION_SECRET;
    const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    expect(verifySession(`${payload}.${sig}`)).toBeNull();
  });
});

describe('Kolkata dates', () => {
  it('rolls over to the next month at IST midnight, not UTC', () => {
    // 2026-10-31 20:00 UTC is 2026-11-01 01:30 IST
    expect(getKolkataMonthYear(new Date('2026-10-31T20:00:00Z'))).toBe('2026-11');
    expect(getKolkataDateString(new Date('2026-10-31T20:00:00Z'))).toBe('2026-11-01');
    // 2026-10-31 18:00 UTC is still 2026-10-31 23:30 IST
    expect(getKolkataDateString(new Date('2026-10-31T18:00:00Z'))).toBe('2026-10-31');
  });
});
