import type { ControlCoordinate, ObservedControlBlockState } from './activateAllowlistedControl';

export type Mp01GatedBoundaryLeaf = 'west' | 'east';
export type Mp01GatedBoundaryGateMode = 'both_closed' | 'west_open' | 'east_open';
export type Mp01GatedBoundaryDirection = 'outbound' | 'return';

export interface Mp01GatedBoundaryInteraction {
  id: string;
  sequence: number;
  leaf: Mp01GatedBoundaryLeaf;
  transition: 'open' | 'close';
  direction: Mp01GatedBoundaryDirection;
  activationMethod: 'mineflayer.activateBlock';
  target: ControlCoordinate;
  actorFeet: ControlCoordinate;
}

export interface Mp01GatedBoundaryObservation {
  id: string;
  afterInteractionId: string;
  settledWindow: 1 | 2;
  gateMode: Mp01GatedBoundaryGateMode;
  doorStates: ObservedControlBlockState[];
}

export interface Mp01GatedBoundaryRuntimeAttestation {
  botIdentity: string;
  capturedAtUtc: string;
  immutablePostCaptureManifestSha256: string;
  evidenceReference: string;
}

/**
 * This type represents submitted evidence, not proof that a live interaction
 * occurred. The validator only checks that a submitted Mineflayer trace has
 * the exact state/ordering required before an independent live reviewer can
 * use the referenced immutable capture.
 */
export interface Mp01GatedBoundaryInteractionTrace {
  protocolId: 'MP01-DIRECT-LAMP-EAST-SEQUENTIAL-GATED-PATH-01';
  evidenceMode: 'mineflayer-live-interaction-trace';
  designIdentitySha256: string;
  runtimeAttestation: Mp01GatedBoundaryRuntimeAttestation;
  interactions: Mp01GatedBoundaryInteraction[];
  observations: Mp01GatedBoundaryObservation[];
}

export interface Mp01GatedBoundaryInteractionValidation {
  status: 'VALID_TRACE_REQUIRES_INDEPENDENT_LIVE_ATTESTATION' | 'REJECTED_GATED_BOUNDARY_INTERACTION_TRACE';
  valid: boolean;
  /** Never true here: only an independently reviewed immutable capture can be live acceptance. */
  liveAcceptance: false;
  errors: string[];
  requiredNextEvidence: string[];
}

const PROTOCOL_ID = 'MP01-DIRECT-LAMP-EAST-SEQUENTIAL-GATED-PATH-01' as const;
const HASH = /^[a-f0-9]{64}$/;
const WEST_LOWER = { x: 2006, y: 166, z: -894 };
const WEST_UPPER = { x: 2006, y: 167, z: -894 };
const EAST_LOWER = { x: 2008, y: 166, z: -894 };
const EAST_UPPER = { x: 2008, y: 167, z: -894 };

const LEAF_CELLS: Record<Mp01GatedBoundaryLeaf, readonly ControlCoordinate[]> = {
  west: [WEST_LOWER, WEST_UPPER],
  east: [EAST_LOWER, EAST_UPPER],
};

const EXPECTED_INTERACTIONS: readonly Omit<Mp01GatedBoundaryInteraction, 'activationMethod'>[] = [
  { id: 'outbound-west-open', sequence: 1, leaf: 'west', transition: 'open', direction: 'outbound', target: WEST_LOWER, actorFeet: { x: 2005, y: 165, z: -894 } },
  { id: 'outbound-west-close', sequence: 2, leaf: 'west', transition: 'close', direction: 'outbound', target: WEST_LOWER, actorFeet: { x: 2007, y: 166, z: -894 } },
  { id: 'outbound-east-open', sequence: 3, leaf: 'east', transition: 'open', direction: 'outbound', target: EAST_LOWER, actorFeet: { x: 2007, y: 166, z: -894 } },
  { id: 'outbound-east-close', sequence: 4, leaf: 'east', transition: 'close', direction: 'outbound', target: EAST_LOWER, actorFeet: { x: 2009, y: 166, z: -894 } },
  { id: 'return-east-open', sequence: 5, leaf: 'east', transition: 'open', direction: 'return', target: EAST_LOWER, actorFeet: { x: 2009, y: 166, z: -894 } },
  { id: 'return-east-close', sequence: 6, leaf: 'east', transition: 'close', direction: 'return', target: EAST_LOWER, actorFeet: { x: 2007, y: 166, z: -894 } },
  { id: 'return-west-open', sequence: 7, leaf: 'west', transition: 'open', direction: 'return', target: WEST_LOWER, actorFeet: { x: 2007, y: 166, z: -894 } },
  { id: 'return-west-close', sequence: 8, leaf: 'west', transition: 'close', direction: 'return', target: WEST_LOWER, actorFeet: { x: 2005, y: 165, z: -894 } },
];

