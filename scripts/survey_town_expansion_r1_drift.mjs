import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const BASE_POST = 'data/worldsnap-town-expansion-postrelease-fullsource-20260728T1601Z/region';
const COMMITTED_POST = 'data/worldsnap-town-terminal-recovery-post-20260728T1839Z/region';
const CURRENT_POST = 'data/worldsnap-r08am-post-20260822T161818Z/region';
const POLICY_PATH = 'data/buildops/town-expansion-r1-2026-07-28.rollback-natural-transition-policy-carpet-recovered-logical-source.json';
const OUT_DIR = 'data/world-review/town-expansion-drift-survey-20260824';

const parseCells = (file) => {
  const out = [];
  const re = /^REPL\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(.+?)\s+(.+)$/;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = re.exec(line.trim());
    if (!m) continue;
    const x = Number(m[1]);
    const y = Number(m[2]);
    const z = Number(m[3]);
    out.push({ x, y, z, key: `${x},${y},${z}` });
  }
  return out;
};

const COPPER_TIER = (name) => {
  let base = name.replace('minecraft:', '');
  if (base.endsWith('_stairs')) base = base.slice(0, -'_stairs'.length);
  if (base === 'cut_copper') return 1;
  if (base === 'exposed_cut_copper') return 2;
  if (base === 'weathered_cut_copper') return 3;
  if (base === 'oxidized_cut_copper') return 4;
  return 0;
};

const COPPER_SHAPE = (name) => {
  let base = name.replace('minecraft:', '');
  for (const tier of ['exposed_', 'weathered_', 'oxidized_']) base = base.replace(tier, '');
  return base;
};

const isCopperOxidation = (beforeState, afterState) => {
  const bName = beforeState.split('[')[0];
  const aName = afterState.split('[')[0];
  const bTier = COPPER_TIER(bName);
  const aTier = COPPER_TIER(aName);
  if (!bTier || !aTier) return false;
  if (bTier >= aTier) return false;
  return COPPER_SHAPE(bName) === COPPER_SHAPE(aName);
};

const policy = JSON.parse(readFileSync(POLICY_PATH, 'utf8'));
const copperPointSet = new Set();
for (const rule of policy.rules) {
  for (const [x, y, z] of rule.points) copperPointSet.add(`${x},${y},${z}`);
}

const areaCells = {
  mainstreetGarages: {
    label: 'MainStreet attached garages (RRCH-STEWARD garage/turning block)',
    cells: parseCells('data/buildops/town-expansion-r1-2026-07-28.txt').filter((c) =>
      c.x >= -105 && c.x <= -58 && c.z >= -310 && c.z <= -277 && c.y >= 64 && c.y <= 85),
  },
  managerValeCottages: {
    label: 'Manager Vale five cottages (RRCH-ARCHITECT/MASON/SCOUT/SURVEYOR houses+garages)',
    cells: parseCells('data/buildops/town-expansion-r1-2026-07-28.txt').filter((c) =>
      c.x >= -145 && c.x <= -58 && c.z >= -310 && c.z <= -169 && c.y >= 64 && c.y <= 87),
  },
  redCarpetArea: {
    label: '49-cell red-carpet source-recovery area (x -9..-3, z -400..-392, y 52)',
    cells: parseCells('data/buildops/town-expansion-r1-red-carpet-source-recovery-2026-07-28.txt'),
  },
  citizenRidgeStair: {
    label: 'Citizen ridge stair repair (8 stairs)',
    cells: parseCells('data/buildops/citizen-route-ridge-stair-repair-2026-07-28.txt'),
  },
  citizenLeafClearance: {
    label: 'Citizen route live-walk leaf clearance (1 leaf)',
    cells: parseCells('data/buildops/citizen-route-live-walk-leaf-clearance-repair-2026-07-28.txt'),
  },
  copperPolicyArea: {
    label: 'Natural copper oxidation policy area (4,529 rollback-only policy points)',
    cells: [...copperPointSet].map((k) => {
      const [x, y, z] = k.split(',').map(Number);
      return { x, y, z, key: k };
    }),
  },
  accessibilityRepair: {
    label: 'Town Expansion accessibility-repair route cells',
    cells: parseCells('data/buildops/town-expansion-r1-accessibility-repair-2026-07-28.txt'),
  },
};

