import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const REPORT_ROOT = path.join(
  ROOT,
  'docs/redevelopment/2026-07-28-underground-navigation',
);
const readJson = (filename: string) => JSON.parse(fs.readFileSync(filename, 'utf8'));
const sha256 = (filename: string) => crypto
  .createHash('sha256')
  .update(fs.readFileSync(filename))
  .digest('hex');

describe('Underground Navigation current access refresh', () => {
  const inventory = readJson(path.join(REPORT_ROOT, 'underground-inventory.json'));
  const access = readJson(path.join(REPORT_ROOT, 'underground-access-audit.json'));
  const routeQa = readJson(path.join(
    ROOT,
    'data/world-review/underground-navigation-r08am-20260822/current-route-qa.json',
  ));

  it('binds the current immutable R08AM post and preserves the truthful 19/22 result', () => {
    expect(routeQa.postSnapshot.sha256).toBe(
      '30f5c3394c4080d74156a59deb613290366c130e72a859261625117b8276541f',
    );
    expect(routeQa.summary).toMatchObject({ routes: 22, passed: 19, failed: 3 });
    expect(access.unprovenRouteIds).toEqual([
      'TE-ROUTE-C01-MOUNTAIN-PORTAL-L1',
      'TE-ROUTE-MAINSTREET-WAREHOUSE-DRIVE-HALL',
      'TE-ROUTE-OBSERVATORY-PORTAL-HUB',
    ]);
  });

  it('separates public, staff, adults-only, sealed, and unproven access', () => {
    expect(access.status).toBe('PASS_WITH_EXPLICIT_HOLDS');
    expect(access.statusCounts.UNPROVEN_CURRENT_SNAPSHOT).toBe(3);
    expect(access.statusCounts.SEALED_UNCOMMISSIONED).toBeGreaterThan(0);
    expect(access.connections.some((entry: Record<string, string>) => (
      entry.audience === 'public' && entry.verification === 'VERIFIED_WALKABLE'
    ))).toBe(true);
    expect(access.connections.some((entry: Record<string, string>) => (
      entry.audience.includes('staff')
    ))).toBe(true);
    expect(access.connections.some((entry: Record<string, string>) => (
      entry.audience.includes('adults-only')
    ))).toBe(true);
  });

  it('binds the exact Empty Eight public and restricted boundaries', () => {
    expect(access.publicEmptyEight.southVacantBayIds).toHaveLength(11);
    expect(access.publicEmptyEight.retainedCappedSouthShellIds).toEqual(['EE-R-S06']);
    expect(access.publicEmptyEight.pf08StairCount).toBe(2);
    expect(access.restrictedEmptyEight).toMatchObject({
      publicToStaffDoorCount: 2,
      securedBackroomDoorCount: 12,
      lowerAnnexPublic: false,
      lowerAnnexAdultsOnlyRestricted: true,
    });
    expect(access.restrictedEmptyEight.grandStair).toMatchObject({
      width: 7,
      longitudinalStepCount: 26,
      verticalDrop: 25,
      exactStepContinuity: true,
      exactHeadroomHeight: 5,
    });
  });

  it('publishes current maps and immutable-snapshot screenshots with exact identities', () => {
    const expected = {
      'maps/19-empty-eight-public-retail-boh-sectional.png':
        '9201f83c6671c6c8ee208f0d1c96f06e9562aa86008da77fa369c3aba399d69c',
      'maps/20-empty-eight-restricted-annex-sectional.png':
        'bffa49063975e86f864db53a72e95775b58c0ea02c0fc74819f44dc51c3c437b',
      'screenshots/empty-eight-public-gallery.png':
        '6846b499e5413ffb6f9b247f5b4a346a95d545bc05e1a7b42d822c3a2a318589',
      'screenshots/empty-eight-restricted-grand-stair.png':
        '62ba45b480b008844147c76e5cf47497040dc39afe9c6a9d867d864a0bcfc164',
      'screenshots/empty-eight-restricted-theatre.png':
        '97c0263cc036756214f03c8604fb074dcbac95a0b059b26033559f1e58712e87',
    };
    for (const [relative, expectedSha256] of Object.entries(expected)) {
      expect(sha256(path.join(REPORT_ROOT, relative)), relative).toBe(expectedSha256);
    }
  });

  it('renders every hold and the no-mutation boundary into the report', () => {
    const html = fs.readFileSync(
      path.join(REPORT_ROOT, 'underground-navigation-report.html'),
      'utf8',
    );
    for (const routeId of access.unprovenRouteIds) expect(html).toContain(routeId);
    expect(html).toContain('SEALED_UNCOMMISSIONED');
    expect(html).toContain('restricted adults-only');
    expect(html).toContain(
      'No world command, RCON request, bot movement, database write, or live server mutation was made.',
    );
    expect(inventory.physicalMutation).toBe(false);
  });
});
