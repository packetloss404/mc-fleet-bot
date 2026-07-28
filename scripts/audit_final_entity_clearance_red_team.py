#!/usr/bin/env python3
"""Read-only red-team audit for the final Town Expansion entity gate."""

import argparse
import glob
import hashlib
import importlib.util
import json
import os
import re
from datetime import datetime, timezone


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
GATE_SCRIPT = os.path.join(ROOT, 'scripts', 'redevelopment_live_entity_gate.py')
ATOMIC_SCRIPT = os.path.join(
    ROOT,
    'scripts',
    'run_redevelopment_atomic_release.py',
)
FAILED_CLEARANCE = '5d'
BASE_COMPLETED_CLEARANCES = ('6a', '7a', '8a')


def load_module(name, filename):
    spec = importlib.util.spec_from_file_location(name, filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


LIVE_GATE = load_module('final_entity_gate_audit_gate', GATE_SCRIPT)
ATOMIC = load_module('final_entity_gate_audit_atomic', ATOMIC_SCRIPT)


def load_json(filename):
    with open(filename, encoding='utf-8') as handle:
        return json.load(handle)


def sha256(filename):
    digest = hashlib.sha256()
    with open(filename, 'rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def utc_now():
    return (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace('+00:00', 'Z')
    )


def parse_time(value):
    return datetime.fromisoformat(value.replace('Z', '+00:00'))


def check(checks, check_id, condition, detail):
    checks.append({
        'id': check_id,
        'status': 'PASS' if condition else 'FAIL',
        'detail': detail,
    })


def clearance_paths(clearance):
    stem = (
        'data/buildops/town-expansion-r1-2026-07-28.'
        f'entity-evacuation.clearance{clearance}'
    )
    return {
        'manifest': os.path.join(ROOT, f'{stem}.manifest.json'),
        'journal': os.path.join(ROOT, f'{stem}.journal.json'),
        'preflight': os.path.join(
            ROOT,
            'data/world-review/town-entity-evacuation-'
            f'destination-preflight.clearance{clearance}.json',
        ),
        'exclusions': os.path.join(
            ROOT,
            'data/world-review/town-entity-destination-'
            f'exclusions-completed-clearance{clearance}.json',
        ),
    }


def audit_failed_clearance(checks, evidence):
    paths = clearance_paths(FAILED_CLEARANCE)
    manifest = load_json(paths['manifest'])
    journal = load_json(paths['journal'])
    preflight = load_json(paths['preflight'])
    manifest_rows = manifest.get('transactionRows', [])
    journal_rows = journal.get('rows', [])
    evidence[f'clearance{FAILED_CLEARANCE}'] = {
        key: {'file': os.path.relpath(path, ROOT), 'sha256': sha256(path)}
        for key, path in paths.items()
        if key != 'exclusions'
    }
    check(
        checks,
        'ENT-RT-001',
        journal.get('manifestSha256') == sha256(paths['manifest'])
        and journal.get('status') == 'failed-rolled-back'
        and journal.get('rollbackFailures') == [],
        'clearance5d binds its manifest and records a clean failed rollback',
    )
    check(
        checks,
        'ENT-RT-002',
        [row.get('uuidKey') for row in journal_rows]
        == [
            row.get('uuidKey')
            for row in manifest_rows[:len(journal_rows)]
        ]
        and all(
            (
                row.get('state') == 'rolled-back'
                and row.get('rolledBackAtUtc')
                and row.get('immutableBefore') == row.get('immutableAfter')
            )
            if row.get('teleportIssued')
            else (
                row.get('state') == 'force-loaded'
                and not row.get('rolledBackAtUtc')
            )
            for row in journal_rows
        ),
        (
            'the sole moved clearance5d row was restored exactly; the failed '
            'prequery row was never teleported'
        ),
    )
    check(
        checks,
        'ENT-RT-003',
        preflight.get('status') == 'PASS'
        and preflight.get('manifestSha256') == sha256(paths['manifest'])
        and len(preflight.get('rows', [])) == len(manifest_rows)
        and all(
            row.get('status') == 'PASS'
            and row.get('verifiedFootingColumns') == 25
            for row in preflight.get('rows', [])
        ),
        'clearance5d preflight was complete before its fail-closed execution',
    )
    return journal


def audit_completed_clearance(clearance, ordinal, checks, evidence):
    paths = clearance_paths(clearance)
    manifest = load_json(paths['manifest'])
    journal = load_json(paths['journal'])
    preflight = load_json(paths['preflight'])
    exclusions = load_json(paths['exclusions'])
    manifest_rows = manifest.get('transactionRows', [])
    journal_rows = journal.get('rows', [])
    evidence[f'clearance{clearance}'] = {
        key: {'file': os.path.relpath(path, ROOT), 'sha256': sha256(path)}
        for key, path in paths.items()
    }
    check(
        checks,
        f'ENT-RT-{4 + ordinal * 4:03d}',
        manifest.get('schemaVersion') == 2
        and manifest.get('authorizedForPartialEvacuation') is True
        and journal.get('manifestSha256') == sha256(paths['manifest'])
        and journal.get('status') == 'partial-evacuation-completed'
        and len(journal_rows) == len(manifest_rows),
        (
            f'clearance{clearance} completed all {len(manifest_rows)} '
            'manifest-bound rows'
        ),
    )
    check(
        checks,
        f'ENT-RT-{5 + ordinal * 4:03d}',
        [row.get('uuidKey') for row in journal_rows]
        == [row.get('uuidKey') for row in manifest_rows]
        and all(
            row.get('state') == 'completed'
            and row.get('teleportIssued') is True
            and row.get('immutableBefore') == row.get('immutableAfter')
            for row in journal_rows
        ),
        f'clearance{clearance} preserves exact UUID order and immutable state',
    )
    age = (
        parse_time(journal['startedAtUtc'])
        - parse_time(preflight['completedAtUtc'])
    ).total_seconds()
    check(
        checks,
        f'ENT-RT-{6 + ordinal * 4:03d}',
        preflight.get('status') == 'PASS'
        and preflight.get('manifestSha256') == sha256(paths['manifest'])
        and preflight.get('gateSha256')
        == manifest.get('source', {}).get('gateSha256')
        and len(preflight.get('rows', [])) == len(manifest_rows)
        and all(
            row.get('status') == 'PASS'
            and row.get('verifiedFootingColumns') == 25
            for row in preflight.get('rows', [])
        )
        and preflight.get('badDestinationChunks') == []
        and preflight.get('errors') == []
        and 0 <= age <= 60,
        (
            f'clearance{clearance} all-destination preflight passed '
            f'{age:.1f}s before execution'
        ),
    )
    destination_chunks = [
        row.get('sanctuarySlot', {}).get('destinationChunk')
        for row in manifest_rows
    ]
    check(
        checks,
        f'ENT-RT-{7 + ordinal * 4:03d}',
        exclusions.get('status') == 'PASS'
        and exclusions.get('manifestSha256') == sha256(paths['manifest'])
        and exclusions.get('journalSha256') == sha256(paths['journal'])
        and exclusions.get('counts', {}).get('completedRelocations')
        == len(manifest_rows)
        and exclusions.get('counts', {}).get(
            'uniqueOccupiedDestinationChunks'
        ) == len(manifest_rows)
        and len({
            tuple(chunk)
            for chunk in exclusions.get('badDestinationChunks', [])
        }) == len(manifest_rows)
        and sorted(exclusions.get('badDestinationChunks', []))
        == sorted(destination_chunks)
        and all(
            row.get('status') == 'FAIL'
            and row.get('errors') == ['occupied-by-completed-relocation']
            for row in exclusions.get('rows', [])
        ),
        (
            f'clearance{clearance} exclusion report reserves every completed '
            'destination exactly once'
        ),
    )
    return journal


def discover_completed_clearances():
    completed = set(BASE_COMPLETED_CLEARANCES)
    pattern = os.path.join(
        ROOT,
        'data/buildops/town-expansion-r1-2026-07-28.'
        'entity-evacuation.clearance*.journal.json',
    )
    for journal_path in glob.glob(pattern):
        match = re.search(
            r'entity-evacuation\.clearance([0-9]+[a-z]+)\.journal\.json$',
            journal_path,
        )
        if not match:
            continue
        clearance = match.group(1)
        if clearance == FAILED_CLEARANCE:
            continue
        paths = clearance_paths(clearance)
        if not all(os.path.exists(path) for path in paths.values()):
            continue
        if load_json(journal_path).get('status') == 'partial-evacuation-completed':
            completed.add(clearance)
    return sorted(
        completed,
        key=lambda value: (
            int(re.match(r'\d+', value).group()),
            re.sub(r'^\d+', '', value),
        ),
    )


def audit_gate(gate_path, checks, evidence, journals):
    gate = load_json(gate_path)
    packages = gate.get('packages') or []
    package = packages[0] if len(packages) == 1 else {}
    force = gate.get('forceLoadAudit', {})
    operation_path = os.path.join(ROOT, package.get('file', ''))
    evidence['finalGate'] = {
        'artifact': {
            'file': os.path.relpath(gate_path, ROOT),
            'sha256': sha256(gate_path),
        },
    }
    evidence['gateImplementation'] = {
        'script': {
            'file': os.path.relpath(GATE_SCRIPT, ROOT),
            'sha256': sha256(GATE_SCRIPT),
        },
    }
    check(
        checks,
        'ENT-RT-100',
        gate.get('schemaVersion') == 2
        and gate.get('status') == 'PASS'
        and gate.get('passed') is True
        and len(packages) == 1
        and package.get('passed') is True,
        'final gate is one-package schema-2 PASS',
    )
    check(
        checks,
        'ENT-RT-101',
        os.path.isfile(operation_path)
        and package.get('operationSha256') == sha256(operation_path),
        'final gate binds the exact canonical operation package',
    )
    check(
        checks,
        'ENT-RT-102',
        package.get('blockers') == []
        and package.get('queryErrors') == []
        and package.get('selectorLimitReached') is False
        and package.get('blockerNbtCaptureErrors') == [],
        'final gate has zero blockers, query errors, limits, or capture errors',
    )
    check(
        checks,
        'ENT-RT-103',
        ATOMIC.live_gate_contract_passed(gate, 1),
        'atomic release accepts the complete sparse spatial-query contract',
    )
    boxes = LIVE_GATE.parse_boxes(operation_path)
    protected = package.get('protectedNonBlockingEntities', [])
    allowed_policies = {
        'expired-transient-projectile',
        'home-linked-bee-outside-exact-target',
        'ambient-unattached-bat-outside-exact-target',
    }
    protected_valid = True
    for entity in protected:
        expected = LIVE_GATE.protected_nonblocking_evidence(entity, boxes)
        if (
            expected != entity.get('nonBlockingEvidence')
            or expected is None
            or expected.get('policy') not in allowed_policies
        ):
            protected_valid = False
            break
    check(
        checks,
        'ENT-RT-104',
        protected_valid,
        (
            f'all {len(protected)} protected nonblocking observations '
            'recompute exactly under the narrow policy'
        ),
    )
    pre = force.get('preExistingChunkCoordinates')
    final = force.get('finalChunkCoordinates')
    check(
        checks,
        'ENT-RT-105',
        force.get('mode') == 'sparse-target-halo-batched'
        and force.get('serverChunkLimit') == 256
        and force.get('maximumSimultaneousTemporaryChunks', 257) <= 256
        and force.get('allRequiredChunksLoadedBeforeQueries') is True
        and force.get('missingRequiredChunks') == []
        and force.get('allTemporaryChunksReleased') is True
        and force.get('cleanupErrors') == []
        and force.get('finalSetMatchesPreExistingSet') is True
        and pre == final
        and all(
            journal.get('preExistingForceLoads') == pre
            for journal in journals
        )
        and all(
            batch.get('passed') is True
            and batch.get('missingRequiredChunks') == []
            and batch.get('temporaryChunksStillLoadedAfterBatch') == []
            for batch in force.get('batches', [])
        ),
        (
            'all relocation and final-gate force-load evidence converges on '
            f'the same exact {len(pre or [])}-chunk set'
        ),
    )
    latest_completion = max(
        parse_time(journal['completedAtUtc'])
        for journal in journals
        if journal.get('completedAtUtc')
    )
    check(
        checks,
        'ENT-RT-106',
        parse_time(gate['generatedAtUtc']) >= latest_completion,
        'final gate was generated after the last successful relocation',
    )
    return gate


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--gate', required=True)
    parser.add_argument('--report', required=True)
    parser.add_argument('--markdown', required=True)
    args = parser.parse_args()
    gate_path = os.path.abspath(args.gate)
    checks = []
    evidence = {}
    journals = [audit_failed_clearance(checks, evidence)]
    for ordinal, clearance in enumerate(discover_completed_clearances()):
        paths = clearance_paths(clearance)
        if not all(os.path.exists(path) for path in paths.values()):
            continue
        journals.append(
            audit_completed_clearance(
                clearance,
                ordinal,
                checks,
                evidence,
            )
        )
    audit_gate(gate_path, checks, evidence, journals)
    failed = [entry for entry in checks if entry['status'] != 'PASS']
    report = {
        'schemaVersion': 1,
        'generatedAtUtc': utc_now(),
        'status': (
            'PASS_FINAL_ENTITY_CLEARANCE_RED_TEAM'
            if not failed
            else 'HOLD'
        ),
        'worldBuildReleaseAuthorizedByThisGate': not failed,
        'scope': (
            'Entity clearance only; this does not replace operation, '
            'transaction, route, rollback, post-state, or media acceptance.'
        ),
        'checks': checks,
        'failedChecks': [entry['id'] for entry in failed],
        'evidence': evidence,
    }
    for filename in (args.report, args.markdown):
        os.makedirs(os.path.dirname(os.path.abspath(filename)), exist_ok=True)
    with open(args.report, 'w', encoding='utf-8') as handle:
        json.dump(report, handle, indent=2)
        handle.write('\n')
    lines = [
        '# Final Entity Clearance Red-Team Audit',
        '',
        f'**Decision:** `{report["status"]}`',
        '',
        report['scope'],
        '',
        '## Checks',
        '',
        *[
            f'- **{entry["id"]} — {entry["status"]}:** {entry["detail"]}'
            for entry in checks
        ],
        '',
        '## Hash-bound evidence',
        '',
    ]
    for group, entries in evidence.items():
        for label, entry in entries.items():
            lines.append(
                f'- `{group}.{label}` — `{entry["file"]}` — '
                f'`{entry["sha256"]}`'
            )
    with open(args.markdown, 'w', encoding='utf-8') as handle:
        handle.write('\n'.join(lines) + '\n')
    print(json.dumps({
        'status': report['status'],
        'failedChecks': report['failedChecks'],
        'report': args.report,
        'markdown': args.markdown,
    }, indent=2))
    return 0 if not failed else 2


if __name__ == '__main__':
    raise SystemExit(main())
