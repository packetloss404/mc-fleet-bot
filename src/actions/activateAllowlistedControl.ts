import { Bot } from 'mineflayer';
import { Vec3 } from 'vec3';
import { logger } from '../util/logger';
import { ActionResult } from './types';

/** A world coordinate that is deliberately exact, rather than a search area. */
export interface ControlCoordinate {
  x: number;
  y: number;
  z: number;
}

/**
 * A lossless-enough, JSON-safe record of a block state for an interaction
 * audit. `properties` carries such things as lever `powered`, wire `power`,
 * and lamp `lit`; `stateId` preserves the game's complete palette state too.
 */
export interface ObservedControlBlockState {
  coordinate: ControlCoordinate;
  present: boolean;
  name: string | null;
  stateId: number | null;
  metadata: number | null;
  properties: Record<string, string | number | boolean | null>;
}

export interface ControlStateObservation {
  phase: 'before_activation' | 'after_first_normal_tick_window' | 'after_second_normal_tick_window';
  target: ObservedControlBlockState;
  signals: ObservedControlBlockState[];
  outputs: ObservedControlBlockState[];
}

/** Exact expected state used by a supervised commissioning test. */
export interface ExpectedControlBlockState {
  coordinate: ControlCoordinate;
  name: string;
  properties?: Record<string, string | number | boolean | null>;
}

/**
 * Contract for a single isolated control activation.
 *
 * This is intentionally narrower than Mineflayer's `activateBlock`: the
 * only activatable block is a lever, and its coordinate has to be listed
 * exactly in `allowlistedTargetCoordinates`. The action neither moves, digs,
 * places, equips, chats, nor opens containers.
 */
export interface AllowlistedControlActivation {
  /** Stable release/commissioning identifier included in the audit result. */
  actionId: string;
  target: ControlCoordinate;
  allowlistedTargetCoordinates: readonly ControlCoordinate[];
  declaredSignalCoordinates: readonly ControlCoordinate[];
  declaredOutputCoordinates: readonly ControlCoordinate[];
  /** Defaults to two normal game ticks; bounded to prevent a hidden delay loop. */
  normalTickWait?: number;
  /**
   * Exact state assertions that must hold immediately before the click.
   * A controlled interaction is never allowed to "discover" a changed
   * topology by clicking it first.
   */
  expectedPreActivation: readonly ExpectedControlBlockState[];
  /** Optional exact end-state assertions, checked at both post-tick reads. */
  expectedPostActivation?: readonly ExpectedControlBlockState[];
}

export interface AllowlistedControlActivationData {
  actionId: string;
  target: ControlCoordinate;
  allowedTargetCoordinates: ControlCoordinate[];
  declaredSignalCoordinates: ControlCoordinate[];
  declaredOutputCoordinates: ControlCoordinate[];
  normalTickWait: number;
  activationMethod: 'mineflayer.activateBlock';
  observations: ControlStateObservation[];
  expectedPreActivation: ExpectedControlBlockState[];
  expectedPostActivation: ExpectedControlBlockState[];
  expectationFailures: string[];
}

export type AllowlistedControlActivationResult = ActionResult & {
  data?: AllowlistedControlActivationData;
};

const MAX_CONTROL_INTERACTION_DISTANCE = 4.5;
const NORMAL_TICK_WAIT = 2;

function isExactCoordinate(value: ControlCoordinate): boolean {
  return Number.isInteger(value.x) && Number.isInteger(value.y) && Number.isInteger(value.z);
}

function coordinateKey(value: ControlCoordinate): string {
  return `${value.x},${value.y},${value.z}`;
}

function sameCoordinate(a: ControlCoordinate, b: ControlCoordinate): boolean {
  return a.x === b.x && a.y === b.y && a.z === b.z;
}

function cloneCoordinate(value: ControlCoordinate): ControlCoordinate {
  return { x: value.x, y: value.y, z: value.z };
}

