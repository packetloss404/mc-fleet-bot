#!/usr/bin/env python3
"""Journaled, fail-closed UUID relocation transaction for town construction.

Validation is offline. ``--execute`` is the only mode that changes the live
world. It moves each manifest UUID no more than once, verifies immutable NBT
paths immediately, and compensates every completed row on the first mismatch.
"""

import argparse
import hashlib
import json
import math
import os
import re
import sys
import tempfile
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mc_admin import Rcon, connect  # noqa: E402


DEFAULT_MANIFEST = (
    'data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.manifest.json'
)
DEFAULT_JOURNAL = (
    'data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.journal.json'
)
DEFAULT_PREFLIGHT_REPORT = (
    'data/world-review/town-entity-evacuation-destination-preflight.json'
)
COUNT_RE = re.compile(r'Test passed[.,]\s*count:\s*(\d+)', re.IGNORECASE)
EMPTY_RE = re.compile(r'(?:Test failed|No entity was found)', re.IGNORECASE)
FORCELOAD_RE = re.compile(r'\[(-?\d+), (-?\d+)\]')
POS_RE = re.compile(
    r'\[\s*(-?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?)d,\s*'
    r'(-?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?)d,\s*'
    r'(-?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?)d\s*\]'
)
ROTATION_RE = re.compile(
    r'\[\s*(-?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?)f,\s*'
    r'(-?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?)f\s*\]'
)
SAFE_GROUND = {
    'minecraft:grass_block',
    'minecraft:dirt',
    'minecraft:coarse_dirt',
    'minecraft:podzol',
    'minecraft:moss_block',
    'minecraft:sand',
    'minecraft:stone',
}
AIR_BLOCKS = {'minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'}
VOLATILE_PROJECTION_PATHS = {
    'minecraft:bee': {
        'HivePos', 'hive_pos', 'FlowerPos', 'flower_pos',
    },
}


def utc_now():
    return (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace('+00:00', 'Z')
    )


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'))


def sha256_file(filename):
    digest = hashlib.sha256()
    with open(filename, 'rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def load_json(filename):
    with open(filename, encoding='utf-8') as handle:
        return json.load(handle)


def durable_json(filename, value):
    directory = os.path.dirname(os.path.abspath(filename))
    os.makedirs(directory, exist_ok=True)
    descriptor, temporary = tempfile.mkstemp(
        prefix='.entity-evacuation-', suffix='.json.tmp', dir=directory
    )
    try:
        with os.fdopen(descriptor, 'w', encoding='utf-8') as handle:
            json.dump(value, handle, indent=2, sort_keys=True)
            handle.write('\n')
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, filename)
        directory_fd = os.open(directory, os.O_RDONLY)
        try:
            os.fsync(directory_fd)
        finally:
            os.close(directory_fd)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def create_json_exclusive(filename, value):
    directory = os.path.dirname(os.path.abspath(filename))
    os.makedirs(directory, exist_ok=True)
    descriptor = os.open(
        filename, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600
    )
    try:
        with os.fdopen(descriptor, 'w', encoding='utf-8') as handle:
            json.dump(value, handle, indent=2, sort_keys=True)
            handle.write('\n')
            handle.flush()
            os.fsync(handle.fileno())
        directory_fd = os.open(directory, os.O_RDONLY)
        try:
            os.fsync(directory_fd)
        finally:
            os.close(directory_fd)
    except Exception:
        if os.path.exists(filename):
            os.unlink(filename)
        raise


def parse_count(reply):
    match = COUNT_RE.search(reply)
    if match:
        return int(match.group(1))
    if EMPTY_RE.search(reply):
        return 0
    raise RuntimeError(f'unrecognized selector count reply: {reply!r}')


def parse_forceloads(reply):
    return {
        (int(chunk_x), int(chunk_z))
        for chunk_x, chunk_z in FORCELOAD_RE.findall(reply)
    }


def force_load_add_succeeded(reply):
    normalized = reply.lower()
    return any(
        phrase in normalized
        for phrase in (
            'marked for force loading',
            'to be force loaded',
            'already marked',
        )
    )


def reply_value(reply):
    marker = ' has the following entity data: '
    if marker not in reply:
        return {'present': False}
    return {'present': True, 'value': reply.split(marker, 1)[1].strip()}


def expected_projection(projection):
    return {
        'entityType': projection['entityType'],
        'paths': projection['paths'],
        'values': {
            field: {
                key: value
                for key, value in projection['values'][field].items()
                if key in ('present', 'value')
            }
            for field in projection['paths']
        },
        'vehicleRelationPresent': projection['vehicleRelationPresent'],
        'passengerRelationPresent': projection['passengerRelationPresent'],
    }


