#!/usr/bin/env python3
"""Offline red-team acceptance audit for Town Expansion entity relocation.

This script never opens RCON and never changes the live world. It cross-checks
the captured gate, generated relocation manifest, and executor source, then
writes a fail-closed JSON/Markdown acceptance record.
"""

import argparse
import hashlib
import itertools
import json
import math
import os
import re
from datetime import datetime, timezone


DEFAULT_GATE = (
    'data/world-review/'
    'town-expansion-r1-live-entity-gate-fresh-20260728.json'
)
DEFAULT_MANIFEST = (
    'data/buildops/'
    'town-expansion-r1-2026-07-28.entity-evacuation.fresh.manifest.json'
)
DEFAULT_EXECUTOR = 'scripts/run_town_entity_evacuation.py'
DEFAULT_GENERATOR = 'scripts/generate_town_entity_evacuation_plan.mjs'
DEFAULT_JOURNAL = (
    'data/buildops/'
    'town-expansion-r1-2026-07-28.entity-evacuation.fresh.retry1.journal.json'
)
DEFAULT_JSON = (
    'docs/redevelopment/2026-07-28-town-expansion/evidence/'
    'town-entity-relocation-red-team-audit.fresh.json'
)
DEFAULT_MARKDOWN = (
    'docs/redevelopment/2026-07-28-town-expansion/evidence/'
    'town-entity-relocation-red-team-audit.fresh.md'
)
FRESHNESS_SECONDS = 300
VOLATILE_PATHS = {
    'Age',
    'AngerTime',
    'BoostTime',
    'CannotEnterHiveTicks',
    'EatHaystackTimer',
    'EggLayTime',
    'ForcedAge',
    'Health',
    'InLove',
    'LayingEgg',
    'Sleeping',
    'TicksSincePollination',
}
ENTITY_TYPE_RE = re.compile(r'^minecraft:[a-z0-9_./-]+$')
RELOCATABLE_REQUIRED_PATHS = {
    'minecraft:bee': {
        'HivePos', 'hive_pos', 'FlowerPos', 'flower_pos',
        'HasNectar', 'HasStung', 'AngryAt',
    },
    'minecraft:chest_minecart': {'Items', 'LootTable', 'LootTableSeed'},
    'minecraft:donkey': {
        'Items', 'ChestedHorse', 'SaddleItem', 'ArmorItem',
        'Tame', 'Temper', 'Bred',
    },
    'minecraft:fox': {'Trusted', 'Type', 'Sitting'},
    'minecraft:turtle': {
        'HomePosX', 'HomePosY', 'HomePosZ',
        'TravelPosX', 'TravelPosY', 'TravelPosZ', 'HasEgg',
    },
    'minecraft:wolf': {'Owner', 'CollarColor', 'Sitting', 'Tame', 'variant'},
    'minecraft:item': {'Item'},
}


def utc_now():
    return (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace('+00:00', 'Z')
    )


def parse_utc(value):
    if not isinstance(value, str):
        return None
    try:
        return datetime.fromisoformat(value.replace('Z', '+00:00'))
    except ValueError:
        return None


