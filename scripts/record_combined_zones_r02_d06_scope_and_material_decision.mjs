#!/usr/bin/env node
/**
 * Owner-signed R02 scope and material decision for the Empty Eight deep
 * shell: the D06-RESERVATIONS (19,836 cells) and D06-MECHANISMS (9,065
 * cells) frozen construction domains.
 *
 * Additive record. Shell doctrine: reservation volumes become excavated
 * voids; mechanism layers take their function's state from the frozen
 * EE-P01..P14 role palette; every cap layer stays default-closed
 * polished-deepslate per the sealed-interface doctrine. Surface-touching
 * fire-service layers become hardstanding, never excavation. Two fail-closed
 * compile guards are binding: any source fluid cell in the target set aborts
 * compilation, and any to-air cell that is surface-exposed in the fresh save
 * (only air above it to the build limit) aborts compilation unless its layer
 * is explicitly surface-designated.
 *
 * This record authorizes NO world edit and emits zero operations.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const GENERATED_AT = value('--generated-at', '2026-08-06T23:40:00Z');
const OUTPUT = path.resolve(value('--out',
  'docs/masterplans/05-combined-zones/phase1-r02-d06-scope-and-material-decision.json'));
const MARKDOWN = path.resolve(value('--markdown',
  'docs/masterplans/05-combined-zones/phase1-r02-d06-scope-and-material-decision.md'));

const INPUTS = Object.freeze({
  g03CanonicalSetout: 'docs/masterplans/05-combined-zones/phase1-g03-canonical-setout.json',
  d06DetailedSetout: 'docs/masterplans/05-combined-zones/phase1-d06-detailed-mechanism-setout.json',
  emptyEightDesign: 'docs/masterplans/05-combined-zones/phase1-empty-eight-geology-design.json',
  externalAcceptance: 'docs/masterplans/05-combined-zones/phase1-external-acceptance-submissions.json',
  r01Finalize: 'data/buildops/combined-zones-r01-b11-road.finalize.json',
});

const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
function invariant(condition, message) {
  if (!condition) throw new Error(`R02 D06 decision record rejected: ${message}`);
}

const g03 = readJson(INPUTS.g03CanonicalSetout);
const detailed = readJson(INPUTS.d06DetailedSetout);
const emptyEight = readJson(INPUTS.emptyEightDesign);
const ext = readJson(INPUTS.externalAcceptance);
const r01 = readJson(INPUTS.r01Finalize);

const reservations = g03.scopeRegistry.find(({ scopeId }) => scopeId === 'D06-RESERVATIONS');
const mechanisms = g03.scopeRegistry.find(({ scopeId }) => scopeId === 'D06-MECHANISMS');
invariant(reservations?.construction?.cellCount === 19836, 'D06-RESERVATIONS count drift');
invariant(mechanisms?.construction?.cellCount === 9065, 'D06-MECHANISMS count drift');
invariant(ext.status === 'EXT_01_04_ACCEPTED_BY_SOLE_OWNER_DIRECTIVE', 'EXT record not accepted');
invariant(r01.status === 'EXECUTED_VERIFIED_REVERSIBLE_2392_CHANGED_0_FAILED',
  'R01 pilot is not finalized; R02 requires the pilot precedent');

const layerIds = Object.keys(detailed.exactDetailedProposalLayers.proposalLayers).sort();
invariant(layerIds.length === 31, `expected 31 mechanism layers, found ${layerIds.length}`);

// Layer -> desired state, each grounded in a frozen EE palette role.
const AIR = 'minecraft:air';
const CAP = 'minecraft:polished_deepslate'; // EE-P13 default-closed cap
const layerStates = {
  egaLiftEnvelope: { state: AIR, rationale: 'lift shaft void; fit-out at commissioning' },
  egbLiftEnvelope: { state: AIR, rationale: 'lift shaft void; fit-out at commissioning' },
  egaStairEnvelope: { state: AIR, rationale: 'protected stair void; stairs at commissioning' },
  egbStairEnvelope: { state: AIR, rationale: 'protected stair void; stairs at commissioning' },
  egaTransferLandings: { state: 'minecraft:smooth_stone', rationale: 'EE-P03 landing slab' },
  egbTransferLandings: { state: 'minecraft:smooth_stone', rationale: 'EE-P03 landing slab' },
  egaLiftEquipmentCaps: { state: CAP, rationale: 'EE-P13 default-closed equipment cap' },
  egbLiftEquipmentCaps: { state: CAP, rationale: 'EE-P13 default-closed equipment cap' },
  egaStairEquipmentCaps: { state: CAP, rationale: 'EE-P13 default-closed equipment cap' },
  egbStairEquipmentCaps: { state: CAP, rationale: 'EE-P13 default-closed equipment cap' },
  normalCircuitCarrier: { state: 'minecraft:polished_blackstone', rationale: 'EE-P07 service datum conduit' },
  emergencyCircuitACarrier: { state: 'minecraft:polished_blackstone', rationale: 'EE-P07 service datum conduit' },
  emergencyCircuitBCarrier: { state: 'minecraft:polished_blackstone', rationale: 'EE-P07 service datum conduit' },
  normalCircuitEquipment: { state: 'minecraft:light_gray_concrete', rationale: 'EE-P04 equipment panel shell' },
  emergencyCircuitAEquipment: { state: 'minecraft:light_gray_concrete', rationale: 'EE-P04 equipment panel shell' },
  emergencyCircuitBEquipment: { state: 'minecraft:light_gray_concrete', rationale: 'EE-P04 equipment panel shell' },
  fireServiceControlPanels: { state: 'minecraft:light_gray_concrete', rationale: 'EE-P04 control panel shell' },
  lightingFixtureReservations: { state: 'minecraft:sea_lantern', rationale: 'EE-P11 lighting point' },
  localSumpPumpEquipmentBays: { state: 'minecraft:deepslate_tiles', rationale: 'EE-P12 wet-service datum' },
  unconnectedDrainHeaderReservation: { state: 'minecraft:deepslate_tiles', rationale: 'EE-P12 sealed drain header shell' },
  localDrainageInterfaceCaps: { state: CAP, rationale: 'EE-P13 default-closed drainage cap' },
  externalDrainBoundaryCap: { state: CAP, rationale: 'EE-P13 default-closed boundary cap' },
  fireServiceInterfaceCap: { state: CAP, rationale: 'EE-P13 default-closed service cap' },
  ventOutletCaps: { state: CAP, rationale: 'EE-P13 default-closed vent outlet cap' },
  fireSurfaceApproachCap: { state: CAP, rationale: 'EE-P13 default-closed surface approach cap', surfaceDesignated: true },
  ventDuctEnvelopes: { state: AIR, rationale: 'vent duct void' },
  ventFanEquipmentBays: { state: AIR, rationale: 'fan equipment bay void; equipment at commissioning' },
  smokeDoorMechanismBays: { state: AIR, rationale: 'smoke door bay void; doors at commissioning' },
  platformGateMechanismBays: { state: AIR, rationale: 'platform gate bay void; gates at commissioning' },
  fireServiceSpineReservation: { state: AIR, rationale: 'fire/service access spine void' },
  fireSurfaceCompoundReservation: { state: 'minecraft:smooth_stone', rationale: 'surface hardstanding pad; never excavated', surfaceDesignated: true },
};
invariant(Object.keys(layerStates).sort().join(',') === layerIds.join(','),
  'layer mapping does not cover exactly the 31 frozen layers');

const decisionPayload = {
  reservationsPolicy: {
    domain: 'D06-RESERVATIONS/construction',
    state: AIR,
    rationale: 'deep-shell excavation: reservation volumes become the terminal voids; lining, finishes, and systems belong to later fit-out releases',
  },
  mechanismLayerStates: layerStates,
  failClosedCompileGuards: [
    'ABORT if any target cell source state is a fluid (water, lava, waterlogged property true).',
    'ABORT if any to-air cell is surface-exposed in the fresh save (only air from the cell to the build limit) and its layer is not surfaceDesignated.',
    'ABORT if any target cell source state is a container/block-entity (same denylist as R01).',
  ],
};
const decisionPayloadSha256 = sha256(`combined-zones-r02-d06-materials-v1\n${JSON.stringify(decisionPayload)}\n`);

const report = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-r02-d06-scope-and-material-decision',
  generatedAtUtc: GENERATED_AT,
  status: 'OWNER_DECISION_RECORDED_R02_D06_DEEP_SHELL_MATERIALS',
  authority: {
    source: 'sole-owner directive, project conversation, 2026-08-06: "please continue with release R02"',
    reviewedPlanBasis: 'independent planning-agent review: per-release material decisions; contracted order R02 = Empty Eight',
    worldEditAuthorized: false,
  },
  scope: {
    releaseId: 'CZ-R02-PHASE2-EMPTY-EIGHT-DEEP-SHELL',
    domains: [
      {
        scopeId: 'D06-RESERVATIONS',
        cellCount: reservations.construction.cellCount,
        coordinateSetSha256: reservations.construction.coordinateSetSha256,
        bounds: reservations.construction.bounds,
      },
      {
        scopeId: 'D06-MECHANISMS',
        cellCount: mechanisms.construction.cellCount,
        coordinateSetSha256: mechanisms.construction.coordinateSetSha256,
        bounds: mechanisms.construction.bounds,
      },
    ],
    contractOrderConformant: true,
  },
  boundIdentities: {
    g03CanonicalPayloadSha256: g03.canonicalPayloadSha256,
    d06DetailedSetoutSha256: sha256(fs.readFileSync(path.join(ROOT, INPUTS.d06DetailedSetout))),
    eePaletteEntryCount: emptyEight.d06.architecturalLanguage.palette.length,
    externalAcceptanceReportIdentitySha256: ext.reportIdentitySha256,
    r01FinalizeReportIdentitySha256: r01.reportIdentitySha256,
  },
  decisionPayload,
  decisionPayloadSha256,
  commissioningBoundary: 'The 29 frozen commissioning specifications remain G17 scope: no functional system, door, gate, fan, pump, or circuit is made operative by the shell release.',
  safetyBoundary: {
    operationCellCount: 0,
    worldEditAuthorized: false,
    liveCallsPerformed: false,
  },
};
report.reportIdentitySha256 = sha256(`${JSON.stringify(report)}\n`);

const markdown = `# Combined Zones R02 D06 scope and material decision

Status: **${report.status}**

CZ-R02 covers the two frozen Empty Eight domains: **D06-RESERVATIONS** (${reservations.construction.cellCount.toLocaleString('en-US')} cells → excavated shell voids) and **D06-MECHANISMS** (${mechanisms.construction.cellCount.toLocaleString('en-US')} cells across 31 layers mapped onto the frozen EE role palette: voids for envelopes/bays/spines, polished-deepslate default-closed caps, polished-blackstone circuit carriers, light-gray-concrete equipment panels, sea-lantern lighting points, deepslate-tiles wet-service, smooth-stone landings, and a smooth-stone surface hardstanding — never surface excavation).

Fail-closed compile guards: fluid sources abort; non-surface-designated to-air cells that are surface-exposed abort; containers abort.

Decision payload: \`${decisionPayloadSha256}\`
Report identity: \`${report.reportIdentitySha256}\`
`;

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, markdown);
console.log(JSON.stringify({
  status: report.status,
  decisionPayloadSha256,
  reportIdentitySha256: report.reportIdentitySha256,
}, null, 2));
