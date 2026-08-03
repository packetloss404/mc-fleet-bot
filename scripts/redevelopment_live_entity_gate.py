#!/usr/bin/env python3
"""Same-moment live entity gate for guarded redevelopment packages.

The immutable Anvil snapshots prove block and block-entity state, but entity
region data is intentionally not part of the snapshot contract. This gate asks
the live server for players and non-player entities only in chunks touched by an
exact REPL target's conservative safety halo.

It never changes blocks or entities. Sparse target-halo chunks are force-loaded
in bounded batches, each temporary batch is released before the next one, and
the complete pre-existing force-load set is restored and verified at the end.
"""

import argparse
import hashlib
import json
import math
import os
import re
import sys
import time
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mc_admin import Rcon, connect  # noqa: E402


DEFAULT_PACKAGES = [
    'data/buildops/westlight-infinity-screen-2026-07-27.txt',
    'data/buildops/ravenrock-s1-section-pilot-2026-07-27.txt',
    'data/buildops/mainstreet-redevelopment-r4-r5-runtime-safe-2026-07-27.txt',
    'data/buildops/mainstreet-bunker-surface-phase1-2026-07-27.txt',
    'data/buildops/mainstreet-bunker-recessed-portal-phase2-2026-07-27.txt',
]
POSITION = re.compile(
    r'([^\r\n]+?) has the following entity data: '
    r'\[(-?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?)d, '
    r'(-?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?)d, '
    r'(-?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?)d\]'
)
SELECTOR_COUNT = re.compile(r'Test passed[.,]\s*count:\s*(\d+)', re.IGNORECASE)
SELECTOR_EMPTY = re.compile(r'(?:Test failed|No entity was found)', re.IGNORECASE)
SERVER_FORCELOAD_LIMIT = 256
DEFAULT_CHUNK_BATCH_LIMIT = 64
ENTITY_NBT_CAPTURE_RADIUS = 1.0
TRANSIENT_ABSENCE_RADIUS = 4.0
LABEL_ENTITY_TYPES = {
    'Bat': 'minecraft:bat',
    'Bee': 'minecraft:bee',
    'Chicken': 'minecraft:chicken',
    'Cow': 'minecraft:cow',
    'Donkey': 'minecraft:donkey',
    'Egg': 'minecraft:egg',
    'Fox': 'minecraft:fox',
    'Minecart with Chest': 'minecraft:chest_minecart',
    'Oak Sapling': 'minecraft:item',
    'Pig': 'minecraft:pig',
    'Sheep': 'minecraft:sheep',
    'Turtle': 'minecraft:turtle',
    'Wolf': 'minecraft:wolf',
}
COMMON_PRESERVATION_PATHS = [
    'CustomName',
    'Owner',
    'OwnerUUID',
    'Leash',
    'leash',
    'Passengers',
    'Items',
    'PersistenceRequired',
    'Invulnerable',
    'NoAI',
    'Silent',
    'Glowing',
    'Tags',
    'Health',
    'Age',
    'ForcedAge',
    'InLove',
    'LoveCause',
]
TYPE_PRESERVATION_PATHS = {
    'minecraft:bee': [
        'HivePos', 'hive_pos', 'FlowerPos', 'flower_pos',
        'CannotEnterHiveTicks', 'TicksSincePollination', 'HasNectar', 'HasStung',
        'AngerTime', 'AngryAt',
    ],
    'minecraft:chest_minecart': ['Items', 'LootTable', 'LootTableSeed'],
    'minecraft:item': ['Item'],
    'minecraft:chicken': ['EggLayTime', 'IsChickenJockey'],
    'minecraft:donkey': [
        'Items', 'ChestedHorse', 'SaddleItem', 'ArmorItem',
        'Tame', 'Temper', 'Bred',
    ],
    'minecraft:fox': ['Trusted', 'Type', 'Sleeping', 'Crouching', 'Sitting'],
    'minecraft:pig': ['Saddle', 'SaddleItem', 'BoostTime'],
    'minecraft:sheep': ['Color', 'Sheared', 'EatHaystackTimer'],
    'minecraft:turtle': [
        'HomePosX', 'HomePosY', 'HomePosZ', 'TravelPosX', 'TravelPosY',
        'TravelPosZ', 'HasEgg', 'LayingEgg',
    ],
    'minecraft:wolf': [
        'Owner', 'CollarColor', 'Sitting', 'Tame', 'variant',
    ],
}


def utc_now():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z')


def parse_boxes(filename):
    boxes = []
    with open(filename, encoding='utf-8') as handle:
        for line_no, raw in enumerate(handle, 1):
            fields = raw.split()
            if not fields or fields[0].startswith('#') or fields[0] != 'REPL':
                continue
            if len(fields) < 9:
                raise ValueError(f'{filename}:{line_no}: malformed REPL operation')
            values = [int(value) for value in fields[1:7]]
            x1, y1, z1, x2, y2, z2 = values
            boxes.append({
                'line': line_no,
                'box': [
                    min(x1, x2), min(y1, y2), min(z1, z2),
                    max(x1, x2), max(y1, y2), max(z1, z2),
                ],
            })
    if not boxes:
        raise ValueError(f'{filename}: no REPL operations')
    return boxes


