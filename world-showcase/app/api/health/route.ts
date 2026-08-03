import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export function GET() {
  return NextResponse.json({
    service: 'ianlan-nextgen',
    status: 'ok',
  });
}
