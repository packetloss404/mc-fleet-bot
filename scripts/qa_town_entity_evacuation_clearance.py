#!/usr/bin/env python3
"""Offline acceptance audit for the town entity evacuation/clearance cycle."""

import argparse
import hashlib
import json
import os
from datetime import datetime


DEFAULT_MANIFEST = (
    'data/buildops/town-expansion-r1-2026-07-28.'
    'entity-evacuation.fresh3-preferred.manifest.json'
)
DEFAULT_JOURNAL = (
    'data/buildops/town-expansion-r1-2026-07-28.'
    'entity-evacuation.fresh3-preferred.journal.json'
)
DEFAULT_PREFLIGHT = (
    'data/world-review/town-entity-evacuation-'
    'destination-preflight.fresh3-preferred-execute.json'
)
DEFAULT_CLEARANCE = (
    'data/world-review/town-expansion-r1-'
    'live-entity-gate-clearance-final-20260728.json'
)
DEFAULT_REPORT = (
    'data/world-review/town-entity-evacuation-clearance-audit.json'
)
DEFAULT_MARKDOWN = (
    'docs/redevelopment/2026-07-28-town-expansion/evidence/'
    'town-entity-evacuation-clearance-audit.md'
)


def load_json(filename):
    with open(filename, encoding='utf-8') as handle:
        return json.load(handle)


