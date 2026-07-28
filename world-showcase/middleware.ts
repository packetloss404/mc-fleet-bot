import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'ianlan_nextgen_session';

function base64Url(bytes: Uint8Array): string {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}

async function sign(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return base64Url(new Uint8Array(
    await crypto.subtle.sign('HMAC', key, encoder.encode(payload)),
  ));
}

async function validSession(value: string | undefined): Promise<boolean> {
  const secret = process.env.SITE_SESSION_SECRET ?? '';
  if (!value || secret.length < 32) return false;
  const [version, rawExpiry, suppliedSignature, ...extra] = value.split('.');
  if (
    version !== 'v1'
    || extra.length > 0
    || !/^\d+$/.test(rawExpiry ?? '')
    || !suppliedSignature
  ) {
    return false;
  }
  const expiresAt = Number(rawExpiry);
  if (
    !Number.isSafeInteger(expiresAt)
    || expiresAt <= Math.floor(Date.now() / 1000)
  ) {
    return false;
  }
  return await sign(`${version}.${rawExpiry}`, secret) === suppliedSignature;
}

export async function middleware(request: NextRequest) {
  if (await validSession(request.cookies.get(COOKIE_NAME)?.value)) {
    return NextResponse.next();
  }
  if (request.nextUrl.pathname === '/') {
    return NextResponse.next();
  }
  const login = request.nextUrl.clone();
  login.pathname = '/';
  login.search = '';
  return NextResponse.rewrite(login);
}

export const config = {
  matcher: [
    '/((?!api/auth|api/health|_next/static|_next/image|favicon.ico|icon.svg).*)',
  ],
};
