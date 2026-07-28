import crypto from 'node:crypto';

export const SITE_SESSION_COOKIE = 'ianlan_nextgen_session';
export const SITE_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

function sessionSecret(): string {
  const secret = process.env.SITE_SESSION_SECRET ?? '';
  if (secret.length < 32) {
    throw new Error('SITE_SESSION_SECRET must contain at least 32 characters');
  }
  return secret;
}

function signature(payload: string): string {
  return crypto
    .createHmac('sha256', sessionSecret())
    .update(payload)
    .digest('base64url');
}

function equal(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length
    && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function createSiteSession(now = Date.now()): string {
  const expiresAt = Math.floor(now / 1000) + SITE_SESSION_TTL_SECONDS;
  const payload = `v1.${expiresAt}`;
  return `${payload}.${signature(payload)}`;
}

export function verifySiteSession(
  session: string | undefined,
  now = Date.now(),
): boolean {
  if (!session) return false;
  const [version, rawExpiry, suppliedSignature, ...extra] = session.split('.');
  if (
    version !== 'v1'
    || extra.length > 0
    || !/^\d+$/.test(rawExpiry ?? '')
    || !suppliedSignature
  ) {
    return false;
  }
  const expiresAt = Number(rawExpiry);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(now / 1000)) {
    return false;
  }
  const payload = `${version}.${rawExpiry}`;
  return equal(signature(payload), suppliedSignature);
}

export function verifySitePasscode(candidate: unknown): boolean {
  const expected = process.env.SITE_PASSCODE ?? '';
  if (!/^\d{10}$/.test(expected) || typeof candidate !== 'string') {
    return false;
  }
  return /^\d{10}$/.test(candidate) && equal(candidate, expected);
}
