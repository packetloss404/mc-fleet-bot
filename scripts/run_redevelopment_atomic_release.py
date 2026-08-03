#!/usr/bin/env python3
"""Execute the redevelopment release as a compensating atomic transaction.

Five independently generated exact-state packages are committed in a fixed
order. If any package fails, the partially applied package and every previously
completed package are rolled back in reverse order. The transaction ledger is
rewritten after every state transition so an interrupted session remains
auditable.
"""

import argparse
import hashlib
import json
import os
import subprocess
import sys
from datetime import datetime, timezone


PACKAGES = [
    {
        'key': 'westlight',
        'forward': 'data/buildops/westlight-infinity-screen-2026-07-27.txt',
        'rollback': 'data/buildops/westlight-infinity-screen-2026-07-27.rollback.txt',
    },
    {
        'key': 'ravenrock',
        'forward': 'data/buildops/ravenrock-s1-section-pilot-2026-07-27.txt',
        'rollback': 'data/buildops/ravenrock-s1-section-pilot-2026-07-27.rollback.txt',
    },
    {
        'key': 'mainstreet',
        'forward':
            'data/buildops/mainstreet-redevelopment-r4-r5-runtime-safe-2026-07-27.txt',
        'rollback':
            'data/buildops/mainstreet-redevelopment-r4-r5-runtime-safe-2026-07-27.rollback.txt',
    },
    {
        'key': 'bunker-phase1',
        'forward': 'data/buildops/mainstreet-bunker-surface-phase1-2026-07-27.txt',
        'rollback': 'data/buildops/mainstreet-bunker-surface-phase1-2026-07-27.rollback.txt',
    },
    {
        'key': 'bunker-phase2',
        'forward': 'data/buildops/mainstreet-bunker-recessed-portal-phase2-2026-07-27.txt',
        'rollback': 'data/buildops/mainstreet-bunker-recessed-portal-phase2-2026-07-27.rollback.txt',
    },
]


def load_release_plan(filename):
    """Load an optional release manifest without weakening the R1 defaults."""
    if not filename:
        return {
            'schemaVersion': 1,
            'transactionId': 'redevelopment-atomic-release-2026-07-27',
            'packages': PACKAGES,
        }
    manifest = load_json(filename)
    if manifest.get('schemaVersion') != 1:
        raise SystemExit(f'unsupported release manifest schema: {filename}')
    transaction_id = manifest.get('transactionId')
    packages = manifest.get('packages')
    if not isinstance(transaction_id, str) or not transaction_id.strip():
        raise SystemExit(f'release manifest has no transactionId: {filename}')
    if not isinstance(packages, list) or not packages:
        raise SystemExit(f'release manifest has no packages: {filename}')
    normalized = []
    keys = set()
    paths = set()
    for index, package in enumerate(packages):
        if not isinstance(package, dict):
            raise SystemExit(f'release manifest package {index} is not an object')
        key = package.get('key')
        forward = package.get('forward')
        rollback = package.get('rollback')
        if not all(
            isinstance(value, str) and value.strip()
            for value in (key, forward, rollback)
        ):
            raise SystemExit(
                f'release manifest package {index} requires key, forward, and rollback'
            )
        if key in keys:
            raise SystemExit(f'duplicate release package key: {key}')
        for operation_path in (forward, rollback):
            normalized_path = os.path.abspath(operation_path)
            if normalized_path in paths:
                raise SystemExit(
                    f'release manifest reuses an operation path: {operation_path}'
                )
            paths.add(normalized_path)
        keys.add(key)
        rollback_transition_policy = package.get('rollbackTransitionPolicy')
        if (
            rollback_transition_policy is not None
            and (
                not isinstance(rollback_transition_policy, str)
                or not rollback_transition_policy.strip()
            )
        ):
            raise SystemExit(
                f'release manifest package {index} has invalid '
                'rollbackTransitionPolicy'
            )
        normalized.append({
            'key': key,
            'forward': forward,
            'rollback': rollback,
            **(
                {'rollbackTransitionPolicy': rollback_transition_policy}
                if rollback_transition_policy else {}
            ),
        })
    return {
        'schemaVersion': 1,
        'transactionId': transaction_id,
        'packages': normalized,
        'manifest': os.path.abspath(filename),
        'manifestSha256': sha256(filename),
    }