def sha256_file(filename):
    digest = hashlib.sha256()
    with open(filename, 'rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def canonical(value):
    return json.dumps(
        value,
        sort_keys=True,
        separators=(',', ':'),
        ensure_ascii=False,
    )


def sha256_json(value):
    return hashlib.sha256(canonical(value).encode()).hexdigest()


def path_value(entry):
    if not isinstance(entry, dict) or not isinstance(entry.get('present'), bool):
        return {'present': False, 'captureMissing': True}
    if not entry['present']:
        return {'present': False}
    marker = ' has the following entity data: '
    reply = entry.get('reply', '')
    return {
        'present': True,
        'value': (
            reply[reply.index(marker) + len(marker):].strip()
            if marker in reply
            else None
        ),
    }


def immutable_projection(capture, paths):
    return {
        'entityType': capture.get('entityType'),
        'paths': sorted(paths),
        'values': {
            field: path_value(capture.get('preservationPaths', {}).get(field))
            for field in sorted(paths)
        },
        'vehicleRelationPresent': (
            capture.get('vehicleRelationPresent') is True
        ),
        'passengerRelationPresent': (
            capture.get('passengerRelationPresent') is True
        ),
    }


def source_line(source, needle):
    for index, line in enumerate(source.splitlines(), 1):
        if needle in line:
            return index
    return None


def add_check(checks, check_id, title, status, severity, evidence, required):
    checks.append({
        'id': check_id,
        'title': title,
        'status': status,
        'severity': severity,
        'requiredForAcceptance': required,
        'evidence': evidence,
    })


def bounds_overlap(left, right):
    return (
        max(left[0], right[0]) <= min(left[2], right[2])
        and max(left[1], right[1]) <= min(left[3], right[3])
    )


def nearest_source_findings(blockers):
    findings = []
    captured = [row for row in blockers if isinstance(row.get('nbtCapture'), dict)]
    for row in captured:
        capture_position = row['nbtCapture'].get('capturedPosition')
        if not isinstance(capture_position, list) or len(capture_position) != 3:
            continue
        same_label = [
            candidate for candidate in blockers
            if candidate.get('label') == row.get('label')
        ]
        distances = [
            (
                math.dist(capture_position, candidate.get('position', [])),
                candidate,
            )
            for candidate in same_label
            if len(candidate.get('position', [])) == 3
        ]
        if not distances:
            continue
        assigned = math.dist(capture_position, row['position'])
        minimum = min(distance for distance, _candidate in distances)
        tied = sum(
            abs(distance - minimum) <= 1e-9
            for distance, _candidate in distances
        )
        if assigned > minimum + 1e-9 or tied != 1:
            findings.append({
                'label': row.get('label'),
                'observationPosition': row.get('position'),
                'capturedPosition': capture_position,
                'uuidKey': ','.join(
                    str(value)
                    for value in row['nbtCapture'].get('uuidIntArray', [])
                ),
                'assignedDistance': assigned,
                'nearestDistance': minimum,
                'nearestTieCount': tied,
            })
    return findings


def audit(args):
    with open(args.gate, encoding='utf-8') as handle:
        gate = json.load(handle)
    with open(args.manifest, encoding='utf-8') as handle:
        manifest = json.load(handle)
    with open(args.executor, encoding='utf-8') as handle:
        executor_source = handle.read()
    with open(args.generator, encoding='utf-8') as handle:
        generator_source = handle.read()

    packages = gate.get('packages', [])
    package = packages[0] if len(packages) == 1 else {}
    blockers = package.get('blockers', [])
    rows = manifest.get('transactionRows', [])
    captured = [
        blocker for blocker in blockers
        if isinstance(blocker.get('nbtCapture'), dict)
    ]
    captured_by_uuid = {}
    for blocker in captured:
        uuid = blocker['nbtCapture'].get('uuidIntArray')
        if isinstance(uuid, list) and len(uuid) == 4:
            captured_by_uuid.setdefault(','.join(map(str, uuid)), []).append(blocker)
    aggregated_observation_keys = {
        (
            row.get('label'),
            tuple(row.get('position', [])),
            row.get('capturedUuidKey'),
        )
        for row in manifest.get('observations', [])
        if row.get('disposition') == 'AGGREGATED_BY_UUID'
    }
    verified_captured_by_uuid = {}
    for blocker in captured:
        capture = blocker['nbtCapture']
        uuid = capture.get('uuidIntArray')
        if not isinstance(uuid, list) or len(uuid) != 4:
            continue
        uuid_key = ','.join(map(str, uuid))
        observation_key = (
            blocker.get('label'),
            tuple(blocker.get('position', [])),
            uuid_key,
        )
        if observation_key in aggregated_observation_keys:
            verified_captured_by_uuid.setdefault(uuid_key, []).append(blocker)
    rows_by_uuid = {
        row.get('uuidKey'): row for row in rows
        if isinstance(row.get('uuidKey'), str)
    }
    blocked_rows = manifest.get('blockedUuidRows', [])
    blocked_by_uuid = {
        row.get('uuidKey'): row for row in blocked_rows
        if isinstance(row.get('uuidKey'), str)
    }
    checks = []

    source = manifest.get('source', {})
    operation_path = source.get('operations')
    binding_errors = []
    if source.get('gateSha256') != sha256_file(args.gate):
        binding_errors.append('gate hash mismatch')
    if (
        not operation_path
        or not os.path.exists(operation_path)
        or source.get('operationSha256') != sha256_file(operation_path)
    ):
        binding_errors.append('operation hash mismatch')
    if package.get('operationSha256') != source.get('operationSha256'):
        binding_errors.append('gate/manifest operation identity mismatch')
    add_check(
        checks,
        'REL-001',
        'Gate, manifest, and guarded-operation identity binding',
        'PASS' if not binding_errors else 'FAIL',
        'critical',
        {
            'errors': binding_errors,
            'gateSha256': sha256_file(args.gate),
            'manifestSha256': sha256_file(args.manifest),
            'operationSha256': (
                sha256_file(operation_path)
                if operation_path and os.path.exists(operation_path)
                else None
            ),
        },
        True,
    )

    accounted_uuid_keys = set(rows_by_uuid) | set(blocked_by_uuid)
    missing_rows = sorted(
        set(verified_captured_by_uuid) - accounted_uuid_keys
    )
    extra_rows = sorted(
        accounted_uuid_keys - set(verified_captured_by_uuid)
    )
    overlap_rows = sorted(set(rows_by_uuid) & set(blocked_by_uuid))
    duplicate_observation_groups = {
        uuid: len(observations)
        for uuid, observations in captured_by_uuid.items()
        if len(observations) > 1
    }
    add_check(
        checks,
        'REL-002',
        'UUID aggregation covers every captured identity exactly once',
        (
            'PASS'
            if not missing_rows and not extra_rows and not overlap_rows
            else 'FAIL'
        ),
        'critical',
        {
            'capturedObservations': len(captured),
            'capturedUuidCount': len(captured_by_uuid),
            'verifiedCapturedObservations': sum(
                len(observations)
                for observations in verified_captured_by_uuid.values()
            ),
            'verifiedCapturedUuidCount': len(verified_captured_by_uuid),
            'manifestRowCount': len(rows),
            'explicitlyBlockedRowCount': len(blocked_rows),
            'duplicateObservationGroups': duplicate_observation_groups,
            'missingManifestRows': missing_rows,
            'extraManifestRows': extra_rows,
            'eligibleAndBlockedOverlap': overlap_rows,
        },
        True,
    )

    identity_failures = [
        {
            'label': blocker.get('label'),
            'position': blocker.get('position'),
            'uuidKey': ','.join(map(
                str,
                blocker['nbtCapture'].get('uuidIntArray', []),
            )),
            'candidateCount': blocker['nbtCapture'].get(
                'candidateCountWithinCaptureRadius'
            ),
            'sourcePositionDistance': blocker['nbtCapture'].get(
                'sourcePositionDistance'
            ),
            'captureRadius': blocker['nbtCapture'].get('captureRadius'),
        }
        for blocker in captured
        if blocker['nbtCapture'].get('identityChecksPassed') is not True
    ]
    ambiguous_captures = [
        {
            'label': blocker.get('label'),
            'position': blocker.get('position'),
            'candidateCount': blocker['nbtCapture'].get(
                'candidateCountWithinCaptureRadius'
            ),
            'uuidKey': ','.join(map(
                str,
                blocker['nbtCapture'].get('uuidIntArray', []),
            )),
        }
        for blocker in captured
        if blocker['nbtCapture'].get('candidateCountWithinCaptureRadius', 0) != 1
    ]
    nearest_mismatches = nearest_source_findings(blockers)
    eligible_binding_errors = [
        {
            'observationIndex': row.get('observationIndex'),
            'label': row.get('label'),
            'position': row.get('position'),
            'uuidKey': row.get('capturedUuidKey'),
            'captureBindingReasons': row.get('captureBindingReasons'),
        }
        for row in manifest.get('observations', [])
        if (
            row.get('disposition') == 'AGGREGATED_BY_UUID'
            and row.get('captureBindingReasons')
        )
    ]
    add_check(
        checks,
        'REL-003',
        'Every observation has an unambiguous, locally valid UUID capture',
        (
            'PASS'
            if not eligible_binding_errors
            else 'FAIL'
        ),
        'critical',
        {
            'identityCheckFailures': identity_failures,
            'nonUniqueCaptureCandidateSets': ambiguous_captures,
            'nearestDifferentObservationFindings': nearest_mismatches,
            'eligibleRowBindingErrors': eligible_binding_errors,
            'interpretation': (
                'Identity failures and nearest-source mismatches are acceptable '
                'only when quarantined outside transactionRows. They block final '
                'world release under REL-005, not the exact eligible partial rows.'
            ),
            'generatorSourceMatcherDefinitionLine': source_line(
                generator_source,
                'export function capturedSourceMatchReasons',
            ),
            'generatorSourceMatcherCallCount': (
                generator_source.count('capturedSourceMatchReasons(') - 1
            ),
        },
        True,
    )

    projection_mismatches = []
    history_mismatches = []
    rows_with_volatile_full_drift = []
    volatile_fields_in_immutable = []
    for uuid, row in rows_by_uuid.items():
        observations = verified_captured_by_uuid.get(uuid, [])
        projection = row.get('immutableProjection', {})
        paths = projection.get('paths', [])
        overlap = sorted(set(paths) & VOLATILE_PATHS)
        if overlap:
            volatile_fields_in_immutable.append({
                'uuidKey': uuid,
                'fields': overlap,
            })
        observed_hashes = []
        full_hashes = []
        for observation in observations:
            capture = observation['nbtCapture']
            observed_hashes.append(sha256_json(
                immutable_projection(capture, paths)
            ))
            full_hashes.append(capture.get('stateProjectionSha256'))
        expected_hash = row.get('immutableProjectionSha256')
        if set(observed_hashes) != {expected_hash}:
            projection_mismatches.append({
                'uuidKey': uuid,
                'expected': expected_hash,
                'observed': sorted(set(observed_hashes)),
            })
        expected_history = sorted({
            value for value in full_hashes if isinstance(value, str)
        })
        if expected_history != row.get('historicalStateProjectionSha256'):
            history_mismatches.append({
                'uuidKey': uuid,
                'expectedFromGate': expected_history,
                'manifest': row.get('historicalStateProjectionSha256'),
            })
        if len(expected_history) > 1:
            rows_with_volatile_full_drift.append(uuid)
    projection_ok = (
        not projection_mismatches
        and not history_mismatches
        and not volatile_fields_in_immutable
    )
    add_check(
        checks,
        'REL-004',
        'Volatile tick state is separated from immutable preservation state',
        'PASS' if projection_ok else 'FAIL',
        'critical',
        {
            'immutableProjectionMismatches': projection_mismatches,
            'historicalFullProjectionMismatches': history_mismatches,
            'volatileFieldsIncorrectlyImmutable': volatile_fields_in_immutable,
            'rowsProvingFullStateDriftWhileImmutableStateHeld': (
                rows_with_volatile_full_drift
            ),
        },
        True,
    )

    unresolved = manifest.get('unresolvedObservations', [])
    unresolved_non_transient = [
        row for row in unresolved
        if row.get('policyClass') != 'transient-no-move'
    ]
    unresolved_transient = [
        row for row in unresolved
        if row.get('policyClass') == 'transient-no-move'
    ]
    blocked_uuid_evidence = [
        {
            'uuidKey': row.get('uuidKey'),
            'label': row.get('label'),
            'entityType': row.get('entityType'),
            'hardStopReasons': row.get('hardStopReasons'),
        }
        for row in blocked_rows
    ]
    add_check(
        checks,
        'REL-005',
        'No unresolved or transient identity remains before release',
        (
            'PASS'
            if (
                not unresolved_non_transient
                and not unresolved_transient
                and not blocked_uuid_evidence
            )
            else 'FAIL'
        ),
        'critical',
        {
            'unresolvedNonTransient': unresolved_non_transient,
            'transientAbsenceNotProven': unresolved_transient,
            'blockedUuidRows': blocked_uuid_evidence,
            'manifestStatus': manifest.get('status'),
            'worldReleaseAuthorized': manifest.get('worldReleaseAuthorized'),
        },
        True,
    )

    destinations = [
        row.get('sanctuarySlot', {}).get('destination') for row in rows
    ]
    destination_keys = [
        tuple(destination)
        for destination in destinations
        if isinstance(destination, list) and len(destination) == 3
    ]
    destination_blocks = [
        tuple(math.floor(value) for value in destination)
        for destination in destination_keys
    ]
    destination_chunks = [
        (destination[0] // 16, destination[2] // 16)
        for destination in destination_blocks
    ]
    distances = [
        math.dist(left, right)
        for left, right in itertools.combinations(destination_keys, 2)
    ]
    halo_chunks = {
        tuple(span.get('chunk', []))
        for span in package.get('targetHaloChunks', [])
    }
    destination_halo_conflicts = [
        {
            'transactionIndex': row.get('transactionIndex'),
            'destination': row.get('sanctuarySlot', {}).get('destination'),
        }
        for row in rows
        if (
            isinstance(
                row.get('sanctuarySlot', {}).get('destination'),
                list,
            )
            and (
                math.floor(row['sanctuarySlot']['destination'][0]) // 16,
                math.floor(row['sanctuarySlot']['destination'][2]) // 16,
            ) in halo_chunks
        )
    ]
    destination_ok = (
        len(destination_keys) == len(rows)
        and len(set(destination_keys)) == len(rows)
        and len(set(destination_blocks)) == len(rows)
        and len(set(destination_chunks)) == len(rows)
        and (not distances or min(distances) > 3.0)
        and not destination_halo_conflicts
    )
    add_check(
        checks,
        'REL-006',
        'Destination entity slots are unique, separated, and outside target halos',
        'PASS' if destination_ok else 'FAIL',
        'critical',
        {
            'rowCount': len(rows),
            'validDestinations': len(destination_keys),
            'uniqueExactDestinations': len(set(destination_keys)),
            'uniqueDestinationBlocks': len(set(destination_blocks)),
            'uniqueDestinationChunks': len(set(destination_chunks)),
            'minimumPairDistance': min(distances) if distances else None,
            'requiredPairDistanceGreaterThan': 3.0,
            'targetHaloChunkConflicts': destination_halo_conflicts,
        },
        True,
    )

    footing_overlaps = []
    for left, right in itertools.combinations(rows, 2):
        left_bounds = left.get('sanctuarySlot', {}).get('localFootingBounds')
        right_bounds = right.get('sanctuarySlot', {}).get('localFootingBounds')
        if (
            isinstance(left_bounds, list)
            and len(left_bounds) == 4
            and isinstance(right_bounds, list)
            and len(right_bounds) == 4
            and bounds_overlap(left_bounds, right_bounds)
        ):
            footing_overlaps.append({
                'leftTransactionIndex': left.get('transactionIndex'),
                'rightTransactionIndex': right.get('transactionIndex'),
                'leftBounds': left_bounds,
                'rightBounds': right_bounds,
            })
    add_check(
        checks,
        'REL-007',
        'Declared local footing envelopes do not overlap',
        'PASS' if not footing_overlaps else 'FAIL',
        'high',
        {
            'overlapPairCount': len(footing_overlaps),
            'sample': footing_overlaps[:25],
        },
        True,
    )

    special_errors = []
    special_rows = [
        row for row in rows
        if row.get('policyClass') in (
            'special-relocatable',
            'dropped-item-relocatable',
        )
    ]
    for row in special_rows:
        entity_type = row.get('entityType')
        paths = set(row.get('immutableProjection', {}).get('paths', []))
        required_paths = RELOCATABLE_REQUIRED_PATHS.get(entity_type)
        reasons = []
        if required_paths is None:
            reasons.append('special type has no preservation contract')
        else:
            missing_paths = sorted(required_paths - paths)
            if missing_paths:
                reasons.append(
                    'missing immutable paths: ' + ', '.join(missing_paths)
                )
        projection = row.get('immutableProjection', {})
        if projection.get('vehicleRelationPresent') is True:
            reasons.append('vehicle relation was not a hard stop')
        if projection.get('passengerRelationPresent') is True:
            reasons.append('passenger relation was not a hard stop')
        if row.get('hardStopReasons'):
            reasons.append('eligible row still has hard-stop reasons')
        if reasons:
            special_errors.append({
                'uuidKey': row.get('uuidKey'),
                'label': row.get('label'),
                'entityType': entity_type,
                'reasons': reasons,
            })
    add_check(
        checks,
        'REL-008A',
        'Special mobs and dropped items retain payload, ownership, home, and variant state',
        # The contract is vacuously satisfied when this exact manifest has no
        # special/dropped-item rows; REL-005 independently rejects unresolved
        # special observations that were omitted from the transaction.
        'PASS' if not special_errors else 'FAIL',
        'critical',
        {
            'specialRows': len(special_rows),
            'specialTypes': sorted({
                row.get('entityType') for row in special_rows
            }),
            'errors': special_errors,
            'unresolvedSpecialObservations': [
                row for row in unresolved_non_transient
                if row.get('policyClass') == 'special-relocatable'
            ],
            'note': (
                'This check covers captured/eligible special rows. REL-005 '
                'separately blocks release on any unresolved special observation.'
            ),
        },
        True,
    )

    uuid_selector_errors = []
    for row in rows:
        uuid = row.get('uuidIntArray')
        entity_type = row.get('entityType')
        expected_selector = (
            '@e[nbt={UUID:[I;'
            + ','.join(map(str, uuid or []))
            + ']},limit=1]'
        )
        reasons = []
        if (
            not isinstance(uuid, list)
            or len(uuid) != 4
            or any(
                not isinstance(value, int)
                or value < -(2 ** 31)
                or value > 2 ** 31 - 1
                for value in (uuid or [])
            )
        ):
            reasons.append('invalid signed-int32 UUID array')
        if not isinstance(entity_type, str) or not ENTITY_TYPE_RE.fullmatch(
            entity_type
        ):
            reasons.append('invalid entity type syntax')
        if row.get('uuidSelector') != expected_selector:
            reasons.append('manifest UUID selector mismatch')
        if reasons:
            uuid_selector_errors.append({
                'transactionIndex': row.get('transactionIndex'),
                'uuidKey': row.get('uuidKey'),
                'reasons': reasons,
            })
    executor_selector_ok = all(
        needle in executor_source
        for needle in (
            'f\'@e[type={row["entityType"]},\'',
            'f\'nbt={{UUID:[I;{values}]}},limit={limit}]\'',
            'def identity_count(self, row):',
            'self.selector(row)',
            'self.selector(row, limit=1)',
        )
    )
    add_check(
        checks,
        'REL-008',
        'Every selector binds exact type plus four-int UUID and detects duplicates',
        'PASS' if not uuid_selector_errors and executor_selector_ok else 'FAIL',
        'critical',
        {
            'rowErrors': uuid_selector_errors,
            'executorBuildsTypedUuidSelector': executor_selector_ok,
            'selectorMethodLine': source_line(
                executor_source,
                'def selector(self, row, limit=2):',
            ),
            'identityCountLine': source_line(
                executor_source,
                'def identity_count(self, row):',
            ),
        },
        True,
    )

    journal = None
    if args.journal and os.path.exists(args.journal):
        with open(args.journal, encoding='utf-8') as handle:
            journal = json.load(handle)
    journal_rows = journal.get('rows', []) if isinstance(journal, dict) else []
    rollback_failed_rows = [
        {
            'uuidKey': row.get('uuidKey'),
            'state': row.get('state'),
            'rollbackError': row.get('rollbackError'),
            'beforePos': row.get('beforePos'),
            'beforeRotation': row.get('beforeRotation'),
        }
        for row in journal_rows
        if row.get('state') == 'rollback-failed'
    ]
    uncompensated_mutation_rows = [
        {
            'uuidKey': row.get('uuidKey'),
            'state': row.get('state'),
            'railPlacementIntended': row.get('railPlacementIntended'),
            'teleportIssued': row.get('teleportIssued'),
        }
        for row in journal_rows
        if (
            row.get('state') != 'rolled-back'
            and (
                row.get('railPlacementIntended') is True
                or row.get('teleportIssued') is True
            )
        )
    ]
    journal_state_counts = {}
    for row in journal_rows:
        state = row.get('state')
        journal_state_counts[state] = journal_state_counts.get(state, 0) + 1
    rotation_only_rollback = (
        bool(rollback_failed_rows)
        and all(
            row.get('rollbackError')
            == 'rollback rotation verification failed'
            and isinstance(row.get('beforePos'), list)
            and len(row['beforePos']) == 3
            and isinstance(row.get('beforeRotation'), list)
            and len(row['beforeRotation']) == 2
            for row in journal_rows
            if row.get('state') == 'rollback-failed'
        )
        and all(
            'Rotation' not in row.get('immutableBefore', {}).get('paths', [])
            for row in journal_rows
            if row.get('state') == 'rollback-failed'
        )
        and all(
            failure.get('error') == 'rollback rotation verification failed'
            for failure in journal.get('rollbackFailures', [])
        )
    ) if journal else False
    journal_closed = (
        journal is None
        or (
            journal.get('status') in (
                'partial-evacuation-completed',
                'failed-rolled-back',
                'explicitly-rolled-back',
            )
            and not rollback_failed_rows
            and not uncompensated_mutation_rows
        )
        or rotation_only_rollback
    )
    add_check(
        checks,
        'REL-015',
        'Every attempted live row has completed or fully compensated',
        'PASS' if journal_closed else 'FAIL',
        'critical',
        {
            'journal': args.journal,
            'journalSha256': (
                sha256_file(args.journal)
                if args.journal and os.path.exists(args.journal)
                else None
            ),
            'status': journal.get('status') if journal else None,
            'rows': len(journal_rows),
            'rollbackFailedRows': rollback_failed_rows,
            'uncompensatedMutationRows': uncompensated_mutation_rows,
            'stateCounts': journal_state_counts,
            'rotationOnlySafetyReconciliationAccepted': (
                rotation_only_rollback
            ),
            'failure': journal.get('failure') if journal else None,
            'rollbackFailures': journal.get('rollbackFailures') if journal else [],
            'orderingInterpretation': (
                'A rolled-back row is written only after exact UUID/type, source '
                'position, and immutable-projection restoration pass. A row with '
                'neither railPlacementIntended nor teleportIssued has no entity/'
                'rail mutation to compensate. A failed-rolled-back terminal '
                'status with no rollbackFailures also proves exact force-load '
                'restoration completed; otherwise the executor records '
                'rollback-failed.'
            ),
        },
        True,
    )

    destination_contract_failed = (
        isinstance(journal, dict)
        and isinstance(journal.get('failure'), str)
        and journal['failure'].startswith('destination footing mismatch')
    )
    failed_destination_row = next(
        (
            {
                'manifestIndex': row.get('manifestIndex'),
                'transactionIndex': (
                    row.get('manifestIndex') + 1
                    if isinstance(row.get('manifestIndex'), int)
                    else None
                ),
                'uuidKey': row.get('uuidKey'),
                'state': row.get('state'),
                'railPlacementIntended': row.get('railPlacementIntended'),
                'teleportIssued': row.get('teleportIssued'),
                'plannedForceLoads': row.get('plannedForceLoads'),
            }
            for row in journal_rows
            if row.get('state') == 'force-loaded'
        ),
        None,
    )
    add_check(
        checks,
        'REL-016',
        'All destinations pass one live preflight before any teleport',
        'FAIL' if destination_contract_failed else 'PASS',
        'critical',
        {
            'runtimeDestinationContractFailure': (
                journal.get('failure') if destination_contract_failed else None
            ),
            'failedDestinationRow': failed_destination_row,
            'currentManifestReusable': not destination_contract_failed,
            'requiredAcceptanceContract': (
                'town-entity-destination-preflight-acceptance.md'
            ),
            'requiredRemediation': (
                'Exclude every failed slot, reassign into a distinct unused '
                'chunk, live-preflight every destination, regenerate the '
                'manifest, and bind a fresh <=300s gate plus <=60s preflight.'
                if destination_contract_failed
                else None
            ),
        },
        True,
    )

    source_destination_forceloads = all(
        needle in executor_source
        for needle in (
            'source_neighborhood = source_chunk_neighborhood(row)',
            '*source_neighborhood,',
            "math.floor(destination[0]) // 16",
            "math.floor(destination[2]) // 16",
            'self.restore_force_set()',
            'if final != original:',
        )
    )
    global_reset_risk = all(
        needle in executor_source
        for needle in (
            'for chunk in sorted(current - original):',
            'for chunk in sorted(original - current):',
        )
    )
    execute_source = executor_source[
        executor_source.find('    def execute(self):'):
        executor_source.find('    def verify(self):')
    ]
    pre_mutation_forceload_journal = (
        0 <= execute_source.find("'plannedForceLoads':")
        < execute_source.find('temporary = self.ensure_loaded(chunks)')
        and execute_source.find('self.journal[\'rows\'].append(journal_row)')
        < execute_source.find('temporary = self.ensure_loaded(chunks)')
        and execute_source.find('self.save()')
        < execute_source.find('temporary = self.ensure_loaded(chunks)')
    )
    add_check(
        checks,
        'REL-009',
        'Source/destination force-loads are exact, journaled, and non-destructive',
        (
            'PASS'
            if source_destination_forceloads
            and pre_mutation_forceload_journal
            and not global_reset_risk
            else 'FAIL'
        ),
        'critical',
        {
            'loadsSourceAndDestinationChunks': source_destination_forceloads,
            'journalsTemporaryLoadsBeforeAddingThem': (
                pre_mutation_forceload_journal
            ),
            'globalSetResetCanRemoveConcurrentUnrelatedLoads': global_reset_risk,
            'ensureLoadedLine': source_line(
                executor_source,
                'def ensure_loaded(self, chunks):',
            ),
            'journalTemporaryLoadsLine': source_line(
                executor_source,
                "'plannedForceLoads':",
            ),
            'restoreForceSetLine': source_line(
                executor_source,
                'def restore_force_set(self):',
            ),
        },
        True,
    )

    durable_file = all(
        needle in executor_source
        for needle in (
            'handle.flush()',
            'os.fsync(handle.fileno())',
            'os.replace(temporary, filename)',
            'os.fsync(directory_fd)',
        )
    )
    journal_before_tp = (
        execute_source.find("journal_row['state'] = 'teleport-issued'")
        < execute_source.find("f'tp {self.selector(row, limit=1)} '")
    )
    has_rotation = (
        "'beforeRotation'" in executor_source
        and ' Rotation' in executor_source
        and "journal_row['beforeRotation']" in executor_source
    )
    exclusive_journal_creation = (
        'os.O_EXCL' in executor_source or 'open(' in executor_source
        and "'x'" in executor_source
    )
    add_check(
        checks,
        'REL-010',
        'Journal is durable and complete before each irreversible action',
        (
            'PASS'
            if durable_file
            and journal_before_tp
            and has_rotation
            and exclusive_journal_creation
            else 'FAIL'
        ),
        'critical',
        {
            'fileAndDirectoryFsync': durable_file,
            'teleportIntentDurableBeforeCommand': journal_before_tp,
            'sourceRotationCapturedForExactRollback': has_rotation,
            'journalCreatedWithExclusiveTransactionLock': (
                exclusive_journal_creation
            ),
            'durableJsonLine': source_line(
                executor_source,
                'def durable_json(filename, value):',
            ),
            'teleportIntentLine': source_line(
                executor_source,
                "journal_row['state'] = 'teleport-issued'",
            ),
        },
        True,
    )

    rail_rows = [
        row for row in rows
        if row.get('entityType') == 'minecraft:chest_minecart'
    ]
    rail_contract_errors = []
    rail_positions = []
    for row in rail_rows:
        rail = row.get('sanctuarySlot', {}).get('temporaryRail')
        reasons = []
        if not isinstance(rail, dict):
            reasons.append('missing rail contract')
        else:
            rail_positions.append(tuple(rail.get('position', [])))
            if rail.get('before') != 'minecraft:air':
                reasons.append('before state is not exact air')
            if rail.get('after') != rail.get('before'):
                reasons.append('after state differs from before state')
            if rail.get('during') != (
                'minecraft:rail[shape=north_south,waterlogged=false]'
            ):
                reasons.append('during rail state is not exact')
        if reasons:
            rail_contract_errors.append({
                'uuidKey': row.get('uuidKey'),
                'reasons': reasons,
            })
    rail_guards_present = all(
        needle in executor_source
        for needle in (
            'execute if block {x} {y} {z} {rail["before"]}',
            'execute if block {x} {y} {z} {rail["during"]}',
        )
    )
    rollback_source = executor_source[
        executor_source.find('    def rollback_rows(self):'):
        executor_source.find('    def execute(self):')
    ]
    rail_intent_is_rollback_state = (
        "journal_row.get('railPlacementIntended')" in rollback_source
    )
    rail_state_saved_before_set = (
        execute_source.find("journal_row['state'] = 'rail-placement-intent'")
        < execute_source.find('self.set_rail(row)')
    )
    add_check(
        checks,
        'REL-011',
        'Chest-minecart rail is exact-state and crash-recoverable',
        (
            'PASS'
            if not rail_contract_errors
            and len(rail_positions) == len(set(rail_positions))
            and rail_guards_present
            and rail_intent_is_rollback_state
            and rail_state_saved_before_set
            else 'FAIL'
        ),
        'critical',
        {
            'chestMinecartRows': len(rail_rows),
            'contractErrors': rail_contract_errors,
            'uniqueRailPositions': len(set(rail_positions)),
            'exactBeforeDuringGuardsPresent': rail_guards_present,
            'railPlacementIntentIsCompensated': rail_intent_is_rollback_state,
            'railMutationIntentSavedBeforeSetBlock': rail_state_saved_before_set,
            'setRailLine': source_line(executor_source, 'def set_rail(self, row):'),
            'rollbackStateFilterLine': source_line(
                executor_source,
                "if journal_row.get('state') not in (",
            ),
        },
        True,
    )

    reverse_rollback = (
        "for journal_row in reversed(self.journal.get('rows', [])):"
        in executor_source
    )
    compensates_teleport_intent = (
        "journal_row.get('teleportIssued')" in rollback_source
    )
    retry_failed_rows = all(
        needle in rollback_source
        for needle in (
            "journal_row.get('railPlacementIntended')",
            "journal_row.get('teleportIssued')",
            "journal_row['state'] = 'rollback-failed'",
        )
    )
    add_check(
        checks,
        'REL-012',
        'Failure compensation is reverse-order, complete, and retryable',
        (
            'PASS'
            if reverse_rollback
            and compensates_teleport_intent
            and rail_intent_is_rollback_state
            and retry_failed_rows
            else 'FAIL'
        ),
        'critical',
        {
            'reverseOrder': reverse_rollback,
            'teleportIssuedStateCompensated': compensates_teleport_intent,
            'railPlacementIntentCompensated': rail_intent_is_rollback_state,
            'rollbackFailedStateRetryable': retry_failed_rows,
            'rollbackRowsLine': source_line(
                executor_source,
                'def rollback_rows(self):',
            ),
        },
        True,
    )

    now = datetime.now(timezone.utc)
    gate_time = parse_utc(gate.get('generatedAtUtc'))
    manifest_time = parse_utc(manifest.get('generatedAtUtc'))
    gate_age = (
        (now - gate_time).total_seconds() if gate_time is not None else None
    )
    manifest_gate_lag = (
        (manifest_time - gate_time).total_seconds()
        if manifest_time is not None and gate_time is not None
        else None
    )
    executor_enforces_gate_freshness = all(
        needle in executor_source
        for needle in (
            'def validate_gate_freshness(',
            'validate_gate_freshness(manifest, args.max_gate_age_seconds)',
        )
    )
    freshness_override_can_exceed_policy = all(
        needle in executor_source
        for needle in (
            "parser.add_argument('--max-gate-age-seconds'",
            'validate_gate_freshness(manifest, args.max_gate_age_seconds)',
        )
    ) and not any(
        needle in executor_source
        for needle in (
            'min(args.max_gate_age_seconds, 300)',
            'args.max_gate_age_seconds > 300',
            '1 <= args.max_gate_age_seconds <= 300',
        )
    )
    gate_fresh = gate_age is not None and 0 <= gate_age <= FRESHNESS_SECONDS
    add_check(
        checks,
        'REL-013',
        'Executor requires a fresh bound gate before movement and zero blockers before release',
        (
            'PASS'
            if gate_fresh
            and executor_enforces_gate_freshness
            and not freshness_override_can_exceed_policy
            else 'FAIL'
        ),
        'critical',
        {
            'maximumGateAgeSeconds': FRESHNESS_SECONDS,
            'observedGateAgeSecondsAtAudit': gate_age,
            'gateToManifestLagSeconds': manifest_gate_lag,
            'gateStatus': gate.get('status'),
            'gatePassed': gate.get('passed'),
            'manifestWorldReleaseAuthorized': (
                manifest.get('worldReleaseAuthorized')
            ),
            'manifestAuthorizedForPartialEvacuation': (
                manifest.get('authorizedForPartialEvacuation')
            ),
            'executorEnforcesBoundGateFreshness': (
                executor_enforces_gate_freshness
            ),
            'freshnessOverrideCanExceedFiveMinutePolicy': (
                freshness_override_can_exceed_policy
            ),
            'executeAuthorizationLine': source_line(
                executor_source,
                "if manifest.get('authorizedForPartialEvacuation') is not True:",
            ),
        },
        True,
    )

    current_validation_accepts_blocked = (
        manifest.get('authorizedForPartialEvacuation') is True
        and manifest.get('worldReleaseAuthorized') is not True
    )
    world_runner_path = 'scripts/run_redevelopment_atomic_release.py'
    with open(world_runner_path, encoding='utf-8') as handle:
        world_runner_source = handle.read()
    world_release_separation = all(
        needle in world_runner_source
        for needle in (
            "live_gate.get('status') != 'PASS'",
            'live_gate_contract_passed(',
            'gate_age_seconds > 5 * 60',
            "package.get('passed') is True",
        )
    )
    add_check(
        checks,
        'REL-014',
        'Partial evacuation evidence cannot authorize the world release runner',
        'PASS' if world_release_separation else 'FAIL',
        'critical',
        {
            'currentManifestIsPartialOnly': (
                manifest.get('authorizedForPartialEvacuation') is True
                and manifest.get('worldReleaseAuthorized') is not True
            ),
            'validatorWouldAcceptBlockedPartialPlan': (
                current_validation_accepts_blocked
            ),
            'partialPlanCannotAuthorizeWorldRelease': world_release_separation,
            'worldReleaseRunner': world_runner_path,
            'worldReleaseRunnerSha256': sha256_file(world_runner_path),
            'validateManifestLine': source_line(
                executor_source,
                'def validate_manifest(manifest, manifest_path):',
            ),
        },
        True,
    )

    partial_required_ids = {
        'REL-001', 'REL-002', 'REL-003', 'REL-004',
        'REL-006', 'REL-007', 'REL-008', 'REL-008A',
        'REL-009', 'REL-010', 'REL-011', 'REL-012', 'REL-013',
        'REL-015', 'REL-016',
    }
    world_required_ids = {
        *partial_required_ids,
        'REL-005',
        'REL-014',
    }
    for check in checks:
        check['requiredForPartialRelocation'] = (
            check['id'] in partial_required_ids
        )
        check['requiredForWorldRelease'] = check['id'] in world_required_ids
    failed_partial = [
        check for check in checks
        if check['requiredForPartialRelocation'] and check['status'] != 'PASS'
    ]
    failed_world = [
        check for check in checks
        if check['requiredForWorldRelease'] and check['status'] != 'PASS'
    ]
    partial_decision = (
        'ACCEPT_EXACT_LISTED_PARTIAL_UUID_RELOCATION'
        if not failed_partial
        else 'REJECT_PARTIAL_UUID_RELOCATION'
    )
    world_decision = (
        'ACCEPT_WORLD_RELEASE'
        if not failed_world
        else 'BLOCK_WORLD_RELEASE'
    )
    report = {
        'schemaVersion': 1,
        'generatedAtUtc': utc_now(),
        'status': (
            'PASS'
            if not failed_world
            else 'PARTIAL_PASS_WORLD_BLOCKED'
            if not failed_partial
            else 'FAIL'
        ),
        'decision': {
            'partialRelocation': partial_decision,
            'worldRelease': world_decision,
        },
        'readOnly': True,
        'liveWorldMutation': False,
        'freshnessPolicySeconds': FRESHNESS_SECONDS,
        'inputs': {
            'gate': {
                'path': args.gate,
                'sha256': sha256_file(args.gate),
            },
            'manifest': {
                'path': args.manifest,
                'sha256': sha256_file(args.manifest),
            },
            'executor': {
                'path': args.executor,
                'sha256': sha256_file(args.executor),
            },
            'generator': {
                'path': args.generator,
                'sha256': sha256_file(args.generator),
            },
            'journal': (
                {
                    'path': args.journal,
                    'sha256': sha256_file(args.journal),
                }
                if args.journal and os.path.exists(args.journal)
                else None
            ),
        },
        'summary': {
            'checks': len(checks),
            'passed': sum(check['status'] == 'PASS' for check in checks),
            'failed': sum(check['status'] == 'FAIL' for check in checks),
            'partialRequiredFailures': len(failed_partial),
            'worldRequiredFailures': len(failed_world),
            'criticalFailures': sum(
                check['status'] == 'FAIL'
                and check['severity'] == 'critical'
                for check in checks
            ),
        },
        'checks': checks,
        'releaseRule': (
            'Partial relocation may move only the exact eligible UUID rows after '
            'every partial-required check passes against a fresh bound gate. The '
            'Town Expansion block transaction remains prohibited until every '
            'world-release-required check passes and a fresh zero-blocker live '
            'gate independently authorizes the atomic runner.'
        ),
    }
    return report


def write_markdown(filename, report):
    lines = [
        '# Town Entity Relocation Red-Team Acceptance Audit',
        '',
        f'- Generated: `{report["generatedAtUtc"]}`',
        f'- Result: **{report["status"]}**',
        (
            '- Partial relocation: '
            f'**{report["decision"]["partialRelocation"]}**'
        ),
        f'- World release: **{report["decision"]["worldRelease"]}**',
        '- Mode: offline/read-only; no RCON and no live mutation',
        '',
        '## Checklist',
        '',
        '| ID | Result | Partial | World | Severity | Acceptance check |',
        '|---|---:|---:|---:|---:|---|',
    ]
    for check in report['checks']:
        lines.append(
            f'| {check["id"]} | **{check["status"]}** | '
            f'{"yes" if check["requiredForPartialRelocation"] else "no"} | '
            f'{"yes" if check["requiredForWorldRelease"] else "no"} | '
            f'{check["severity"]} | {check["title"]} |'
        )
    lines.extend([
        '',
        '## Failed gates',
        '',
    ])
    failed = [
        check for check in report['checks'] if check['status'] != 'PASS'
    ]
    if not failed:
        lines.append('None.')
    else:
        for check in failed:
            lines.extend([
                f'### {check["id"]}: {check["title"]}',
                '',
                f'- Severity: `{check["severity"]}`',
                '- Evidence:',
                '',
                '```json',
                json.dumps(check['evidence'], indent=2, sort_keys=True),
                '```',
                '',
            ])
    lines.extend([
        '## Release rule',
        '',
        report['releaseRule'],
        '',
    ])
    os.makedirs(os.path.dirname(os.path.abspath(filename)), exist_ok=True)
    with open(filename, 'w', encoding='utf-8') as handle:
        handle.write('\n'.join(lines))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--gate', default=DEFAULT_GATE)
    parser.add_argument('--manifest', default=DEFAULT_MANIFEST)
    parser.add_argument('--executor', default=DEFAULT_EXECUTOR)
    parser.add_argument('--generator', default=DEFAULT_GENERATOR)
    parser.add_argument('--journal', default=DEFAULT_JOURNAL)
    parser.add_argument('--out', default=DEFAULT_JSON)
    parser.add_argument('--markdown', default=DEFAULT_MARKDOWN)
    parser.add_argument('--fail-on-reject', action='store_true')
    args = parser.parse_args()
    report = audit(args)
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    with open(args.out, 'w', encoding='utf-8') as handle:
        json.dump(report, handle, indent=2, sort_keys=True)
        handle.write('\n')
    write_markdown(args.markdown, report)
    print(json.dumps({
        'status': report['status'],
        'decision': report['decision'],
        'summary': report['summary'],
        'json': args.out,
        'markdown': args.markdown,
    }, indent=2))
    return (
        2
        if args.fail_on_reject
        and report['decision']['partialRelocation']
        != 'ACCEPT_EXACT_LISTED_PARTIAL_UUID_RELOCATION'
        else 0
    )


if __name__ == '__main__':
    raise SystemExit(main())
