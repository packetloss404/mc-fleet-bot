#!/usr/bin/env node
/** Record the bounded, isolated D06 bee runtime compatibility result. */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const GENERATED_AT = value('--generated-at', '2026-08-06T06:15:00Z');
const OUTPUT = path.resolve(value(
  '--out',
  'docs/masterplans/05-combined-zones/phase1-d06-bee-runtime-compatibility-audit.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'docs/masterplans/05-combined-zones/phase1-d06-bee-runtime-compatibility-audit.md',
));
const INPUTS = Object.freeze({
  syntheticFixture:
    'docs/masterplans/05-combined-zones/phase1-d06-bee-nest-relocation-fixture.json',
  runtimeHarness: 'scripts/run_combined_zones_bee_runtime_fixture.mjs',
  packageLock: 'package-lock.json',
});

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function canonicalize(input) {
  if (Array.isArray(input)) return input.map(canonicalize);
  if (input && typeof input === 'object') {
    return Object.fromEntries(Object.keys(input).sort().map((key) => (
      [key, canonicalize(input[key])]
    )));
  }
  return input;
}

function binding(filename, role) {
  const data = fs.readFileSync(path.join(ROOT, filename));
  return { path: filename, bytes: data.length, sha256: sha256(data), role };
}

const fixture = JSON.parse(fs.readFileSync(
  path.join(ROOT, INPUTS.syntheticFixture),
  'utf8',
));
if (fixture.disposition?.syntheticStateContractPassed !== true
  || fixture.disposition?.runtimeMechanicProven !== false) {
  throw new Error('D06 runtime compatibility audit rejected: synthetic fixture drift');
}

const evidence = {
  productionRuntime: {
    paperVersion: '1.21.11-69-main@94d0c97',
    paperJarBytes: 54_816_531,
    paperJarSha256:
      'cf374f2af9d71dfcc75343f37b722a7abcb091c574131b95e3b13c6fc2cb8fae',
    jarCopiedReadOnlyOverSftp: true,
    productionJavaTruststoreCopiedReadOnlyOverSftp: true,
  },
  disposableRuntime: {
    serverMode: 'PLUGIN_FREE_DISPOSABLE_FLAT_WORLD',
    javaVersion: '21.0.11',
    syntheticSource: { x: 0, y: 65, z: 0 },
    syntheticEmbeddedBeeCount: 3,
    sourceBlockState: 'minecraft:bee_nest[facing=south,honey_level=0]',
    sourceIndexedRecordsPresent: [0, 1, 2],
    sourceFourthRecordAbsent: true,
  },
  attempts: [
    {
      id: 'CLIENT-01-REPOSITORY-STACK',
      nodeVersion: '20.20.2',
      mineflayerVersion: '4.35.0',
      minecraftProtocolVersion: '1.64.0',
      result: 'HOLD_CLIENT_ITEM_COMPONENT_DECODE_FAILURE',
      exactFailureClass: 'SlotComponent anonymous-NBT parse rejected minecraft:bees item payload with abnormally large int-array size',
    },
    {
      id: 'CLIENT-02-CURRENT-TEMPORARY-STACK',
      nodeVersion: '22.23.2',
      mineflayerVersion: '4.37.1',
      minecraftProtocolVersion: '1.66.2',
      minecraftDataVersion: '3.112.0',
      result: 'HOLD_CLIENT_ITEM_COMPONENT_AND_ENCHANTMENT_DECODE_FAILURE',
      exactFailureClass: 'same SlotComponent anonymous-NBT parse failure; prismarine-block also received a non-iterable enchantment representation',
      repositoryDependencyChanged: false,
    },
    {
      id: 'CLIENT-03-SEQUENCED-LOW-LEVEL-ACTION',
      nodeVersion: '22.23.2',
      mineflayerVersion: '4.37.1',
      minecraftProtocolVersion: '1.66.2',
      action: 'survival player start/stop block_dig with required 1.21.11 sequence fields, tick terminators, Silk Touch diamond axe, and five-second interval',
      serverAcknowledgements: [{ sequenceId: 2 }],
      blockChanged: false,
      itemCreated: false,
      result: 'HOLD_ACTION_ACKNOWLEDGED_WITHOUT_SERVER_BLOCK_CHANGE',
    },
  ],
  exactRuntimeLootTable: {
    source: 'data/minecraft/loot_table/blocks/bee_nest.json inside the exact patched Paper runtime',
    requiresSilkTouch: true,
    copiedComponent: 'minecraft:bees',
    temporaryLootTableProbeCreatedThreeBeeItem: true,
    implication: 'Paper serialization is viable; the current automation-client action/item path is the unclosed boundary.',
  },
};

