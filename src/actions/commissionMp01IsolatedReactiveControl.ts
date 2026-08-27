import { Bot } from 'mineflayer';
import { Vec3 } from 'vec3';

import {
  activateAllowlistedControl,
  type ControlCoordinate,
  type ExpectedControlBlockState,
  type ObservedControlBlockState,
} from './activateAllowlistedControl';
import { type ActionResult } from './types';
import { logger } from '../util/logger';

/**
 * The only production interaction protocol for the retained MP01 indicator.
 *
 * It is intentionally a fixed, two-click commissioning procedure, not a
 * generic control API and not a Voyager-code capability. It neither uses RCON
 * nor changes blocks directly. The sole mutation remains Mineflayer's genuine
 * interaction with the exact floor lever below.
 */
const MP01_CONTROL = {
  actionId: 'MP01-D01-ISOLATED-REACTIVE-CONTROL-COMMISSIONING-01',
  target: { x: 2001, y: 166, z: -902 },
  wire: { x: 2002, y: 166, z: -902 },
  lamp: { x: 2003, y: 166, z: -902 },
  core: [
    { x: 2001, y: 165, z: -902 },
    { x: 2002, y: 165, z: -902 },
    { x: 2003, y: 165, z: -902 },
    { x: 2004, y: 165, z: -902 },
    { x: 2001, y: 166, z: -902 },
    { x: 2002, y: 166, z: -902 },
    { x: 2003, y: 166, z: -902 },
  ] as const,
  staging: [
    { x: 2001, y: 165, z: -899 },
    { x: 2002, y: 165, z: -899 },
    { x: 2003, y: 165, z: -899 },
  ] as const,
} as const;

const OFF_REACTIVE_STATES: readonly ExpectedControlBlockState[] = [
  {
    coordinate: MP01_CONTROL.target,
    name: 'lever',
    properties: { face: 'floor', facing: 'north', powered: false },
  },
  {
    coordinate: MP01_CONTROL.wire,
    name: 'redstone_wire',
    properties: { east: 'side', north: 'none', power: 0, south: 'none', west: 'side' },
  },
  { coordinate: MP01_CONTROL.lamp, name: 'redstone_lamp', properties: { lit: false } },
];

const ON_REACTIVE_STATES: readonly ExpectedControlBlockState[] = [
  {
    coordinate: MP01_CONTROL.target,
    name: 'lever',
    properties: { face: 'floor', facing: 'north', powered: true },
  },
  {
    coordinate: MP01_CONTROL.wire,
    name: 'redstone_wire',
    properties: { east: 'side', north: 'none', power: 15, south: 'none', west: 'side' },
  },
  { coordinate: MP01_CONTROL.lamp, name: 'redstone_lamp', properties: { lit: true } },
];

const STABLE_CORE_STATES: readonly ExpectedControlBlockState[] = MP01_CONTROL.core
  .slice(0, 4)
  .map((coordinate) => ({ coordinate, name: 'polished_blackstone_bricks' }));

export interface Mp01ControlEnvelopeSnapshot {
  phase: 'before_first_interaction' | 'after_first_interaction' | 'before_second_interaction' | 'after_second_interaction';
  core: ObservedControlBlockState[];
  halo: ObservedControlBlockState[];
}

export interface Mp01IsolatedReactiveControlCommissioningData {
  protocolId: typeof MP01_CONTROL.actionId;
  botIdentity: string;
  stagingPosition: ControlCoordinate;
  positionBeforeFirstInteraction: ControlCoordinate;
  positionBeforeSecondInteraction?: ControlCoordinate;
  routeValidation: { passed: boolean; checkedCells: ObservedControlBlockState[] };
  snapshots: Mp01ControlEnvelopeSnapshot[];
  firstInteraction?: Awaited<ReturnType<typeof activateAllowlistedControl>>['data'];
  secondInteraction?: Awaited<ReturnType<typeof activateAllowlistedControl>>['data'];
  abortReason?: string;
}

export type Mp01IsolatedReactiveControlCommissioningResult = ActionResult & {
  data?: Mp01IsolatedReactiveControlCommissioningData;
};