function coordinateKey(coordinate: ControlCoordinate): string {
  return `${coordinate.x},${coordinate.y},${coordinate.z}`;
}

function sameCoordinate(left: ControlCoordinate, right: ControlCoordinate): boolean {
  return left.x === right.x && left.y === right.y && left.z === right.z;
}

function expectedMode(interaction: Mp01GatedBoundaryInteraction): Mp01GatedBoundaryGateMode {
  if (interaction.transition === 'close') return 'both_closed';
  return interaction.leaf === 'west' ? 'west_open' : 'east_open';
}

function expectedOpen(leaf: Mp01GatedBoundaryLeaf, mode: Mp01GatedBoundaryGateMode): boolean {
  return mode === `${leaf}_open`;
}

function validateDoorState(
  actual: ObservedControlBlockState | undefined,
  coordinate: ControlCoordinate,
  expectedOpenState: boolean,
  errors: string[],
): void {
  const label = coordinateKey(coordinate);
  if (!actual) {
    errors.push(`missing observed door state at ${label}`);
    return;
  }
  if (!actual.present || actual.name !== 'spruce_door') {
    errors.push(`door state at ${label} is not present spruce_door`);
    return;
  }
  const expectedHalf = coordinate.y === 166 ? 'lower' : 'upper';
  const properties = actual.properties;
  if (properties.facing !== 'west' || properties.hinge !== 'left' || properties.half !== expectedHalf
    || properties.powered !== false || properties.open !== expectedOpenState) {
    errors.push(`door state drift at ${label}; expected west/left/${expectedHalf}/powered=false/open=${expectedOpenState}`);
  }
}

function validateObservation(
  observation: Mp01GatedBoundaryObservation | undefined,
  interaction: Mp01GatedBoundaryInteraction,
  settledWindow: 1 | 2,
  errors: string[],
): void {
  const expectedId = `${interaction.id}-settled-${settledWindow}`;
  if (!observation) {
    errors.push(`missing settled observation ${expectedId}`);
    return;
  }
  if (observation.id !== expectedId || observation.afterInteractionId !== interaction.id || observation.settledWindow !== settledWindow) {
    errors.push(`observation ${expectedId} has mismatched identity or settled window`);
  }
  const mode = expectedMode(interaction);
  if (observation.gateMode !== mode) errors.push(`observation ${expectedId} gateMode must be ${mode}`);
  const byCoordinate = new Map(observation.doorStates.map((state) => [coordinateKey(state.coordinate), state]));
  for (const leaf of ['west', 'east'] as const) {
    for (const coordinate of LEAF_CELLS[leaf]) {
      validateDoorState(byCoordinate.get(coordinateKey(coordinate)), coordinate, expectedOpen(leaf, mode), errors);
    }
  }
  if (observation.gateMode === 'both_closed') return;
  if (observation.gateMode === 'west_open' && !expectedOpen('west', mode)) errors.push(`observation ${expectedId} claims a prohibited west state`);
  if (observation.gateMode === 'east_open' && !expectedOpen('east', mode)) errors.push(`observation ${expectedId} claims a prohibited east state`);
}