def envelope(boxes):
    return [
        min(entry['box'][0] for entry in boxes) - 1,
        min(entry['box'][1] for entry in boxes) - 2,
        min(entry['box'][2] for entry in boxes) - 1,
        # A target cell at coordinate N occupies [N, N + 1). Include the
        # positive cell extent before applying the configured safety halo.
        max(entry['box'][3] for entry in boxes) + 2,
        max(entry['box'][4] for entry in boxes) + 3,
        max(entry['box'][5] for entry in boxes) + 2,
    ]


def parse_entities(reply, category):
    return [
        {
            'category': category,
            'label': match.group(1).strip(),
            'position': [float(match.group(2)), float(match.group(3)), float(match.group(4))],
        }
        for match in POSITION.finditer(reply)
    ]


def parse_selector_count(reply):
    match = SELECTOR_COUNT.search(reply)
    if match:
        return int(match.group(1))
    if SELECTOR_EMPTY.search(reply):
        return 0
    raise ValueError(f'unrecognized entity-count reply: {reply!r}')


def touches(box, position):
    x, y, z = position
    x1, y1, z1, x2, y2, z2 = box
    return (
        x1 - 1 <= x <= x2 + 2
        and y1 - 2 <= y <= y2 + 3
        and z1 - 1 <= z <= z2 + 2
    )


def touches_exact_cell_volume(box, position):
    """Return whether an entity point is inside an exact target cell volume."""
    x, y, z = position
    x1, y1, z1, x2, y2, z2 = box
    return (
        x1 <= x < x2 + 1
        and y1 <= y < y2 + 1
        and z1 <= z < z2 + 1
    )


def contains_exact_block(box, position):
    x, y, z = position
    x1, y1, z1, x2, y2, z2 = box
    return x1 <= x <= x2 and y1 <= y <= y2 and z1 <= z <= z2


def parse_int_array_payload(path_reply):
    if not path_reply.get('present'):
        return None
    try:
        payload = reply_payload(path_reply['reply'])
    except EntityNbtCaptureError:
        return None
    match = re.fullmatch(
        r'\[I;\s*(-?\d+),\s*(-?\d+),\s*(-?\d+)\]',
        payload,
    )
    if not match:
        return None
    return [int(match.group(index)) for index in range(1, 4)]


def protected_nonblocking_evidence(entity, boxes):
    """Return narrow, auditable evidence for a safe halo-only observation."""
    if entity.get('category') == 'player':
        return None
    if entity.get('label') == 'Egg':
        absence = entity.get('transientAbsenceProof', {})
        if (
            entity.get('nbtCaptureError', '').startswith(
                'NBT capture found no minecraft:egg'
            )
            and absence.get('entityType') == 'minecraft:egg'
            and absence.get('radius') == TRANSIENT_ABSENCE_RADIUS
            and absence.get('confirmedCount') == 0
        ):
            return {
                'policy': 'expired-transient-projectile',
                'reason': (
                    'The observed Egg no longer exists within four blocks of '
                    'its queried position and therefore cannot intersect an '
                    'exact target cell.'
                ),
                'absenceProof': absence,
            }
        return None
    capture = entity.get('nbtCapture')
    if not capture:
        return None
    captured_position = capture.get('capturedPosition')
    expected_type = LABEL_ENTITY_TYPES.get(entity.get('label'))
    if (
        expected_type is None
        or capture.get('entityType') != expected_type
        or capture.get('capturedId') != expected_type
        or capture.get('identityChecksPassed') is not True
        or not isinstance(captured_position, list)
        or len(captured_position) != 3
        or not all(
            isinstance(value, (int, float)) and math.isfinite(value)
            for value in captured_position
        )
    ):
        return None
    if any(
        touches_exact_cell_volume(entry['box'], position)
        for entry in boxes
        for position in (entity['position'], captured_position)
    ):
        return None
    if entity.get('label') == 'Bat':
        preservation = capture.get('preservationPaths', {})

        def has_special_value(path, ordinary_values):
            record = preservation.get(path, {})
            if record.get('present') is not True:
                return False
            try:
                value = reply_payload(record.get('reply', ''))
            except EntityNbtCaptureError:
                return True
            return value not in ordinary_values

        if (
            has_special_value('CustomName', set())
            or has_special_value(
                'PersistenceRequired',
                {'0b', 'false'},
            )
            or has_special_value('Tags', {'[]'})
            or capture.get('vehicleRelationPresent') is not False
            or capture.get('passengerRelationPresent') is not False
        ):
            return None
        return {
            'policy': 'ambient-unattached-bat-outside-exact-target',
            'reason': (
                'The identity-verified ambient Bat is halo-only at both '
                'observed positions and has no name, persistence, tags, '
                'vehicle, or passengers.'
            ),
            'batDirectTargetIntersection': False,
            'capturedPosition': captured_position,
            'specialState': {
                'customName': False,
                'persistenceRequired': False,
                'tags': False,
                'vehicle': False,
                'passengers': False,
            },
        }
    if entity.get('label') != 'Bee':
        return None
    home = (
        parse_int_array_payload(
            capture.get('preservationPaths', {}).get('hive_pos', {})
        )
        or parse_int_array_payload(
            capture.get('preservationPaths', {}).get('HivePos', {})
        )
    )
    if home is None:
        return None
    probes = capture.get('homeHiveBlockProbeReplies', {})
    matching_blocks = sorted(
        block for block, reply in probes.items()
        if reply.strip().lower() in ('test passed', 'test passed.')
    )
    if not matching_blocks:
        return None
    target_lines = [
        entry['line'] for entry in boxes
        if contains_exact_block(entry['box'], home)
    ]
    if target_lines:
        return None
    return {
        'policy': 'home-linked-bee-outside-exact-target',
        'reason': (
            'The Bee is halo-only, its live home hive is intact, and no exact '
            'operation targets the hive block.'
        ),
        'homeHive': home,
        'matchingHiveBlocks': matching_blocks,
        'homeHiveExactTargetLines': target_lines,
        'beeDirectTargetIntersection': False,
    }