def projection_sha256(projection):
    return hashlib.sha256(canonical(projection).encode()).hexdigest()


def comparable_projection(projection):
    comparable = json.loads(json.dumps(projection))
    volatile = VOLATILE_PROJECTION_PATHS.get(
        comparable.get('entityType'), set()
    )
    comparable['paths'] = [
        field for field in comparable.get('paths', [])
        if field not in volatile
    ]
    comparable['values'] = {
        field: value
        for field, value in comparable.get('values', {}).items()
        if field not in volatile
    }
    return comparable


def projections_equal(left, right):
    return comparable_projection(left) == comparable_projection(right)


def validate_manifest(manifest, manifest_path):
    errors = []
    if manifest.get('schemaVersion') != 2:
        errors.append('manifest schemaVersion must be 2')
    rows = manifest.get('transactionRows')
    if not isinstance(rows, list) or not rows:
        errors.append('manifest has no transactionRows')
        rows = []
    uuid_keys = [row.get('uuidKey') for row in rows]
    if len(set(uuid_keys)) != len(uuid_keys):
        errors.append('transactionRows contain duplicate UUIDs')
    destination_chunks = []
    order_keys = []
    for index, row in enumerate(rows, 1):
        prefix = f'transactionRows[{index}]'
        expected_priority = (
            0 if row.get('entityType') == 'minecraft:item'
            else 1 if row.get('entityType') == 'minecraft:chest_minecart'
            else 2 if row.get('policyClass') == 'special-relocatable'
            else 3
        )
        if row.get('executionPriority') != expected_priority:
            errors.append(f'{prefix} has invalid execution priority')
        order_keys.append((
            expected_priority,
            row.get('entityType', ''),
            row.get('uuidKey', ''),
        ))
        if row.get('disposition') != 'ELIGIBLE_REVERSIBLE_RELOCATION':
            errors.append(f'{prefix} is not eligible')
        if row.get('hardStopReasons'):
            errors.append(f'{prefix} has hard-stop reasons')
        if len(row.get('uuidIntArray', [])) != 4:
            errors.append(f'{prefix} has invalid UUID')
        projection = row.get('immutableProjection')
        if not isinstance(projection, dict):
            errors.append(f'{prefix} has no immutable projection')
        else:
            normalized = expected_projection(projection)
            if projection_sha256(normalized) != row.get(
                'immutableProjectionSha256'
            ):
                errors.append(f'{prefix} immutable projection hash mismatch')
        observations = row.get('collisionObservations')
        if not isinstance(observations, list) or not observations:
            errors.append(f'{prefix} lost its collision observations')
        slot = row.get('sanctuarySlot', {})
        if len(slot.get('destination', [])) != 3:
            errors.append(f'{prefix} has invalid destination')
        destination_chunk = slot.get('destinationChunk')
        if (
            not isinstance(destination_chunk, list)
            or len(destination_chunk) != 2
        ):
            errors.append(f'{prefix} has invalid destination chunk')
        else:
            destination_chunks.append(tuple(destination_chunk))
        footing_columns = slot.get('footingColumns')
        if not isinstance(footing_columns, list) or len(footing_columns) != 25:
            errors.append(f'{prefix} lacks exact 25-cell footing evidence')
        else:
            if any(
                column.get('ground') not in SAFE_GROUND
                or column.get('headOne') not in AIR_BLOCKS
                or column.get('headTwo') not in AIR_BLOCKS
                for column in footing_columns
            ):
                errors.append(f'{prefix} has unsafe footing/headroom types')
        if (
            row.get('entityType') == 'minecraft:turtle'
            and slot.get('centerGround') != 'minecraft:sand'
        ):
            errors.append(f'{prefix} turtle destination is not natural sand')
        if row.get('entityType') == 'minecraft:chest_minecart':
            if not slot.get('temporaryRail'):
                errors.append(f'{prefix} chest minecart has no rail contract')
    if len(set(destination_chunks)) != len(rows):
        errors.append(
            'every transaction row must use a distinct destination chunk'
        )
    if order_keys != sorted(order_keys):
        errors.append(
            'transactionRows violate deterministic item/vehicle/special/livestock order'
        )
    source = manifest.get('source', {})
    for field, hash_field in (
        ('gate', 'gateSha256'),
        ('operations', 'operationSha256'),
    ):
        filename = source.get(field)
        if not filename or not os.path.exists(filename):
            errors.append(f'source {field} is unavailable')
        elif sha256_file(filename) != source.get(hash_field):
            errors.append(f'source {field} hash mismatch')
    return {
        'mode': 'validate',
        'manifest': os.path.abspath(manifest_path),
        'manifestSha256': sha256_file(manifest_path),
        'valid': not errors,
        'errors': errors,
        'transactionRows': len(rows),
        'uniqueUuids': len(set(uuid_keys)),
        'uniqueDestinationChunks': len(set(destination_chunks)),
        'authorizedForPartialEvacuation': (
            manifest.get('authorizedForPartialEvacuation') is True
        ),
        'worldReleaseAuthorized': (
            manifest.get('worldReleaseAuthorized') is True
        ),
    }