function key({ x, y, z }: ControlCoordinate): string {
  return `${x},${y},${z}`;
}

function clone({ x, y, z }: ControlCoordinate): ControlCoordinate {
  return { x, y, z };
}

function readBlock(bot: Bot, coordinate: ControlCoordinate): ObservedControlBlockState {
  const block = bot.blockAt(new Vec3(coordinate.x, coordinate.y, coordinate.z));
  if (!block) {
    return { coordinate: clone(coordinate), present: false, name: null, stateId: null, metadata: null, properties: {} };
  }
  let rawProperties: unknown = {};
  try {
    rawProperties = block.getProperties();
  } catch {
    // A partial state is recorded and will fail exact checks below.
  }
  const properties: Record<string, string | number | boolean | null> = {};
  if (rawProperties && typeof rawProperties === 'object' && !Array.isArray(rawProperties)) {
    for (const [property, value] of Object.entries(rawProperties)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) {
        properties[property] = value;
      }
    }
  }
  return {
    coordinate: clone(coordinate),
    present: true,
    name: block.name,
    stateId: typeof block.stateId === 'number' ? block.stateId : null,
    metadata: typeof block.metadata === 'number' ? block.metadata : null,
    properties,
  };
}

function haloCoordinates(): ControlCoordinate[] {
  const coreKeys = new Set(MP01_CONTROL.core.map(key));
  const halo = new Map<string, ControlCoordinate>();
  for (const cell of MP01_CONTROL.core) {
    for (const neighbor of [
      { x: cell.x - 1, y: cell.y, z: cell.z }, { x: cell.x + 1, y: cell.y, z: cell.z },
      { x: cell.x, y: cell.y - 1, z: cell.z }, { x: cell.x, y: cell.y + 1, z: cell.z },
      { x: cell.x, y: cell.y, z: cell.z - 1 }, { x: cell.x, y: cell.y, z: cell.z + 1 },
    ]) {
      if (!coreKeys.has(key(neighbor))) halo.set(key(neighbor), neighbor);
    }
  }
  return [...halo.values()].sort((a, b) => a.x - b.x || a.y - b.y || a.z - b.z);
}

const MP01_CONTROL_HALO = haloCoordinates();

function snapshot(bot: Bot, phase: Mp01ControlEnvelopeSnapshot['phase']): Mp01ControlEnvelopeSnapshot {
  return {
    phase,
    core: MP01_CONTROL.core.map((coordinate) => readBlock(bot, coordinate)),
    halo: MP01_CONTROL_HALO.map((coordinate) => readBlock(bot, coordinate)),
  };
}

function stateMatches(actual: ObservedControlBlockState, expected: ExpectedControlBlockState): boolean {
  if (!actual.present || actual.name !== expected.name) return false;
  return Object.entries(expected.properties ?? {}).every(([property, value]) => actual.properties[property] === value);
}

function assertExpectedStates(
  states: readonly ObservedControlBlockState[],
  expected: readonly ExpectedControlBlockState[],
): string | null {
  const stateByCoordinate = new Map(states.map((state) => [key(state.coordinate), state]));
  for (const expectedState of expected) {
    const actual = stateByCoordinate.get(key(expectedState.coordinate));
    if (!actual || !stateMatches(actual, expectedState)) {
      return `exact state drift at ${key(expectedState.coordinate)}; expected ${expectedState.name}`;
    }
  }
  return null;
}

function signature(state: ObservedControlBlockState): string {
  return JSON.stringify({
    present: state.present,
    name: state.name,
    stateId: state.stateId,
    metadata: state.metadata,
    properties: Object.fromEntries(Object.entries(state.properties).sort(([a], [b]) => a.localeCompare(b))),
  });
}

