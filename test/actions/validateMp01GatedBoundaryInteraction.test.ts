import { describe, expect, it } from 'vitest';

import type { ControlCoordinate, ObservedControlBlockState } from '../../src/actions/activateAllowlistedControl';
import {
  validateMp01GatedBoundaryInteractionTrace,
  type Mp01GatedBoundaryGateMode,
  type Mp01GatedBoundaryInteractionTrace,
} from '../../src/actions/validateMp01GatedBoundaryInteraction';

const WEST_LOWER = { x: 2006, y: 166, z: -894 };
const WEST_UPPER = { x: 2006, y: 167, z: -894 };
const EAST_LOWER = { x: 2008, y: 166, z: -894 };
const EAST_UPPER = { x: 2008, y: 167, z: -894 };

function door(coordinate: ControlCoordinate, open: boolean): ObservedControlBlockState {
  return {
    coordinate,
    present: true,
    name: 'spruce_door',
    stateId: null,
    metadata: null,
    properties: {
      facing: 'west',
      hinge: 'left',
      half: coordinate.y === 166 ? 'lower' : 'upper',
      powered: false,
      open,
    },
  };
}

function observedDoors(mode: Mp01GatedBoundaryGateMode): ObservedControlBlockState[] {
  return [
    door(WEST_LOWER, mode === 'west_open'), door(WEST_UPPER, mode === 'west_open'),
    door(EAST_LOWER, mode === 'east_open'), door(EAST_UPPER, mode === 'east_open'),
  ];
}

function validTrace(): Mp01GatedBoundaryInteractionTrace {
  const interactions: Mp01GatedBoundaryInteractionTrace['interactions'] = [
    { id: 'outbound-west-open', sequence: 1, leaf: 'west', transition: 'open', direction: 'outbound', activationMethod: 'mineflayer.activateBlock', target: WEST_LOWER, actorFeet: { x: 2005, y: 165, z: -894 } },
    { id: 'outbound-west-close', sequence: 2, leaf: 'west', transition: 'close', direction: 'outbound', activationMethod: 'mineflayer.activateBlock', target: WEST_LOWER, actorFeet: { x: 2007, y: 166, z: -894 } },
    { id: 'outbound-east-open', sequence: 3, leaf: 'east', transition: 'open', direction: 'outbound', activationMethod: 'mineflayer.activateBlock', target: EAST_LOWER, actorFeet: { x: 2007, y: 166, z: -894 } },
    { id: 'outbound-east-close', sequence: 4, leaf: 'east', transition: 'close', direction: 'outbound', activationMethod: 'mineflayer.activateBlock', target: EAST_LOWER, actorFeet: { x: 2009, y: 166, z: -894 } },
    { id: 'return-east-open', sequence: 5, leaf: 'east', transition: 'open', direction: 'return', activationMethod: 'mineflayer.activateBlock', target: EAST_LOWER, actorFeet: { x: 2009, y: 166, z: -894 } },
    { id: 'return-east-close', sequence: 6, leaf: 'east', transition: 'close', direction: 'return', activationMethod: 'mineflayer.activateBlock', target: EAST_LOWER, actorFeet: { x: 2007, y: 166, z: -894 } },
    { id: 'return-west-open', sequence: 7, leaf: 'west', transition: 'open', direction: 'return', activationMethod: 'mineflayer.activateBlock', target: WEST_LOWER, actorFeet: { x: 2007, y: 166, z: -894 } },
    { id: 'return-west-close', sequence: 8, leaf: 'west', transition: 'close', direction: 'return', activationMethod: 'mineflayer.activateBlock', target: WEST_LOWER, actorFeet: { x: 2005, y: 165, z: -894 } },
  ];
  const observations = interactions.flatMap((interaction) => {
    const gateMode: Mp01GatedBoundaryGateMode = interaction.transition === 'close'
      ? 'both_closed' : interaction.leaf === 'west' ? 'west_open' : 'east_open';
    return ([1, 2] as const).map((settledWindow) => ({
      id: `${interaction.id}-settled-${settledWindow}`,
      afterInteractionId: interaction.id,
      settledWindow,
      gateMode,
      doorStates: observedDoors(gateMode),
    }));
  });
  return {
    protocolId: 'MP01-DIRECT-LAMP-EAST-SEQUENTIAL-GATED-PATH-01',
    evidenceMode: 'mineflayer-live-interaction-trace',
    designIdentitySha256: 'a'.repeat(64),
    runtimeAttestation: {
      botIdentity: 'MP01RestrictedCommissioner',
      capturedAtUtc: '2026-08-28T04:30:00.000Z',
      immutablePostCaptureManifestSha256: 'b'.repeat(64),
      evidenceReference: 'immutable-post-capture-to-be-independently-reviewed',
    },
    interactions,
    observations,
  };
}

describe('MP01 gated sequential boundary interaction validator', () => {
  it('accepts only a complete one-leaf-at-a-time OFF/ON/OFF trace but never declares live acceptance', () => {
    const result = validateMp01GatedBoundaryInteractionTrace(validTrace());
    expect(result).toMatchObject({
      status: 'VALID_TRACE_REQUIRES_INDEPENDENT_LIVE_ATTESTATION',
      valid: true,
      liveAcceptance: false,
      errors: [],
    });
    expect(result.requiredNextEvidence).toContain('independent review of the referenced immutable post-interaction capture');
  });

  it('rejects a both-open state even when the submitted mode label tries to hide it', () => {
    const trace = validTrace();
    const observation = trace.observations.find(({ id }) => id === 'outbound-west-open-settled-1');
    if (!observation) throw new Error('fixture lacks west-open observation');
    observation.doorStates = observedDoors('west_open').map((state) => (
      state.coordinate.x === 2008 ? { ...state, properties: { ...state.properties, open: true } } : state
    ));
    const result = validateMp01GatedBoundaryInteractionTrace(trace);
    expect(result.status).toBe('REJECTED_GATED_BOUNDARY_INTERACTION_TRACE');
    expect(result.errors.join('\n')).toMatch(/open=false/);
  });

  it('rejects a state-write surrogate and an incomplete reset sequence', () => {
    const trace = validTrace();
    trace.interactions[0].activationMethod = 'rcon.setblock' as unknown as 'mineflayer.activateBlock';
    trace.interactions.splice(-1, 1);
    trace.observations = trace.observations.filter(({ afterInteractionId }) => afterInteractionId !== 'return-west-close');
    const result = validateMp01GatedBoundaryInteractionTrace(trace);
    expect(result.status).toBe('REJECTED_GATED_BOUNDARY_INTERACTION_TRACE');
    expect(result.errors.join('\n')).toMatch(/not a genuine Mineflayer activateBlock event/);
    expect(result.errors.join('\n')).toMatch(/expected 8 genuine click interactions/);
  });
});
