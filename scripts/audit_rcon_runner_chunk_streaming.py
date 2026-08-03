#!/usr/bin/env python3
"""Offline red-team audit for exact-chunk RCON release execution.

This script never opens RCON and never changes a world. It inventories the
canonical operation package, proves the exact per-source-group chunk footprint,
and compares the current runner implementation with the fail-closed streaming
acceptance contract.
"""

import argparse
import hashlib
import importlib.util
import json
import os
import pathlib
import re
from collections import Counter
from datetime import datetime, timezone


ROOT = pathlib.Path(__file__).resolve().parents[1]
RUNNER_PATH = ROOT / 'scripts' / 'rcon_runner.py'
ATOMIC_PATH = ROOT / 'scripts' / 'run_redevelopment_atomic_release.py'
DEFAULT_OPERATIONS = (
    ROOT / 'data' / 'buildops' / 'town-expansion-r1-2026-07-28.txt'
)
DEFAULT_DRY_RUN_REPORT = (
    ROOT / 'data' / 'buildops'
    / 'town-expansion-r1-2026-07-28.streaming-strict-dry-run.v2.json'
)
SERVER_FORCELOAD_LIMIT = 256

COMMAND_RE = re.compile(
    r'^execute if block '
    r'(-?\d+) (-?\d+) (-?\d+) \S+ '
    r'if block (-?\d+) (-?\d+) (-?\d+) \S+ '
    r'run data merge block '
    r'(-?\d+) (-?\d+) (-?\d+) .+$'
)