function assertOnlyDeclaredDrift(
  before: Mp01ControlEnvelopeSnapshot,
  after: Mp01ControlEnvelopeSnapshot,
  allowedCoreChanges: readonly ControlCoordinate[],
): string | null {
  const allowed = new Set(allowedCoreChanges.map(key));
  for (const group of ['core', 'halo'] as const) {
    const beforeByCoordinate = new Map(before[group].map((state) => [key(state.coordinate), state]));
    for (const actual of after[group]) {
      const coordinate = key(actual.coordinate);
      if (group === 'core' && allowed.has(coordinate)) continue;
      const prior = beforeByCoordinate.get(coordinate);
      if (!prior || signature(prior) !== signature(actual)) {
        return `undeclared ${group} drift at ${coordinate}`;
      }
    }
  }
  return null;
}

function entityPosition(bot: Bot): ControlCoordinate | null {
  const position = bot.entity?.position;
  if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y) || !Number.isFinite(position.z)) return null;
  return { x: position.x, y: position.y, z: position.z };
}

function selectedStagingPosition(position: ControlCoordinate): ControlCoordinate | null {
  return MP01_CONTROL.staging.find((candidate) => (
    Math.abs(position.x - candidate.x) <= 0.75
    && Math.abs(position.y - candidate.y) <= 0.75
    && Math.abs(position.z - candidate.z) <= 0.75
  )) ?? null;
}

function validateRoute(bot: Bot): { passed: boolean; checkedCells: ObservedControlBlockState[] } {
  const checkedCells: ObservedControlBlockState[] = [];
  for (let x = 2001; x <= 2003; x += 1) {
    for (let z = -899; z >= -901; z -= 1) {
      const floor = readBlock(bot, { x, y: 164, z });
      const feet = readBlock(bot, { x, y: 165, z });
      const head = readBlock(bot, { x, y: 166, z });
      checkedCells.push(floor, feet, head);
      if (floor.name !== 'polished_andesite' || feet.name !== 'air' || head.name !== 'air') {
        return { passed: false, checkedCells };
      }
    }
  }
  return { passed: true, checkedCells };
}

function fail(
  message: string,
  data: Mp01IsolatedReactiveControlCommissioningData,
): Mp01IsolatedReactiveControlCommissioningResult {
  data.abortReason = message;
  logger.warn({ mp01ReactiveControlCommissioning: data, message }, 'MP01 isolated reactive control commissioning aborted');
  return { success: false, message, data };
}

/**
 * Run the one permitted MP01 OFF → ON → OFF interaction proof. The bot must
 * already have been moved by a separately supervised controller to one of the
 * three fixed staging squares; this function performs no arbitrary movement.
 */
