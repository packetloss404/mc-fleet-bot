#!/usr/bin/env python3
"""Read-only, hash-bound reconciliation for the clearance2b Bee rollback."""

import argparse
import hashlib
import json
import math
import os
import re
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mc_admin import Rcon, connect  # noqa: E402
from run_town_entity_evacuation import (  # noqa: E402
    comparable_projection,
    parse_forceloads,
    reply_value,
)


VOLATILE = {'HivePos', 'hive_pos', 'FlowerPos', 'flower_pos'}
POSITION = re.compile(
    r'\[\s*(-?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?)d,\s*'
    r'(-?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?)d,\s*'
    r'(-?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?)d\s*\]'
)


def sha256(filename):
    digest = hashlib.sha256()
    with open(filename, 'rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def utc_now():
    return (
        datetime.now(timezone.utc).replace(microsecond=0).isoformat()
        .replace('+00:00', 'Z')
    )


def load_json(filename):
    with open(filename, encoding='utf-8') as handle:
        return json.load(handle)


def parse_count(reply):
    match = re.search(r'Test passed[.,]\s*count:\s*(\d+)', reply, re.I)
    if match:
        return int(match.group(1))
    if 'Test failed' in reply or 'No entity was found' in reply:
        return 0
    raise RuntimeError(f'unrecognized count reply: {reply!r}')


def exact_target_hits(operation_path, point):
    hits = []
    with open(operation_path, encoding='utf-8') as handle:
        for line_number, raw in enumerate(handle, 1):
            fields = raw.split()
            if not fields or fields[0] != 'REPL':
                continue
            values = [int(value) for value in fields[1:7]]
            x1, y1, z1, x2, y2, z2 = values
            if (
                min(x1, x2) <= point[0] <= max(x1, x2)
                and min(y1, y2) <= point[1] <= max(y1, y2)
                and min(z1, z2) <= point[2] <= max(z1, z2)
            ):
                hits.append(line_number)
    return hits


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        '--manifest',
        default=(
            'data/buildops/town-expansion-r1-2026-07-28.'
            'entity-evacuation.clearance2b.manifest.json'
        ),
    )
    parser.add_argument(
        '--journal',
        default=(
            'data/buildops/town-expansion-r1-2026-07-28.'
            'entity-evacuation.clearance2b.journal.json'
        ),
    )
    parser.add_argument(
        '--out',
        default='data/world-review/clearance2b-bee-reconciliation.json',
    )
    parser.add_argument(
        '--markdown',
        default=(
            'docs/redevelopment/2026-07-28-town-expansion/evidence/'
            'clearance2b-bee-reconciliation.md'
        ),
    )
    args = parser.parse_args()
    manifest = load_json(args.manifest)
    journal = load_json(args.journal)
    if (
        journal.get('status') != 'explicitly-rolled-back'
        or len(journal.get('rows', [])) != 1
        or journal['rows'][0].get('state') != 'rolled-back'
        or journal.get('manifestSha256') != sha256(args.manifest)
    ):
        raise SystemExit('clearance2b journal is not one exact completed rollback')
    row = journal['rows'][0]
    planned = manifest['transactionRows'][row['manifestIndex']]
    if planned['entityType'] != 'minecraft:bee':
        raise SystemExit('reconciliation row is not a Bee')
    before = row['immutableBefore']
    source = row['beforePos']
    destination = planned['sanctuarySlot']['destination']
    uuid_values = ','.join(str(value) for value in planned['uuidIntArray'])
    selector = (
        f'@e[type=minecraft:bee,nbt={{UUID:[I;{uuid_values}]}},limit=2]'
    )
    chunks = {
        (math.floor(source[0]) // 16, math.floor(source[2]) // 16),
        (math.floor(destination[0]) // 16, math.floor(destination[2]) // 16),
    }
    client = connect()
    rcon = Rcon(client)
    original = set()
    owned = set()
    commands = []
    cleanup_errors = []
    try:
        original = parse_forceloads(rcon.cmd('forceload query'))
        for chunk in sorted(chunks - original):
            reply = rcon.cmd(
                f'forceload add {chunk[0] * 16} {chunk[1] * 16}'
            )
            commands.append({'command': 'forceload-add', 'chunk': list(chunk),
                             'reply': reply})
            owned.add(chunk)
        count_reply = rcon.cmd(f'execute if entity {selector}')
        count = parse_count(count_reply)
        pos_reply = rcon.cmd(f'data get entity {selector} Pos')
        pos_match = POSITION.search(pos_reply)
        current_position = (
            [float(pos_match.group(index)) for index in range(1, 4)]
            if pos_match else None
        )
        current = {
            'entityType': 'minecraft:bee',
            'paths': before['paths'],
            'values': {},
            'vehicleRelationPresent': False,
            'passengerRelationPresent': False,
        }
        for field in before['paths']:
            current['values'][field] = reply_value(
                rcon.cmd(f'data get entity {selector} {field}')
            )
        vehicle_reply = rcon.cmd(
            f'execute as {selector} on vehicle run data get entity @s UUID'
        )
        passenger_reply = rcon.cmd(
            f'execute as {selector} on passengers run data get entity @s UUID'
        )
        current['vehicleRelationPresent'] = (
            ' has the following entity data: ' in vehicle_reply
        )
        current['passengerRelationPresent'] = (
            ' has the following entity data: ' in passenger_reply
        )
        hive = [805, 73, -580]
        hive_replies = {
            block: rcon.cmd(
                f'execute if block {hive[0]} {hive[1]} {hive[2]} {block}'
            )
            for block in ('minecraft:bee_nest', 'minecraft:beehive')
        }
        rail_position = [
            math.floor(destination[0]),
            math.floor(destination[1]),
            math.floor(destination[2]),
        ]
        rail_reply = rcon.cmd(
            f'execute if block {rail_position[0]} {rail_position[1]} '
            f'{rail_position[2]} minecraft:rail'
        )
    finally:
        for chunk in sorted(owned):
            rcon.cmd(f'forceload remove {chunk[0] * 16} {chunk[1] * 16}')
        current_force = parse_forceloads(rcon.cmd('forceload query'))
        for chunk in sorted(original - current_force):
            rcon.cmd(f'forceload add {chunk[0] * 16} {chunk[1] * 16}')
        final_force = parse_forceloads(rcon.cmd('forceload query'))
        if final_force != original:
            cleanup_errors.append({
                'missing': [list(chunk) for chunk in sorted(original - final_force)],
                'extra': [list(chunk) for chunk in sorted(final_force - original)],
            })
        client.close()

    differences = []
    for field in before['paths']:
        if before['values'].get(field) != current['values'].get(field):
            differences.append({
                'field': field,
                'before': before['values'].get(field),
                'current': current['values'].get(field),
            })
    relation_differences = [
        field for field in (
            'vehicleRelationPresent', 'passengerRelationPresent'
        )
        if before.get(field) != current.get(field)
    ]
    comparable_equal = (
        comparable_projection(before) == comparable_projection(current)
    )
    source_exact = (
        current_position is not None
        and math.dist(source, current_position) <= 0.15
    )
    hive_exists = any('passed' in reply.lower()
                      for reply in hive_replies.values())
    target_hits = exact_target_hits(
        manifest['source']['operations'], [805, 73, -580]
    )
    waiver_exact = (
        {entry['field'] for entry in differences}.issubset(VOLATILE)
        and any(entry['field'] == 'hive_pos' for entry in differences)
        and before['values']['hive_pos'].get('value')
        == '[I; 805, 73, -580]'
        and current['values']['hive_pos'].get('present') is False
    )
    checks = {
        'oneExactUuidAndType': count == 1,
        'exactSourcePosition': source_exact,
        'remainingImmutableProjectionEqual': comparable_equal,
        'soleDifferenceIsWhitelistedBeeNavigation': waiver_exact,
        'noVehiclePassengerOrLeash': (
            not current['vehicleRelationPresent']
            and not current['passengerRelationPresent']
            and current['values'].get('Leash') == {'present': False}
            and current['values'].get('leash') == {'present': False}
            and relation_differences == []
        ),
        'homeHiveExists': hive_exists,
        'homeHiveHasZeroExactTargetHits': target_hits == [],
        'noRailContractOrResidue': (
            planned['sanctuarySlot'].get('temporaryRail') is None
            and 'passed' not in rail_reply.lower()
        ),
        'exactForceLoadSetRestored': not cleanup_errors,
    }
    evidence = {
        'schemaVersion': 1,
        'generatedAtUtc': utc_now(),
        'status': 'PASS_RECONCILED' if all(checks.values()) else 'FAIL',
        'readOnly': True,
        'waiver': (
            'Bee HivePos/hive_pos/FlowerPos/flower_pos are environment-driven '
            'AI navigation links, not identity or preserved ownership state.'
        ),
        'inputs': {
            'manifest': {'file': args.manifest, 'sha256': sha256(args.manifest)},
            'journal': {'file': args.journal, 'sha256': sha256(args.journal)},
            'executor': {
                'file': 'scripts/run_town_entity_evacuation.py',
                'sha256': sha256('scripts/run_town_entity_evacuation.py'),
            },
            'operations': {
                'file': manifest['source']['operations'],
                'sha256': sha256(manifest['source']['operations']),
            },
        },
        'uuidKey': planned['uuidKey'],
        'entityType': planned['entityType'],
        'sourcePosition': source,
        'currentPosition': current_position,
        'homeHive': [805, 73, -580],
        'homeHiveProbeReplies': hive_replies,
        'homeHiveExactTargetLines': target_hits,
        'projectionDifferences': differences,
        'relationDifferences': relation_differences,
        'railProbePosition': rail_position,
        'railProbeReply': rail_reply,
        'preExistingForceLoads': [list(chunk) for chunk in sorted(original)],
        'ownedAuditForceLoads': [list(chunk) for chunk in sorted(owned)],
        'forceLoadCleanupErrors': cleanup_errors,
        'checks': checks,
        'worldReleaseAuthorized': False,
    }
    content_hash = hashlib.sha256(
        json.dumps(evidence, sort_keys=True, separators=(',', ':')).encode()
    ).hexdigest()
    evidence['evidenceContentSha256'] = content_hash
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, 'w', encoding='utf-8') as handle:
        json.dump(evidence, handle, indent=2)
        handle.write('\n')
    os.makedirs(os.path.dirname(args.markdown), exist_ok=True)
    with open(args.markdown, 'w', encoding='utf-8') as handle:
        handle.write('# Clearance2b Bee Reconciliation\n\n')
        handle.write(f'**Decision:** `{evidence["status"]}`\n\n')
        handle.write(f'**Evidence content SHA-256:** `{content_hash}`\n\n')
        handle.write(evidence['waiver'] + '\n\n')
        handle.write('## Checks\n\n')
        for name, passed in checks.items():
            handle.write(f'- {name}: `{"PASS" if passed else "FAIL"}`\n')
    print(json.dumps({
        'status': evidence['status'],
        'output': args.out,
        'markdown': args.markdown,
        'evidenceContentSha256': content_hash,
        'checks': checks,
    }, indent=2))
    return 0 if evidence['status'] == 'PASS_RECONCILED' else 2


if __name__ == '__main__':
    raise SystemExit(main())
