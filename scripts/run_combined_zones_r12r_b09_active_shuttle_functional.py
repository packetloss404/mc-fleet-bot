#!/usr/bin/env python3
"""Guarded functional proof for the bounded R12R B09 active shuttle.

The default is a deterministic no-RCON plan. Explicit execution accepts only
the UUID captured by the frozen tagged-minecart executor. Every exit path
attempts to leave the two declared controls OFF and proves all 15 powered rails
unpowered. Entity removal is deliberately outside this helper and belongs to
the composed transaction coordinator.
"""

import argparse
import hashlib
import json
import os
import re
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import run_guarded_tagged_minecart_transaction as entity_kernel  # noqa: E402


TRANSACTION_ID = 'combined-zones-r12r-b09-bounded-active-shuttle'
TAG = 'cz_r12_7464210e11d51e28eb4e133e2d40fd0b'
CONTROL_X = (2061, 2070)
RAIL_X = tuple(range(2058, 2073))
Y = 130
RAIL_Z = -748
CONTROL_Z = -747
LEVER_OFF = 'minecraft:lever[face=wall,facing=north,powered=false]'
LEVER_ON = 'minecraft:lever[face=wall,facing=north,powered=true]'
RAIL_OFF = 'minecraft:powered_rail[powered=false,shape=east_west,waterlogged=false]'
RAIL_ON = 'minecraft:powered_rail[powered=true,shape=east_west,waterlogged=false]'
POS_RE = entity_kernel.POS_RE
MOTION_RE = re.compile(
    r'\[\s*(-?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?)d,\s*'
    r'(-?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?)d,\s*'
    r'(-?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?)d\s*\]'
)
TEST_PASS_RE = re.compile(r'(?:Test passed|condition passed)', re.I)
SET_SUCCESS_RE = re.compile(r'(?:Set the block|Changed the block|Successfully)', re.I)


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'))


def payload_hash(value):
    payload = dict(value)
    payload.pop('reportPayloadSha256', None)
    return hashlib.sha256(canonical(payload).encode()).hexdigest()


def exact_selector(uuid):
    values = ','.join(str(int(value)) for value in uuid)
    return (
        '@e[type=minecraft:minecart,'
        f'tag={TAG},x=2058,y=130,z=-748,dx=15,dy=1,dz=1,'
        f'nbt={{UUID:[I;{values}]}},limit=1]'
    )


def test_block(rcon, x, y, z, state):
    reply = rcon.cmd(f'execute if block {x} {y} {z} {state}')
    return bool(TEST_PASS_RE.search(reply))


def guarded_set(rcon, x, y, z, source, target):
    command = f'execute if block {x} {y} {z} {source} run setblock {x} {y} {z} {target}'
    reply = rcon.cmd(command)
    if not SET_SUCCESS_RE.search(reply):
        raise RuntimeError(f'guarded set failed at ({x},{y},{z}): {reply!r}')
    return {'command': command, 'reply': reply}


def read_vector(rcon, selector, field, pattern):
    reply = rcon.cmd(f'data get entity {selector} {field}')
    match = pattern.search(reply)
    if not match:
        raise RuntimeError(f'cannot parse {field}: {reply!r}')
    return [float(match.group(index)) for index in range(1, 4)]