const report = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-d06-bee-runtime-compatibility-audit',
  generatedAtUtc: GENERATED_AT,
  status:
    'HOLD_EXACT_PRODUCTION_PAPER_RUNTIME_REACHED_CURRENT_AUTOMATION_CLIENT_INCOMPATIBLE_NO_MECHANIC_PASS',
  purpose: 'Record the bounded exact-runtime experiment without converting client incompatibility into a false intact-relocation pass.',
  sourceBindings: {
    syntheticFixture: binding(
      INPUTS.syntheticFixture,
      'offline three-member conservation and transport-eligibility contract',
    ),
    runtimeHarness: binding(
      INPUTS.runtimeHarness,
      'reproducible disposable Paper/Mineflayer diagnostic harness',
    ),
    packageLock: binding(
      INPUTS.packageLock,
      'repository Mineflayer dependency identity',
    ),
  },
  evidence,
  conclusion: {
    exactProductionRuntimeBinaryBound: true,
    syntheticThreeBeeSourceEstablished: true,
    paperBeeItemSerializationObserved: true,
    isolatedRuntimeMechanicProven: false,
    currentProductionCaptureTransportEligible: false,
    freshLiveConsolidationStillRequired: true,
    productionPluginInterferenceTested: false,
    recommendedNextMethod: 'Use a version-matched vanilla client automation path or first repair and independently verify PrismarineJS 1.21.11 block-action and minecraft:bees component handling; do not upgrade the fleet dependency tree merely for this fixture.',
    blindFleetDependencyUpgradeRecommended: false,
    technicalTreatmentAccepted: false,
    operationCompilationAuthorized: false,
  },
  safetyBoundary: {
    disposableServerStarted: true,
    disposableBlockEditsPerformed: true,
    disposableEntityFixtureCount: 3,
    productionHostReadOnlyFilesCopied: 2,
    productionMinecraftProcessContacted: false,
    productionWorldContacted: false,
    productionBlockEditCount: 0,
    productionEntityMoveCount: 0,
    operationCellCount: 0,
    physicalReleaseAuthorized: false,
    worldEditAuthorized: false,
    executable: false,
  },
};
report.auditPayloadSha256 = sha256(
  `combined-zones-d06-bee-runtime-compatibility-payload-v1\n${JSON.stringify(canonicalize({
    evidence: report.evidence,
    conclusion: report.conclusion,
  }))}\n`,
);
report.reportIdentitySha256 = sha256(
  `combined-zones-d06-bee-runtime-compatibility-report-v1\n${JSON.stringify(canonicalize({
    schemaVersion: report.schemaVersion,
    id: report.id,
    generatedAtUtc: report.generatedAtUtc,
    status: report.status,
    sourceBindings: report.sourceBindings,
    auditPayloadSha256: report.auditPayloadSha256,
    safetyBoundary: report.safetyBoundary,
  }))}\n`,
);

const markdown = `# Combined Zones D06 bee runtime compatibility audit\n\n`
  + `Generated: ${GENERATED_AT}\n\n`
  + `Status: **${report.status}**\n\n`
  + `A plugin-free disposable server ran the byte-identical production Paper jar (${evidence.productionRuntime.paperVersion}, SHA-256 \`${evidence.productionRuntime.paperJarSha256}\`). The three-record synthetic nest was established and Paper's exact loot table serialized a nest item with the new \`minecraft:bees\` component.\n\n`
  + `The repository client stack and temporary current Mineflayer stack both failed to decode that 1.21.11 item component. A sequenced five-second low-level survival break was acknowledged by Paper but did not change the block. Therefore the intact relocation mechanic is **not proven** through the current automation path.\n\n`
  + `The next efficient route is a version-matched vanilla client automation path or a focused PrismarineJS protocol fix and independent verification. A blind fleet dependency upgrade is not recommended because the current release reproduces the same failure.\n\n`
  + `Production Minecraft and the production world were never contacted. Zero production blocks or entities changed, and no operation was generated.\n\n`
  + `Audit payload SHA-256: \`${report.auditPayloadSha256}\`\n\n`
  + `Report identity SHA-256: \`${report.reportIdentitySha256}\`\n`;

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, markdown);
process.stdout.write(`${JSON.stringify({
  output: path.relative(ROOT, OUTPUT),
  markdown: path.relative(ROOT, MARKDOWN),
  status: report.status,
  isolatedRuntimeMechanicProven: report.conclusion.isolatedRuntimeMechanicProven,
  productionBlockEditCount: report.safetyBoundary.productionBlockEditCount,
  reportIdentitySha256: report.reportIdentitySha256,
}, null, 2)}\n`);