def validate_gate_freshness(manifest, max_age_seconds, now=None):
    gate_path = manifest.get('source', {}).get('gate')
    if not gate_path or not os.path.exists(gate_path):
        raise RuntimeError('manifest gate is unavailable')
    if sha256_file(gate_path) != manifest['source'].get('gateSha256'):
        raise RuntimeError('manifest gate changed after plan generation')
    gate = load_json(gate_path)
    generated = gate.get('generatedAtUtc')
    if not isinstance(generated, str):
        raise RuntimeError('gate has no generatedAtUtc')
    generated_at = datetime.fromisoformat(generated.replace('Z', '+00:00'))
    now = now or datetime.now(timezone.utc)
    age = (now - generated_at).total_seconds()
    if age < -30:
        raise RuntimeError(f'gate timestamp is {abs(age):.1f}s in the future')
    if age > max_age_seconds:
        raise RuntimeError(
            f'gate is stale ({age:.1f}s > {max_age_seconds}s); '
            'capture a fresh gate and regenerate the manifest'
        )
    audit = gate.get('forceLoadAudit', {})
    if (
        gate.get('schemaVersion') != 2
        or audit.get('allTemporaryChunksReleased') is not True
        or audit.get('finalSetMatchesPreExistingSet') is not True
        or audit.get('cleanupErrors') != []
    ):
        raise RuntimeError('fresh gate failed its restoration contract')
    return age


def source_chunk_neighborhood(row):
    source_x, source_z = row['currentIdentity']['sourceChunk']
    return {
        (source_x + dx, source_z + dz)
        for dx in (-1, 0, 1)
        for dz in (-1, 0, 1)
    }


def validate_destination_preflight(report, manifest, manifest_path, now=None):
    errors = []
    if report.get('status') != 'PASS':
        errors.append('preflight status is not PASS')
    if report.get('manifestSha256') != sha256_file(manifest_path):
        errors.append('preflight manifest hash mismatch')
    if report.get('gateSha256') != manifest.get('source', {}).get('gateSha256'):
        errors.append('preflight gate hash mismatch')
    if report.get('executorSha256') != sha256_file(__file__):
        errors.append('preflight executor hash mismatch')
    rows = report.get('rows', [])
    expected_rows = manifest.get('transactionRows', [])
    if len(rows) != len(expected_rows):
        errors.append('preflight row count mismatch')
    if any(
        row.get('status') != 'PASS'
        or row.get('verifiedFootingColumns') != 25
        for row in rows
    ):
        errors.append('preflight did not pass all 25-cell destination probes')
    completed = report.get('completedAtUtc')
    try:
        completed_at = datetime.fromisoformat(completed.replace('Z', '+00:00'))
        age = ((now or datetime.now(timezone.utc)) - completed_at).total_seconds()
        if age < -5 or age > 60:
            errors.append(f'preflight age {age:.1f}s is outside 0..60s')
    except (AttributeError, ValueError):
        errors.append('preflight completedAtUtc is invalid')
    return errors