class FunctionalVerifier:
    def __init__(self, rcon_factory, clock=entity_kernel.utc_now, sleeper=time.sleep):
        self.rcon_factory = rcon_factory
        self.clock = clock
        self.sleeper = sleeper

    def plan(self):
        report = {
            'schemaVersion': 1,
            'transactionId': TRANSACTION_ID,
            'generatedAtUtc': self.clock(),
            'status': 'PLAN_VALIDATED_NO_RCON_CONNECTION',
            'mode': 'DRY_RUN',
            'blockContract': {
                'controlCells': [[x, Y, CONTROL_Z] for x in CONTROL_X],
                'poweredRailCells': [[x, Y, RAIL_Z] for x in RAIL_X],
                'initialAndTerminalControlsState': LEVER_OFF,
                'initialAndTerminalRailState': RAIL_OFF,
            },
            'functionalContract': {
                'westThresholdX': 2059.75,
                'eastThresholdX': 2071.25,
                'terminalParkMinX': 2058,
                'terminalParkMaxX': 2059,
                'stationaryMotionAbsMax': 0.02,
                'westEastWestTraversalRequired': True,
            },
            'safetyBoundary': {
                'rconConnected': False,
                'worldMutationPerformed': False,
                'entityKillAllowed': False,
                'onlyDeclaredControlsMayBeEnergized': True,
                'controlsOffAttemptedOnEveryExit': True,
            },
        }
        report['reportPayloadSha256'] = payload_hash(report)
        return report

    def execute(self, forward_report, timeout_seconds=30.0, poll_seconds=0.25):
        entity_kernel.validate_forward_report(forward_report)
        if forward_report['transactionId'] != TRANSACTION_ID:
            raise ValueError('entity forward report transactionId mismatch')
        identity = forward_report['capturedIdentity']
        if identity.get('entityType') != 'minecraft:minecart':
            raise ValueError('captured entity is not a minecart')
        selector = exact_selector(identity['uuidIntArray'])
        report = {
            'schemaVersion': 1,
            'transactionId': TRANSACTION_ID,
            'generatedAtUtc': self.clock(),
            'mode': 'EXECUTE_FUNCTIONAL_ACCEPTANCE',
            'status': 'RUNNING',
            'capturedIdentity': identity,
            'entityForwardReportPayloadSha256': forward_report['reportPayloadSha256'],
            'commands': [],
            'observations': [],
            'failure': None,
        }
        rcon = self.rcon_factory()
        try:
            authentication_command = f'execute if entity {selector}'
            authentication_reply = rcon.cmd(authentication_command)
            authentication_count = entity_kernel.parse_count(authentication_reply)
            report['entityAuthentication'] = {
                'selector': selector,
                'command': authentication_command,
                'reply': authentication_reply,
                'count': authentication_count,
                'selectorRequiresExactUuidTypeTagAndFullAabb': True,
            }
            if authentication_count != 1:
                raise RuntimeError('exact captured UUID/type/tag is not unique in shuttle AABB')
            for x in CONTROL_X:
                if not test_block(rcon, x, Y, CONTROL_Z, LEVER_OFF):
                    raise RuntimeError(f'control at x={x} is not initially OFF')
            for x in RAIL_X:
                if not test_block(rcon, x, Y, RAIL_Z, RAIL_OFF):
                    raise RuntimeError(f'powered rail at x={x} is not initially unpowered')
            for x in CONTROL_X:
                report['commands'].append(guarded_set(
                    rcon, x, Y, CONTROL_Z, LEVER_OFF, LEVER_ON
                ))
            for x in RAIL_X:
                if not test_block(rcon, x, Y, RAIL_Z, RAIL_ON):
                    raise RuntimeError(f'powered rail at x={x} did not energize')
            deadline = time.monotonic() + timeout_seconds
            east = None
            west_return = None
            while time.monotonic() < deadline:
                position = read_vector(rcon, selector, 'Pos', POS_RE)
                report['observations'].append({'position': position})
                if east is None and position[0] >= 2071.25:
                    east = position
                elif east is not None and position[0] <= 2059.75:
                    west_return = position
                    break
                self.sleeper(poll_seconds)
            if east is None or west_return is None:
                raise RuntimeError('west-east-west traversal was not observed before timeout')
            report['westToEastPosition'] = east
            report['eastToWestReturnPosition'] = west_return
        except Exception as error:
            report['failure'] = str(error)
        finally:
            off_failures = []
            for x in CONTROL_X:
                try:
                    if test_block(rcon, x, Y, CONTROL_Z, LEVER_ON):
                        report['commands'].append(guarded_set(
                            rcon, x, Y, CONTROL_Z, LEVER_ON, LEVER_OFF
                        ))
                    elif not test_block(rcon, x, Y, CONTROL_Z, LEVER_OFF):
                        off_failures.append(f'control x={x} state unknown')
                except Exception as error:
                    off_failures.append(str(error))
            controls_off = all(test_block(rcon, x, Y, CONTROL_Z, LEVER_OFF) for x in CONTROL_X)
            rails_unpowered = sum(
                test_block(rcon, x, Y, RAIL_Z, RAIL_OFF) for x in RAIL_X
            )
            settle_samples = []
            try:
                stable_run = 0
                position = None
                motion = None
                for _ in range(8):
                    position = read_vector(rcon, selector, 'Pos', POS_RE)
                    motion = read_vector(rcon, selector, 'Motion', MOTION_RE)
                    sample = {'position': position, 'motion': motion}
                    settle_samples.append(sample)
                    in_sample_park = (2058 <= position[0] <= 2059
                                      and 130 <= position[1] <= 131
                                      and -748 <= position[2] <= -747)
                    low_motion = max(abs(value) for value in motion) <= 0.02
                    low_drift = (len(settle_samples) == 1 or max(
                        abs(position[index] - settle_samples[-2]['position'][index])
                        for index in range(3)
                    ) <= 0.05)
                    stable_run = stable_run + 1 if in_sample_park and low_motion and low_drift else 0
                    if stable_run >= 4:
                        break
                    self.sleeper(poll_seconds)
                stationary = stable_run >= 4
            except Exception as error:
                position = None
                motion = None
                stationary = False
                off_failures.append(str(error))
            in_park = bool(position and 2058 <= position[0] <= 2059
                           and 130 <= position[1] <= 131
                           and -748 <= position[2] <= -747)
            counts = {
                'globalTagCount': entity_kernel.parse_count(rcon.cmd(
                    f'execute if entity @e[tag={TAG}]'
                )),
                'boundedTagCount': entity_kernel.parse_count(rcon.cmd(
                    f'execute if entity @e[type=minecraft:minecart,tag={TAG},x=2058,y=130,z=-748,dx=15,dy=1,dz=1]'
                )),
                'boundedMinecartCount': entity_kernel.parse_count(rcon.cmd(
                    'execute if entity @e[type=minecraft:minecart,x=2058,y=130,z=-748,dx=15,dy=1,dz=1]'
                )),
            }
            report['terminal'] = {
                **counts,
                'position': position,
                'motion': motion,
                'stationary': stationary,
                'settleSamples': settle_samples,
                'requiredConsecutiveStableSamples': 4,
                'positionDriftTolerance': 0.05,
                'insideWestParkEnvelope': in_park,
                'controlsOff': controls_off,
                'railsUnpoweredCount': rails_unpowered,
                'controlOffFailures': off_failures,
            }
            passed = (report['failure'] is None and controls_off and rails_unpowered == 15
                      and stationary and in_park and all(value == 1 for value in counts.values()))
            report['status'] = (
                'PASS_WEST_EAST_WEST_FAIL_CLOSED_PARK_VERIFIED'
                if passed else 'FAIL_FUNCTIONAL_OR_FAIL_CLOSED_TERMINAL_UNVERIFIED'
            )
            report['safetyBoundary'] = {
                'entityKillUsed': False,
                'broadOrTagOnlyCleanupUsed': False,
                'controlsOffAttemptedOnExit': True,
            }
            rcon.close()
        report['reportPayloadSha256'] = payload_hash(report)
        return report


