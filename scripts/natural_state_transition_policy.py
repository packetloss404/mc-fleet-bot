"""Fail-closed loader for exact-point natural block-state transition policies."""

import hashlib
import json
import os
import re


COPPER_FAMILIES = {
    'chiseled_copper',
    'copper_block',
    'copper_bulb',
    'copper_door',
    'copper_grate',
    'copper_trapdoor',
    'cut_copper',
    'cut_copper_slab',
    'cut_copper_stairs',
}
OXIDATION_PREFIXES = (
    ('oxidized_', 3),
    ('weathered_', 2),
    ('exposed_', 1),
    ('', 0),
)
SHA256 = re.compile(r'^[a-f0-9]{64}$')


def file_sha256(filename):
    digest = hashlib.sha256()
    with open(filename, 'rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def normalize_state(state):
    source = str(state)
    bracket = source.find('[')
    if bracket < 0:
        return source
    if not source.endswith(']'):
        raise ValueError(f'malformed block state {source}')
    properties = sorted(
        entry for entry in source[bracket + 1:-1].split(',') if entry
    )
    return f'{source[:bracket]}[{",".join(properties)}]'


def copper_oxidation_identity(state):
    normalized = normalize_state(state)
    bracket = normalized.find('[')
    name = normalized if bracket < 0 else normalized[:bracket]
    properties = '' if bracket < 0 else normalized[bracket:]
    if not name.startswith('minecraft:'):
        return None
    local_name = name[len('minecraft:'):]
    if local_name.startswith('waxed_'):
        return None
    for prefix, stage in OXIDATION_PREFIXES:
        if not local_name.startswith(prefix):
            continue
        family = local_name[len(prefix):]
        if family not in COPPER_FAMILIES:
            return None
        return {
            'family': f'minecraft:{family}',
            'stage': stage,
            'properties': properties,
            'normalized': normalized,
        }
    return None


def is_natural_copper_oxidation_evolution(canonical, actual):
    source = copper_oxidation_identity(canonical)
    evolved = copper_oxidation_identity(actual)
    return bool(
        source
        and evolved
        and source['family'] == evolved['family']
        and source['properties'] == evolved['properties']
        and evolved['stage'] > source['stage']
    )


def _split_masks(mask):
    masks, start, depth = [], 0, 0
    for index, char in enumerate(mask):
        if char == '[':
            depth += 1
        elif char == ']':
            depth = max(0, depth - 1)
        elif char == ',' and depth == 0:
            masks.append(mask[start:index])
            start = index + 1
    masks.append(mask[start:])
    return [normalize_state(entry) for entry in masks if entry]


def _point_key(point):
    return ','.join(str(value) for value in point)


def _in_box(point, box):
    return (
        min(box[0], box[3]) <= point[0] <= max(box[0], box[3])
        and min(box[1], box[4]) <= point[1] <= max(box[1], box[4])
        and min(box[2], box[5]) <= point[2] <= max(box[2], box[5])
    )


def _operation_by_line(ops):
    output = {}
    for line, fields in ops:
        if fields[0] != 'REPL' or len(fields) < 9:
            continue
        output[line] = {
            'box': [int(value) for value in fields[1:7]],
            'expected': _split_masks(fields[7]),
            'replacement': normalize_state(fields[8]),
        }
    return output


def _resolve_evidence(policy_path, evidence_path):
    if os.path.isabs(evidence_path):
        return evidence_path
    beside = os.path.abspath(
        os.path.join(os.path.dirname(policy_path), evidence_path)
    )
    if os.path.exists(beside):
        return beside
    return os.path.abspath(evidence_path)


def load_natural_state_transition_policy(
    filename,
    *,
    operation_sha256,
    operation_path,
    ops,
    require_evidence=True,
):
    policy_path = os.path.abspath(filename)
    with open(policy_path, encoding='utf-8') as handle:
        policy = json.load(handle)
    policy_sha256 = file_sha256(policy_path)
    if (
        not isinstance(policy, dict)
        or policy.get('schemaVersion') != 1
        or policy.get('kind') != 'natural-block-state-transition'
        or policy.get('executionRole') != 'rollback'
        or policy.get('matchMode') != 'exact-declared-points'
        or policy.get('propertyPolicy') != 'identical'
    ):
        raise ValueError('unsupported natural-state-transition policy contract')
    operation = policy.get('operation')
    bound_hash = operation.get('sha256') if isinstance(operation, dict) else None
    if not SHA256.fullmatch(str(bound_hash or '')):
        raise ValueError('policy operation SHA-256 is missing or malformed')
    if bound_hash != operation_sha256:
        raise ValueError(
            f'policy operation hash {bound_hash} does not match '
            f'{operation_sha256}'
        )
    bound_path = operation.get('path')
    if (
        not isinstance(bound_path, str)
        or not bound_path
        or os.path.abspath(bound_path) != os.path.abspath(operation_path)
    ):
        raise ValueError(
            'policy operation path does not match the supplied operation'
        )
    raw_rules = policy.get('rules')
    if not isinstance(raw_rules, list) or not raw_rules:
        raise ValueError('policy must declare at least one transition rule')

    canonical_operations = _operation_by_line(ops)
    seen_rule_ids = set()
    seen_points = set()
    rules = []
    for raw in raw_rules:
        if (
            not isinstance(raw, dict)
            or not isinstance(raw.get('id'), str)
            or not raw['id']
            or type(raw.get('line')) is not int
            or raw['line'] < 1
            or not isinstance(raw.get('box'), list)
            or len(raw['box']) != 6
            or any(type(value) is not int for value in raw['box'])
            or not isinstance(raw.get('points'), list)
            or not raw['points']
            or not isinstance(raw.get('allowedActualStates'), list)
            or not raw['allowedActualStates']
        ):
            raise ValueError('malformed natural-state-transition rule')
        if raw['id'] in seen_rule_ids:
            raise ValueError(f'duplicate policy rule {raw["id"]}')
        seen_rule_ids.add(raw['id'])
        canonical_source = normalize_state(raw.get('canonicalSource'))
        allowed = [
            normalize_state(state) for state in raw['allowedActualStates']
        ]
        if len(set(allowed)) != len(allowed):
            raise ValueError(f'{raw["id"]}: duplicate allowedActualStates')
        for actual in allowed:
            if not is_natural_copper_oxidation_evolution(
                canonical_source,
                actual,
            ):
                raise ValueError(
                    f'{raw["id"]}: {canonical_source} -> {actual} is not a '
                    'same-family forward copper oxidation with identical '
                    'properties'
                )
        canonical = canonical_operations.get(raw['line'])
        if canonical is None:
            raise ValueError(
                f'{raw["id"]}: no REPL operation exists at line {raw["line"]}'
            )
        if (
            canonical['box'] != raw['box']
            or canonical['expected'] != [canonical_source]
        ):
            raise ValueError(
                f'{raw["id"]}: rule does not match the exact canonical group'
            )
        points = []
        for point in raw['points']:
            if (
                not isinstance(point, list)
                or len(point) != 3
                or any(type(value) is not int for value in point)
                or not _in_box(point, raw['box'])
            ):
                raise ValueError(
                    f'{raw["id"]}: invalid or out-of-box policy point'
                )
            key = f'{raw["line"]}:{_point_key(point)}'
            if key in seen_points:
                raise ValueError(f'duplicate policy point {key}')
            seen_points.add(key)
            points.append(list(point))
        rules.append({
            'id': raw['id'],
            'line': raw['line'],
            'box': list(raw['box']),
            'canonicalSource': canonical_source,
            'allowedActualStates': allowed,
            'points': points,
        })

    evidence_result = None
    if require_evidence:
        evidence = policy.get('evidence')
        if not isinstance(evidence, dict):
            raise ValueError('policy evidence binding is missing')
        evidence_path = evidence.get('preflightPath')
        evidence_hash = evidence.get('preflightSha256')
        snapshot_hash = evidence.get('snapshotSha256')
        if (
            not isinstance(evidence_path, str)
            or not evidence_path
            or not SHA256.fullmatch(str(evidence_hash or ''))
            or not SHA256.fullmatch(str(snapshot_hash or ''))
        ):
            raise ValueError('policy evidence binding is malformed')
        resolved_evidence = _resolve_evidence(policy_path, evidence_path)
        if not os.path.exists(resolved_evidence):
            raise ValueError(
                f'policy evidence preflight does not exist: {resolved_evidence}'
            )
        if file_sha256(resolved_evidence) != evidence_hash:
            raise ValueError('policy evidence preflight SHA-256 mismatch')
        with open(resolved_evidence, encoding='utf-8') as handle:
            preflight = json.load(handle)
        if (
            preflight.get('schemaVersion', 0) < 2
            or preflight.get('orderAwareProjection') is not True
            or preflight.get('failurePointsComplete') is not True
            or preflight.get('partialMasks') != []
            or preflight.get('opsSha256') != bound_hash
            or (preflight.get('regionsSnapshot') or {}).get('sha256')
            != snapshot_hash
            or preflight.get('failed') != len(preflight.get('failures') or [])
            or preflight.get('failed', 0) < 1
            or any(
                failure.get('unexpectedComplete') is not True
                or failure.get('unexpectedCount')
                != len(failure.get('unexpected') or [])
                for failure in preflight.get('failures') or []
            )
        ):
            raise ValueError(
                'policy evidence preflight identity or failure contract changed'
            )
        observed = {}
        for failure in preflight['failures']:
            for entry in failure.get('unexpected') or []:
                observed[
                    f'{failure["line"]}:{_point_key(entry["point"])}'
                ] = normalize_state(entry['actual'])
        declared = {}
        for rule in rules:
            for point in rule['points']:
                declared[
                    f'{rule["line"]}:{_point_key(point)}'
                ] = set(rule['allowedActualStates'])
        if len(observed) != len(declared):
            raise ValueError(
                'policy evidence/declaration cell count mismatch '
                f'({len(observed)} observed, {len(declared)} declared)'
            )
        for key, actual in observed.items():
            if actual not in declared.get(key, set()):
                raise ValueError(
                    f'policy does not exactly bind observed transition '
                    f'{key}={actual}'
                )
        evidence_result = {
            'preflightPath': resolved_evidence,
            'preflightSha256': evidence_hash,
            'snapshotSha256': snapshot_hash,
            'observedTransitionCells': len(observed),
        }

    return {
        'policy': policy,
        'path': policy_path,
        'sha256': policy_sha256,
        'bytes': os.path.getsize(policy_path),
        'operationSha256': bound_hash,
        'rules': rules,
        'ruleByLine': {rule['line']: rule for rule in rules},
        'declaredPointCount': len(seen_points),
        'evidence': evidence_result,
    }
