import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { AuthSession, AUTH_TOKEN_KEY } from '@api/AuthSession';
import type { ApiClient } from '@api/ApiClient';

const now = () => Math.floor(Date.now() / 1000);
const jwt = (expiresIn: number, id: number) =>
  ['h', Buffer.from(JSON.stringify({ exp: now() + expiresIn, jti: id })).toString('base64url'), 's'].join(
    '.',
  );

/** Fake API: hands out tokens with the given lifetime and counts logins. */
function fakeApi(lifetimeSeconds: number) {
  const calls = { logins: 0 };
  const api = {
    login: () => {
      calls.logins++;
      return Promise.resolve({
        access_token: jwt(lifetimeSeconds, calls.logins),
        token_type: 'bearer',
        expires_in: lifetimeSeconds,
      });
    },
  } as unknown as ApiClient;
  return { api, calls };
}

/** Toolshop JWTs live 5 minutes: the session must renew them instead of handing out stale ones. */
test.describe('AuthSession', { tag: '@unit' }, () => {
  const creds = { email: 'a@b.c', password: 'x' };

  test('a valid token is reused: one API login for many tests', async ({}, testInfo) => {
    const { api, calls } = fakeApi(300);
    const session = new AuthSession(api, creds, 'http://localhost:4200', testInfo.outputPath('state.json'));

    const first = await session.getToken();
    await session.getToken();
    await session.storageStatePath();

    expect(calls.logins).toBe(1);
    expect(await session.getToken()).toBe(first);
  });

  test('a token about to expire is renewed and the storageState file is rewritten', async ({}, testInfo) => {
    const { api, calls } = fakeApi(30); // inside the 90 s renewal margin
    const file = testInfo.outputPath('state.json');
    const session = new AuthSession(api, creds, 'http://localhost:4200/some/path', file);

    const first = await session.getToken();
    const second = await session.getToken();

    expect(calls.logins).toBe(2);
    expect(second).not.toBe(first);
    const state = JSON.parse(await readFile(file, 'utf8')) as {
      origins: Array<{ origin: string; localStorage: Array<{ name: string; value: string }> }>;
    };
    expect(state.origins).toEqual([
      { origin: 'http://localhost:4200', localStorage: [{ name: AUTH_TOKEN_KEY, value: second }] },
    ]);
    expect(path.basename(file)).toBe('state.json');
  });
});
