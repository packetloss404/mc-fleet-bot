#!/usr/bin/env python3
"""Fail-closed, journaled executor for one deterministic tagged minecart.

Dry-run is the default and never opens RCON. ``--execute`` is required for a
forward mutation. ``--rollback <forward-report.json> --execute`` removes only
the exact captured UUID after immediately re-verifying its type, tag, bounded
position, and uniqueness. This tool is deliberately independent from the
Combined Zones scoped block-release wrapper.
"""

import argparse
import hashlib
import json
import math
import os
import re
import socket
import struct
import sys
import tempfile
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mc_admin import Rcon as ProductionRcon  # noqa: E402
from mc_admin import connect as production_connect  # noqa: E402


ENTITY_TYPE = 'minecraft:minecart'
COUNT_RE = re.compile(r'Test passed[.,]\s*count:\s*(\d+)', re.IGNORECASE)
EMPTY_RE = re.compile(r'(?:Test failed|No entity was found)', re.IGNORECASE)
UUID_RE = re.compile(
    r'\[I;\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*\]'
)
POS_RE = re.compile(
    r'\[\s*(-?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?)d,\s*'
    r'(-?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?)d,\s*'
    r'(-?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?)d\s*\]'
)
TAG_RE = re.compile(r'^[a-z0-9_.+-]{1,64}$')
SUCCESS_SUMMON_RE = re.compile(r'summoned new|summoned entity', re.IGNORECASE)
SUCCESS_KILL_RE = re.compile(r'^killed\b', re.IGNORECASE)


def utc_now():
    return (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace('+00:00', 'Z')
    )


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'))


def sha256_bytes(value):
    if isinstance(value, str):
        value = value.encode('utf-8')
    return hashlib.sha256(value).hexdigest()