function coordinatesAreDistinct(coordinates: readonly ControlCoordinate[]): boolean {
  return new Set(coordinates.map(coordinateKey)).size === coordinates.length;
}

function normalizeProperties(value: unknown): Record<string, string | number | boolean | null> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const properties: Record<string, string | number | boolean | null> = {};
  for (const [key, property] of Object.entries(value as Record<string, unknown>)) {
    if (
      typeof property === 'string'
      || typeof property === 'number'
      || typeof property === 'boolean'
      || property === null
    ) {
      properties[key] = property;
    }
  }
  return properties;
}

function observeControlBlock(bot: Bot, coordinate: ControlCoordinate): ObservedControlBlockState {
  const block = bot.blockAt(new Vec3(coordinate.x, coordinate.y, coordinate.z));
  if (!block) {
    return {
      coordinate: cloneCoordinate(coordinate),
      present: false,
      name: null,
      stateId: null,
      metadata: null,
      properties: {},
    };
  }

  let rawProperties: unknown = {};
  try {
    rawProperties = block.getProperties();
  } catch {
    // An unloaded/partially decoded state is still recorded explicitly rather
    // than being silently treated as an expected state.
  }

  return {
    coordinate: cloneCoordinate(coordinate),
    present: true,
    name: block.name,
    stateId: typeof block.stateId === 'number' ? block.stateId : null,
    metadata: typeof block.metadata === 'number' ? block.metadata : null,
    properties: normalizeProperties(rawProperties),
  };
}

function observeAll(
  bot: Bot,
  phase: ControlStateObservation['phase'],
  target: ControlCoordinate,
  signals: readonly ControlCoordinate[],
  outputs: readonly ControlCoordinate[],
): ControlStateObservation {
  return {
    phase,
    target: observeControlBlock(bot, target),
    signals: signals.map((coordinate) => observeControlBlock(bot, coordinate)),
    outputs: outputs.map((coordinate) => observeControlBlock(bot, coordinate)),
  };
}

function matchingExpectation(
  observation: ControlStateObservation,
  expected: ExpectedControlBlockState,
): ObservedControlBlockState | undefined {
  if (sameCoordinate(observation.target.coordinate, expected.coordinate)) return observation.target;
  return [...observation.signals, ...observation.outputs]
    .find((state) => sameCoordinate(state.coordinate, expected.coordinate));
}

function validateExpectedStates(
  observation: ControlStateObservation,
  expectedStates: readonly ExpectedControlBlockState[],
): string[] {
  const failures: string[] = [];
  for (const expected of expectedStates) {
    const actual = matchingExpectation(observation, expected);
    const position = coordinateKey(expected.coordinate);
    if (!actual) {
      failures.push(`${observation.phase}: expected coordinate ${position} was not declared`);
      continue;
    }
    if (!actual.present || actual.name !== expected.name) {
      failures.push(`${observation.phase}: ${position} expected ${expected.name}, observed ${actual.name ?? 'unloaded'}`);
      continue;
    }
    for (const [property, expectedValue] of Object.entries(expected.properties ?? {})) {
      if (actual.properties[property] !== expectedValue) {
        failures.push(
          `${observation.phase}: ${position} ${property} expected ${String(expectedValue)}, observed ${String(actual.properties[property])}`,
        );
      }
    }
  }
  return failures;
}

function fail(
  message: string,
  data?: AllowlistedControlActivationData,
): AllowlistedControlActivationResult {
  if (data) {
    logger.warn({ controlActivation: data, message }, 'Allowlisted control activation refused or failed');
  } else {
    logger.warn({ message }, 'Allowlisted control activation refused or failed');
  }
  return { success: false, message, data };
}

