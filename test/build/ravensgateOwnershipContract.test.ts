import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const OUT_DIR = path.join(ROOT, 'data/world-review/ravensgate-ownership-contract-20260825');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'ravensgate-ownership-'));

type Contract = {
  reportIdentity: string;
  status: string;
  contestedInterface: { resolution: string };
  policy: {
    defaultDeny: boolean;
    oneOwnerPerCell: boolean;
    multipleOwnershipProhibited: boolean;
    wildcardOrLastWriterWinsProhibited: boolean;
  };
  interfaces: Array<{
    id: string;
    status: string;
    cellCount: number;
    coordinateSetSha256: string;
    owners: Record<string, { cellCount: number; coordinateSetSha256?: string }>;
    fluidCount: number;
    containerControlCount: number;
  }>;
  census: {
    totalInterfaceCellCount: number;
    doubleAssignedCellCount: number;
    unresolvableCellCount: number;
  };
};

let contract: Contract;

describe('RAVENSGATE ownership interface contract (read-only)', () => {
  beforeAll(() => {
    execFileSync(process.execPath, [
      'scripts/generate_ravensgate_ownership_contract.mjs',
      '--out', path.join(temporaryDirectory, 'ravensgate-ownership-contract.json'),
    ], { cwd: ROOT, stdio: 'pipe', timeout: 180_000 });
    contract = JSON.parse(
      fs.readFileSync(path.join(OUT_DIR, 'ravensgate-ownership-contract.json'), 'utf8'),
    ) as Contract;
  });

  afterAll(() => {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  });

  it('emits a PASS read-only contract with one owner per cell', () => {
    expect(contract.status).toBe('PASS_RAVENSGATE_OWNERSHIP_CONTRACT_ONE_OWNER_PER_CELL');
    expect(contract.reportIdentity).toMatch(/^[0-9a-f]{64}$/);
    expect(contract.policy.defaultDeny).toBe(true);
    expect(contract.policy.oneOwnerPerCell).toBe(true);
    expect(contract.policy.multipleOwnershipProhibited).toBe(true);
    expect(contract.policy.wildcardOrLastWriterWinsProhibited).toBe(true);
  });

  it('resolves the contested IF-RG-GARTH-LIBRARY-TERRACE interface at z=-432', () => {
    const iface = contract.interfaces.find((i) => i.id === 'IF-RG-GARTH-LIBRARY-TERRACE');
    expect(iface).toBeDefined();
    expect(iface!.cellCount).toBe(85);
    expect(iface!.status).toContain('CONTESTED_RESOLVED_ONE_OWNER_PER_CELL');
    expect(iface!.owners['town-expansion-r1 TE-LIBRARY-TERRACE'].cellCount).toBeGreaterThan(0);
    expect(iface!.owners['ravensgate RG-GARTH public-realm'].cellCount).toBeGreaterThan(0);
    expect(iface!.owners['town-expansion-r1 TE-LIBRARY-TERRACE'].cellCount
      + iface!.owners['ravensgate RG-GARTH public-realm'].cellCount).toBe(85);
    expect(contract.contestedInterface.resolution).toContain('one owner per cell');
  });

  it('records the other interface contracts with zero double-assigned cells', () => {
    expect(contract.interfaces.length).toBe(7);
    expect(contract.census.doubleAssignedCellCount).toBe(0);
    expect(contract.census.unresolvableCellCount).toBe(0);
    const ids = contract.interfaces.map((i) => i.id);
    expect(ids).toContain('IF-RG-LOGGIA-LIBRARY');
    expect(ids).toContain('IF-RG-GARTH-PAVILION');
    expect(ids).toContain('IF-RG-STOREHOUSE-NORTH');
    expect(ids).toContain('IF-RG-GUILDHALL-EAST');
    expect(ids).toContain('IF-RG-GARTH-STATUES');
    expect(ids).toContain('IF-RG-LIB-GUILD-SECRET-01');
  });

  it('keeps the storehouse north wall single-owner and the Terem overlay zero-built', () => {
    const storehouse = contract.interfaces.find((i) => i.id === 'IF-RG-STOREHOUSE-NORTH');
    expect(storehouse!.cellCount).toBe(105);
    expect(storehouse!.owners['ravensreach RRCH-STOREHOUSE (north wall)'].cellCount).toBe(105);
    expect(storehouse!.owners['ravensgate RG-GARTH public-realm'].cellCount).toBe(0);

    const pavilion = contract.interfaces.find((i) => i.id === 'IF-RG-GARTH-PAVILION');
    expect(pavilion!.cellCount).toBe(7912);
    expect(pavilion!.owners['town-expansion-r1 TE-RUSSIAN-TEREM-PAVILION'].cellCount).toBe(0);
    expect(pavilion!.status).toContain('SURFACE_OVERLAY_ONLY_RULE_CONFIRMED');
  });

  it('surveys zero fluid and zero container/control cells across the interface bands', () => {
    for (const iface of contract.interfaces) {
      if (iface.cellCount > 0) {
        expect(iface.fluidCount).toBe(0);
        expect(iface.containerControlCount).toBe(0);
      }
    }
  });
});