function validateRuntimeAttestation(attestation: Mp01GatedBoundaryRuntimeAttestation | undefined, errors: string[]): void {
  if (!attestation) {
    errors.push('runtime attestation is missing');
    return;
  }
  if (!attestation.botIdentity.trim()) errors.push('runtime attestation bot identity is missing');
  if (!Number.isFinite(Date.parse(attestation.capturedAtUtc))) errors.push('runtime attestation capturedAtUtc is invalid');
  if (!HASH.test(attestation.immutablePostCaptureManifestSha256)) errors.push('runtime attestation immutable post capture SHA-256 is invalid');
  if (!attestation.evidenceReference.trim()) errors.push('runtime attestation evidence reference is missing');
}

/**
 * Validate the two one-leaf-at-a-time OFF → ON → OFF interaction sequences.
 * Calling this function never reaches Mineflayer, Minecraft, RCON, or a world
 * file, and a passing result intentionally remains short of live acceptance.
 */
export function validateMp01GatedBoundaryInteractionTrace(
  trace: Mp01GatedBoundaryInteractionTrace,
): Mp01GatedBoundaryInteractionValidation {
  const errors: string[] = [];
  if (trace.protocolId !== PROTOCOL_ID) errors.push(`protocolId must be ${PROTOCOL_ID}`);
  if (trace.evidenceMode !== 'mineflayer-live-interaction-trace') errors.push('evidenceMode must identify a Mineflayer live interaction trace');
  if (!HASH.test(trace.designIdentitySha256)) errors.push('design identity SHA-256 is invalid');
  validateRuntimeAttestation(trace.runtimeAttestation, errors);

  const interactions = trace.interactions ?? [];
  if (interactions.length !== EXPECTED_INTERACTIONS.length) errors.push(`expected ${EXPECTED_INTERACTIONS.length} genuine click interactions, got ${interactions.length}`);
  for (const expected of EXPECTED_INTERACTIONS) {
    const actual = interactions.find((interaction) => interaction.sequence === expected.sequence);
    if (!actual) {
      errors.push(`missing interaction sequence ${expected.sequence} (${expected.id})`);
      continue;
    }
    if (actual.id !== expected.id || actual.leaf !== expected.leaf || actual.transition !== expected.transition
      || actual.direction !== expected.direction || !sameCoordinate(actual.target, expected.target)
      || !sameCoordinate(actual.actorFeet, expected.actorFeet)) {
      errors.push(`interaction sequence ${expected.sequence} does not match the exact restricted gate procedure`);
    }
    if (actual.activationMethod !== 'mineflayer.activateBlock') {
      errors.push(`interaction ${expected.id} is not a genuine Mineflayer activateBlock event`);
    }
    const matchingObservations = (trace.observations ?? []).filter((observation) => observation.afterInteractionId === actual.id);
    for (const settledWindow of [1, 2] as const) {
      validateObservation(matchingObservations.find((observation) => observation.settledWindow === settledWindow), actual, settledWindow, errors);
    }
  }
  for (const observation of trace.observations ?? []) {
    if (observation.gateMode !== 'both_closed' && observation.gateMode !== 'west_open' && observation.gateMode !== 'east_open') {
      errors.push(`observation ${observation.id} contains a prohibited both-open or unknown gate mode`);
    }
  }

  return {
    status: errors.length ? 'REJECTED_GATED_BOUNDARY_INTERACTION_TRACE' : 'VALID_TRACE_REQUIRES_INDEPENDENT_LIVE_ATTESTATION',
    valid: errors.length === 0,
    liveAcceptance: false,
    errors,
    requiredNextEvidence: [
      'independent review of the referenced immutable post-interaction capture',
      'fresh source/post and rollback preflights for the static four-door package',
      'a full owner-bound origin-to-service and distinct recovery route contract',
      'fresh live entity and checkpoint gates before any supervised movement',
    ],
  };
}

export const MP01_GATED_BOUNDARY_INTERACTION_PROTOCOL_ID = PROTOCOL_ID;