export async function commissionMp01IsolatedReactiveControl(
  bot: Bot,
): Promise<Mp01IsolatedReactiveControlCommissioningResult> {
  const positionBeforeFirstInteraction = entityPosition(bot);
  const botIdentity = bot.username?.trim() ?? '';
  if (!botIdentity) {
    return { success: false, message: 'MP01 commissioning requires a live bot identity' };
  }
  if (!positionBeforeFirstInteraction) {
    return { success: false, message: 'MP01 commissioning requires a live bot position' };
  }
  const stagingPosition = selectedStagingPosition(positionBeforeFirstInteraction);
  const data: Mp01IsolatedReactiveControlCommissioningData = {
    protocolId: MP01_CONTROL.actionId,
    botIdentity,
    stagingPosition: stagingPosition ? clone(stagingPosition) : { x: 0, y: 0, z: 0 },
    positionBeforeFirstInteraction,
    routeValidation: { passed: false, checkedCells: [] },
    snapshots: [],
  };
  if (!stagingPosition) {
    return fail('MP01 commissioning bot is not at an allowlisted safe staging position', data);
  }

  data.routeValidation = validateRoute(bot);
  if (!data.routeValidation.passed) {
    return fail('MP01 commissioning route validation failed immediately before interaction', data);
  }

  const beforeFirst = snapshot(bot, 'before_first_interaction');
  data.snapshots.push(beforeFirst);
  const offCoreFailure = assertExpectedStates(beforeFirst.core, [...STABLE_CORE_STATES, ...OFF_REACTIVE_STATES]);
  if (offCoreFailure) return fail(`MP01 commissioning refused before first interaction: ${offCoreFailure}`, data);

  const firstInteraction = await activateAllowlistedControl(bot, {
    actionId: MP01_CONTROL.actionId,
    target: MP01_CONTROL.target,
    allowlistedTargetCoordinates: [MP01_CONTROL.target],
    declaredSignalCoordinates: [MP01_CONTROL.wire],
    declaredOutputCoordinates: [MP01_CONTROL.lamp],
    expectedPreActivation: OFF_REACTIVE_STATES,
    expectedPostActivation: ON_REACTIVE_STATES,
  });
  data.firstInteraction = firstInteraction.data;
  if (!firstInteraction.success) return fail(`MP01 commissioning first interaction failed: ${firstInteraction.message}`, data);

  const afterFirst = snapshot(bot, 'after_first_interaction');
  data.snapshots.push(afterFirst);
  const onCoreFailure = assertExpectedStates(afterFirst.core, [...STABLE_CORE_STATES, ...ON_REACTIVE_STATES]);
  if (onCoreFailure) return fail(`MP01 commissioning first interaction state failed: ${onCoreFailure}`, data);
  const firstDrift = assertOnlyDeclaredDrift(beforeFirst, afterFirst, [MP01_CONTROL.target, MP01_CONTROL.wire, MP01_CONTROL.lamp]);
  if (firstDrift) return fail(`MP01 commissioning first interaction ${firstDrift}`, data);

  const positionBeforeSecondInteraction = entityPosition(bot);
  data.positionBeforeSecondInteraction = positionBeforeSecondInteraction ?? undefined;
  if (!positionBeforeSecondInteraction || !selectedStagingPosition(positionBeforeSecondInteraction)) {
    return fail('MP01 commissioning bot left the allowlisted staging positions before the reset interaction', data);
  }
  data.routeValidation = validateRoute(bot);
  if (!data.routeValidation.passed) return fail('MP01 commissioning route validation failed immediately before reset interaction', data);

  const beforeSecond = snapshot(bot, 'before_second_interaction');
  data.snapshots.push(beforeSecond);
  const preSecondDrift = assertOnlyDeclaredDrift(afterFirst, beforeSecond, []);
  if (preSecondDrift) return fail(`MP01 commissioning ${preSecondDrift} before reset interaction`, data);

  const secondInteraction = await activateAllowlistedControl(bot, {
    actionId: MP01_CONTROL.actionId,
    target: MP01_CONTROL.target,
    allowlistedTargetCoordinates: [MP01_CONTROL.target],
    declaredSignalCoordinates: [MP01_CONTROL.wire],
    declaredOutputCoordinates: [MP01_CONTROL.lamp],
    expectedPreActivation: ON_REACTIVE_STATES,
    expectedPostActivation: OFF_REACTIVE_STATES,
  });
  data.secondInteraction = secondInteraction.data;
  if (!secondInteraction.success) return fail(`MP01 commissioning reset interaction failed: ${secondInteraction.message}`, data);

  const afterSecond = snapshot(bot, 'after_second_interaction');
  data.snapshots.push(afterSecond);
  const resetCoreFailure = assertExpectedStates(afterSecond.core, [...STABLE_CORE_STATES, ...OFF_REACTIVE_STATES]);
  if (resetCoreFailure) return fail(`MP01 commissioning reset state failed: ${resetCoreFailure}`, data);
  const secondDrift = assertOnlyDeclaredDrift(beforeSecond, afterSecond, [MP01_CONTROL.target, MP01_CONTROL.wire, MP01_CONTROL.lamp]);
  if (secondDrift) return fail(`MP01 commissioning reset interaction ${secondDrift}`, data);
  const recoveryDrift = assertOnlyDeclaredDrift(beforeFirst, afterSecond, []);
  if (recoveryDrift) return fail(`MP01 commissioning failed to recover exact OFF envelope: ${recoveryDrift}`, data);

  logger.info({ mp01ReactiveControlCommissioning: data }, 'MP01 isolated reactive control commissioning completed');
  return {
    success: true,
    message: 'MP01 isolated reactive control completed genuine OFF → ON → OFF interaction with exact envelope recovery',
    data,
  };
}
