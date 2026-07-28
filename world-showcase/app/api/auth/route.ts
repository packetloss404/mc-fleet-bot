import { NextResponse } from 'next/server';

import {
  createSiteSession,
  SITE_SESSION_COOKIE,
  SITE_SESSION_TTL_SECONDS,
  verifySitePasscode,
} from '../../../lib/siteAuth';

export const runtime = 'nodejs';

const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 10;
const failedAttempts = new Map<string, { count: number; resetAt: number }>();

function clientKey(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'
  );
}

function activeAttempt(key: string, now: number) {
  const attempt = failedAttempts.get(key);
  if (attempt && attempt.resetAt > now) return attempt;
  failedAttempts.delete(key);
  return undefined;
}

export async function POST(request: Request) {
  const key = clientKey(request);
  const now = Date.now();
  const priorAttempt = activeAttempt(key, now);
  if (priorAttempt && priorAttempt.count >= MAX_FAILED_ATTEMPTS) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again later.' },
      {
        status: 429,
        headers: {
          'Cache-Control': 'no-store',
          'Retry-After': Math.ceil((priorAttempt.resetAt - now) / 1000).toString(),
        },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  const pin = (
    typeof body === 'object'
    && body !== null
    && 'pin' in body
  ) ? (body as { pin?: unknown }).pin : undefined;
  if (!verifySitePasscode(pin)) {
    failedAttempts.set(key, {
      count: (priorAttempt?.count ?? 0) + 1,
      resetAt: priorAttempt?.resetAt ?? now + ATTEMPT_WINDOW_MS,
    });
    return NextResponse.json(
      { error: 'Incorrect access code.' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  failedAttempts.delete(key);
  const response = NextResponse.json(
    { authenticated: true },
    { headers: { 'Cache-Control': 'no-store' } },
  );
  response.cookies.set(SITE_SESSION_COOKIE, createSiteSession(), {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: SITE_SESSION_TTL_SECONDS,
  });
  return response;
}
