import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ApiClient } from './ApiClient';
import { isExpiringSoon } from '../utils/jwt';

/** localStorage key used by the Toolshop Angular app (TokenStorageService). */
export const AUTH_TOKEN_KEY = 'auth-token';

/**
 * One authenticated session per worker.
 *
 * Toolshop issues JWTs that live 5 minutes, so a single storageState created in a setup
 * project would expire in the middle of a long shard. Instead, each worker logs in through
 * the API, writes its own storageState file and transparently renews it when the token is
 * about to expire. No test ever goes through the login form unless that is what it tests.
 */
export class AuthSession {
  private token: string | undefined;

  constructor(
    private readonly api: ApiClient,
    private readonly credentials: { email: string; password: string },
    private readonly baseURL: string,
    private readonly stateFile: string,
  ) {}

  /** Valid bearer token (renewed through the API when it is close to expiring). */
  async getToken(): Promise<string> {
    if (!this.token || isExpiringSoon(this.token, 90)) {
      const { access_token } = await this.api.login(this.credentials.email, this.credentials.password);
      this.token = access_token;
      await this.persist(access_token);
    }
    return this.token;
  }

  /** Path to a storageState file whose token is guaranteed to be fresh. */
  async storageStatePath(): Promise<string> {
    await this.getToken();
    return this.stateFile;
  }

  private async persist(token: string): Promise<void> {
    const state = {
      cookies: [],
      origins: [
        {
          origin: new URL(this.baseURL).origin,
          localStorage: [{ name: AUTH_TOKEN_KEY, value: token }],
        },
      ],
    };
    await mkdir(path.dirname(this.stateFile), { recursive: true });
    await writeFile(this.stateFile, JSON.stringify(state, null, 2));
  }
}