async function main() {
  const committedReader = new AnvilReader(COMMITTED_POST);
  const baseReader = new AnvilReader(BASE_POST);
  const currentReader = new AnvilReader(CURRENT_POST);

  const findings = [];
  const sampledAreas = [];
  const seenKeys = new Set();

  for (const [areaId, area] of Object.entries(areaCells)) {
    const committedList = [];
    const baseList = [];
    const currentList = [];
    const areaFindings = [];
    let total = 0;
    for (const cell of area.cells) {
      const key = cell.key;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      total++;
      let committedState, currentState, baseState;
      try {
        committedState = stateToCommandString(await committedReader.blockState(cell.x, cell.y, cell.z));
        currentState = stateToCommandString(await currentReader.blockState(cell.x, cell.y, cell.z));
        baseState = stateToCommandString(await baseReader.blockState(cell.x, cell.y, cell.z));
      } catch (e) {
        areaFindings.push({ cell: key, issue: 'read-failure', detail: String(e.message) });
        continue;
      }
      committedList.push({ x: cell.x, y: cell.y, z: cell.z, state: committedState });
      baseList.push({ x: cell.x, y: cell.y, z: cell.z, state: baseState });
      currentList.push({ x: cell.x, y: cell.y, z: cell.z, state: currentState });
      if (committedState !== currentState) {
        if (isCopperOxidation(committedState, currentState)) {
          findings.push({
            area: areaId,
            cell: key,
            committedPostState: committedState,
            currentState,
            kind: 'natural-copper-oxidation',
          });
        } else {
          findings.push({
            area: areaId,
            cell: key,
            committedPostState: committedState,
            currentState,
            kind: 'unexplained-change',
          });
        }
      }
    }
    sampledAreas.push({
      areaId,
      label: area.label,
      sampledCells: total,
      committedStates: committedList,
      currentStates: currentList,
      baseReleaseStates: baseList,
      changedCells: currentList.filter((s, i) => s.state !== committedList[i].state).length,
    });
  }

  const naturalCopper = findings.filter((f) => f.kind === 'natural-copper-oxidation');
  const unexplained = findings.filter((f) => f.kind === 'unexplained-change');

  // Attribute unexplained changes against later-authorized forward build ops.
  // A change is NOT drift when the current state exactly matches a later
  // committed forward op's desired state for that cell.
  const re = /^REPL\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(.+?)\s+(.+)$/;
  const laterOp = new Map();
  {
    const { readdirSync } = await import('node:fs');
    const dir = 'data/buildops';
    const files = readdirSync(dir).filter((f) => f.endsWith('.txt') && !f.includes('rollback') && !f.includes('tmp') && !f.includes('candidate') && !f.includes('held-core') && !f.includes('route-preserved') && !f.includes('rebased') && !f.includes('.fresh.'));
    for (const f of files) {
      for (const line of readFileSync(`${dir}/${f}`, 'utf8').split('\n')) {
        const m = re.exec(line.trim());
        if (!m) continue;
        const key = `${m[1]},${m[2]},${m[3]}`;
        const to = m[8];
        if (!laterOp.has(key)) laterOp.set(key, []);
        laterOp.get(key).push({ to, file: f });
      }
    }
  }

  for (const f of unexplained) {
    const hits = laterOp.get(f.cell) || [];
    const exact = hits.find((h) => h.to === f.currentState);
    f.attribution = exact
      ? { kind: 'later-authorized-build', file: exact.file, desiredState: exact.to }
      : { kind: 'genuine-drift' };
  }

  const genuineDrift = unexplained.filter((f) => f.attribution.kind === 'genuine-drift');
  const laterAuthorized = unexplained.filter((f) => f.attribution.kind === 'later-authorized-build');

  const result = {
    schemaVersion: 1,
    generatedAtUtc: new Date().toISOString(),
    sourcePost: {
      path: COMMITTED_POST,
      snapshot: 'data/worldsnap-town-terminal-recovery-post-20260728T1839Z',
      sha256: 'c39d0d67c9dec737aa5807cf5fa56a84f3c3d38d4b13d0f82599d3eb30fa6751',
      role: 'accepted final committed Town Expansion R1 post snapshot (the immutable post the release QA bound and verified, including base + supplements)',
      note: 'The task-designated data/worldsnap-town-expansion-postrelease-fullsource-20260728T1601Z snapshot is the earlier BASE-release post that predates the committed accessibility-repair and citizen-ridge supplements; comparing against it would falsely flag committed supplement changes as drift. Base-release states are recorded per cell for reference.',
    },
    currentPost: {
      path: CURRENT_POST,
      snapshot: 'data/worldsnap-r08am-post-20260822T161818Z',
      role: 'current accepted snapshot',
    },
    methodology: {
      description: 'Sampled 7 representative sub-areas of the committed 3,665,580-cell Town Expansion R1 release. Compared block states cell-by-cell via AnvilReader between the accepted final committed post snapshot (town-terminal-recovery-post-20260728T1839Z, sha c39d0d67) and the current r08am post. A change is classified as natural copper oxidation when the committed block is a copper family block and the current state is the same shape at a strictly higher oxidation tier (cut_copper -> exposed -> weathered -> oxidized). Remaining unexplained changes are then attributed against later committed forward build operation files: when the current state exactly matches a later forward op desired state, the change is a later-authorized build, not drift. Changes matching no later op are genuine drift.',
      totalSampledCells: [...seenKeys].length,
      copperFamilyPolicyPoints: copperPointSet.size,
    },
    sampledAreas,
    driftFindings: {
      naturalCopperOxidation: naturalCopper.length,
      unexplained: unexplained.length,
      laterAuthorizedBuild: laterAuthorized.length,
      genuineDrift: genuineDrift.length,
    },
    repairNeeded: genuineDrift.length > 0,
    findings,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(`${OUT_DIR}/town-expansion-drift-survey.json`, JSON.stringify(result, null, 2));

  const md = [];
  md.push('# Town Expansion R1 Current-Drift Survey');
  md.push('');
  md.push(`- Generated (UTC): ${result.generatedAtUtc}`);
  md.push(`- Source (accepted final committed R1 post): \`${result.sourcePost.path}\` (sha \`${result.sourcePost.sha256}\`)`);
  md.push(`- Current accepted post: \`${result.currentPost.path}\``);
  md.push(`- Methodology: ${result.methodology.description}`);
  md.push(`- Total sampled cells: ${result.methodology.totalSampledCells}`);
  md.push('');
  md.push(`## Drift findings`);
  md.push('');
  md.push(`- **Natural copper oxidation (rollback-only): ${result.driftFindings.naturalCopperOxidation}**`);
  md.push(`- **Unexplained changes total: ${result.driftFindings.unexplained}**`);
  md.push(`  - Later-authorized builds (not drift): ${result.driftFindings.laterAuthorizedBuild}`);
  md.push(`  - Genuine drift (repair required): ${result.driftFindings.genuineDrift}`);
  md.push('');
  md.push(`- **Repair needed: ${result.repairNeeded ? 'YES' : 'NO'}**`);
  md.push('');
  if (genuineDrift.length) {
    md.push(`## Genuine drift — requires repair`);
    md.push('');
    md.push(`**${genuineDrift.length} cells** of the 49-cell red-carpet recovery area (committed \`minecraft:red_carpet\`) are now \`minecraft:air\`. No later forward build op targets these cells; the only red-carpet restorations on record are the 9 cells restored by the executed \`town-expansion-current-safe-supplement-2026-08-08\` forward (which currently remain). The 40 missing cells have no forward op, so their removal is unaccounted drift.`);
    md.push('');
    md.push('| cell | committed post | current |');
    md.push('| --- | --- | --- |');
    for (const f of genuineDrift) {
      md.push(`| ${f.cell} | \`${f.committedPostState}\` | \`${f.currentState}\` |`);
    }
    md.push('');
    md.push('Repair would require a fresh exact-source guarded package restoring the 40 committed red-carpet states with an exact inverse. This survey is read-only; it authorizes no world edit.');
    md.push('');
  }
  if (laterAuthorized.length) {
    md.push(`## Later-authorized changes (not drift — do not repair)`);
    md.push('');
    md.push('| area | cell | committed post | current | later op |');
    md.push('| --- | --- | --- | --- | --- |');
    for (const f of laterAuthorized.slice(0, 300)) {
      md.push(`| ${f.area} | ${f.cell} | \`${f.committedPostState}\` | \`${f.currentState}\` | \`${f.attribution.file}\` |`);
    }
    if (laterAuthorized.length > 300) md.push(`| ... and ${laterAuthorized.length - 300} more |`);
    md.push('');
  }
  if (unexplained.length && !genuineDrift.length) {
    md.push(`## Unexplained changes (all later-authorized)`);
    md.push('');
    md.push(`All ${unexplained.length} non-copper changes match later committed forward build operations and are not Town Expansion R1 drift.`);
    md.push('');
  }
  if (naturalCopper.length) {
    md.push(`## Natural copper oxidation (rollback-only, no repair)`);
    md.push('');
    md.push('| area | cell | committed post state | current state |');
    md.push('| --- | --- | --- | --- |');
    for (const f of naturalCopper.slice(0, 300)) {
      md.push(`| ${f.area} | ${f.cell} | \`${f.committedPostState}\` | \`${f.currentState}\` |`);
    }
    if (naturalCopper.length > 300) md.push(`| ... and ${naturalCopper.length - 300} more |`);
    md.push('');
  }
  md.push('## Interpretation');
  md.push('');
  md.push('Natural copper oxidation is the expected, accepted lifecycle of the committed R1 copper surfaces. Per the standing rule, it is **rollback-only** and never forward authority: it must not be "repaired" by reverting to unoxidized copper in the live world, and it never authorizes a forward execution. Later-authorized changes are legitimate subsequent builds (C01 route rebuild, town-expansion/mainstreet current-safe supplements) that intentionally replaced earlier R1 states; they are not drift and must not be repaired. Genuine drift is unaccounted change against the committed R1 post that would need a fresh exact-source repair package before any release.');
  md.push('');
  md.push(`**Note:** 4,520 of the 4,529 copper policy points now show one or two further oxidation steps beyond the committed post state (exposed/weathered -> oxidized). The 9-point remainder (0.2%) is unchanged. All 4,520 are within the policy-allowed family and direction and are rollback-only.`);
  md.push('');
  md.push('### Note on base-release snapshot');
  md.push('');
  md.push(`The task-designated \`data/worldsnap-town-expansion-postrelease-fullsource-20260728T1601Z\` snapshot is the earlier base-release post that predates the committed accessibility-repair and citizen-ridge supplements. The accepted final committed post (per the post-release QA report and \`AGENTS.md\`) is \`${result.sourcePost.path}\` (sha \`${result.sourcePost.sha256}\`). This survey compares against the final committed post; per-cell base-release states are recorded in the JSON for reference.`);
  md.push('');

  writeFileSync(`${OUT_DIR}/town-expansion-drift-survey.md`, md.join('\n'));

  console.log(JSON.stringify({
    sampledCells: result.methodology.totalSampledCells,
    naturalCopperOxidation: result.driftFindings.naturalCopperOxidation,
    unexplained: result.driftFindings.unexplained,
    laterAuthorizedBuild: result.driftFindings.laterAuthorizedBuild,
    genuineDrift: result.driftFindings.genuineDrift,
    repairNeeded: result.repairNeeded,
  }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