def selector(envelope_box, entity_filter, limit):
    x1, y1, z1, x2, y2, z2 = envelope_box
    return (
        f'@e[x={x1},y={y1},z={z1},'
        f'dx={x2 - x1},dy={y2 - y1},dz={z2 - z1},'
        f'{entity_filter},limit={limit},sort=arbitrary]'
    )


def target_halo_spans(boxes):
    """Return one conservative selector span for each exact halo-touched chunk."""
    spans = {}
    for entry in boxes:
        x1, y1, z1, x2, y2, z2 = entry['box']
        halo = [x1 - 1, y1 - 2, z1 - 1, x2 + 2, y2 + 3, z2 + 2]
        for chunk_x in range(halo[0] // 16, halo[3] // 16 + 1):
            for chunk_z in range(halo[2] // 16, halo[5] // 16 + 1):
                intersection = [
                    max(halo[0], chunk_x * 16),
                    halo[1],
                    max(halo[2], chunk_z * 16),
                    min(halo[3], chunk_x * 16 + 15),
                    halo[4],
                    min(halo[5], chunk_z * 16 + 15),
                ]
                key = (chunk_x, chunk_z)
                current = spans.get(key)
                if current is None:
                    spans[key] = intersection
                else:
                    spans[key] = [
                        min(current[0], intersection[0]),
                        min(current[1], intersection[1]),
                        min(current[2], intersection[2]),
                        max(current[3], intersection[3]),
                        max(current[4], intersection[4]),
                        max(current[5], intersection[5]),
                    ]
    return [
        {
            'chunk': [chunk_x, chunk_z],
            'envelope': spans[(chunk_x, chunk_z)],
        }
        for chunk_x, chunk_z in sorted(spans)
    ]


def chunk_batches(chunks, pre_existing, batch_limit, server_limit=SERVER_FORCELOAD_LIMIT):
    """Partition chunks without ever exceeding the server force-load ceiling."""
    if not 1 <= batch_limit <= server_limit:
        raise ValueError(
            f'chunk batch limit must be between 1 and {server_limit}'
        )
    if len(pre_existing) > server_limit:
        raise ValueError(
            f'pre-existing force-load count {len(pre_existing)} exceeds '
            f'the server limit {server_limit}'
        )
    temporary_capacity = server_limit - len(pre_existing)
    batches = []
    current = []
    current_temporary = 0
    for chunk in chunks:
        chunk = tuple(chunk)
        needs_temporary_load = chunk not in pre_existing
        if needs_temporary_load and temporary_capacity == 0:
            raise ValueError(
                'no temporary force-load capacity remains after preserving '
                'the pre-existing set'
            )
        if current and (
            len(current) >= batch_limit
            or (
                needs_temporary_load
                and current_temporary >= temporary_capacity
            )
        ):
            batches.append(current)
            current = []
            current_temporary = 0
        current.append(chunk)
        if needs_temporary_load:
            current_temporary += 1
    if current:
        batches.append(current)
    return batches


def parse_forceloads(reply):
    return {
        (int(chunk_x), int(chunk_z))
        for chunk_x, chunk_z in re.findall(r'\[(-?\d+), (-?\d+)\]', reply)
    }


def chunk_coordinates(chunks):
    return [[chunk_x, chunk_z] for chunk_x, chunk_z in sorted(chunks)]


def release_temporary_chunks(chunks):
    """Release a temporary set on a fresh RCON stream and verify each chunk."""
    chunks = sorted(set(chunks))
    if not chunks:
        return []
    cleanup_client = connect()
    cleanup_rcon = Rcon(cleanup_client)
    try:
        for chunk_x, chunk_z in chunks:
            cleanup_rcon.cmd(f'forceload remove {chunk_x * 16} {chunk_z * 16}')
        return [
            (chunk_x, chunk_z)
            for chunk_x, chunk_z in chunks
            if ' is marked for force loading' in cleanup_rcon.cmd(
                f'forceload query {chunk_x * 16} {chunk_z * 16}'
            )
        ]
    finally:
        cleanup_client.close()


class EntityNbtCaptureError(ValueError):
    def __init__(self, message, diagnostics=None):
        super().__init__(message)
        self.diagnostics = diagnostics or {}


def sanitize_nbt_reply(reply):
    sanitized = re.sub(r'"(?:\\.|[^"\\])*"', '"<string>"', reply)
    sanitized = re.sub(
        r'(?<![A-Za-z_])-?\d+(?:\.\d+)?(?:[Ee][+-]?\d+)?[bBdDfFlLsS]?',
        '<number>',
        sanitized,
    )
    return sanitized[:2048]


def reply_payload(reply):
    marker = ' has the following entity data: '
    if marker not in reply:
        raise EntityNbtCaptureError(
            'entity data reply has no payload marker',
            {
                'replyLength': len(reply),
                'replySha256': hashlib.sha256(reply.encode()).hexdigest(),
                'sanitizedReply': sanitize_nbt_reply(reply),
            },
        )
    return reply.split(marker, 1)[1].strip()


def capture_entity_nbt(rcon, entity):
    """Capture exact identity and preservation paths without changing the entity."""
    entity_type = LABEL_ENTITY_TYPES.get(entity['label'])
    if entity_type is None:
        raise EntityNbtCaptureError(
            f'no entity type mapping for {entity["label"]!r}'
        )
    x, y, z = entity['position']
    positioned = f'execute positioned {x:.12g} {y:.12g} {z:.12g}'
    candidates = (
        f'@e[type={entity_type},distance=..{ENTITY_NBT_CAPTURE_RADIUS:g},'
        'limit=64,sort=nearest]'
    )
    candidate_reply = rcon.cmd(f'{positioned} if entity {candidates}')
    candidate_count = parse_selector_count(candidate_reply)
    if candidate_count == 0:
        raise EntityNbtCaptureError(
            f'NBT capture found no {entity_type} within '
            f'{ENTITY_NBT_CAPTURE_RADIUS:g} blocks',
            {
                'candidateCountReplyLength': len(candidate_reply),
                'candidateCountReplySha256': hashlib.sha256(
                    candidate_reply.encode()
                ).hexdigest(),
                'candidateCountSanitizedReply': sanitize_nbt_reply(
                    candidate_reply
                ),
            },
        )
    nearest = (
        f'@e[type={entity_type},distance=..{ENTITY_NBT_CAPTURE_RADIUS:g},'
        'limit=1,sort=nearest]'
    )
    replies = {}
    for field in ('UUID', 'Pos'):
        replies[field] = rcon.cmd(
            f'{positioned} run data get entity {nearest} {field}'
        )
    try:
        uuid_payload = reply_payload(replies['UUID'])
        pos_payload = reply_payload(replies['Pos'])
    except EntityNbtCaptureError as error:
        error.diagnostics['fieldReplies'] = {
            field: {
                'length': len(reply),
                'sha256': hashlib.sha256(reply.encode()).hexdigest(),
                'sanitized': sanitize_nbt_reply(reply),
            }
            for field, reply in replies.items()
        }
        raise
    uuid_match = re.fullmatch(
        r'\[I;\s*(-?\d+),\s*(-?\d+),\s*(-?\d+),\s*(-?\d+)\]',
        uuid_payload,
    )
    pos_match = re.fullmatch(
        r'\[\s*'
        r'(-?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?)d,\s*'
        r'(-?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?)d,\s*'
        r'(-?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?)d\s*\]',
        pos_payload,
    )
    if not uuid_match or not pos_match:
        raise EntityNbtCaptureError(
            'path-level entity reply has invalid UUID or Pos syntax',
            {
                'fieldReplies': {
                    field: {
                        'length': len(reply),
                        'sha256': hashlib.sha256(reply.encode()).hexdigest(),
                        'sanitized': sanitize_nbt_reply(reply),
                    }
                    for field, reply in replies.items()
                },
            },
        )
    uuid = [int(uuid_match.group(index)) for index in range(1, 5)]
    captured_position = [
        float(pos_match.group(index)) for index in range(1, 4)
    ]
    source_distance = math.dist(entity['position'], captured_position)
    uuid_selector = (
        '@e[nbt={UUID:[I;'
        + ','.join(str(value) for value in uuid)
        + ']},limit=1]'
    )
    typed_uuid_selector = (
        f'@e[type={entity_type},nbt={{UUID:[I;'
        + ','.join(str(value) for value in uuid)
        + ']},limit=1]'
    )
    type_verification_reply = rcon.cmd(
        f'execute if entity {typed_uuid_selector}'
    )
    type_verification_count = parse_selector_count(type_verification_reply)
    vehicle_reply = rcon.cmd(
        f'execute as {uuid_selector} on vehicle run data get entity @s UUID'
    )
    passengers_reply = rcon.cmd(
        f'execute as {uuid_selector} on passengers run data get entity @s UUID'
    )
    preservation_replies = {}
    preservation_paths = list(dict.fromkeys([
        *COMMON_PRESERVATION_PATHS,
        *TYPE_PRESERVATION_PATHS.get(entity_type, []),
    ]))
    for field in preservation_paths:
        reply = rcon.cmd(f'data get entity {uuid_selector} {field}')
        preservation_replies[field] = {
            'present': ' has the following entity data: ' in reply,
            'reply': reply,
            'replySha256': hashlib.sha256(reply.encode()).hexdigest(),
        }
    home_hive = (
        parse_int_array_payload(preservation_replies.get('hive_pos', {}))
        or parse_int_array_payload(preservation_replies.get('HivePos', {}))
    )
    home_hive_probe_replies = {}
    if entity_type == 'minecraft:bee' and home_hive is not None:
        for block in ('minecraft:bee_nest', 'minecraft:beehive'):
            home_hive_probe_replies[block] = rcon.cmd(
                f'execute if block {home_hive[0]} {home_hive[1]} '
                f'{home_hive[2]} {block}'
            )
    state_projection_sha256 = hashlib.sha256(
        json.dumps(
            preservation_replies,
            sort_keys=True,
            separators=(',', ':'),
        ).encode()
    ).hexdigest()
    return {
        'entityType': entity_type,
        'captureRadius': ENTITY_NBT_CAPTURE_RADIUS,
        'candidateCountWithinCaptureRadius': candidate_count,
        'uuidIntArray': uuid,
        'uuidSelector': uuid_selector,
        'capturedPosition': captured_position,
        'sourcePositionDistance': source_distance,
        'capturedId': entity_type,
        'typeVerificationReply': type_verification_reply,
        'typeVerificationCount': type_verification_count,
        'identityFieldReplies': replies,
        'identityFieldReplySha256': {
            field: hashlib.sha256(reply.encode()).hexdigest()
            for field, reply in replies.items()
        },
        'preservationPaths': preservation_replies,
        'homeHivePosition': home_hive,
        'homeHiveBlockProbeReplies': home_hive_probe_replies,
        'stateProjectionSha256': state_projection_sha256,
        'vehicleProbeReply': vehicle_reply,
        'vehicleRelationPresent': (
            ' has the following entity data: ' in vehicle_reply
        ),
        'passengersProbeReply': passengers_reply,
        'passengerRelationPresent': (
            ' has the following entity data: ' in passengers_reply
        ),
        'identityChecksPassed': (
            source_distance <= ENTITY_NBT_CAPTURE_RADIUS
            and type_verification_count == 1
        ),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--ops', action='append', default=[])
    parser.add_argument(
        '--report',
        default='data/world-review/redevelopment-live-entity-gate-2026-07-27.json',
    )
    parser.add_argument('--limit', type=int, default=500)
    parser.add_argument(
        '--capture-blocker-nbt',
        action='store_true',
        help=(
            'capture full read-only SNBT and UUID/vehicle/passenger evidence '
            'for exact blocker observations while each batch is loaded'
        ),
    )
    parser.add_argument(
        '--chunk-batch-size',
        type=int,
        default=DEFAULT_CHUNK_BATCH_LIMIT,
        help=(
            'maximum exact target-halo chunks queried per temporary force-load '
            f'batch (1..{SERVER_FORCELOAD_LIMIT})'
        ),
    )
    args = parser.parse_args()
    filenames = args.ops or DEFAULT_PACKAGES
    if args.limit < 1:
        raise ValueError('--limit must be positive')
    if not 1 <= args.chunk_batch_size <= SERVER_FORCELOAD_LIMIT:
        raise ValueError(
            f'--chunk-batch-size must be between 1 and {SERVER_FORCELOAD_LIMIT}'
        )

    packages = []
    for filename in filenames:
        if not os.path.exists(filename):
            raise FileNotFoundError(filename)
        boxes = parse_boxes(filename)
        spans = target_halo_spans(boxes)
        with open(filename, 'rb') as operation_handle:
            operation_sha256 = hashlib.sha256(
                operation_handle.read()
            ).hexdigest()
        packages.append({
            'file': filename,
            'operationSha256': operation_sha256,
            'boxes': boxes,
            'envelope': envelope(boxes),
            'targetHaloChunks': spans,
        })

    client = connect()
    rcon = Rcon(client)
    try:
        before_forceloads = parse_forceloads(rcon.cmd('forceload query'))
    finally:
        client.close()
    # Keep the unbounded full-set reply isolated from every later command.
    # This RCON client reads one response packet per command.
    client = connect()
    rcon = Rcon(client)
    try:
        online = rcon.cmd('list')
    finally:
        client.close()

    required_forceloads = {
        tuple(span['chunk'])
        for package in packages
        for span in package['targetHaloChunks']
    }
    active_temporary_chunks = set()
    force_load_batches = []
    all_temporary_chunks_released = True
    cleanup_errors = []
    batch_limit = min(args.limit, 64)

    try:
        for package in packages:
            package_entities = []
            spatial_queries = []
            query_errors = []
            summaries = {
                category: {
                    'category': category,
                    'batchCount': len(package['targetHaloChunks']),
                    'selectedCount': 0,
                    'parsedPositions': 0,
                    'selectorLimitReached': False,
                }
                for category in ('player', 'non-player')
            }
            spans_by_chunk = {
                tuple(span['chunk']): span
                for span in package['targetHaloChunks']
            }
            span_indexes = {
                tuple(span['chunk']): index
                for index, span in enumerate(package['targetHaloChunks'])
            }
            try:
                planned_batches = chunk_batches(
                    spans_by_chunk,
                    before_forceloads,
                    args.chunk_batch_size,
                )
            except ValueError as error:
                planned_batches = []
                query_errors.append({
                    'stage': 'chunk-batch-planning',
                    'error': str(error),
                })
            package['chunkBatches'] = [
                {
                    'chunkBatchIndex': batch_index,
                    'requiredChunks': chunk_coordinates(chunks),
                    'temporaryChunks': chunk_coordinates(
                        chunk for chunk in chunks
                        if chunk not in before_forceloads
                    ),
                }
                for batch_index, chunks in enumerate(planned_batches)
            ]

            for chunk_batch_index, chunks in enumerate(planned_batches):
                temporary_chunks = {
                    chunk for chunk in chunks
                    if chunk not in before_forceloads
                }
                batch_audit = {
                    'packageFile': package['file'],
                    'chunkBatchIndex': chunk_batch_index,
                    'requiredChunks': chunk_coordinates(chunks),
                    'temporaryChunks': chunk_coordinates(temporary_chunks),
                    'missingRequiredChunks': chunk_coordinates(chunks),
                    'temporaryChunksStillLoadedAfterBatch': [],
                    'released': False,
                    'passed': False,
                }
                force_load_batches.append(batch_audit)
                query_client = None
                missing_chunks = set(chunks)
                try:
                    query_client = connect()
                    query_rcon = Rcon(query_client)
                    for chunk_x, chunk_z in sorted(temporary_chunks):
                        # Track before issuing the command so cleanup is still
                        # attempted when a command or response fails.
                        active_temporary_chunks.add((chunk_x, chunk_z))
                        query_rcon.cmd(
                            f'forceload add {chunk_x * 16} {chunk_z * 16}'
                        )
                    missing_chunks = {
                        (chunk_x, chunk_z)
                        for chunk_x, chunk_z in chunks
                        if ' is marked for force loading' not in query_rcon.cmd(
                            f'forceload query {chunk_x * 16} {chunk_z * 16}'
                        )
                    }
                    batch_audit['missingRequiredChunks'] = chunk_coordinates(
                        missing_chunks
                    )
                    if missing_chunks:
                        query_errors.append({
                            'stage': 'force-load-verification',
                            'chunkBatchIndex': chunk_batch_index,
                            'missingRequiredChunks': chunk_coordinates(missing_chunks),
                            'error': 'not every target-halo chunk was loaded',
                        })
                    else:
                        time.sleep(2)
                        for category, entity_filter in (
                            ('player', 'type=minecraft:player'),
                            ('non-player', 'type=!minecraft:player'),
                        ):
                            for chunk in chunks:
                                span = spans_by_chunk[chunk]
                                spatial_index = span_indexes[chunk]
                                spatial_selector = selector(
                                    span['envelope'],
                                    entity_filter,
                                    batch_limit,
                                )
                                count_reply = query_rcon.cmd(
                                    f'execute if entity {spatial_selector}'
                                )
                                data_reply = ''
                                try:
                                    selected_count = parse_selector_count(count_reply)
                                    entities = []
                                    if selected_count > 0:
                                        data_reply = query_rcon.cmd(
                                            f'execute as {spatial_selector} '
                                            'run data get entity @s Pos'
                                        )
                                        entities = parse_entities(data_reply, category)
                                        if len(entities) != selected_count:
                                            raise ValueError(
                                                f'{category}/span-{spatial_index}: '
                                                f'selector counted {selected_count} '
                                                f'but parsed {len(entities)} positions'
                                            )
                                    package_entities.extend(entities)
                                    if args.capture_blocker_nbt:
                                        for captured_entity in entities:
                                            hit = next(
                                                (
                                                    entry
                                                    for entry in package['boxes']
                                                    if touches(
                                                        entry['box'],
                                                        captured_entity['position'],
                                                    )
                                                ),
                                                None,
                                            )
                                            if hit is None:
                                                continue
                                            try:
                                                captured_entity['nbtCapture'] = (
                                                    capture_entity_nbt(
                                                        query_rcon,
                                                        captured_entity,
                                                    )
                                                )
                                            except EntityNbtCaptureError as error:
                                                captured_entity['nbtCaptureError'] = (
                                                    str(error)
                                                )
                                                captured_entity[
                                                    'nbtCaptureDiagnostics'
                                                ] = error.diagnostics
                                                if (
                                                    captured_entity['label']
                                                    == 'Egg'
                                                ):
                                                    x, y, z = (
                                                        captured_entity[
                                                            'position'
                                                        ]
                                                    )
                                                    absence_target = (
                                                        'execute positioned '
                                                        f'{x:.12g} {y:.12g} '
                                                        f'{z:.12g} if entity '
                                                        '@e[type=minecraft:egg,'
                                                        'distance=..'
                                                        f'{TRANSIENT_ABSENCE_RADIUS:g},'
                                                        'limit=64,sort=nearest]'
                                                    )
                                                    reply = query_rcon.cmd(
                                                        absence_target
                                                    )
                                                    try:
                                                        confirmed_count = (
                                                            parse_selector_count(
                                                                reply
                                                            )
                                                        )
                                                    except ValueError:
                                                        confirmed_count = None
                                                    captured_entity[
                                                        'transientAbsenceProof'
                                                    ] = {
                                                        'entityType':
                                                            'minecraft:egg',
                                                        'radius':
                                                            TRANSIENT_ABSENCE_RADIUS,
                                                        'confirmedCount':
                                                            confirmed_count,
                                                        'reply': reply,
                                                        'replySha256':
                                                            hashlib.sha256(
                                                                reply.encode()
                                                            ).hexdigest(),
                                                    }
                                    summary = summaries[category]
                                    summary['selectedCount'] += selected_count
                                    summary['parsedPositions'] += len(entities)
                                    limit_reached = selected_count >= batch_limit
                                    summary['selectorLimitReached'] = (
                                        summary['selectorLimitReached']
                                        or limit_reached
                                    )
                                    spatial_queries.append({
                                        'category': category,
                                        'batchIndex': spatial_index,
                                        'chunkBatchIndex': chunk_batch_index,
                                        'chunk': list(chunk),
                                        'envelope': span['envelope'],
                                        'selector': spatial_selector,
                                        'selectedCount': selected_count,
                                        'parsedPositions': len(entities),
                                        'selectorLimitReached': limit_reached,
                                    })
                                except ValueError as error:
                                    query_errors.append({
                                        'stage': 'entity-query',
                                        'category': category,
                                        'batchIndex': spatial_index,
                                        'chunkBatchIndex': chunk_batch_index,
                                        'chunk': list(chunk),
                                        'envelope': span['envelope'],
                                        'selector': spatial_selector,
                                        'countReply': count_reply,
                                        'dataReply': data_reply,
                                        'error': str(error),
                                    })
                except Exception as error:  # RCON failures must fail closed.
                    query_errors.append({
                        'stage': 'chunk-batch-rcon',
                        'chunkBatchIndex': chunk_batch_index,
                        'error': str(error),
                    })
                finally:
                    if query_client is not None:
                        query_client.close()
                    try:
                        still_loaded = release_temporary_chunks(temporary_chunks)
                    except Exception as error:  # Cleanup is verified again below.
                        still_loaded = sorted(temporary_chunks)
                        query_errors.append({
                            'stage': 'chunk-batch-cleanup',
                            'chunkBatchIndex': chunk_batch_index,
                            'error': str(error),
                        })
                    active_temporary_chunks.difference_update(
                        temporary_chunks - set(still_loaded)
                    )
                    active_temporary_chunks.update(still_loaded)
                    batch_audit['temporaryChunksStillLoadedAfterBatch'] = (
                        chunk_coordinates(still_loaded)
                    )
                    batch_audit['released'] = not still_loaded
                    batch_audit['passed'] = (
                        not missing_chunks and not still_loaded
                    )
                    all_temporary_chunks_released = (
                        all_temporary_chunks_released and not still_loaded
                    )

            unique_entities = {}
            for entity in package_entities:
                key = (
                    entity['category'],
                    entity['label'],
                    *(round(value, 9) for value in entity['position']),
                )
                unique_entities[key] = entity
            package_entities = list(unique_entities.values())
            blockers = []
            protected_nonblocking = []
            for entity in package_entities:
                hit = next(
                    (
                        entry for entry in package['boxes']
                        if touches(entry['box'], entity['position'])
                    ),
                    None,
                )
                if hit:
                    observation = {
                        **entity,
                        'operationLine': hit['line'],
                        'targetBox': hit['box'],
                    }
                    evidence = protected_nonblocking_evidence(
                        entity,
                        package['boxes'],
                    )
                    if evidence is None:
                        blockers.append(observation)
                    else:
                        protected_nonblocking.append({
                            **observation,
                            'nonBlockingEvidence': evidence,
                        })
            category_queries = [
                summaries['player'],
                summaries['non-player'],
            ]
            package_batch_audits = [
                audit for audit in force_load_batches
                if audit['packageFile'] == package['file']
            ]
            package['entitiesReturnedInEnvelope'] = len(package_entities)
            package['selectorLimit'] = batch_limit
            package['targetHaloChunkCount'] = len(package['targetHaloChunks'])
            package['spatialBatchCount'] = len(package['targetHaloChunks'])
            package['chunkBatchCount'] = len(planned_batches)
            package['categoryQueries'] = category_queries
            package['spatialQueries'] = spatial_queries
            package['queryErrors'] = query_errors
            package['selectorLimitReached'] = any(
                query['selectorLimitReached'] for query in category_queries
            )
            package['blockers'] = blockers
            package['protectedNonBlockingEntities'] = protected_nonblocking
            package['blockerNbtCaptureRequested'] = args.capture_blocker_nbt
            package['blockerNbtCaptures'] = sum(
                'nbtCapture' in blocker for blocker in blockers
            )
            package['blockerNbtCaptureErrors'] = [
                {
                    'label': blocker['label'],
                    'position': blocker['position'],
                    'error': blocker['nbtCaptureError'],
                    'diagnostics': blocker.get('nbtCaptureDiagnostics', {}),
                }
                for blocker in blockers
                if 'nbtCaptureError' in blocker
            ]
            package['blockerNbtCaptureComplete'] = (
                args.capture_blocker_nbt
                and package['blockerNbtCaptures'] == len(blockers)
                and not package['blockerNbtCaptureErrors']
            )
            package['passed'] = (
                not blockers
                and not package['selectorLimitReached']
                and not query_errors
                and len(spatial_queries)
                == len(package['targetHaloChunks']) * len(category_queries)
                and len(package_batch_audits) == len(planned_batches)
                and all(audit['passed'] for audit in package_batch_audits)
            )
            del package['boxes']
    finally:
        # A fresh stream prevents an unexpected multi-packet selector response
        # from contaminating cleanup and restoration commands.
        if active_temporary_chunks:
            try:
                remaining = release_temporary_chunks(active_temporary_chunks)
                active_temporary_chunks = set(remaining)
                all_temporary_chunks_released = (
                    all_temporary_chunks_released and not remaining
                )
            except Exception as error:
                all_temporary_chunks_released = False
                cleanup_errors.append({
                    'stage': 'final-temporary-chunk-release',
                    'error': str(error),
                })
        after_forceloads = set()
        restored_forceloads = set()
        final_forceloads = set()
        force_load_state_restored = False
        try:
            state_client = connect()
            state_rcon = Rcon(state_client)
            try:
                after_forceloads = parse_forceloads(
                    state_rcon.cmd('forceload query')
                )
            finally:
                state_client.close()
            restored_forceloads = before_forceloads - after_forceloads
            if restored_forceloads:
                restore_client = connect()
                restore_rcon = Rcon(restore_client)
                try:
                    for chunk_x, chunk_z in sorted(restored_forceloads):
                        restore_rcon.cmd(
                            f'forceload add {chunk_x * 16} {chunk_z * 16}'
                        )
                finally:
                    restore_client.close()
            final_client = connect()
            final_rcon = Rcon(final_client)
            try:
                final_forceloads = parse_forceloads(
                    final_rcon.cmd('forceload query')
                )
            finally:
                final_client.close()
            force_load_state_restored = final_forceloads == before_forceloads
        except Exception as error:
            cleanup_errors.append({
                'stage': 'final-force-load-restoration',
                'error': str(error),
            })

    passed = (
        all(package['passed'] for package in packages)
        and all_temporary_chunks_released
        and force_load_state_restored
    )
    report = {
        'schemaVersion': 2,
        'generatedAtUtc': utc_now(),
        'status': 'PASS' if passed else 'FAIL',
        'passed': passed,
        'readOnly': False,
        'blockOrEntityMutation': False,
        'temporaryForceLoadMutation': True,
        'blockerNbtCaptureRequested': args.capture_blocker_nbt,
        'onlinePlayersReply': online,
        'forceLoadAudit': {
            'mode': 'sparse-target-halo-batched',
            'serverChunkLimit': SERVER_FORCELOAD_LIMIT,
            'chunkBatchLimit': args.chunk_batch_size,
            'requiredChunks': len(required_forceloads),
            'requiredChunkCoordinates': chunk_coordinates(required_forceloads),
            'allRequiredChunksLoadedBeforeQueries': all(
                not batch['missingRequiredChunks']
                for batch in force_load_batches
            ),
            'missingRequiredChunks': sorted({
                tuple(chunk)
                for batch in force_load_batches
                for chunk in batch['missingRequiredChunks']
            }),
            'preExistingChunks': len(before_forceloads),
            'preExistingChunkCoordinates': chunk_coordinates(before_forceloads),
            'temporaryChunkAdditions': sum(
                len(batch['temporaryChunks']) for batch in force_load_batches
            ),
            'maximumSimultaneousTemporaryChunks': max(
                (
                    len(batch['temporaryChunks'])
                    for batch in force_load_batches
                ),
                default=0,
            ),
            'batchCount': len(force_load_batches),
            'batches': force_load_batches,
            'restoredPreExistingChunks': len(restored_forceloads),
            'cleanupErrors': cleanup_errors,
            'allTemporaryChunksReleased': (
                all_temporary_chunks_released
                and not active_temporary_chunks
            ),
            'finalChunkCoordinates': chunk_coordinates(final_forceloads),
            'finalSetMatchesPreExistingSet': force_load_state_restored,
        },
        'halo': {
            'horizontalBlocks': 1,
            'verticalBlocksBelow': 2,
            'verticalBlocksAbove': 2,
            'positiveTargetCellExtentIncluded': True,
            'note': 'Conservative point-position screen around every exact REPL target box.',
        },
        'packages': packages,
        'totals': {
            'packages': len(packages),
            'passed': sum(1 for package in packages if package['passed']),
            'failed': sum(1 for package in packages if not package['passed']),
            'entitiesReturnedInEnvelopes': sum(
                package['entitiesReturnedInEnvelope'] for package in packages
            ),
            'blockingEntityHits': sum(len(package['blockers']) for package in packages),
            'blockerNbtCaptures': sum(
                package['blockerNbtCaptures'] for package in packages
            ),
            'blockerNbtCaptureErrors': sum(
                len(package['blockerNbtCaptureErrors'])
                for package in packages
            ),
        },
    }
    os.makedirs(os.path.dirname(os.path.abspath(args.report)), exist_ok=True)
    with open(args.report, 'w', encoding='utf-8') as handle:
        json.dump(report, handle, indent=2)
        handle.write('\n')
    print(json.dumps({
        'status': report['status'],
        'report': args.report,
        'totals': report['totals'],
    }, indent=2))
    return 0 if passed else 1


if __name__ == '__main__':
    sys.exit(main())