def sha256_file(filename):
    digest = hashlib.sha256()
    with open(filename, 'rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def payload_hash(report):
    value = dict(report)
    value.pop('reportPayloadSha256', None)
    return sha256_bytes(canonical(value))


def durable_json(filename, value, exclusive=False):
    directory = os.path.dirname(os.path.abspath(filename))
    os.makedirs(directory, exist_ok=True)
    if exclusive and os.path.exists(filename):
        raise RuntimeError(f'refusing to overwrite existing report: {filename}')
    descriptor, temporary = tempfile.mkstemp(
        prefix='.tagged-minecart-', suffix='.json.tmp', dir=directory
    )
    try:
        with os.fdopen(descriptor, 'w', encoding='utf-8') as handle:
            json.dump(value, handle, indent=2, sort_keys=True)
            handle.write('\n')
            handle.flush()
            os.fsync(handle.fileno())
        if exclusive and os.path.exists(filename):
            raise RuntimeError(f'refusing to overwrite existing report: {filename}')
        os.replace(temporary, filename)
        directory_fd = os.open(directory, os.O_RDONLY)
        try:
            os.fsync(directory_fd)
        finally:
            os.close(directory_fd)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def parse_count(reply):
    match = COUNT_RE.search(reply)
    if match:
        return int(match.group(1))
    if EMPTY_RE.search(reply):
        return 0
    raise RuntimeError(f'unrecognized selector count reply: {reply!r}')


def parse_uuid(reply):
    match = UUID_RE.search(reply)
    if not match:
        raise RuntimeError(f'cannot parse entity UUID: {reply!r}')
    return [int(match.group(index)) for index in range(1, 5)]


def parse_position(reply):
    match = POS_RE.search(reply)
    if not match:
        raise RuntimeError(f'cannot parse entity position: {reply!r}')
    return [float(match.group(index)) for index in range(1, 4)]


def number(value):
    result = float(value)
    if not math.isfinite(result):
        raise ValueError(f'coordinate is not finite: {value}')
    return result


def command_number(value):
    value = number(value)
    if value == int(value):
        return str(int(value))
    return format(value, '.15g')


def validate_spec(spec):
    if not isinstance(spec.get('transactionId'), str) or not spec['transactionId'].strip():
        raise ValueError('transactionId is required')
    aabb = spec.get('aabb')
    spawn = spec.get('spawn')
    if not isinstance(aabb, dict) or not isinstance(spawn, list) or len(spawn) != 3:
        raise ValueError('exact aabb and three-coordinate spawn are required')
    normalized_aabb = {}
    for axis in ('X', 'Y', 'Z'):
        low = number(aabb[f'min{axis}'])
        high = number(aabb[f'max{axis}'])
        if low > high:
            raise ValueError(f'AABB min{axis} exceeds max{axis}')
        normalized_aabb[f'min{axis}'] = low
        normalized_aabb[f'max{axis}'] = high
    normalized_spawn = [number(value) for value in spawn]
    for index, axis in enumerate(('X', 'Y', 'Z')):
        if not normalized_aabb[f'min{axis}'] <= normalized_spawn[index] <= normalized_aabb[f'max{axis}']:
            raise ValueError(f'spawn is outside AABB on {axis}')
    tolerance = number(spec.get('positionTolerance', 0.05))
    if tolerance < 0 or tolerance > 0.25:
        raise ValueError('positionTolerance must be in 0..0.25')
    normalized = {
        'transactionId': spec['transactionId'].strip(),
        'entityType': ENTITY_TYPE,
        'aabb': normalized_aabb,
        'spawn': normalized_spawn,
        'spawnParkAabb': {
            'minX': math.floor(normalized_spawn[0]),
            'minY': math.floor(normalized_spawn[1]),
            'minZ': math.floor(normalized_spawn[2]),
            'maxX': math.floor(normalized_spawn[0]) + 1,
            'maxY': math.floor(normalized_spawn[1]) + 1,
            'maxZ': math.floor(normalized_spawn[2]) + 1,
        },
        'positionTolerance': tolerance,
    }
    seed = {
        'transactionId': normalized['transactionId'],
        'entityType': ENTITY_TYPE,
        'aabb': normalized_aabb,
        'spawn': normalized_spawn,
    }
    digest = sha256_bytes(canonical(seed))
    tag = spec.get('tag') or f'cz_r12_{digest[:32]}'
    if not isinstance(tag, str) or not TAG_RE.fullmatch(tag):
        raise ValueError('tag must match [a-z0-9_.+-]{1,64}')
    expected_tag = f'cz_r12_{digest[:32]}'
    if tag != expected_tag:
        raise ValueError(f'tag is not the derived deterministic value {expected_tag}')
    expected_name = f'CZ R12 minecart {digest[:16]}'
    name = spec.get('name') or expected_name
    if name != expected_name:
        raise ValueError(f'name is not the deterministic value {expected_name}')
    normalized['tag'] = tag
    normalized['name'] = name
    normalized['identitySeedSha256'] = digest
    return normalized


def bounded_selector(spec, tag=True, uuid=None, limit=None):
    aabb = spec['aabb']
    parts = [f'type={ENTITY_TYPE}']
    if tag:
        parts.append(f'tag={spec["tag"]}')
    parts.extend([
        f'x={command_number(aabb["minX"])}',
        f'y={command_number(aabb["minY"])}',
        f'z={command_number(aabb["minZ"])}',
        f'dx={command_number(aabb["maxX"] - aabb["minX"])}',
        f'dy={command_number(aabb["maxY"] - aabb["minY"])}',
        f'dz={command_number(aabb["maxZ"] - aabb["minZ"])}',
    ])
    if uuid is not None:
        values = ','.join(str(value) for value in uuid)
        parts.append(f'nbt={{UUID:[I;{values}]}}')
    if limit is not None:
        parts.append(f'limit={limit}')
    return '@e[' + ','.join(parts) + ']'


def global_tag_selector(spec, limit=None):
    parts = [f'tag={spec["tag"]}']
    if limit is not None:
        parts.append(f'limit={limit}')
    return '@e[' + ','.join(parts) + ']'


def count_command(selector):
    return f'execute if entity {selector}'


def summon_command(spec):
    position = ' '.join(command_number(value) for value in spec['spawn'])
    name_json = json.dumps({'text': spec['name']}, separators=(',', ':'))
    name_snbt = name_json.replace('\\', '\\\\').replace("'", "\\'")
    return (
        f'summon {ENTITY_TYPE} {position} '
        f'{{Tags:["{spec["tag"]}"],CustomName:\'{name_snbt}\','
        'CustomNameVisible:1b,PersistenceRequired:1b,Motion:[0.0d,0.0d,0.0d]}'
    )


def position_matches(observed, expected, tolerance):
    return all(abs(float(left) - float(right)) <= tolerance for left, right in zip(observed, expected))


def position_in_aabb(position, aabb):
    return all(
        aabb[f'min{axis}'] <= float(position[index]) <= aabb[f'max{axis}']
        for index, axis in enumerate(('X', 'Y', 'Z'))
    )


class JsonlJournal:
    def __init__(self, filename=None, clock=utc_now):
        self.filename = filename
        self.clock = clock
        self.entries = []
        self.previous = None
        self.bytes = bytearray()
        self.handle = None
        if filename:
            directory = os.path.dirname(os.path.abspath(filename))
            os.makedirs(directory, exist_ok=True)
            descriptor = os.open(filename, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            self.handle = os.fdopen(descriptor, 'w', encoding='utf-8')

    def append(self, event, details=None):
        base = {
            'sequence': len(self.entries) + 1,
            'atUtc': self.clock(),
            'event': event,
            'details': details or {},
            'previousEntrySha256': self.previous,
        }
        entry_hash = sha256_bytes(canonical(base))
        entry = {**base, 'entrySha256': entry_hash}
        encoded = (canonical(entry) + '\n').encode('utf-8')
        self.bytes.extend(encoded)
        self.entries.append(entry)
        self.previous = entry_hash
        if self.handle:
            self.handle.write(encoded.decode('utf-8'))
            self.handle.flush()
            os.fsync(self.handle.fileno())
        return entry

    def close(self):
        if self.handle:
            self.handle.close()
            self.handle = None

    def binding(self):
        return {
            'path': os.path.abspath(self.filename) if self.filename else None,
            'entryCount': len(self.entries),
            'bytes': len(self.bytes),
            'sha256': sha256_bytes(bytes(self.bytes)),
            'lastEntrySha256': self.previous,
        }


class DirectRcon:
    """Small direct TCP RCON client used only for an explicit loopback endpoint."""

    def __init__(self, host, port, password, timeout=10):
        self.socket = socket.create_connection((host, int(port)), timeout=timeout)
        self.socket.settimeout(timeout)
        self.next_id = 10
        response = self._request(1, 3, password)
        if response[0] == -1:
            self.close()
            raise RuntimeError('RCON authentication failed')

    @staticmethod
    def _packet(request_id, packet_type, body):
        payload = body.encode('utf-8')
        return struct.pack('<iii', len(payload) + 10, request_id, packet_type) + payload + b'\x00\x00'

    def _read_exact(self, count):
        chunks = bytearray()
        while len(chunks) < count:
            chunk = self.socket.recv(count - len(chunks))
            if not chunk:
                raise RuntimeError('RCON connection closed')
            chunks.extend(chunk)
        return bytes(chunks)

    def _request(self, request_id, packet_type, body):
        self.socket.sendall(self._packet(request_id, packet_type, body))
        size = struct.unpack('<i', self._read_exact(4))[0]
        if size < 10 or size > 10_000_000:
            raise RuntimeError(f'invalid RCON packet length {size}')
        packet = self._read_exact(size)
        response_id, response_type = struct.unpack('<ii', packet[:8])
        return response_id, response_type, packet[8:-2].decode('utf-8')

    def cmd(self, command):
        request_id = self.next_id
        self.next_id += 1
        response_id, _, body = self._request(request_id, 2, command)
        if response_id != request_id:
            raise RuntimeError('RCON response id mismatch')
        return re.sub(r'§.', '', body)

    def close(self):
        if self.socket:
            self.socket.close()
            self.socket = None


class ProductionRconAdapter:
    """Repository-standard SSH-tunnel production endpoint; explicit mode only."""

    def __init__(self):
        self.client = production_connect()
        self.rcon = ProductionRcon(self.client)

    def cmd(self, command):
        return self.rcon.cmd(command)

    def close(self):
        self.client.close()


class TaggedMinecartExecutor:
    def __init__(self, spec, rcon_factory, clock=utc_now):
        self.spec = validate_spec(spec)
        self.rcon_factory = rcon_factory
        self.clock = clock

    def _count(self, rcon, selector):
        return parse_count(rcon.cmd(count_command(selector)))

    def _capture(self, rcon, selector):
        one = selector[:-1] + ',limit=1]'
        uuid = parse_uuid(rcon.cmd(f'data get entity {one} UUID'))
        position = parse_position(rcon.cmd(f'data get entity {one} Pos'))
        return {
            'uuidIntArray': uuid,
            'uuidKey': ','.join(str(value) for value in uuid),
            'entityType': ENTITY_TYPE,
            'entityTypeEvidence': 'EXACT_TYPE_SELECTOR_MATCHED_ONE',
            'position': position,
            'tag': self.spec['tag'],
            'name': self.spec['name'],
        }

    def _verify_exact_identity(self, rcon, identity, required_position_aabb=None):
        global_count = self._count(rcon, global_tag_selector(self.spec))
        bounded_all_count = self._count(rcon, bounded_selector(self.spec, tag=False))
        if global_count != 1 or bounded_all_count != 1:
            raise RuntimeError(
                'transaction ownership changed before exact identity action: '
                f'globalTag={global_count}, boundedMinecart={bounded_all_count}'
            )
        selector = bounded_selector(
            self.spec, tag=True, uuid=identity['uuidIntArray'], limit=2
        )
        if self._count(rcon, selector) != 1:
            raise RuntimeError('captured UUID/type/tag/bounds count is not exactly one')
        observed = self._capture(rcon, selector.rsplit(',limit=2]', 1)[0] + ']')
        if observed['uuidIntArray'] != identity['uuidIntArray']:
            raise RuntimeError('captured UUID changed before exact identity action')
        if observed['entityType'] != ENTITY_TYPE:
            raise RuntimeError('captured entity type is not minecraft:minecart')
        if not position_in_aabb(observed['position'], self.spec['aabb']):
            raise RuntimeError('captured UUID is outside the declared shuttle AABB')
        if required_position_aabb is not None and not position_in_aabb(
            observed['position'], required_position_aabb
        ):
            raise RuntimeError('captured UUID is outside the required spawn/park AABB')
        return observed, selector

    def _zero_verification(self, rcon):
        global_tag = self._count(rcon, global_tag_selector(self.spec))
        bounded_tag = self._count(rcon, bounded_selector(self.spec, tag=True))
        bounded_all = self._count(rcon, bounded_selector(self.spec, tag=False))
        if global_tag != 0 or bounded_tag != 0 or bounded_all != 0:
            raise RuntimeError(
                f'zero verification failed: globalTag={global_tag}, '
                f'boundedTag={bounded_tag}, boundedMinecart={bounded_all}'
            )
        return {'globalTagCount': 0, 'boundedTagCount': 0, 'boundedMinecartCount': 0}

    def _recover_owned_identity(self, rcon):
        global_count = self._count(rcon, global_tag_selector(self.spec))
        bounded_count = self._count(rcon, bounded_selector(self.spec, tag=True))
        bounded_all = self._count(rcon, bounded_selector(self.spec, tag=False))
        if global_count == 0 and bounded_count == 0 and bounded_all == 0:
            return None
        if global_count != 1 or bounded_count != 1 or bounded_all != 1:
            raise RuntimeError(
                'cannot recover a unique owned minecart without broadening cleanup: '
                f'globalTag={global_count}, boundedTag={bounded_count}, boundedMinecart={bounded_all}'
            )
        return self._capture(rcon, bounded_selector(self.spec, tag=True))

    def _kill_exact(self, rcon, identity, journal, reason, required_position_aabb=None):
        observed, selector = self._verify_exact_identity(
            rcon, identity, required_position_aabb=required_position_aabb
        )
        journal.append('exact-uuid-verified-before-kill', {
            'reason': reason,
            'capturedIdentity': observed,
            'positionPolicy': (
                'EXACT_SPAWN_PARK_POSITION'
                if required_position_aabb is not None
                else 'ANY_POSITION_INSIDE_FULL_SHUTTLE_AABB'
            ),
            'selector': selector,
        })
        reply = rcon.cmd(f'kill {selector}')
        if not SUCCESS_KILL_RE.search(reply):
            raise RuntimeError(f'exact UUID kill did not report success: {reply!r}')
        journal.append('exact-uuid-kill-issued', {'reason': reason, 'reply': reply})
        zero = self._zero_verification(rcon)
        journal.append('zero-postcondition-verified', zero)
        return zero

    def dry_run(self, mode='forward', rollback_source=None):
        plan = {
            'schemaVersion': 1,
            'transactionId': self.spec['transactionId'],
            'mode': f'DRY_RUN_{mode.upper()}',
            'status': 'PLAN_VALIDATED_NO_RCON_CONNECTION',
            'generatedAtUtc': self.clock(),
            'spec': self.spec,
            'preconditions': {
                'globalDeterministicTagCount': 0,
                'boundedAllMinecartCount': 0,
            },
            'commands': {
                'globalTagCount': count_command(global_tag_selector(self.spec)),
                'boundedTagCount': count_command(bounded_selector(self.spec, tag=True)),
                'boundedAllMinecartCount': count_command(bounded_selector(self.spec, tag=False)),
                'summon': summon_command(self.spec) if mode == 'forward' else None,
                'rollbackRequiresExactCapturedUuid': mode == 'rollback',
                'rollbackPositionPolicy': 'ANY_POSITION_INSIDE_FULL_SHUTTLE_AABB',
            },
            'rollbackSource': rollback_source,
            'safetyBoundary': {
                'dryRunDefault': True,
                'rconConnected': False,
                'worldMutationPerformed': False,
                'broadMinecartKillAllowed': False,
                'tagOnlyKillAllowed': False,
            },
        }
        plan['reportPayloadSha256'] = payload_hash(plan)
        return plan

    def execute_forward(self, journal):
        report = {
            'schemaVersion': 1,
            'transactionId': self.spec['transactionId'],
            'mode': 'EXECUTE_FORWARD',
            'status': 'RUNNING',
            'generatedAtUtc': self.clock(),
            'spec': self.spec,
            'capturedIdentity': None,
            'failure': None,
            'compensation': None,
        }
        rcon = self.rcon_factory()
        summon_intended = False
        try:
            journal.append('transaction-start', {'mode': 'forward'})
            global_tag_count = self._count(rcon, global_tag_selector(self.spec))
            if global_tag_count != 0:
                raise RuntimeError(f'global deterministic tag precondition is {global_tag_count}, expected zero')
            journal.append('global-tag-zero-precondition', {'count': global_tag_count})
            bounded_tag_count = self._count(rcon, bounded_selector(self.spec, tag=True))
            bounded_all_count = self._count(rcon, bounded_selector(self.spec, tag=False))
            if bounded_tag_count != 0 or bounded_all_count != 0:
                raise RuntimeError(
                    f'bounded AABB is occupied: tagged={bounded_tag_count}, allMinecarts={bounded_all_count}'
                )
            journal.append('bounded-aabb-empty-precondition', {
                'taggedMinecartCount': 0, 'allMinecartCount': 0,
            })
            summon_intended = True
            journal.append('summon-intent', {'command': summon_command(self.spec)})
            summon_reply = rcon.cmd(summon_command(self.spec))
            if not SUCCESS_SUMMON_RE.search(summon_reply):
                raise RuntimeError(f'summon did not report success: {summon_reply!r}')
            journal.append('summon-reply', {'reply': summon_reply})
            if self._count(rcon, global_tag_selector(self.spec)) != 1:
                raise RuntimeError('global deterministic tag postcount is not exactly one')
            if self._count(rcon, bounded_selector(self.spec, tag=True)) != 1:
                raise RuntimeError('bounded deterministic tag postcount is not exactly one')
            if self._count(rcon, bounded_selector(self.spec, tag=False)) != 1:
                raise RuntimeError('bounded all-minecart postcount is not exactly one')
            identity = self._capture(rcon, bounded_selector(self.spec, tag=True))
            report['capturedIdentity'] = identity
            journal.append('identity-captured', identity)
            observed, _ = self._verify_exact_identity(rcon, identity)
            if not position_matches(
                observed['position'], self.spec['spawn'], self.spec['positionTolerance']
            ):
                raise RuntimeError(
                    f'exact position postcondition failed: {observed["position"]} != {self.spec["spawn"]}'
                )
            journal.append('exact-postcondition-verified', {
                'globalTagCount': 1, 'boundedTagCount': 1,
                'boundedMinecartCount': 1, 'capturedIdentity': observed,
            })
            report['status'] = 'EXECUTED_POSTCONDITION_VERIFIED'
        except Exception as error:
            report['failure'] = str(error)
            journal.append('forward-failure', {'error': str(error), 'summonIntended': summon_intended})
            if summon_intended:
                try:
                    identity = report['capturedIdentity'] or self._recover_owned_identity(rcon)
                    if identity is None:
                        zero = self._zero_verification(rcon)
                        report['compensation'] = {'status': 'NOT_NEEDED_ZERO_ALREADY', **zero}
                    else:
                        report['capturedIdentity'] = identity
                        journal.append('compensation-identity-captured', identity)
                        zero = self._kill_exact(
                            rcon,
                            identity,
                            journal,
                            'forward-failure',
                            required_position_aabb=self.spec['spawnParkAabb'],
                        )
                        report['compensation'] = {'status': 'COMPENSATED_EXACT_UUID_TO_ZERO', **zero}
                    report['status'] = 'FAILED_COMPENSATED_TO_ZERO'
                except Exception as compensation_error:
                    report['compensation'] = {
                        'status': 'COMPENSATION_FAILED', 'error': str(compensation_error),
                    }
                    report['status'] = 'FAILED_COMPENSATION_INCOMPLETE'
                    journal.append('compensation-failure', {'error': str(compensation_error)})
            else:
                report['status'] = 'FAILED_NO_MUTATION'
        finally:
            journal.append('transaction-complete', {'status': report['status']})
            rcon.close()
            journal.close()
        report['journal'] = journal.entries
        report['journalBinding'] = journal.binding()
        report['safetyBoundary'] = {
            'broadMinecartKillUsed': False,
            'tagOnlyKillUsed': False,
            'exactUuidKillRequired': True,
        }
        report['reportPayloadSha256'] = payload_hash(report)
        return report

    def execute_rollback(self, forward_report, journal):
        validate_forward_report(forward_report)
        if forward_report['spec'] != self.spec:
            raise RuntimeError('rollback source spec does not match requested transaction')
        identity = forward_report['capturedIdentity']
        report = {
            'schemaVersion': 1,
            'transactionId': self.spec['transactionId'],
            'mode': 'EXECUTE_ROLLBACK',
            'status': 'RUNNING',
            'generatedAtUtc': self.clock(),
            'forwardReportPayloadSha256': forward_report['reportPayloadSha256'],
            'spec': self.spec,
            'capturedIdentity': identity,
            'failure': None,
        }
        rcon = self.rcon_factory()
        try:
            journal.append('transaction-start', {'mode': 'rollback'})
            zero = self._kill_exact(
                rcon,
                identity,
                journal,
                'explicit-rollback',
                required_position_aabb=None,
            )
            report['rollback'] = {'status': 'ROLLED_BACK_EXACT_UUID_TO_ZERO', **zero}
            report['status'] = 'ROLLBACK_POSTCONDITION_VERIFIED'
        except Exception as error:
            report['failure'] = str(error)
            report['status'] = 'ROLLBACK_FAILED_NO_BROADENED_CLEANUP'
            journal.append('rollback-failure', {'error': str(error)})
        finally:
            journal.append('transaction-complete', {'status': report['status']})
            rcon.close()
            journal.close()
        report['journal'] = journal.entries
        report['journalBinding'] = journal.binding()
        report['safetyBoundary'] = {
            'broadMinecartKillUsed': False,
            'tagOnlyKillUsed': False,
            'exactUuidKillRequired': True,
        }
        report['reportPayloadSha256'] = payload_hash(report)
        return report


def validate_forward_report(report):
    if report.get('schemaVersion') != 1:
        raise ValueError('forward report schemaVersion must be 1')
    if report.get('mode') != 'EXECUTE_FORWARD':
        raise ValueError('rollback source is not a forward execution report')
    if report.get('status') != 'EXECUTED_POSTCONDITION_VERIFIED':
        raise ValueError('rollback source forward transaction is not successfully executed')
    if report.get('reportPayloadSha256') != payload_hash(report):
        raise ValueError('rollback source report payload hash drifted')
    identity = report.get('capturedIdentity')
    if not isinstance(identity, dict) or len(identity.get('uuidIntArray', [])) != 4:
        raise ValueError('rollback source lacks exact captured UUID identity')
    validate_spec(report.get('spec', {}))
    return True


def spec_from_args(args):
    return validate_spec({
        'transactionId': args.transaction_id,
        'aabb': {
            'minX': args.min_x, 'minY': args.min_y, 'minZ': args.min_z,
            'maxX': args.max_x, 'maxY': args.max_y, 'maxZ': args.max_z,
        },
        'spawn': [args.spawn_x, args.spawn_y, args.spawn_z],
        'positionTolerance': args.position_tolerance,
        'tag': args.tag,
        'name': args.name,
    })


def rcon_factory_from_args(args):
    if args.endpoint == 'production':
        if args.confirm_production != args.transaction_id:
            raise ValueError('--confirm-production must exactly equal --transaction-id')
        return ProductionRconAdapter
    host = args.host or '127.0.0.1'
    try:
        addresses = {item[4][0] for item in socket.getaddrinfo(host, None)}
    except socket.gaierror as error:
        raise ValueError(f'loopback host cannot be resolved: {error}') from error
    if not addresses or any(address not in ('127.0.0.1', '::1') for address in addresses):
        raise ValueError('loopback endpoint refuses a non-loopback host')
    password = args.password or os.environ.get(args.password_env)
    if not password:
        raise ValueError(f'RCON password unavailable; set --password or {args.password_env}')
    port = args.port or int(os.environ.get('MC_RCON_PORT', '25575'))
    return lambda: DirectRcon(host, port, password, args.timeout_seconds)


def build_parser():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--transaction-id', required=True)
    for name in ('min-x', 'min-y', 'min-z', 'max-x', 'max-y', 'max-z',
                 'spawn-x', 'spawn-y', 'spawn-z'):
        parser.add_argument(f'--{name}', required=True, type=float)
    parser.add_argument('--position-tolerance', type=float, default=0.05)
    parser.add_argument('--tag', help='explicit package-stable deterministic tag')
    parser.add_argument('--name', help='explicit package-stable deterministic CustomName')
    parser.add_argument('--execute', action='store_true')
    parser.add_argument('--rollback', metavar='FORWARD_REPORT_JSON')
    parser.add_argument('--report')
    parser.add_argument('--journal')
    parser.add_argument('--generated-at')
    parser.add_argument('--endpoint', choices=('loopback', 'production'), default='loopback')
    parser.add_argument('--host')
    parser.add_argument('--port', type=int)
    parser.add_argument('--password')
    parser.add_argument('--password-env', default='MC_RCON_PASSWORD')
    parser.add_argument('--timeout-seconds', type=float, default=10)
    parser.add_argument('--confirm-production')
    return parser


def main(argv=None):
    args = build_parser().parse_args(argv)
    spec = spec_from_args(args)
    fixed_time = args.generated_at
    clock = (lambda: fixed_time) if fixed_time else utc_now
    mode = 'rollback' if args.rollback else 'forward'
    executor = TaggedMinecartExecutor(spec, lambda: None, clock=clock)
    if not args.execute:
        source = None
        if args.rollback:
            source_report = json.load(open(args.rollback, encoding='utf-8'))
            validate_forward_report(source_report)
            source = {
                'path': os.path.abspath(args.rollback),
                'sha256': sha256_file(args.rollback),
                'reportPayloadSha256': source_report['reportPayloadSha256'],
            }
        report = executor.dry_run(mode, rollback_source=source)
        if args.report:
            durable_json(args.report, report, exclusive=True)
        print(json.dumps(report, indent=2, sort_keys=True))
        return 0
    if not args.report or not args.journal:
        raise ValueError('--execute requires both --report and --journal')
    factory = rcon_factory_from_args(args)
    executor = TaggedMinecartExecutor(spec, factory, clock=clock)
    journal = JsonlJournal(args.journal, clock=clock)
    if args.rollback:
        with open(args.rollback, encoding='utf-8') as handle:
            source_report = json.load(handle)
        report = executor.execute_rollback(source_report, journal)
        success = report['status'] == 'ROLLBACK_POSTCONDITION_VERIFIED'
    else:
        report = executor.execute_forward(journal)
        success = report['status'] == 'EXECUTED_POSTCONDITION_VERIFIED'
    durable_json(args.report, report, exclusive=True)
    print(json.dumps({
        'status': report['status'],
        'report': os.path.abspath(args.report),
        'reportPayloadSha256': report['reportPayloadSha256'],
    }, indent=2, sort_keys=True))
    return 0 if success else 1


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except (ValueError, RuntimeError, OSError) as error:
        print(json.dumps({'status': 'REJECTED', 'error': str(error)}, indent=2), file=sys.stderr)
        raise SystemExit(2)