def build_parser():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--entity-forward-report')
    parser.add_argument('--execute', action='store_true')
    parser.add_argument('--report')
    parser.add_argument('--generated-at')
    parser.add_argument('--timeout-seconds', type=float, default=30)
    parser.add_argument('--poll-seconds', type=float, default=0.25)
    parser.add_argument('--endpoint', choices=('loopback', 'production'), default='loopback')
    parser.add_argument('--host')
    parser.add_argument('--port', type=int)
    parser.add_argument('--password')
    parser.add_argument('--password-env', default='MC_RCON_PASSWORD')
    parser.add_argument('--confirm-production')
    return parser


def main(argv=None):
    args = build_parser().parse_args(argv)
    clock = (lambda: args.generated_at) if args.generated_at else entity_kernel.utc_now
    if not args.execute:
        report = FunctionalVerifier(lambda: None, clock=clock).plan()
    else:
        if not args.report or not args.entity_forward_report:
            raise ValueError('--execute requires --report and --entity-forward-report')
        if args.endpoint == 'production' and args.confirm_production != TRANSACTION_ID:
            raise ValueError('--confirm-production must exactly equal transactionId')
        # Reuse the frozen executor's endpoint validation and adapters.
        endpoint_args = argparse.Namespace(
            endpoint=args.endpoint, confirm_production=args.confirm_production,
            transaction_id=TRANSACTION_ID, host=args.host, port=args.port,
            password=args.password, password_env=args.password_env, timeout_seconds=10,
        )
        factory = entity_kernel.rcon_factory_from_args(endpoint_args)
        with open(args.entity_forward_report, encoding='utf-8') as handle:
            forward = json.load(handle)
        report = FunctionalVerifier(factory, clock=clock).execute(
            forward, args.timeout_seconds, args.poll_seconds
        )
    if args.report:
        entity_kernel.durable_json(args.report, report, exclusive=True)
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if (not args.execute or report['status'].startswith('PASS_')) else 1


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except (ValueError, RuntimeError, OSError) as error:
        print(f'ERROR: {error}', file=sys.stderr)
        raise SystemExit(2)