def utc_now():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z')


def sha256(filename):
    digest = hashlib.sha256()
    with open(filename, 'rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def load_json(filename):
    with open(filename, encoding='utf-8') as handle:
        return json.load(handle)


def parse_utc(value):
    if not isinstance(value, str):
        raise ValueError('timestamp is not a string')
    return datetime.fromisoformat(value.replace('Z', '+00:00'))


def guarded_operation_count(filename):
    count = 0
    with open(filename, encoding='utf-8') as handle:
        for raw in handle:
            fields = raw.split()
            if fields and fields[0] == 'REPL':
                count += 1
    return count


def validate_stream_journal(filename, execution):
    """Validate the append-only runner journal and its exact committed prefix."""
    if not os.path.isfile(filename):
        return {'passed': False, 'sha256': None, 'error': 'missing-journal'}
    digest = hashlib.sha256()
    expected_sequence = 1
    expected_group = 0
    active_group = None
    last_event = None
    try:
        with open(filename, 'rb') as handle:
            for raw in handle:
                digest.update(raw)
                event = json.loads(raw)
                if event.get('sequence') != expected_sequence:
                    raise ValueError('non-contiguous journal sequence')
                expected_sequence += 1
                if (
                    event.get('operationSha256')
                    != execution.get('operationSha256')
                    or event.get('sourceGroupPlanSha256')
                    != execution.get('sourceGroupPlanSha256')
                    or event.get('expandedCommandSha256')
                    != execution.get('expandedCommandSha256')
                ):
                    raise ValueError('journal/report plan hash mismatch')
                batch = event.get('batch') or {}
                if batch.get('status') == 'group-intent':
                    if active_group is not None:
                        raise ValueError('nested group intent')
                    active_group = batch.get('activeGroupIndex')
                    if active_group != expected_group:
                        raise ValueError('journal source-group order mismatch')
                elif batch.get('status') == 'group-result':
                    if batch.get('activeGroupIndex') != active_group:
                        raise ValueError('group result does not match intent')
                    if batch.get('activeGroupResult') != 'passed':
                        raise ValueError('journal contains failed group')
                    expected_group += 1
                    active_group = None
                last_event = event
    except (OSError, UnicodeDecodeError, json.JSONDecodeError, ValueError) as error:
        return {
            'passed': False,
            'sha256': digest.hexdigest(),
            'error': str(error),
        }
    passed = (
        last_event is not None
        and last_event.get('status') == 'complete'
        and active_group is None
        and expected_group == execution.get('sourceGroupCount')
    )
    return {
        'passed': passed,
        'sha256': digest.hexdigest(),
        'error': None if passed else 'incomplete committed prefix',
        'eventCount': expected_sequence - 1,
        'committedGroupCount': expected_group,
    }


def parse_operation_boxes(filename):
    boxes = []
    with open(filename, encoding='utf-8') as handle:
        for line_number, raw in enumerate(handle, 1):
            fields = raw.split()
            if not fields or fields[0].startswith('#') or fields[0] != 'REPL':
                continue
            if len(fields) < 9:
                raise ValueError(
                    f'{filename}:{line_number}: malformed REPL operation'
                )
            values = [int(value) for value in fields[1:7]]
            x1, y1, z1, x2, y2, z2 = values
            boxes.append([
                min(x1, x2), min(y1, y2), min(z1, z2),
                max(x1, x2), max(y1, y2), max(z1, z2),
            ])
    if not boxes:
        raise ValueError(f'{filename}: no REPL operations')
    return boxes


def target_halo_spans(boxes):
    spans = {}
    for box in boxes:
        x1, y1, z1, x2, y2, z2 = box
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


def target_envelope(boxes):
    return [
        min(box[0] for box in boxes) - 1,
        min(box[1] for box in boxes) - 2,
        min(box[2] for box in boxes) - 1,
        max(box[3] for box in boxes) + 2,
        max(box[4] for box in boxes) + 3,
        max(box[5] for box in boxes) + 2,
    ]


def normalized_chunk_coordinates(value):
    if not isinstance(value, list):
        return None
    chunks = []
    for entry in value:
        if (
            not isinstance(entry, list)
            or len(entry) != 2
            or any(type(coordinate) is not int for coordinate in entry)
        ):
            return None
        chunks.append(tuple(entry))
    if len(set(chunks)) != len(chunks):
        return None
    return chunks


def partition_target_chunks(chunks, pre_existing, batch_limit, server_limit):
    if (
        type(batch_limit) is not int
        or type(server_limit) is not int
        or not 1 <= batch_limit <= server_limit
        or len(pre_existing) > server_limit
    ):
        raise ValueError('invalid force-load capacity contract')
    temporary_capacity = server_limit - len(pre_existing)
    batches = []
    current = []
    current_temporary = 0
    for chunk in chunks:
        needs_temporary_load = chunk not in pre_existing
        if needs_temporary_load and temporary_capacity == 0:
            raise ValueError('no temporary force-load capacity')
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


def spatial_query_contract_passed_v2(
    package,
    pre_existing,
    chunk_batch_limit,
    server_limit,
):
    expected_categories = (
        ('player', 'type=minecraft:player'),
        ('non-player', 'type=!minecraft:player'),
    )
    selector_limit = package.get('selectorLimit')
    filename = package.get('file')
    if (
        type(selector_limit) is not int
        or not 1 <= selector_limit <= 64
        or not isinstance(filename, str)
        or not os.path.isfile(filename)
        or package.get('queryErrors') != []
        or package.get('blockers') != []
        or package.get('selectorLimitReached') is not False
    ):
        return False
    try:
        boxes = parse_operation_boxes(filename)
        expected_spans = target_halo_spans(boxes)
        expected_batches = partition_target_chunks(
            [tuple(span['chunk']) for span in expected_spans],
            pre_existing,
            chunk_batch_limit,
            server_limit,
        )
    except (OSError, TypeError, ValueError):
        return False
    if (
        package.get('envelope') != target_envelope(boxes)
        or package.get('targetHaloChunks') != expected_spans
        or package.get('targetHaloChunkCount') != len(expected_spans)
        or package.get('spatialBatchCount') != len(expected_spans)
        or package.get('chunkBatchCount') != len(expected_batches)
    ):
        return False
    expected_chunk_batches = [
        {
            'chunkBatchIndex': batch_index,
            'requiredChunks': [list(chunk) for chunk in chunks],
            'temporaryChunks': [
                list(chunk) for chunk in chunks
                if chunk not in pre_existing
            ],
        }
        for batch_index, chunks in enumerate(expected_batches)
    ]
    if package.get('chunkBatches') != expected_chunk_batches:
        return False

    summaries = package.get('categoryQueries')
    queries = package.get('spatialQueries')
    if (
        not isinstance(summaries, list)
        or len(summaries) != len(expected_categories)
        or not isinstance(queries, list)
        or len(queries) != len(expected_spans) * len(expected_categories)
    ):
        return False
    summaries_by_category = {
        summary.get('category'): summary
        for summary in summaries
        if isinstance(summary, dict)
    }
    if set(summaries_by_category) != {
        category for category, _ in expected_categories
    }:
        return False
    query_lookup = {}
    for query in queries:
        if not isinstance(query, dict):
            return False
        key = (query.get('category'), query.get('batchIndex'))
        if key in query_lookup:
            return False
        query_lookup[key] = query

    chunk_batch_indexes = {}
    for chunk_batch_index, chunks in enumerate(expected_batches):
        for chunk in chunks:
            chunk_batch_indexes[chunk] = chunk_batch_index
    selected_total = 0
    for category, entity_filter in expected_categories:
        summary = summaries_by_category[category]
        if (
            summary.get('batchCount') != len(expected_spans)
            or type(summary.get('selectedCount')) is not int
            or summary['selectedCount'] < 0
            or summary.get('selectedCount') != summary.get('parsedPositions')
            or summary.get('selectorLimitReached') is not False
        ):
            return False
        category_selected = 0
        category_parsed = 0
        for batch_index, span in enumerate(expected_spans):
            query = query_lookup.get((category, batch_index))
            if query is None:
                return False
            x1, y1, z1, x2, y2, z2 = span['envelope']
            expected_selector = (
                f'@e[x={x1},y={y1},z={z1},'
                f'dx={x2 - x1},dy={y2 - y1},dz={z2 - z1},'
                f'{entity_filter},limit={selector_limit},sort=arbitrary]'
            )
            selected = query.get('selectedCount')
            chunk = tuple(span['chunk'])
            if (
                query.get('chunk') != span['chunk']
                or query.get('chunkBatchIndex') != chunk_batch_indexes[chunk]
                or query.get('envelope') != span['envelope']
                or query.get('selector') != expected_selector
                or type(selected) is not int
                or selected < 0
                or selected >= selector_limit
                or selected != query.get('parsedPositions')
                or query.get('selectorLimitReached') is not False
            ):
                return False
            category_selected += selected
            category_parsed += query['parsedPositions']
        if (
            category_selected != summary['selectedCount']
            or category_parsed != summary['parsedPositions']
        ):
            return False
        selected_total += category_selected

    returned = package.get('entitiesReturnedInEnvelope')
    return type(returned) is int and 0 <= returned <= selected_total


def live_gate_contract_passed_v2(gate, expected_package_count):
    force_load_audit = gate.get('forceLoadAudit') or {}
    halo = gate.get('halo') or {}
    packages = gate.get('packages')
    server_limit = force_load_audit.get('serverChunkLimit')
    chunk_batch_limit = force_load_audit.get('chunkBatchLimit')
    pre_existing_list = normalized_chunk_coordinates(
        force_load_audit.get('preExistingChunkCoordinates')
    )
    required_list = normalized_chunk_coordinates(
        force_load_audit.get('requiredChunkCoordinates')
    )
    final_list = normalized_chunk_coordinates(
        force_load_audit.get('finalChunkCoordinates')
    )
    if (
        gate.get('schemaVersion') != 2
        or gate.get('status') != 'PASS'
        or gate.get('passed') is not True
        or gate.get('blockOrEntityMutation') is not False
        or gate.get('temporaryForceLoadMutation') is not True
        or halo.get('horizontalBlocks') != 1
        or halo.get('verticalBlocksBelow') != 2
        or halo.get('verticalBlocksAbove') != 2
        or halo.get('positiveTargetCellExtentIncluded') is not True
        or force_load_audit.get('mode') != 'sparse-target-halo-batched'
        or server_limit != 256
        or type(chunk_batch_limit) is not int
        or not 1 <= chunk_batch_limit <= server_limit
        or pre_existing_list is None
        or required_list is None
        or final_list is None
        or pre_existing_list != sorted(pre_existing_list)
        or required_list != sorted(required_list)
        or final_list != sorted(final_list)
        or len(pre_existing_list) > server_limit
        or force_load_audit.get('preExistingChunks') != len(pre_existing_list)
        or force_load_audit.get('requiredChunks') != len(required_list)
        or final_list != pre_existing_list
        or force_load_audit.get('allRequiredChunksLoadedBeforeQueries') is not True
        or force_load_audit.get('missingRequiredChunks') != []
        or force_load_audit.get('cleanupErrors') != []
        or force_load_audit.get('allTemporaryChunksReleased') is not True
        or force_load_audit.get('finalSetMatchesPreExistingSet') is not True
        or not isinstance(packages, list)
        or len(packages) != expected_package_count
        or any(not isinstance(package, dict) for package in packages)
    ):
        return False
    pre_existing = set(pre_existing_list)
    if not all(
        package.get('passed') is True
        and spatial_query_contract_passed_v2(
            package,
            pre_existing,
            chunk_batch_limit,
            server_limit,
        )
        for package in packages
    ):
        return False

    expected_required = sorted({
        tuple(span['chunk'])
        for package in packages
        for span in package['targetHaloChunks']
    })
    if required_list != expected_required:
        return False
    expected_batches = []
    for package in packages:
        for batch in package['chunkBatches']:
            expected_batches.append({
                'packageFile': package['file'],
                'chunkBatchIndex': batch['chunkBatchIndex'],
                'requiredChunks': batch['requiredChunks'],
                'temporaryChunks': batch['temporaryChunks'],
                'missingRequiredChunks': [],
                'temporaryChunksStillLoadedAfterBatch': [],
                'released': True,
                'passed': True,
            })
    batches = force_load_audit.get('batches')
    if (
        batches != expected_batches
        or force_load_audit.get('batchCount') != len(expected_batches)
    ):
        return False
    temporary_additions = sum(
        len(batch['temporaryChunks']) for batch in expected_batches
    )
    maximum_simultaneous = max(
        (len(batch['temporaryChunks']) for batch in expected_batches),
        default=0,
    )
    if (
        force_load_audit.get('temporaryChunkAdditions')
        != temporary_additions
        or force_load_audit.get('maximumSimultaneousTemporaryChunks')
        != maximum_simultaneous
        or maximum_simultaneous > server_limit - len(pre_existing)
        or any(
            len(batch['requiredChunks']) > chunk_batch_limit
            for batch in expected_batches
        )
    ):
        return False
    restored = force_load_audit.get('restoredPreExistingChunks')
    return type(restored) is int and 0 <= restored <= len(pre_existing)


def live_gate_contract_passed(gate, expected_package_count):
    if gate.get('schemaVersion') == 2:
        return live_gate_contract_passed_v2(gate, expected_package_count)
    return False


def write_ledger(filename, ledger):
    ledger['updatedAtUtc'] = utc_now()
    os.makedirs(os.path.dirname(os.path.abspath(filename)), exist_ok=True)
    temporary = f'{filename}.tmp'
    with open(temporary, 'w', encoding='utf-8') as handle:
        json.dump(ledger, handle, indent=2)
        handle.write('\n')
    os.replace(temporary, filename)


def run_package(
    filename,
    report,
    strict,
    *,
    operation_role='forward',
    transition_policy=None,
):
    stream_journal = (
        f'{report}.stream-journal.'
        f'{datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")}.jsonl'
    )
    command = [
        sys.executable,
        'scripts/rcon_runner.py',
        filename,
        '--report',
        report,
        '--stream-journal',
        stream_journal,
        '--operation-role',
        operation_role,
    ]
    transition_plan_audit_path = None
    if transition_policy:
        transition_plan_audit_path = (
            f'{report}.natural-transition-plan-audit.json'
        )
        command.extend([
            '--natural-transition-policy',
            transition_policy,
            '--policy-audit-report',
            transition_plan_audit_path,
        ])
    if strict:
        command.append('--strict-noop')
    result = subprocess.run(command, check=False)
    execution = load_json(report) if os.path.exists(report) else {
        'status': 'missing-report',
        'failedCommands': None,
    }
    force_load_audit = execution.get('forceLoadAudit') or {}
    reported_journal = execution.get('streamJournal')
    journal_validation = validate_stream_journal(
        stream_journal,
        execution,
    )
    journal_hash = journal_validation['sha256']
    transition_evidence = execution.get('naturalStateTransitionPolicy')
    transition_plan_audit = (
        load_json(transition_plan_audit_path)
        if (
            transition_plan_audit_path
            and os.path.exists(transition_plan_audit_path)
        )
        else None
    )
    reported_plan_audit = (
        transition_evidence.get('planAudit')
        if isinstance(transition_evidence, dict)
        else None
    )
    transition_policy_passed = (
        transition_policy is None
        and transition_evidence is None
    ) or (
        transition_policy is not None
        and isinstance(transition_evidence, dict)
        and transition_evidence.get('sha256') == sha256(transition_policy)
        and os.path.abspath(transition_evidence.get('path', ''))
        == os.path.abspath(transition_policy)
        and transition_evidence.get('operationSha256') == sha256(filename)
        and transition_evidence.get('executionRole') == 'rollback'
        and isinstance(transition_plan_audit, dict)
        and transition_plan_audit.get('status') == 'PASS'
        and transition_plan_audit.get('passed') is True
        and transition_plan_audit.get('operation', {}).get('sha256')
            == sha256(filename)
        and transition_plan_audit.get('policy', {}).get('sha256')
            == sha256(transition_policy)
        and isinstance(reported_plan_audit, dict)
        and reported_plan_audit.get('sha256')
            == sha256(transition_plan_audit_path)
        and os.path.abspath(reported_plan_audit.get('path', ''))
            == os.path.abspath(transition_plan_audit_path)
    )
    execution['atomicWrapperJournalValidation'] = journal_validation
    passed = (
        result.returncode == 0
        and execution.get('schemaVersion') == 3
        and execution.get('status') == 'complete'
        and execution.get('operationSha256') == sha256(filename)
        and execution.get('operationRole') == operation_role
        and transition_policy_passed
        and os.path.abspath(execution.get('file', ''))
        == os.path.abspath(filename)
        and execution.get('worldEditLeftoverCount') == 0
        and execution.get('failedGroups') == 0
        and execution.get('stoppedAtFirstFailedGroup') is False
        and execution.get('executedCommandCount')
        == execution.get('expandedCommandCount')
        and force_load_audit.get('mode')
        == 'exact-command-chunk-streaming'
        and force_load_audit.get('serverLimit') == 256
        and force_load_audit.get(
            'allRequiredChunksLoadedBeforeCommands'
        ) is True
        and force_load_audit.get('cleanupErrors') == []
        and force_load_audit.get('allTemporaryReleased') is True
        and force_load_audit.get(
            'finalSetMatchesPreExistingSet'
        ) is True
        and force_load_audit.get(
            'maximumForceLoadedChunkCount',
            257,
        ) <= 256
        and isinstance(reported_journal, str)
        and os.path.abspath(reported_journal)
        == os.path.abspath(stream_journal)
        and execution.get('streamJournalSha256') == journal_hash
        and journal_validation['passed'] is True
    )
    return result.returncode, execution, passed


def execution_ledger_summary(report, execution):
    """Keep the ledger small while binding it to the full runner evidence."""
    summary_fields = (
        'schemaVersion',
        'file',
        'operationSha256',
        'sourceGroupPlanSha256',
        'expandedCommandSha256',
        'status',
        'strictNoop',
        'operationRole',
        'naturalStateTransitionPolicy',
        'sourceGroupCount',
        'expandedCommandCount',
        'executedCommandCount',
        'successfulGroups',
        'failedGroups',
        'failedCommands',
        'stoppedAtFirstFailedGroup',
        'worldEditLeftoverCount',
        'streamJournal',
        'streamJournalSha256',
        'atomicWrapperJournalValidation',
    )
    summary = {
        key: execution.get(key)
        for key in summary_fields
        if key in execution
    }
    force_load = execution.get('forceLoadAudit') or {}
    summary['forceLoadAudit'] = {
        key: force_load.get(key)
        for key in (
            'mode',
            'serverLimit',
            'allRequiredChunksLoadedBeforeCommands',
            'cleanupErrors',
            'allTemporaryReleased',
            'finalSetMatchesPreExistingSet',
            'maximumForceLoadedChunkCount',
        )
        if key in force_load
    }
    summary['report'] = report
    summary['reportSha256'] = sha256(report) if os.path.exists(report) else None
    return summary


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--execute', action='store_true')
    parser.add_argument(
        '--manifest',
        help=(
            'optional schema-1 release plan; omitting it preserves the '
            'five-package R1 release definition'
        ),
    )
    parser.add_argument(
        '--live-gate',
        default='data/world-review/redevelopment-live-entity-gate-2026-07-27.json',
    )
    parser.add_argument(
        '--report',
        default='data/world-review/redevelopment-atomic-transaction-2026-07-27.json',
    )
    parser.add_argument('--pre-regions', required=True)
    parser.add_argument(
        '--rollback-transition-policy',
        help=(
            'exact-point natural transition policy for the sole package '
            'rollback; multi-package releases must bind policies in manifest'
        ),
    )
    args = parser.parse_args()
    if not args.execute:
        raise SystemExit('refusing live mutation without --execute')
    release_plan = load_release_plan(args.manifest)
    release_packages = release_plan['packages']
    if args.rollback_transition_policy:
        if len(release_packages) != 1:
            raise SystemExit(
                '--rollback-transition-policy requires exactly one package'
            )
        if release_packages[0].get('rollbackTransitionPolicy'):
            raise SystemExit(
                'rollback transition policy is declared in both CLI and manifest'
            )
        release_packages[0]['rollbackTransitionPolicy'] = (
            args.rollback_transition_policy
        )
    live_gate = load_json(args.live_gate)
    if live_gate.get('status') != 'PASS' or live_gate.get('passed') is not True:
        raise SystemExit(f'live entity gate is not PASS: {args.live_gate}')
    try:
        gate_age_seconds = (
            datetime.now(timezone.utc) - parse_utc(live_gate.get('generatedAtUtc'))
        ).total_seconds()
    except (TypeError, ValueError) as error:
        raise SystemExit(f'live entity gate has invalid timestamp: {error}') from error
    gate_packages = live_gate.get('packages')
    gate_schema_passed = live_gate_contract_passed(
        live_gate,
        len(release_packages),
    )
    if not gate_schema_passed:
        raise SystemExit(f'live entity gate schema/safety contract failed: {args.live_gate}')
    if gate_age_seconds < 0 or gate_age_seconds > 5 * 60:
        raise SystemExit(
            f'live entity gate is stale ({gate_age_seconds:.1f}s; maximum 300s)'
        )

    gate_hashes = {
        package['file']: package['operationSha256']
        for package in gate_packages
    }
    pre_regions = os.path.abspath(args.pre_regions)
    if not os.path.isdir(pre_regions):
        raise SystemExit(f'pre-release region directory not found: {pre_regions}')
    records = []
    for package in release_packages:
        forward = package['forward']
        rollback = package['rollback']
        preflight_path = forward.replace('.txt', '.prerelease-preflight.json')
        required_artifacts = [forward, rollback, preflight_path]
        rollback_transition_policy = package.get('rollbackTransitionPolicy')
        if rollback_transition_policy:
            required_artifacts.append(rollback_transition_policy)
        for filename in required_artifacts:
            if not os.path.exists(filename):
                raise SystemExit(f'missing release artifact: {filename}')
        forward_hash = sha256(forward)
        if gate_hashes.get(forward) != forward_hash:
            raise SystemExit(f'entity-gate hash mismatch for {forward}')
        preflight = load_json(preflight_path)
        if (
            preflight.get('failed') != 0
            or preflight.get('passed') != preflight.get('operationCount')
            or preflight.get('operationCount') != guarded_operation_count(forward)
            or os.path.abspath(preflight.get('opsPath', '')) != os.path.abspath(forward)
            or os.path.abspath(preflight.get('regions', '')) != pre_regions
        ):
            raise SystemExit(f'preflight is not PASS: {preflight_path}')
        records.append({
            **package,
            'forwardSha256': forward_hash,
            'rollbackSha256': sha256(rollback),
            **(
                {
                    'rollbackTransitionPolicy':
                        rollback_transition_policy,
                    'rollbackTransitionPolicySha256':
                        sha256(rollback_transition_policy),
                }
                if rollback_transition_policy else {}
            ),
            'preflight': preflight_path,
            'status': 'ready',
        })

    ledger = {
        'schemaVersion': 1,
        'transactionId': release_plan['transactionId'],
        'startedAtUtc': utc_now(),
        'status': 'running',
        'atomicityModel': (
            'fixed-order exact-state commit with automatic reverse-order '
            'compensating rollback on any command/report failure'
        ),
        'liveEntityGate': args.live_gate,
        'liveEntityGateAgeSecondsAtStart': round(gate_age_seconds, 3),
        'preReleaseRegions': pre_regions,
        'releaseManifest': release_plan.get('manifest'),
        'releaseManifestSha256': release_plan.get('manifestSha256'),
        'packages': records,
        'events': [],
    }
    write_ledger(args.report, ledger)
    completed = []

    for package in records:
        package['status'] = 'executing'
        package['executionReport'] = package['forward'].replace('.txt', '.execution.json')
        package['preExecutionEntityGate'] = package['forward'].replace(
            '.txt',
            '.pre-execution-entity-gate.json',
        )
        ledger['events'].append({
            'atUtc': utc_now(),
            'event': 'package-entity-gate-started',
            'package': package['key'],
        })
        write_ledger(args.report, ledger)
        local_gate_result = subprocess.run(
            [
                sys.executable,
                'scripts/redevelopment_live_entity_gate.py',
                '--ops',
                package['forward'],
                '--capture-blocker-nbt',
                '--report',
                package['preExecutionEntityGate'],
            ],
            check=False,
        )
        local_gate = load_json(package['preExecutionEntityGate']) if os.path.exists(
            package['preExecutionEntityGate']
        ) else {}
        package['preExecutionEntityGateResult'] = local_gate
        local_gate_entry = (local_gate.get('packages') or [{}])[0]
        local_gate_passed = (
            local_gate_result.returncode == 0
            and live_gate_contract_passed(local_gate, 1)
            and local_gate_entry.get('file') == package['forward']
            and local_gate_entry.get('operationSha256') == package['forwardSha256']
        )
        if local_gate_passed:
            ledger['events'].append({
                'atUtc': utc_now(),
                'event': 'package-entity-gate-passed',
                'package': package['key'],
            })
            ledger['events'].append({
                'atUtc': utc_now(),
                'event': 'package-execution-started',
                'package': package['key'],
            })
            write_ledger(args.report, ledger)
            code, execution, passed = run_package(
                package['forward'],
                package['executionReport'],
                strict=True,
                operation_role='forward',
            )
        else:
            code = 3
            execution = {
                'status': 'pre-execution-entity-gate-failed',
                'entityGateReport': package['preExecutionEntityGate'],
                'returnCode': local_gate_result.returncode,
            }
            passed = False
        package['executionStreamJournal'] = execution.get('streamJournal')
        package['execution'] = execution_ledger_summary(
            package['executionReport'],
            execution,
        )
        if passed:
            package['status'] = 'committed'
            completed.append(package)
            ledger['events'].append({
                'atUtc': utc_now(),
                'event': 'package-committed',
                'package': package['key'],
                'operationSha256': package['forwardSha256'],
            })
            write_ledger(args.report, ledger)
            continue

        package['status'] = 'failed'
        package['returnCode'] = code
        ledger['status'] = 'rolling-back'
        ledger['events'].append({
            'atUtc': utc_now(),
            'event': 'package-failed',
            'package': package['key'],
            'returnCode': code,
        })
        write_ledger(args.report, ledger)

        # The failing package may be only partly applied. Non-strict rollback is
        # intentional here: exact desired-state masks restore applied cells while
        # untouched cells safely no-op.
        rollback_order = [package] + list(reversed(completed))
        rollback_failures = []
        for current in rollback_order:
            current['emergencyRollbackReport'] = current['rollback'].replace(
                '.rollback.txt',
                '.emergency-rollback.execution.json',
            )
            strict = current is not package
            rollback_code, rollback_execution, rollback_passed = run_package(
                current['rollback'],
                current['emergencyRollbackReport'],
                strict=strict,
                operation_role='rollback',
                transition_policy=current.get(
                    'rollbackTransitionPolicy'
                ),
            )
            current['emergencyRollbackStreamJournal'] = (
                rollback_execution.get('streamJournal')
            )
            current['emergencyRollback'] = execution_ledger_summary(
                current['emergencyRollbackReport'],
                rollback_execution,
            )
            current['status'] = 'rolled-back' if rollback_passed else 'rollback-failed'
            if not rollback_passed:
                rollback_failures.append(current['key'])
            ledger['events'].append({
                'atUtc': utc_now(),
                'event': current['status'],
                'package': current['key'],
                'returnCode': rollback_code,
                'strictNoop': strict,
            })
            write_ledger(args.report, ledger)

        ledger['status'] = 'rollback-failed' if rollback_failures else 'rolled-back'
        ledger['completedAtUtc'] = utc_now()
        ledger['rollbackFailures'] = rollback_failures
        write_ledger(args.report, ledger)
        return 2 if rollback_failures else 1

    ledger['status'] = 'committed-pending-post-qa'
    ledger['completedAtUtc'] = utc_now()
    ledger['events'].append({
        'atUtc': utc_now(),
        'event': 'transaction-committed',
        'packageCount': len(completed),
    })
    write_ledger(args.report, ledger)
    print(json.dumps({
        'status': ledger['status'],
        'report': args.report,
        'packages': [package['key'] for package in completed],
    }, indent=2))
    return 0


if __name__ == '__main__':
    sys.exit(main())