/**
 * Activates exactly one allowlisted lever and records the target, declared
 * signal cells, and declared output cells before the interaction and after
 * two separate normal-tick observation windows.
 *
 * This action is for reviewed, isolated commissioning tests. It deliberately
 * is not exported into the free-form Voyager code sandbox: callers must own
 * and provide the exact coordinate allowlist and output contract.
 */
export async function activateAllowlistedControl(
  bot: Bot,
  request: AllowlistedControlActivation,
): Promise<AllowlistedControlActivationResult> {
  const allDeclaredCoordinates = [
    ...request.allowlistedTargetCoordinates,
    ...request.declaredSignalCoordinates,
    ...request.declaredOutputCoordinates,
  ];
  const normalTickWait = request.normalTickWait ?? NORMAL_TICK_WAIT;

  if (!request.actionId || !request.actionId.trim()) {
    return fail('activateAllowlistedControl requires a non-empty actionId');
  }
  if (!isExactCoordinate(request.target) || !allDeclaredCoordinates.every(isExactCoordinate)) {
    return fail('activateAllowlistedControl requires integer target, allowlist, signal, and output coordinates');
  }
  if (!Number.isInteger(normalTickWait) || normalTickWait < 1 || normalTickWait > 20) {
    return fail('activateAllowlistedControl normalTickWait must be an integer from 1 through 20');
  }
  if (request.allowlistedTargetCoordinates.length === 0) {
    return fail('activateAllowlistedControl requires a non-empty target coordinate allowlist');
  }
  if (request.declaredSignalCoordinates.length === 0 || request.declaredOutputCoordinates.length === 0) {
    return fail('activateAllowlistedControl requires at least one declared signal and output coordinate');
  }
  if (!coordinatesAreDistinct(allDeclaredCoordinates)) {
    return fail('activateAllowlistedControl requires distinct allowlist, signal, and output coordinates');
  }
  if (!request.allowlistedTargetCoordinates.some((coordinate) => sameCoordinate(coordinate, request.target))) {
    return fail(`activateAllowlistedControl target (${coordinateKey(request.target)}) is not allowlisted`);
  }
  const expectedPreActivation = request.expectedPreActivation ?? [];
  const expectedPostActivation = request.expectedPostActivation ?? [];
  const expectedStates = [...expectedPreActivation, ...expectedPostActivation];
  if (expectedStates.some((expected) => !isExactCoordinate(expected.coordinate))) {
    return fail('activateAllowlistedControl expected states require integer coordinates');
  }
  const observableCoordinateKeys = new Set([
    coordinateKey(request.target),
    ...request.declaredSignalCoordinates.map(coordinateKey),
    ...request.declaredOutputCoordinates.map(coordinateKey),
  ]);
  if (expectedPreActivation.length === 0) {
    return fail('activateAllowlistedControl requires exact expected pre-activation states');
  }
  if (!coordinatesAreDistinct(expectedPreActivation.map((expected) => expected.coordinate))) {
    return fail('activateAllowlistedControl expected pre-activation states must not duplicate a coordinate');
  }
  if (!coordinatesAreDistinct(expectedPostActivation.map((expected) => expected.coordinate))) {
    return fail('activateAllowlistedControl expected post-activation states must not duplicate a coordinate');
  }
  if (expectedStates.some((expected) => !expected.name || !expected.name.trim())) {
    return fail('activateAllowlistedControl expected states require non-empty block names');
  }
  if (expectedStates.some((expected) => !observableCoordinateKeys.has(coordinateKey(expected.coordinate)))) {
    return fail('activateAllowlistedControl expected states may only reference the target or declared signal/output coordinates');
  }

  const data: AllowlistedControlActivationData = {
    actionId: request.actionId,
    target: cloneCoordinate(request.target),
    allowedTargetCoordinates: request.allowlistedTargetCoordinates.map(cloneCoordinate),
    declaredSignalCoordinates: request.declaredSignalCoordinates.map(cloneCoordinate),
    declaredOutputCoordinates: request.declaredOutputCoordinates.map(cloneCoordinate),
    normalTickWait,
    activationMethod: 'mineflayer.activateBlock',
    observations: [],
    expectedPreActivation: expectedPreActivation.map((expected) => ({
      coordinate: cloneCoordinate(expected.coordinate),
      name: expected.name,
      properties: expected.properties ? { ...expected.properties } : undefined,
    })),
    expectedPostActivation: expectedPostActivation.map((expected) => ({
      coordinate: cloneCoordinate(expected.coordinate),
      name: expected.name,
      properties: expected.properties ? { ...expected.properties } : undefined,
    })),
    expectationFailures: [],
  };

  const targetBlock = bot.blockAt(new Vec3(request.target.x, request.target.y, request.target.z));
  if (!targetBlock) {
    return fail(`activateAllowlistedControl target (${coordinateKey(request.target)}) is not loaded`, data);
  }
  // Restrict the capability to levers. Buttons, doors, containers, command
  // blocks, and arbitrary right-click blocks are intentionally out of scope.
  if (targetBlock.name !== 'lever') {
    return fail(
      `activateAllowlistedControl only permits an exact lever target; observed ${targetBlock.name} at (${coordinateKey(request.target)})`,
      data,
    );
  }
  if (!bot.entity?.position) {
    return fail('activateAllowlistedControl bot has no live entity position', data);
  }
  if (bot.entity.position.distanceTo(targetBlock.position) > MAX_CONTROL_INTERACTION_DISTANCE) {
    return fail(
      `activateAllowlistedControl target (${coordinateKey(request.target)}) is beyond the ${MAX_CONTROL_INTERACTION_DISTANCE}-block interaction range`,
      data,
    );
  }

  const preActivation = observeAll(
    bot,
    'before_activation',
    request.target,
    request.declaredSignalCoordinates,
    request.declaredOutputCoordinates,
  );
  data.observations.push(preActivation);
  const preActivationFailures = validateExpectedStates(preActivation, data.expectedPreActivation);
  if (preActivationFailures.length > 0) {
    data.expectationFailures.push(...preActivationFailures);
    return fail(
      `activateAllowlistedControl refused before interaction because exact pre-activation assertions failed: ${preActivationFailures.join('; ')}`,
      data,
    );
  }

  try {
    await bot.activateBlock(targetBlock);
  } catch (error: unknown) {
    return fail(
      `activateAllowlistedControl failed to activate (${coordinateKey(request.target)}): ${error instanceof Error ? error.message : String(error)}`,
      data,
    );
  }

  try {
    await bot.waitForTicks(normalTickWait);
    const firstPost = observeAll(
      bot,
      'after_first_normal_tick_window',
      request.target,
      request.declaredSignalCoordinates,
      request.declaredOutputCoordinates,
    );
    data.observations.push(firstPost);

    await bot.waitForTicks(normalTickWait);
    const secondPost = observeAll(
      bot,
      'after_second_normal_tick_window',
      request.target,
      request.declaredSignalCoordinates,
      request.declaredOutputCoordinates,
    );
    data.observations.push(secondPost);

    data.expectationFailures.push(
      ...validateExpectedStates(firstPost, data.expectedPostActivation),
      ...validateExpectedStates(secondPost, data.expectedPostActivation),
    );
  } catch (error: unknown) {
    return fail(
      `activateAllowlistedControl could not complete both normal-tick observations: ${error instanceof Error ? error.message : String(error)}`,
      data,
    );
  }

  if (data.expectationFailures.length > 0) {
    return fail(
      `activateAllowlistedControl completed but exact post-activation assertions failed: ${data.expectationFailures.join('; ')}`,
      data,
    );
  }

  logger.info({ controlActivation: data }, 'Allowlisted control activation completed');
  return {
    success: true,
    message: `Activated allowlisted lever at (${coordinateKey(request.target)}) and captured two post-tick state observations`,
    data,
  };
}