class LiveTransaction:
    def __init__(self, manifest, manifest_path, journal_path):
        self.manifest = manifest
        self.manifest_path = manifest_path
        self.journal_path = journal_path
        self.client = None
        self.rcon = None
        self.journal = None

    def open(self):
        self.client = connect()
        self.rcon = Rcon(self.client)

    def close(self):
        if self.client is not None:
            self.client.close()
            self.client = None
            self.rcon = None

    def save(self):
        self.journal['updatedAtUtc'] = utc_now()
        durable_json(self.journal_path, self.journal)

    def force_set(self):
        return parse_forceloads(self.rcon.cmd('forceload query'))

    def ensure_loaded(self, chunks):
        before = self.force_set()
        temporary = []
        for chunk in sorted(set(chunks)):
            if chunk in before:
                continue
            if len(before) + len(temporary) >= 256:
                raise RuntimeError('server force-load capacity exhausted')
            reply = self.rcon.cmd(
                f'forceload add {chunk[0] * 16} {chunk[1] * 16}'
            )
            if not force_load_add_succeeded(reply):
                raise RuntimeError(f'force-load add failed for {chunk}: {reply}')
            temporary.append(chunk)
        after = self.force_set()
        if not set(chunks).issubset(after):
            raise RuntimeError('force-load verification failed')
        return temporary

    def release(self, chunks):
        original = {
            tuple(chunk) for chunk in self.journal['preExistingForceLoads']
        }
        for chunk in sorted(set(chunks)):
            if chunk in original:
                continue
            self.rcon.cmd(
                f'forceload remove {chunk[0] * 16} {chunk[1] * 16}'
            )
        remaining = self.force_set()
        leaked = set(chunks) - original
        if leaked & remaining:
            raise RuntimeError(f'temporary force-load leak: {sorted(leaked & remaining)}')

    def restore_force_set(self):
        original = {
            tuple(chunk) for chunk in self.journal['preExistingForceLoads']
        }
        current = self.force_set()
        owned_temporary = {
            tuple(chunk)
            for row in self.journal.get('rows', [])
            for chunk in (
                row.get('temporaryForceLoads', [])
                + row.get('plannedForceLoads', [])
            )
        }
        for chunk in sorted((current - original) & owned_temporary):
            self.rcon.cmd(
                f'forceload remove {chunk[0] * 16} {chunk[1] * 16}'
            )
        for chunk in sorted(original - current):
            self.rcon.cmd(
                f'forceload add {chunk[0] * 16} {chunk[1] * 16}'
            )
        final = self.force_set()
        if final != original:
            raise RuntimeError(
                'failed to restore exact pre-existing force-load set without '
                'deleting an unowned concurrent addition: '
                f'missing={sorted(original - final)}, extra={sorted(final - original)}'
            )

    def selector(self, row, limit=2):
        values = ','.join(str(value) for value in row['uuidIntArray'])
        return (
            f'@e[type={row["entityType"]},'
            f'nbt={{UUID:[I;{values}]}},limit={limit}]'
        )

    def identity_count(self, row):
        return parse_count(
            self.rcon.cmd(f'execute if entity {self.selector(row)}')
        )

    def position(self, row):
        reply = self.rcon.cmd(
            f'data get entity {self.selector(row, limit=1)} Pos'
        )
        match = POS_RE.search(reply)
        if not match:
            raise RuntimeError(f'cannot parse UUID position: {reply!r}')
        return [float(match.group(index)) for index in range(1, 4)]

    def rotation(self, row):
        reply = self.rcon.cmd(
            f'data get entity {self.selector(row, limit=1)} Rotation'
        )
        match = ROTATION_RE.search(reply)
        if not match:
            raise RuntimeError(f'cannot parse UUID rotation: {reply!r}')
        return [float(match.group(index)) for index in range(1, 3)]

    def projection(self, row):
        expected = expected_projection(row['immutableProjection'])
        selector = self.selector(row, limit=1)
        values = {}
        for field in expected['paths']:
            values[field] = reply_value(
                self.rcon.cmd(f'data get entity {selector} {field}')
            )
        vehicle = self.rcon.cmd(
            f'execute as {selector} on vehicle run data get entity @s UUID'
        )
        passengers = self.rcon.cmd(
            f'execute as {selector} on passengers run data get entity @s UUID'
        )
        return {
            'entityType': row['entityType'],
            'paths': expected['paths'],
            'values': values,
            'vehicleRelationPresent': (
                ' has the following entity data: ' in vehicle
            ),
            'passengerRelationPresent': (
                ' has the following entity data: ' in passengers
            ),
        }

    def verify_footing(self, row, full_footing=False):
        slot = row['sanctuarySlot']
        destination = slot['destination']
        block_x = math.floor(destination[0])
        block_y = math.floor(destination[1])
        block_z = math.floor(destination[2])
        occupied = parse_count(self.rcon.cmd(
            f'execute positioned {destination[0]} {destination[1]} '
            f'{destination[2]} if entity @e[distance=..1.5,limit=2]'
        ))
        if occupied:
            raise RuntimeError(f'destination occupied by {occupied} entity/entities')
        if full_footing:
            footing_columns = slot.get('footingColumns')
            if not isinstance(footing_columns, list) or len(footing_columns) != 25:
                raise RuntimeError('manifest lacks exact 25-cell footing evidence')
            checks = []
            for column in footing_columns:
                checks.extend([
                    (
                        column['x'], column['y'], column['z'],
                        column['ground'],
                    ),
                    (
                        column['x'], column['y'] + 1, column['z'],
                        column['headOne'],
                    ),
                    (
                        column['x'], column['y'] + 2, column['z'],
                        column['headTwo'],
                    ),
                ])
            if slot.get('temporaryRail'):
                rail = slot['temporaryRail']
                x, y, z = rail['position']
                checks.append((x, y, z, rail['before']))
        elif slot.get('temporaryRail'):
            rail = slot['temporaryRail']
            x, y, z = rail['position']
            checks = [
                (x, y, z, rail['before']),
                (x, y + 1, z, 'minecraft:air'),
            ]
        else:
            ground_x, ground_y, ground_z = slot['centerGroundPosition']
            checks = [
                (ground_x, ground_y, ground_z, slot['centerGround']),
                (block_x, block_y, block_z, 'minecraft:air'),
                (block_x, block_y + 1, block_z, 'minecraft:air'),
            ]
        for x, y, z, block in checks:
            reply = self.rcon.cmd(
                f'execute if block {x} {y} {z} {block}'
            )
            if 'passed' not in reply.lower():
                raise RuntimeError(
                    f'destination footing mismatch at {(x, y, z)}: {reply}'
                )
        return 25 if full_footing else 1

    def set_rail(self, row):
        rail = row['sanctuarySlot'].get('temporaryRail')
        if not rail:
            return
        x, y, z = rail['position']
        reply = self.rcon.cmd(
            f'execute if block {x} {y} {z} {rail["before"]} '
            f'run setblock {x} {y} {z} {rail["during"]}'
        )
        if 'changed' not in reply.lower():
            raise RuntimeError(f'temporary rail placement failed: {reply}')

    def remove_rail(self, row, tolerate_absent=False):
        rail = row['sanctuarySlot'].get('temporaryRail')
        if not rail:
            return
        x, y, z = rail['position']
        if tolerate_absent:
            probe = self.rcon.cmd(
                f'execute if block {x} {y} {z} {rail["during"]}'
            )
            if 'passed' not in probe.lower():
                absent = self.rcon.cmd(
                    f'execute if block {x} {y} {z} {rail["after"]}'
                )
                if 'passed' in absent.lower():
                    return
                raise RuntimeError(
                    f'temporary rail is neither exact rail nor rollback state: '
                    f'{probe!r}; {absent!r}'
                )
        reply = self.rcon.cmd(
            f'execute if block {x} {y} {z} {rail["during"]} '
            f'run setblock {x} {y} {z} {rail["after"]}'
        )
        if 'changed' not in reply.lower():
            raise RuntimeError(f'temporary rail rollback failed: {reply}')

    @staticmethod
    def position_matches(actual, expected, tolerance=0.15):
        return math.dist(actual, expected) <= tolerance

    @staticmethod
    def rotation_matches(actual, expected, tolerance=0.01):
        return all(
            abs(left - right) <= tolerance
            for left, right in zip(actual, expected)
        )

    def preflight_destinations(self, report_path, batch_limit=32):
        report = {
            'schemaVersion': 1,
            'generatedAtUtc': utc_now(),
            'mode': 'all-destination-live-preflight',
            'manifest': os.path.abspath(self.manifest_path),
            'manifestSha256': sha256_file(self.manifest_path),
            'gate': self.manifest['source']['gate'],
            'gateSha256': self.manifest['source']['gateSha256'],
            'executor': os.path.abspath(__file__),
            'executorSha256': sha256_file(__file__),
            'batchLimit': batch_limit,
            'status': 'RUNNING',
            'rows': [],
            'badDestinationChunks': [],
            'errors': [],
        }
        self.open()
        try:
            original = sorted(self.force_set())
            original_set = set(original)
            self.journal = {
                'preExistingForceLoads': [list(chunk) for chunk in original],
                'rows': [],
            }
            rows = self.manifest['transactionRows']
            for offset in range(0, len(rows), batch_limit):
                batch = rows[offset:offset + batch_limit]
                chunks = {
                    tuple(row['sanctuarySlot']['destinationChunk'])
                    for row in batch
                }
                intent = {
                    'plannedForceLoads': [
                        list(chunk) for chunk in sorted(chunks)
                    ],
                    'temporaryForceLoads': [],
                }
                self.journal['rows'].append(intent)
                temporary = []
                load_error = None
                try:
                    temporary = self.ensure_loaded(chunks)
                    intent['temporaryForceLoads'] = [
                        list(chunk) for chunk in temporary
                    ]
                except Exception as error:
                    load_error = str(error)
                for row in batch:
                    destination_chunk = tuple(
                        row['sanctuarySlot']['destinationChunk']
                    )
                    errors = []
                    verified_columns = 0
                    if destination_chunk in original_set:
                        errors.append(
                            'destination-chunk-was-preexisting-force-loaded'
                        )
                    if load_error:
                        errors.append(f'batch-force-load-error: {load_error}')
                    else:
                        try:
                            verified_columns = self.verify_footing(
                                row, full_footing=True
                            )
                        except Exception as error:
                            errors.append(str(error))
                            verified_columns = 0
                    report['rows'].append({
                        'transactionIndex': row['transactionIndex'],
                        'uuidKey': row['uuidKey'],
                        'entityType': row['entityType'],
                        'destination': row['sanctuarySlot']['destination'],
                        'destinationChunk': list(destination_chunk),
                        'footingStrategy':
                            row['sanctuarySlot']['footingStrategy'],
                        'typeRule': (
                            'turtle-natural-sand'
                            if row['entityType'] == 'minecraft:turtle'
                            else 'chest-minecart-exact-rail-before'
                            if row['entityType'] == 'minecraft:chest_minecart'
                            else 'dry-safe-generated-ground'
                        ),
                        'footingEvidenceSha256':
                            row['sanctuarySlot']['footingEvidenceSha256'],
                        'verifiedFootingColumns': verified_columns,
                        'status': 'PASS' if not errors else 'FAIL',
                        'errors': errors,
                    })
                try:
                    self.release(temporary)
                except Exception as error:
                    report['errors'].append({
                        'batchOffset': offset,
                        'stage': 'batch-force-load-release',
                        'error': str(error),
                    })
            try:
                self.restore_force_set()
            except Exception as error:
                report['errors'].append({
                    'stage': 'exact-force-load-restoration',
                    'error': str(error),
                })
            report['badDestinationChunks'] = [
                list(chunk)
                for chunk in sorted({
                    tuple(row['destinationChunk'])
                    for row in report['rows']
                    if row['status'] != 'PASS'
                })
            ]
            report['counts'] = {
                'destinations': len(report['rows']),
                'passed': sum(
                    row['status'] == 'PASS' for row in report['rows']
                ),
                'failed': sum(
                    row['status'] != 'PASS' for row in report['rows']
                ),
                'reportErrors': len(report['errors']),
            }
            report['status'] = (
                'PASS'
                if (
                    report['counts']['failed'] == 0
                    and report['counts']['reportErrors'] == 0
                )
                else 'FAIL'
            )
            report['completedAtUtc'] = utc_now()
        except Exception as error:
            report['errors'].append({
                'stage': 'preflight-fatal',
                'error': str(error),
            })
            report['status'] = 'FAIL'
            try:
                if self.journal is not None:
                    self.restore_force_set()
            except Exception as restore_error:
                report['errors'].append({
                    'stage': 'fatal-force-load-restoration',
                    'error': str(restore_error),
                })
        finally:
            self.close()
            report.setdefault('completedAtUtc', utc_now())
            durable_json(report_path, report)
        return report

    def rollback_rows(self):
        failures = []
        for journal_row in reversed(self.journal.get('rows', [])):
            if journal_row.get('state') == 'rolled-back':
                continue
            if not (
                journal_row.get('railPlacementIntended')
                or journal_row.get('teleportIssued')
            ):
                continue
            row = self.manifest['transactionRows'][journal_row['manifestIndex']]
            destination = row['sanctuarySlot']['destination']
            chunks = {
                tuple(journal_row['beforeChunk']),
                (math.floor(destination[0]) // 16, math.floor(destination[2]) // 16),
            }
            temporary = []
            try:
                temporary = self.ensure_loaded(chunks)
                if journal_row.get('teleportIssued'):
                    if self.identity_count(row) != 1:
                        raise RuntimeError(
                            'rollback UUID/type count is not exactly one'
                        )
                    self.rcon.cmd(
                        f'tp {self.selector(row, limit=1)} '
                        + ' '.join(str(value) for value in journal_row['beforePos'])
                        + ' '
                        + ' '.join(
                            str(value) for value in journal_row['beforeRotation']
                        )
                    )
                    if not self.position_matches(
                        self.position(row), journal_row['beforePos']
                    ):
                        raise RuntimeError('rollback position verification failed')
                    if not projections_equal(
                        self.projection(row), journal_row['immutableBefore']
                    ):
                        raise RuntimeError('rollback immutable projection mismatch')
                self.remove_rail(row, tolerate_absent=True)
                journal_row['state'] = 'rolled-back'
                journal_row['rolledBackAtUtc'] = utc_now()
            except Exception as error:
                journal_row['state'] = 'rollback-failed'
                journal_row['rollbackError'] = str(error)
                failures.append({'uuidKey': row['uuidKey'], 'error': str(error)})
            finally:
                try:
                    self.release(temporary)
                except Exception as error:
                    failures.append({'stage': 'force-load-release', 'error': str(error)})
                self.save()
        return failures

    def execute(self):
        # A read-only destination preflight may have used an in-memory cleanup
        # ledger on this object. It must never be mistaken for a created move
        # journal if exclusive journal creation fails.
        self.journal = None
        self.open()
        try:
            initial = sorted(self.force_set())
            initial_set = set(initial)
            preloaded_destinations = {
                tuple(row['sanctuarySlot']['destinationChunk'])
                for row in self.manifest['transactionRows']
            } & initial_set
            if preloaded_destinations:
                raise RuntimeError(
                    'destination chunks must be unloadable but were already '
                    f'force-loaded: {sorted(preloaded_destinations)}'
                )
            initial_journal = {
                'schemaVersion': 1,
                'transactionId': 'town-entity-evacuation-' + utc_now(),
                'manifest': os.path.abspath(self.manifest_path),
                'manifestSha256': sha256_file(self.manifest_path),
                'startedAtUtc': utc_now(),
                'status': 'running',
                'preExistingForceLoads': [list(chunk) for chunk in initial],
                'rows': [],
            }
            create_json_exclusive(self.journal_path, initial_journal)
            self.journal = initial_journal
            completed_uuid_keys = set()
            for manifest_index, row in enumerate(self.manifest['transactionRows']):
                if row['uuidKey'] in completed_uuid_keys:
                    raise RuntimeError(f'duplicate move refused: {row["uuidKey"]}')
                destination = row['sanctuarySlot']['destination']
                source_neighborhood = source_chunk_neighborhood(row)
                chunks = {
                    *source_neighborhood,
                    (
                        math.floor(destination[0]) // 16,
                        math.floor(destination[2]) // 16,
                    ),
                }
                temporary = []
                journal_row = {
                    'manifestIndex': manifest_index,
                    'uuidKey': row['uuidKey'],
                    'entityType': row['entityType'],
                    'plannedForceLoads': [
                        list(chunk) for chunk in sorted(chunks)
                    ],
                    'temporaryForceLoads': [],
                    'railPlacementIntended': False,
                    'teleportIssued': False,
                    'state': 'force-load-intent',
                    'preparedAtUtc': utc_now(),
                }
                self.journal['rows'].append(journal_row)
                self.save()
                try:
                    temporary = self.ensure_loaded(chunks)
                    journal_row['temporaryForceLoads'] = [
                        list(chunk) for chunk in temporary
                    ]
                    journal_row['state'] = 'force-loaded'
                    self.save()
                    if self.identity_count(row) != 1:
                        raise RuntimeError('prequery UUID/type count is not exactly one')
                    before_pos = self.position(row)
                    before_rotation = self.rotation(row)
                    before_projection = self.projection(row)
                    expected = expected_projection(row['immutableProjection'])
                    if not projections_equal(before_projection, expected):
                        raise RuntimeError('live immutable projection differs from manifest')
                    self.verify_footing(row)
                    journal_row.update({
                        'beforePos': before_pos,
                        'beforeRotation': before_rotation,
                        'beforeChunk': [
                            math.floor(before_pos[0]) // 16,
                            math.floor(before_pos[2]) // 16,
                        ],
                        'immutableBefore': before_projection,
                        'state': 'prepared',
                    })
                    self.save()
                    if row['sanctuarySlot'].get('temporaryRail'):
                        journal_row['railPlacementIntended'] = True
                        journal_row['state'] = 'rail-placement-intent'
                        self.save()
                        self.set_rail(row)
                        journal_row['state'] = 'rail-placed'
                        self.save()
                    journal_row['teleportIssued'] = True
                    journal_row['state'] = 'teleport-issued'
                    self.save()
                    reply = self.rcon.cmd(
                        f'tp {self.selector(row, limit=1)} '
                        + ' '.join(str(value) for value in destination)
                    )
                    if 'teleported' not in reply.lower():
                        raise RuntimeError(f'teleport command did not succeed: {reply}')
                    if self.identity_count(row) != 1:
                        raise RuntimeError('postquery UUID/type count is not exactly one')
                    if not self.position_matches(self.position(row), destination):
                        raise RuntimeError('postquery destination mismatch')
                    after_projection = self.projection(row)
                    if not projections_equal(
                        after_projection, before_projection
                    ):
                        raise RuntimeError('postquery immutable projection mismatch')
                    journal_row['immutableAfter'] = after_projection
                    journal_row['state'] = 'completed'
                    journal_row['completedAtUtc'] = utc_now()
                    completed_uuid_keys.add(row['uuidKey'])
                    self.save()
                finally:
                    self.release(temporary)
            self.restore_force_set()
            self.journal['status'] = 'partial-evacuation-completed'
            self.journal['worldReleaseAuthorized'] = False
            self.journal['completedAtUtc'] = utc_now()
            self.save()
            return self.journal
        except Exception as error:
            if self.journal is not None:
                self.journal['status'] = 'failed-rolling-back'
                self.journal['failure'] = str(error)
                self.save()
                failures = self.rollback_rows()
                try:
                    self.restore_force_set()
                except Exception as restore_error:
                    failures.append({
                        'stage': 'force-load-restoration',
                        'error': str(restore_error),
                    })
                self.journal['status'] = (
                    'failed-rolled-back' if not failures else 'rollback-failed'
                )
                self.journal['rollbackFailures'] = failures
                self.save()
            raise
        finally:
            self.close()

    def verify(self):
        self.journal = load_json(self.journal_path)
        if self.journal.get('manifestSha256') != sha256_file(self.manifest_path):
            raise RuntimeError('journal manifest identity mismatch')
        self.open()
        errors = []
        try:
            for journal_row in self.journal.get('rows', []):
                if journal_row.get('state') != 'completed':
                    continue
                row = self.manifest['transactionRows'][journal_row['manifestIndex']]
                destination = row['sanctuarySlot']['destination']
                chunk = (
                    math.floor(destination[0]) // 16,
                    math.floor(destination[2]) // 16,
                )
                temporary = self.ensure_loaded({chunk})
                try:
                    if self.identity_count(row) != 1:
                        errors.append({'uuidKey': row['uuidKey'], 'error': 'count'})
                    elif not self.position_matches(self.position(row), destination):
                        errors.append({'uuidKey': row['uuidKey'], 'error': 'position'})
                    elif not projections_equal(
                        self.projection(row), journal_row['immutableAfter']
                    ):
                        errors.append({'uuidKey': row['uuidKey'], 'error': 'projection'})
                finally:
                    self.release(temporary)
            self.restore_force_set()
        finally:
            self.close()
        return {'mode': 'verify', 'valid': not errors, 'errors': errors}

    def rollback(self):
        self.journal = load_json(self.journal_path)
        if self.journal.get('manifestSha256') != sha256_file(self.manifest_path):
            raise RuntimeError('journal manifest identity mismatch')
        self.open()
        try:
            failures = self.rollback_rows()
            self.restore_force_set()
            self.journal['status'] = (
                'explicitly-rolled-back' if not failures else 'rollback-failed'
            )
            self.journal['rollbackFailures'] = failures
            self.save()
            return self.journal
        finally:
            self.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--manifest', default=DEFAULT_MANIFEST)
    parser.add_argument('--journal', default=DEFAULT_JOURNAL)
    parser.add_argument('--preflight-report', default=DEFAULT_PREFLIGHT_REPORT)
    parser.add_argument('--max-gate-age-seconds', type=int, default=300)
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument('--preflight', action='store_true')
    modes.add_argument('--execute', action='store_true')
    modes.add_argument('--verify', action='store_true')
    modes.add_argument('--rollback', action='store_true')
    args = parser.parse_args()
    manifest = load_json(args.manifest)
    validation = validate_manifest(manifest, args.manifest)
    if not validation['valid']:
        print(json.dumps(validation, indent=2))
        return 2
    if not (args.preflight or args.execute or args.verify or args.rollback):
        print(json.dumps(validation, indent=2))
        return 0
    if not 1 <= args.max_gate_age_seconds <= 300:
        raise SystemExit('--max-gate-age-seconds must be between 1 and 300')
    transaction = LiveTransaction(
        manifest, args.manifest, args.journal
    )
    if args.preflight:
        result = transaction.preflight_destinations(args.preflight_report)
        print(json.dumps(result, indent=2))
        return 0 if result['status'] == 'PASS' else 3
    if args.execute:
        if manifest.get('authorizedForPartialEvacuation') is not True:
            raise SystemExit('manifest does not authorize partial evacuation')
        validate_gate_freshness(manifest, args.max_gate_age_seconds)
        preflight = transaction.preflight_destinations(args.preflight_report)
        preflight_errors = validate_destination_preflight(
            preflight, manifest, args.manifest
        )
        if preflight_errors:
            raise RuntimeError(
                'all-destination preflight failed; no relocation journal '
                f'created; see {args.preflight_report}: '
                + '; '.join(preflight_errors)
            )
        # The full 25-cell sweep takes measurable time. Recheck the entity gate
        # after it completes so movement never begins on a gate that aged out
        # during preflight.
        validate_gate_freshness(manifest, args.max_gate_age_seconds)
        result = transaction.execute()
    elif args.verify:
        result = transaction.verify()
    else:
        result = transaction.rollback()
    print(json.dumps(result, indent=2))
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except Exception as error:
        print(f'FAIL: {error}', file=sys.stderr)
        sys.exit(1)