def sha256(filename):
    digest = hashlib.sha256()
    with open(filename, 'rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def parse_time(value):
    return datetime.fromisoformat(value.replace('Z', '+00:00'))


def check(checks, check_id, condition, detail):
    checks.append({
        'id': check_id,
        'status': 'PASS' if condition else 'FAIL',
        'detail': detail,
    })


def audit(args):
    manifest = load_json(args.manifest)
    journal = load_json(args.journal)
    preflight = load_json(args.preflight)
    clearance = load_json(args.clearance)
    manifest_sha = sha256(args.manifest)
    journal_sha = sha256(args.journal)
    preflight_sha = sha256(args.preflight)
    clearance_sha = sha256(args.clearance)
    checks = []

    rows = manifest.get('transactionRows', [])
    journal_rows = journal.get('rows', [])
    check(
        checks, 'REL-CLEAR-001',
        manifest.get('schemaVersion') == 2
        and len(rows) > 0
        and manifest.get('authorizedForPartialEvacuation') is True,
        f'manifest has {len(rows)} authorized exact UUID rows',
    )
    check(
        checks, 'REL-CLEAR-002',
        len({row.get('uuidKey') for row in rows}) == len(rows)
        and len({
            tuple(row.get('sanctuarySlot', {}).get('destinationChunk', []))
            for row in rows
        }) == len(rows),
        'UUIDs and destination chunks are one-to-one',
    )
    check(
        checks, 'REL-CLEAR-003',
        journal.get('manifestSha256') == manifest_sha
        and journal.get('status') == 'partial-evacuation-completed'
        and len(journal_rows) == len(rows),
        f'journal binds manifest and contains {len(journal_rows)} rows',
    )
    check(
        checks, 'REL-CLEAR-004',
        all(
            row.get('state') == 'completed'
            and row.get('teleportIssued') is True
            and row.get('immutableBefore') == row.get('immutableAfter')
            for row in journal_rows
        ),
        'every move completed with byte-equivalent immutable projection',
    )
    check(
        checks, 'REL-CLEAR-005',
        [row.get('uuidKey') for row in journal_rows]
        == [row.get('uuidKey') for row in rows],
        'journal order and UUID sequence exactly match the manifest',
    )
    preflight_rows = preflight.get('rows', [])
    preflight_age = (
        parse_time(journal['startedAtUtc'])
        - parse_time(preflight['completedAtUtc'])
    ).total_seconds()
    check(
        checks, 'REL-CLEAR-006',
        preflight.get('status') == 'PASS'
        and preflight.get('manifestSha256') == manifest_sha
        and preflight.get('gateSha256') == manifest['source']['gateSha256']
        and len(preflight_rows) == len(rows)
        and 0 <= preflight_age <= 60,
        f'bound all-destination preflight completed {preflight_age:.1f}s '
        'before movement',
    )
    check(
        checks, 'REL-CLEAR-007',
        all(
            row.get('status') == 'PASS'
            and row.get('verifiedFootingColumns') == 25
            for row in preflight_rows
        )
        and preflight.get('badDestinationChunks') == []
        and preflight.get('errors') == [],
        'all destination 25-cell footing/headroom/type/occupancy checks passed',
    )
    package = (clearance.get('packages') or [{}])[0]
    force = clearance.get('forceLoadAudit', {})
    check(
        checks, 'REL-CLEAR-008',
        clearance.get('schemaVersion') == 2
        and len(clearance.get('packages', [])) == 1
        and package.get('operationSha256')
        == manifest['source']['operationSha256'],
        'clearance gate schema and operation package identity match',
    )
    blockers = package.get('blockers', [])
    check(
        checks, 'REL-CLEAR-009',
        package.get('passed') is True
        and blockers == []
        and package.get('queryErrors') == []
        and package.get('selectorLimitReached') is False,
        f'fresh post-move gate reports {len(blockers)} target-halo blockers',
    )
    check(
        checks, 'REL-CLEAR-010',
        force.get('cleanupErrors') == []
        and force.get('allTemporaryChunksReleased') is True
        and force.get('finalSetMatchesPreExistingSet') is True
        and len(force.get('finalChunkCoordinates', []))
        == force.get('preExistingChunks'),
        'clearance gate restored the exact pre-existing force-load set',
    )
    check(
        checks, 'REL-CLEAR-011',
        parse_time(clearance['generatedAtUtc'])
        >= parse_time(journal['completedAtUtc']),
        'clearance gate was captured after evacuation completion',
    )
    failed = [entry for entry in checks if entry['status'] != 'PASS']
    status = 'PASS_ENTITY_CLEARANCE' if not failed else 'FAIL'
    report = {
        'schemaVersion': 1,
        'status': status,
        'worldBuildReleaseAuthorized': not failed,
        'scope': (
            'Entity-clearance authorization only. Block transaction, route, '
            'database, and post-build evidence gates remain independently required.'
        ),
        'inputs': {
            'manifest': {'file': args.manifest, 'sha256': manifest_sha},
            'journal': {'file': args.journal, 'sha256': journal_sha},
            'destinationPreflight': {
                'file': args.preflight,
                'sha256': preflight_sha,
            },
            'clearanceGate': {
                'file': args.clearance,
                'sha256': clearance_sha,
            },
        },
        'counts': {
            'manifestRows': len(rows),
            'completedJournalRows': sum(
                row.get('state') == 'completed' for row in journal_rows
            ),
            'preflightPassedRows': sum(
                row.get('status') == 'PASS' for row in preflight_rows
            ),
            'clearanceBlockers': len(blockers),
            'failedChecks': len(failed),
        },
        'checks': checks,
    }
    return report


def write_outputs(report, report_path, markdown_path):
    os.makedirs(os.path.dirname(report_path), exist_ok=True)
    with open(report_path, 'w', encoding='utf-8') as handle:
        json.dump(report, handle, indent=2)
        handle.write('\n')
    os.makedirs(os.path.dirname(markdown_path), exist_ok=True)
    lines = [
        '# Town Entity Evacuation Clearance Audit',
        '',
        f'**Decision:** `{report["status"]}`',
        '',
        report['scope'],
        '',
        '## Counts',
        '',
    ]
    lines.extend(
        f'- {key}: {value}' for key, value in report['counts'].items()
    )
    lines.extend(['', '## Checks', ''])
    lines.extend(
        f'- **{entry["id"]} — {entry["status"]}:** {entry["detail"]}'
        for entry in report['checks']
    )
    lines.extend(['', '## Bound evidence', ''])
    lines.extend(
        f'- `{entry["file"]}` — `{entry["sha256"]}`'
        for entry in report['inputs'].values()
    )
    with open(markdown_path, 'w', encoding='utf-8') as handle:
        handle.write('\n'.join(lines) + '\n')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--manifest', default=DEFAULT_MANIFEST)
    parser.add_argument('--journal', default=DEFAULT_JOURNAL)
    parser.add_argument('--preflight', default=DEFAULT_PREFLIGHT)
    parser.add_argument('--clearance', default=DEFAULT_CLEARANCE)
    parser.add_argument('--report', default=DEFAULT_REPORT)
    parser.add_argument('--markdown', default=DEFAULT_MARKDOWN)
    args = parser.parse_args()
    report = audit(args)
    write_outputs(report, args.report, args.markdown)
    print(json.dumps({
        'status': report['status'],
        'worldBuildReleaseAuthorized':
            report['worldBuildReleaseAuthorized'],
        'counts': report['counts'],
        'report': args.report,
        'markdown': args.markdown,
    }, indent=2))
    return 0 if report['status'] == 'PASS_ENTITY_CLEARANCE' else 2


if __name__ == '__main__':
    raise SystemExit(main())
