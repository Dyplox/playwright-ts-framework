import { test, expect } from '@playwright/test';
import { isExpiringSoon, jwtExpiresAt } from '@utils/jwt';

const now = () => Math.floor(Date.now() / 1000);
const fakeJwt = (payload: object) =>
  ['header', Buffer.from(JSON.stringify(payload)).toString('base64url'), 'signature'].join('.');

test.describe('JWT helpers', { tag: '@unit' }, () => {
  test('reads the exp claim', () => {
    expect(jwtExpiresAt(fakeJwt({ exp: 1_800_000_000 }))).toBe(1_800_000_000);
  });

  test('a token expiring inside the margin must be renewed', () => {
    expect(isExpiringSoon(fakeJwt({ exp: now() + 30 }), 60)).toBe(true);
    expect(isExpiringSoon(fakeJwt({ exp: now() + 300 }), 60)).toBe(false);
  });

  test('malformed tokens fail loudly instead of being treated as valid', () => {
    expect(() => jwtExpiresAt('not-a-jwt')).toThrow(/Malformed JWT/);
    expect(() => jwtExpiresAt(fakeJwt({ sub: 'x' }))).toThrow(/no exp claim/);
  });
});
