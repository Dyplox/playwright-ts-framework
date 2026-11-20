/** Reads the `exp` claim (seconds since epoch) of a JWT without verifying it. */
export function jwtExpiresAt(token: string): number {
  const payload = token.split('.')[1];
  if (!payload) throw new Error('Malformed JWT: missing payload');
  const json = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
  const { exp } = JSON.parse(json) as { exp?: number };
  if (typeof exp !== 'number') throw new Error('JWT has no exp claim');
  return exp;
}

/** True when the token expires within `marginSeconds` from now. */
export function isExpiringSoon(token: string, marginSeconds = 60): boolean {
  return jwtExpiresAt(token) - Math.floor(Date.now() / 1000) <= marginSeconds;
}