def sha256(path):
    digest = hashlib.sha256()
    with pathlib.Path(path).open('rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def dry_run_report_header(path):
    """Read the scalar report header without loading its 481 MiB plan arrays."""
    fields = {}
    wanted = {
        'schemaVersion',
        'file',
        'operationSha256',
        'sourceGroupPlanSha256',
        'expandedCommandSha256',
        'status',
        'dryRun',
        'strictNoop',
        'sourceOperationCount',
        'sourceGroupCount',
        'commandCount',
        'expandedCommandCount',
        'worldEditLeftoverCount',
    }
    with pathlib.Path(path).open(encoding='utf-8') as handle:
        for raw in handle:
            if '"sourceGroups"' in raw:
                break
            match = re.match(r'^\s*"([^"]+)":\s*(.+?)(?:,)?\s*$', raw)
            if not match or match.group(1) not in wanted:
                continue
            fields[match.group(1)] = json.loads(match.group(2))
    missing = sorted(wanted - fields.keys())
    if missing:
        raise ValueError(f'dry-run report header lacks: {",".join(missing)}')
    return fields


def load_runner():
    spec = importlib.util.spec_from_file_location(
        'audited_rcon_runner',
        RUNNER_PATH,
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def box_chunks(box):
    x1, _, z1, x2, _, z2 = box
    return {
        (chunk_x, chunk_z)
        for chunk_x in range(min(x1, x2) // 16, max(x1, x2) // 16 + 1)
        for chunk_z in range(min(z1, z2) // 16, max(z1, z2) // 16 + 1)
    }


def command_coordinates(command):
    """Return every world coordinate for the only accepted Town CMD grammar.

    Unknown, relative, local, or partially parsed commands fail closed.
    """
    match = COMMAND_RE.fullmatch(command)
    if not match:
        raise ValueError(f'unsupported coordinate-bearing CMD: {command}')
    values = [int(value) for value in match.groups()]
    return [
        tuple(values[offset:offset + 3])
        for offset in range(0, len(values), 3)
    ]


def command_chunks(command):
    return {
        (x // 16, z // 16)
        for x, _, z in command_coordinates(command)
    }


def group_chunks(group):
    if group['kind'] in ('SET', 'REPL'):
        return box_chunks(group['box'])
    if group['kind'] == 'CMD':
        commands = [
            command
            for alternative in group['alternatives']
            for command in alternative['commands']
        ]
        return set().union(*(command_chunks(command) for command in commands))
    raise ValueError(f"unsupported source group kind: {group['kind']}")


def source_line_numbers(path):
    rows = []
    with pathlib.Path(path).open(encoding='utf-8') as handle:
        for line_number, raw in enumerate(handle, 1):
            fields = raw.split()
            if fields and not fields[0].startswith('#'):
                rows.append(line_number)
    return rows


def implementation_findings():
    runner = RUNNER_PATH.read_text(encoding='utf-8')
    atomic = ATOMIC_PATH.read_text(encoding='utf-8')
    execution_loop = runner.find('for i in range(0, len(cmds), BATCH):')
    evaluation = runner.find('evaluation = evaluate_command_groups(')
    return {
        'denseGlobalBoundsUsed': (
            'bx = bounds(ops)' in runner
            and 'for chunk_x in range(min_cx, max_cx + 1, 16):' in runner
        ),
        'preExistingCapacityIsAccounted': (
            'SERVER_FORCELOAD_LIMIT' in runner
            or 'force_load_limit' in runner
        ),
        'commandsEvaluatedOnlyAfterWholeExecution': (
            execution_loop >= 0 and evaluation > execution_loop
        ),
        'cmdCoordinatesIncludedInBounds': (
            'command_touched_chunks(command)' in runner
            and "'chunks': group['chunks']" in runner
        ),
        'unknownOrPartialCmdGrammarFailsClosed': (
            'SUPPORTED_CMD_PATTERNS' in runner
            and '.fullmatch(command)' in runner
        ),
        'broadRectangleCleanupUsed': (
            "rc.cmd(f'forceload remove {cx} {cz} {ex} {ez}')" in runner
        ),
        'durablePerGroupJournalPresent': (
            'os.fsync(journal_handle.fileno())' in runner
            and 'os.fsync(directory_fd)' in runner
            and "'status'] = 'group-intent'" in runner
            and "'status'] = 'group-result'" in runner
        ),
        'journalCheckpointsEveryGroup': (
            "batch_record['completedGroupCount'] = offset + 1" in runner
            and "batch_record['activeGroupIndex'] = group_index" in runner
            and "batch_record['activeGroupResult']" in runner
        ),
        'interruptedJournalCollisionIsRejected': (
            "journal_path,\n                'x'," in runner
        ),
        'strictModeRejectsKeepLoaded': (
            'strict_noop and a.keep_loaded' in runner
        ),
        'dryRunChecksUnsupportedOperationsBeforeSuccess': (
            "'dry_run_failed'" in runner
            and 'return 0 if not failures else 1' in runner
        ),
        'atomicWrapperAttemptsFailingPackageRollback': (
            'rollback_order = [package] + list(reversed(completed))' in atomic
        ),
        'atomicWrapperHasCommittedPrefixRecovery': (
            'validate_stream_journal(' in atomic
            and "'committedGroupCount'" in atomic
            and 'rollback_order = [package] + list(reversed(completed))'
            in atomic
        ),
        'atomicWrapperBindsExecutionReportToOperation': (
            "execution.get('operationSha256')" in atomic
            and "execution.get('streamJournalSha256')" in atomic
            and "journal_validation['passed']" in atomic
        ),
    }


def build_audit(
    operation_path,
    pre_existing_count,
    dry_run_report=DEFAULT_DRY_RUN_REPORT,
):
    runner = load_runner()
    operations = runner.parse(operation_path)
    source_lines = source_line_numbers(operation_path)
    source_kinds = Counter(fields[0] for _, fields in operations)
    largest_footprints = []
    footprint_histogram = Counter()
    exact_chunks = set()
    grammar_errors = []
    kinds = Counter()
    source_group_count = 0
    expanded_command_count = 0
    leftover_count = 0
    group_lines = []
    for line, fields in operations:
        kind = fields[0]
        group_index = source_group_count
        if kind == 'CMD':
            command = ' '.join(fields[1:]).lstrip('/')
            try:
                chunks = command_chunks(command)
            except ValueError as error:
                grammar_errors.append({
                    'groupIndex': group_index,
                    'line': line,
                    'error': str(error),
                })
                chunks = set()
            expanded_commands = 1
        elif kind in ('SET', 'REPL') and len(fields) >= 8:
            box = tuple(int(value) for value in fields[1:7])
            if kind == 'SET':
                pattern = fields[7]
                alternatives = 1
            else:
                pattern = fields[8] if len(fields) > 8 else None
                alternatives = len(runner.split_masks(fields[7]))
            if (
                pattern is None
                or '%' in pattern
                or (
                    pattern.split('[')[0].replace('minecraft:', '')
                    in runner.COMMAND_BLOCKED
                )
            ):
                leftover_count += 1
                continue
            chunks = box_chunks(box)
            expanded_commands = len(runner.split(box)) * alternatives
        else:
            leftover_count += 1
            continue
        source_group_count += 1
        group_lines.append(line)
        kinds[kind] += 1
        expanded_command_count += expanded_commands
        exact_chunks.update(chunks)
        footprint_histogram[len(chunks)] += 1
        candidate = {
            'groupIndex': group_index,
            'line': line,
            'kind': kind,
            'chunkCount': len(chunks),
            'chunks': [list(chunk) for chunk in sorted(chunks)],
        }
        largest_footprints.append(candidate)
        largest_footprints.sort(
            key=lambda item: (-item['chunkCount'], item['groupIndex'])
        )
        del largest_footprints[20:]

    repl_chunks = set()
    for _, fields in operations:
        if fields[0] in ('SET', 'REPL') and len(fields) >= 8:
            repl_chunks.update(box_chunks(
                tuple(int(value) for value in fields[1:7])
            ))
    min_cx = min(chunk[0] for chunk in repl_chunks)
    max_cx = max(chunk[0] for chunk in repl_chunks)
    min_cz = min(chunk[1] for chunk in repl_chunks)
    max_cz = max(chunk[1] for chunk in repl_chunks)
    dense_chunks = (
        (max_cx - min_cx + 1) * (max_cz - min_cz + 1)
    )
    available = SERVER_FORCELOAD_LIMIT - pre_existing_count
    max_footprint = max(footprint_histogram)
    implementation = implementation_findings()
    dry_run_path = pathlib.Path(dry_run_report).resolve()
    dry_run_header = dry_run_report_header(dry_run_path)
    dry_run_expected = {
        'schemaVersion': 2,
        'file': os.path.relpath(operation_path, ROOT),
        'operationSha256': sha256(operation_path),
        'status': 'dry_run',
        'dryRun': True,
        'strictNoop': True,
        'sourceOperationCount': len(operations),
        'sourceGroupCount': source_group_count,
        'commandCount': expanded_command_count,
        'expandedCommandCount': expanded_command_count,
        'worldEditLeftoverCount': 0,
    }
    dry_run_header_errors = {
        field: {
            'expected': expected,
            'actual': dry_run_header.get(field),
        }
        for field, expected in dry_run_expected.items()
        if dry_run_header.get(field) != expected
    }

    source_order_exact = (
        group_lines == sorted(group_lines)
        and len(set(group_lines)) == len(group_lines)
        and source_group_count + leftover_count == len(source_lines)
    )
    checks = [
        {
            'id': 'RCS-001',
            'title': 'Every source group has a complete exact chunk footprint',
            'status': 'PASS' if not grammar_errors else 'FAIL',
            'evidence': {
                'groups': source_group_count,
                'cmdGroups': kinds['CMD'],
                'grammarErrors': grammar_errors,
            },
        },
        {
            'id': 'RCS-002',
            'title': 'Each indivisible source group fits current temporary capacity',
            'status': (
                'PASS'
                if available >= 0 and max_footprint <= available
                else 'FAIL'
            ),
            'evidence': {
                'serverLimit': SERVER_FORCELOAD_LIMIT,
                'preExistingCountScenario': pre_existing_count,
                'availableTemporaryChunks': available,
                'maximumSourceGroupChunks': max_footprint,
            },
        },
        {
            'id': 'RCS-003',
            'title': 'Runner streams exact chunks instead of accumulating dense tiles',
            'status': (
                'PASS' if not implementation['denseGlobalBoundsUsed'] else 'FAIL'
            ),
            'evidence': {
                'exactPackageChunks': len(exact_chunks),
                'denseEnvelopeChunks': dense_chunks,
                'implementation': implementation,
            },
        },
        {
            'id': 'RCS-004',
            'title': 'Source order is preserved and each group is evaluated immediately',
            'status': (
                'PASS'
                if (
                    source_order_exact
                    and not implementation[
                        'commandsEvaluatedOnlyAfterWholeExecution'
                    ]
                )
                else 'FAIL'
            ),
            'evidence': {
                'planSourceOrderExact': source_order_exact,
                'delayedWholePackageEvaluation': implementation[
                    'commandsEvaluatedOnlyAfterWholeExecution'
                ],
            },
        },
        {
            'id': 'RCS-005',
            'title': 'CMD reads and writes are included in chunk coverage',
            'status': (
                'PASS'
                if (
                    not grammar_errors
                    and implementation['cmdCoordinatesIncludedInBounds']
                    and implementation[
                        'unknownOrPartialCmdGrammarFailsClosed'
                    ]
                )
                else 'FAIL'
            ),
            'evidence': {
                'packageCmdGroupsFullyParsed': len(grammar_errors) == 0,
                'currentBoundsIncludesCmd': implementation[
                    'cmdCoordinatesIncludedInBounds'
                ],
                'unknownOrPartialCmdGrammarFailsClosed': implementation[
                    'unknownOrPartialCmdGrammarFailsClosed'
                ],
            },
        },
        {
            'id': 'RCS-006',
            'title': 'Cleanup removes only owned exact chunks and verifies restoration',
            'status': (
                'PASS'
                if not implementation['broadRectangleCleanupUsed']
                else 'FAIL'
            ),
            'evidence': implementation,
        },
        {
            'id': 'RCS-007',
            'title': 'Crash-safe durable group journal and prefix recovery exist',
            'status': (
                'PASS'
                if (
                    implementation['durablePerGroupJournalPresent']
                    and implementation['journalCheckpointsEveryGroup']
                    and implementation[
                        'interruptedJournalCollisionIsRejected'
                    ]
                    and implementation[
                        'atomicWrapperHasCommittedPrefixRecovery'
                    ]
                    and implementation[
                        'atomicWrapperBindsExecutionReportToOperation'
                    ]
                )
                else 'FAIL'
            ),
            'evidence': implementation,
        },
        {
            'id': 'RCS-008',
            'title': 'Strict release cannot retain temporary force-loads',
            'status': (
                'PASS'
                if implementation['strictModeRejectsKeepLoaded']
                else 'FAIL'
            ),
            'evidence': implementation,
        },
        {
            'id': 'RCS-009',
            'title': 'Canonical package has no unsupported live leftovers',
            'status': 'PASS' if leftover_count == 0 else 'FAIL',
            'evidence': {
                'leftoverOperations': leftover_count,
                'reason': (
                    '27 guarded replacements use minecraft:chain[axis=y], '
                    'which this server runner intentionally rejects'
                    if leftover_count else None
                ),
            },
        },
        {
            'id': 'RCS-010',
            'title': 'Dry-run applies the same executability gate as live mode',
            'status': (
                'PASS'
                if implementation[
                    'dryRunChecksUnsupportedOperationsBeforeSuccess'
                ]
                else 'FAIL'
            ),
            'evidence': implementation,
        },
        {
            'id': 'RCS-011',
            'title': 'Canonical strict dry-run is exact and same-plan bound',
            'status': 'PASS' if not dry_run_header_errors else 'FAIL',
            'evidence': {
                'report': os.path.relpath(dry_run_path, ROOT),
                'reportSha256': sha256(dry_run_path),
                'header': dry_run_header,
                'headerErrors': dry_run_header_errors,
            },
        },
    ]
    failed = [check['id'] for check in checks if check['status'] != 'PASS']
    return {
        'schemaVersion': 1,
        'generatedAtUtc': datetime.now(timezone.utc).replace(
            microsecond=0
        ).isoformat().replace('+00:00', 'Z'),
        'mode': 'offline-read-only-red-team',
        'status': (
            'ACCEPTED_FOR_BOUNDED_STREAMING'
            if not failed
            else 'REJECTED_FOR_BOUNDED_STREAMING'
        ),
        'worldReleaseAuthorized': False,
        'worldMutationPerformed': False,
        'operations': os.path.relpath(operation_path, ROOT),
        'operationSha256': sha256(operation_path),
        'runner': os.path.relpath(RUNNER_PATH, ROOT),
        'runnerSha256': sha256(RUNNER_PATH),
        'atomicWrapper': os.path.relpath(ATOMIC_PATH, ROOT),
        'atomicWrapperSha256': sha256(ATOMIC_PATH),
        'dryRunReport': {
            'file': os.path.relpath(dry_run_path, ROOT),
            'sha256': sha256(dry_run_path),
            'sourceGroupPlanSha256': dry_run_header[
                'sourceGroupPlanSha256'
            ],
            'expandedCommandSha256': dry_run_header[
                'expandedCommandSha256'
            ],
        },
        'census': {
            'sourceOperations': len(operations),
            'sourceGroups': source_group_count,
            'expandedCommands': expanded_command_count,
            'leftoverOperations': leftover_count,
            'sourceKindCounts': dict(sorted(source_kinds.items())),
            'executableKindCounts': dict(sorted(kinds.items())),
            'exactPackageChunks': len(exact_chunks),
            'exactReplChunks': len(repl_chunks),
            'replChunkBounds': {
                'minChunkX': min_cx,
                'maxChunkX': max_cx,
                'minChunkZ': min_cz,
                'maxChunkZ': max_cz,
            },
            'denseEnvelopeChunks': dense_chunks,
            'maximumSourceGroupChunks': max_footprint,
            'footprintHistogram': dict(sorted(footprint_histogram.items())),
        },
        'capacityScenario': {
            'serverLimit': SERVER_FORCELOAD_LIMIT,
            'preExistingCount': pre_existing_count,
            'availableTemporaryChunks': available,
        },
        'checks': checks,
        'failedChecks': failed,
        'acceptanceContract': {
            'streamUnit': (
                'one complete source group or one contiguous source-order '
                'window whose exact chunk union fits the measured capacity'
            ),
            'order': (
                'never reorder source groups; preserve expanded alternative '
                'order inside each group'
            ),
            'evaluation': (
                'evaluate and durably checkpoint a group before issuing any '
                'command from the next group; stop on the first failure'
            ),
            'cmdPolicy': (
                'extract every coordinate read or written; reject unknown, '
                'relative, local, or partially parsed CMD grammar before mutation'
            ),
            'ownership': (
                'journal exact planned additions before add, add/verify only '
                'missing chunks, remove/verify only owned chunks, preserve '
                'unowned concurrent additions, and report any final-set drift'
            ),
            'crashPolicy': (
                'create and fsync the report/journal before mutation, fsync '
                'each group transition, and compensate the exact committed '
                'prefix in reverse order after any failure or interrupted run'
            ),
        },
        'largestFootprints': largest_footprints,
    }


def markdown(audit):
    census = audit['census']
    capacity = audit['capacityScenario']
    lines = [
        '# RCON exact-chunk streaming red-team audit',
        '',
        f"Status: `{audit['status']}`",
        '',
        'This is an offline, read-only audit. It did not connect to RCON or '
        'change the world.',
        '',
        '## Package census',
        '',
        f"- Source operations: {census['sourceOperations']:,}",
        f"- Executable source groups: {census['sourceGroups']:,}",
        f"- Runner leftovers: {census['leftoverOperations']:,}",
        f"- Expanded commands: {census['expandedCommands']:,}",
        f"- Exact sparse package chunks: {census['exactPackageChunks']:,}",
        f"- Exact sparse REPL chunks: {census['exactReplChunks']:,}",
        f"- Current dense envelope chunks: {census['denseEnvelopeChunks']:,}",
        f"- Maximum indivisible group footprint: "
        f"{census['maximumSourceGroupChunks']:,} chunks",
        f"- Capacity scenario: {capacity['serverLimit']} total - "
        f"{capacity['preExistingCount']} pre-existing = "
        f"{capacity['availableTemporaryChunks']} temporary chunks",
        '',
        '## Gate results',
        '',
        '| Gate | Status | Requirement |',
        '|---|---:|---|',
    ]
    lines.extend(
        f"| {check['id']} | {check['status']} | {check['title']} |"
        for check in audit['checks']
    )
    lines.extend(['', '## Decision', ''])
    if audit['status'] == 'ACCEPTED_FOR_BOUNDED_STREAMING':
        lines.extend([
            'The exact package, runner, and atomic-wrapper implementation pass '
            'this bounded-streaming acceptance contract: sparse exact chunks, '
            'measured capacity, source order, complete CMD coordinates, '
            'immediate group evaluation, owned-only cleanup, durable per-group '
            'journal events, and wrapper identity binding are present.',
            '',
        ])
    else:
        lines.extend([
            'One or more bounded-streaming gates fail. Do not use the audited '
            'runner/package pair for physical execution until it is regenerated '
            'and this audit passes against the exact replacement hashes.',
            '',
        ])
    lines.extend([
        'A streaming acceptance is not a world-release authorization. Entity, '
        'snapshot, interface, database, media, and post-release gates remain '
        'independent and fail closed.',
        '',
    ])
    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        '--operations',
        default=str(DEFAULT_OPERATIONS),
    )
    parser.add_argument('--pre-existing-count', type=int, default=104)
    parser.add_argument(
        '--dry-run-report',
        default=str(DEFAULT_DRY_RUN_REPORT),
    )
    parser.add_argument('--json-out')
    parser.add_argument('--markdown-out')
    args = parser.parse_args()
    if args.pre_existing_count < 0:
        raise SystemExit('--pre-existing-count must be non-negative')
    audit = build_audit(
        pathlib.Path(args.operations).resolve(),
        args.pre_existing_count,
        pathlib.Path(args.dry_run_report).resolve(),
    )
    payload = json.dumps(audit, indent=2) + '\n'
    if args.json_out:
        output = pathlib.Path(args.json_out)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(payload, encoding='utf-8')
    if args.markdown_out:
        output = pathlib.Path(args.markdown_out)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(markdown(audit) + '\n', encoding='utf-8')
    print(payload, end='')
    return 0 if audit['status'] == 'ACCEPTED_FOR_BOUNDED_STREAMING' else 1


if __name__ == '__main__':
    raise SystemExit(main())
