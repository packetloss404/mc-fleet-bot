#!/usr/bin/env python3
"""
Run build ops over RCON with vanilla /fill instead of driving a bot through WorldEdit.

WHY THIS EXISTS. build_runner.py sends WorldEdit commands as an opped mineflayer bot,
because a WorldEdit selection belongs to a player and the console has none. That
costs three chat round-trips per op (//pos1, //pos2, //set) plus a reply poll --
measured at ~1.5s per op, so a 4,000-op build takes over an hour and a 12,000-op
programme takes most of a day.

Vanilla /fill needs no selection: one command, one box, measured at 0.066s over
RCON. That is ~23x faster. Two catches, both handled here:

  1. /fill silently refuses unloaded chunks with "That position is not loaded".
     Measured: a fill aimed at the Westlight site failed exactly this way, because
     the bots never move (we place by coordinate) so nothing out there is loaded.
     This force-loads the ops' bounding box first and releases only what it added --
     the operator has ~281 chunks force-loaded for their own work and
     `forceload remove all` would destroy that.
  2. /fill has a 32768-block limit and no random-pattern support. Boxes over the
     limit are split; percentage-mix patterns are written out to a leftover file for
     build_runner.py to handle through WorldEdit, which does support them.

EVERY reply is checked. A fill that reports anything other than a success is counted
and reported loudly -- the whole point is not to trade an hour for a silent no-op.

  python3 scripts/rcon_runner.py data/buildops/foo.txt [--dry-run] [--keep-loaded]
"""
import argparse, hashlib, json, os, re, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mc_admin import Rcon, connect            # noqa: E402
from natural_state_transition_policy import (  # noqa: E402
    load_natural_state_transition_policy,
    normalize_state,
)

FILL_LIMIT = 32768
SERVER_FORCELOAD_LIMIT = 256
MAX_COMMAND_CHUNKS = 16
STREAM_GROUP_BATCH_LIMIT = 10000
# Blocks this server's COMMAND PARSER rejects, though WorldEdit places them happily.
# Measured 2026-07-26: the legacy `chain` / `minecraft:chain` id is absent on this
# 1.21.11 server; its registry name is `minecraft:iron_chain`. Keep the legacy id
# blocked so an old ops file cannot silently lose rigging. New generators must emit
# `minecraft:iron_chain`, which works through vanilla /fill and needs no WorldEdit.
COMMAND_BLOCKED = {'chain'}
BATCH = 40                                     # commands per RCON round-trip
OK = re.compile(
    r'Successfully filled|filled \d+ block|Changed the block at|Modified block data of'
)
NOOP = re.compile(
    r'No blocks (were )?(filled|changed)|could not be placed|'
    r'Could not set the block|Nothing changed\. The specified properties'
)


def parse(path):
    ops = []
    with open(path, encoding='utf-8') as handle:
        for n, line in enumerate(handle, 1):
            f = line.split()
            if not f or f[0].startswith('#'):
                continue
            ops.append((n, f))
    return ops


def volume(b):
    x1, y1, z1, x2, y2, z2 = b
    return (abs(x2 - x1) + 1) * (abs(y2 - y1) + 1) * (abs(z2 - z1) + 1)


def box_chunks(b):
    x1, _, z1, x2, _, z2 = b
    min_cx, max_cx = min(x1, x2) // 16, max(x1, x2) // 16
    min_cz, max_cz = min(z1, z2) // 16, max(z1, z2) // 16
    return {
        (chunk_x, chunk_z)
        for chunk_x in range(min_cx, max_cx + 1)
        for chunk_z in range(min_cz, max_cz + 1)
    }


def split(b):
    """Split a fill by both vanilla block limit and streaming chunk limit."""
    touched_chunks = box_chunks(b)
    if volume(b) <= FILL_LIMIT and len(touched_chunks) <= MAX_COMMAND_CHUNKS:
        return [b]
    x1, y1, z1, x2, y2, z2 = b
    x1, x2 = min(x1, x2), max(x1, x2)
    y1, y2 = min(y1, y2), max(y1, y2)
    z1, z2 = min(z1, z2), max(z1, z2)
    if len(touched_chunks) > MAX_COMMAND_CHUNKS:
        chunk_spans = [
            (x2 // 16 - x1 // 16, 0),
            (z2 // 16 - z1 // 16, 2),
        ]
        _, axis = max(chunk_spans)
    else:
        spans = [(x2 - x1, 0), (y2 - y1, 1), (z2 - z1, 2)]
        _, axis = max(spans)
    lo = [x1, y1, z1][axis]
    hi = [x2, y2, z2][axis]
    mid = (lo + hi) // 2
    a = [x1, y1, z1, x2, y2, z2]
    bb = list(a)
    a[axis + 3] = mid
    bb[axis] = mid + 1
    return split(tuple(a)) + split(tuple(bb))


BLOCK_COORDINATE = re.compile(
    r'(?:^|\s)(?:block|positioned|setblock)\s+'
    r'(-?\d+)\s+(-?\d+)\s+(-?\d+)(?:\s|$)'
)
FILL_COORDINATE = re.compile(
    r'(?:^|\s)fill\s+'
    r'(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+'
    r'(-?\d+)\s+(-?\d+)\s+(-?\d+)(?:\s|$)'
)
ABSOLUTE = r'-?\d+'
BLOCK_STATE = r'\S+'
SUPPORTED_CMD_PATTERNS = (
    re.compile(
        rf'^execute(?: if block {ABSOLUTE} {ABSOLUTE} {ABSOLUTE} '
        rf'{BLOCK_STATE})+ run data merge block '
        rf'{ABSOLUTE} {ABSOLUTE} {ABSOLUTE} \{{.*\}}$'
    ),
    re.compile(
        rf'^data merge block {ABSOLUTE} {ABSOLUTE} {ABSOLUTE} \{{.*\}}$'
    ),
    re.compile(
        rf'^data get block {ABSOLUTE} {ABSOLUTE} {ABSOLUTE}(?: .+)?$'
    ),
    re.compile(
        rf'^setblock {ABSOLUTE} {ABSOLUTE} {ABSOLUTE} {BLOCK_STATE}'
        rf'(?: (?:destroy|keep|replace|strict))?$'
    ),
)


def command_touched_chunks(command):
    """Return every exact chunk read or written by a supported command."""
    chunks = set()
    for match in FILL_COORDINATE.finditer(command):
        chunks.update(box_chunks(tuple(int(value) for value in match.groups())))
    for match in BLOCK_COORDINATE.finditer(command):
        x, _, z = (int(value) for value in match.groups())
        chunks.add((x // 16, z // 16))
    return chunks


def command_has_unsupported_coordinates(command):
    """Fail closed unless the whole CMD matches an audited absolute grammar."""
    return not any(pattern.fullmatch(command) for pattern in SUPPORTED_CMD_PATTERNS)


def split_masks(mask):
    """Split a comma-delimited material mask without splitting block states.

    REPL historically allowed masks such as ``air,cave_air``. Modern guarded
    operations also use exact states such as
    ``lantern[hanging=false,waterlogged=false]``; a plain ``str.split(',')``
    corrupts that state into two invalid commands.
    """
    masks, start, depth = [], 0, 0
    for i, char in enumerate(mask):
        if char == '[':
            depth += 1
        elif char == ']':
            depth = max(0, depth - 1)
        elif char == ',' and depth == 0:
            masks.append(mask[start:i])
            start = i + 1
    masks.append(mask[start:])
    return [entry for entry in masks if entry]


def command_plan(ops, transition_policy=None):
    """Build source-operation groups and expanded commands.

    A comma-delimited REPL mask is a finite set of alternative guards, not a
    sequence of independently strict operations. The live evaluator therefore
    keeps every expanded command bound to its source line and alternative.
    """
    groups, expanded, leftover = [], [], []
    for n, f in ops:
        group = {
            'index': len(groups),
            'line': n,
            'kind': f[0],
            'alternatives': [],
        }
        if f[0] == 'CMD':
            group['expandedStart'] = len(expanded)
            command = ' '.join(f[1:]).lstrip('/')
            touched_chunks = command_touched_chunks(command)
            group['alternatives'].append({
                'index': 0,
                'state': None,
                'commands': [command],
            })
            group['chunks'] = [
                list(chunk) for chunk in sorted(touched_chunks)
            ]
            group['unlocatedCommand'] = not bool(touched_chunks)
            group['unsupportedCoordinateGrammar'] = (
                command_has_unsupported_coordinates(command)
            )
            groups.append(group)
            expanded.append({
                'groupIndex': group['index'],
                'line': n,
                'alternativeIndex': 0,
                'state': None,
                'command': command,
                'chunks': group['chunks'],
            })
            group['expandedEnd'] = len(expanded)
            continue
        if f[0] not in ('SET', 'REPL') or len(f) < 8:
            leftover.append((n, f))
            continue
        box = tuple(int(v) for v in f[1:7])
        if f[0] == 'SET':
            pattern, mask = f[7], None
        else:
            mask, pattern = f[7], f[8] if len(f) > 8 else None
        if (pattern is None or '%' in pattern
                or pattern.split('[')[0].replace('minecraft:', '') in COMMAND_BLOCKED):
            leftover.append((n, f))         # random mixes and blocked ids: WorldEdit's job
            continue
        masks = split_masks(mask) if mask else [None]
        if f[0] == 'REPL':
            canonical_pattern = normalize_state(pattern)
            semantic_noop_masks = [
                state for state in masks
                if normalize_state(state) == canonical_pattern
            ]
            if semantic_noop_masks:
                raise ValueError(
                    f'line {n}: REPL replacement {pattern} is semantically '
                    f'identical to guarded source '
                    f'{semantic_noop_masks[0]}'
                )
        transition_rule = (
            transition_policy['ruleByLine'].get(n)
            if transition_policy and f[0] == 'REPL'
            else None
        )
        pieces = split(box)
        group_expanded = []
        group['expandedStart'] = len(expanded)
        group.update({
            'box': list(box),
            'replacement': pattern,
            'sourceMask': mask,
            'finiteUnion': len(masks) > 1,
        })
        if transition_rule:
            if (
                len(masks) != 1
                or normalize_state(masks[0])
                != transition_rule['canonicalSource']
            ):
                raise ValueError(
                    f'line {n}: transition policy requires one exact '
                    'canonical source mask'
                )
            group['policyTransition'] = True
            group['transitionPolicyRuleId'] = transition_rule['id']
            group['transitionSegments'] = []
            # Policy-covered groups use one command per canonical remainder
            # cell. A larger `/fill ... replace canonical` reports success
            # when *any* cell matches and could therefore conceal a newly
            # oxidized undeclared cell inside the same box. One-cell guards
            # make every undeclared point/state fail closed at execution time.
            excluded_points = {
                tuple(point) for point in transition_rule['points']
            }
            x1, y1, z1, x2, y2, z2 = box
            canonical_pieces = [
                (x, y, z, x, y, z)
                for y in range(min(y1, y2), max(y1, y2) + 1)
                for z in range(min(z1, z2), max(z1, z2) + 1)
                for x in range(min(x1, x2), max(x1, x2) + 1)
                if (x, y, z) not in excluded_points
            ]
            canonical_commands = []
            group['alternatives'].append({
                'index': 0,
                'state': masks[0],
                'commands': canonical_commands,
            })
            for piece in canonical_pieces:
                x1, y1, z1, x2, y2, z2 = piece
                command = (
                    f'fill {x1} {y1} {z1} {x2} {y2} {z2} {pattern} '
                    f'replace {masks[0]} strict'
                )
                canonical_commands.append(command)
                entry = {
                    'groupIndex': group['index'],
                    'line': n,
                    'alternativeIndex': 0,
                    'transitionSegmentIndex': 0,
                    'state': masks[0],
                    'command': command,
                    'chunks': [
                        list(chunk) for chunk in sorted(box_chunks(piece))
                    ],
                }
                expanded.append(entry)
                group_expanded.append(entry)
            group['transitionSegments'].append({
                'index': 0,
                'kind': 'canonical-remainder',
                'point': None,
                'alternativeIndexes': [0],
            })
            next_alternative = 1
            for point_index, point in enumerate(transition_rule['points'], 1):
                alternative_indexes = []
                for state in [
                    transition_rule['canonicalSource'],
                    *transition_rule['allowedActualStates'],
                ]:
                    alternative_index = next_alternative
                    next_alternative += 1
                    alternative_indexes.append(alternative_index)
                    x, y, z = point
                    command = (
                        f'fill {x} {y} {z} {x} {y} {z} {pattern} '
                        f'replace {state} strict'
                    )
                    group['alternatives'].append({
                        'index': alternative_index,
                        'state': state,
                        'commands': [command],
                    })
                    entry = {
                        'groupIndex': group['index'],
                        'line': n,
                        'alternativeIndex': alternative_index,
                        'transitionSegmentIndex': point_index,
                        'state': state,
                        'command': command,
                        'chunks': [
                            list(chunk)
                            for chunk in sorted(
                                box_chunks((x, y, z, x, y, z))
                            )
                        ],
                    }
                    expanded.append(entry)
                    group_expanded.append(entry)
                group['transitionSegments'].append({
                    'index': point_index,
                    'kind': 'exact-point-finite-union',
                    'point': point,
                    'alternativeIndexes': alternative_indexes,
                })
            group['chunks'] = [
                list(chunk)
                for chunk in sorted({
                    tuple(chunk)
                    for entry in group_expanded
                    for chunk in entry['chunks']
                })
            ]
            group['expandedEnd'] = len(expanded)
            groups.append(group)
            continue
        for alternative_index, state in enumerate(masks):
            alternative_commands = []
            for piece in pieces:
                x1, y1, z1, x2, y2, z2 = piece
                command = f'fill {x1} {y1} {z1} {x2} {y2} {z2} {pattern}'
                if state:
                    command += ' replace ' + state
                # Paper 1.21.11 accepts `strict` after both plain and
                # mask-scoped fill forms. Suppressing neighbor updates keeps
                # exact dependent cells (plants, doors, rails, wall fixtures)
                # stable until every guarded operation in the transaction has
                # completed. The world is unfrozen only after commit/rollback.
                command += ' strict'
                alternative_commands.append(command)
                entry = {
                    'groupIndex': group['index'],
                    'line': n,
                    'alternativeIndex': alternative_index,
                    'state': state,
                    'command': command,
                    'chunks': [
                        list(chunk) for chunk in sorted(box_chunks(piece))
                    ],
                }
                expanded.append(entry)
                group_expanded.append(entry)
            group['alternatives'].append({
                'index': alternative_index,
                'state': state,
                'commands': alternative_commands,
            })
        group['chunks'] = [
            list(chunk)
            for chunk in sorted({
                tuple(chunk)
                for entry in group_expanded
                for chunk in entry['chunks']
            })
        ]
        group['expandedEnd'] = len(expanded)
        groups.append(group)
    return groups, expanded, leftover


def commands(ops, transition_policy=None):
    """Backward-compatible flattened command view used by older tooling."""
    _, expanded, leftover = command_plan(ops, transition_policy)
    return [(entry['line'], entry['command']) for entry in expanded], leftover


def stream_group_batches(
    groups,
    expanded,
    pre_existing,
    capacity=SERVER_FORCELOAD_LIMIT,
):
    """Pack whole source groups into exact-chunk force-load batches.

    A source group is indivisible because a finite-union REPL operation must be
    evaluated as a unit. Sparse groups may share a batch even when their chunks
    are far apart; only exact referenced chunks count toward server capacity.
    """
    if (
        type(capacity) is not int
        or capacity < 1
        or len(pre_existing) > capacity
    ):
        raise ValueError('invalid force-load capacity contract')
    temporary_capacity = capacity - len(pre_existing)
    missing_group_chunks = {
        group['index']
        for group in groups
        if not group.get('chunks')
    }
    expanded_chunks = {}
    if missing_group_chunks:
        for entry in expanded:
            if entry['groupIndex'] in missing_group_chunks:
                expanded_chunks.setdefault(entry['groupIndex'], set()).update(
                    tuple(chunk) for chunk in entry.get('chunks', [])
                )

    batches = []
    current_indexes = []
    current_required = set()
    for group in groups:
        group_chunks = {
            tuple(chunk) for chunk in group.get('chunks', [])
        } or expanded_chunks.get(group['index'], set())
        if not group_chunks:
            raise ValueError(
                f"source group {group['index']} has no exact command chunks"
            )
        group_temporary = group_chunks - pre_existing
        if len(group_temporary) > temporary_capacity:
            raise ValueError(
                f"source group {group['index']} exceeds temporary "
                f'force-load capacity ({len(group_temporary)} > '
                f'{temporary_capacity})'
            )
        prospective = current_required | group_chunks
        prospective_temporary = prospective - pre_existing
        if current_indexes and (
            len(current_indexes) >= STREAM_GROUP_BATCH_LIMIT
            or len(prospective_temporary) > temporary_capacity
        ):
            batches.append({
                'index': len(batches),
                'groupIndexes': current_indexes,
                'requiredChunks': [
                    list(chunk) for chunk in sorted(current_required)
                ],
                'temporaryChunks': [
                    list(chunk)
                    for chunk in sorted(current_required - pre_existing)
                ],
            })
            current_indexes = []
            current_required = set()
        current_indexes.append(group['index'])
        current_required.update(group_chunks)

    if current_indexes:
        batches.append({
            'index': len(batches),
            'groupIndexes': current_indexes,
            'requiredChunks': [
                list(chunk) for chunk in sorted(current_required)
            ],
            'temporaryChunks': [
                list(chunk)
                for chunk in sorted(current_required - pre_existing)
            ],
        })
    return batches


def classify_reply(reply, *, empty_command_reply_is_noop=False):
    if OK.search(reply):
        return 'success'
    if NOOP.search(reply):
        return 'noop'
    # Paper returns an empty RCON payload when an `execute if ... run ...`
    # command's conditions do not match. That is a recognized command no-op,
    # not an unparseable server reply. Strict forward execution still rejects
    # it as a no-op; non-strict compensating rollback may safely tolerate it.
    if empty_command_reply_is_noop and not reply.strip():
        return 'noop'
    return 'unknown'


def evaluate_command_groups(groups, expanded, replies, strict_noop):
    """Evaluate replies once per source operation, fail closed for unions.

    A finite union passes only when exactly one complete alternative changes
    and every other alternative is a recognized no-op. Zero matches, multiple
    matches, mixed partial alternatives, and unknown replies all fail.
    """
    if len(expanded) != len(replies):
        raise ValueError('expanded command/reply count mismatch')
    reply_records = []
    by_group = {group['index']: [] for group in groups}
    group_by_index = {group['index']: group for group in groups}
    for entry, reply in zip(expanded, replies):
        group = group_by_index[entry['groupIndex']]
        record = {
            **entry,
            'kind': group['kind'],
            'classification': classify_reply(
                reply,
                empty_command_reply_is_noop=group['kind'] == 'CMD',
            ),
            'reply': reply.strip(),
        }
        reply_records.append(record)
        by_group[entry['groupIndex']].append(record)

    results = []
    union_matches = []
    policy_transition_matches = []
    expected_alternative_noops = 0
    tolerated_non_strict_noops = 0
    unexpected_noops = 0
    for group in groups:
        records = by_group[group['index']]
        alternative_results = []
        for alternative in group['alternatives']:
            alternative_records = [
                record for record in records
                if record['alternativeIndex'] == alternative['index']
            ]
            classifications = [
                record['classification'] for record in alternative_records
            ]
            alternative_results.append({
                'index': alternative['index'],
                'state': alternative['state'],
                'classifications': classifications,
                'allSuccess': (
                    bool(classifications)
                    and all(item == 'success' for item in classifications)
                ),
                'allNoop': (
                    bool(classifications)
                    and all(item == 'noop' for item in classifications)
                ),
                'hasUnknown': 'unknown' in classifications,
            })

        if group.get('policyTransition'):
            alternative_by_index = {
                item['index']: item for item in alternative_results
            }
            segment_failures = []
            selected_segments = []
            canonical_segment = group['transitionSegments'][0]
            canonical = alternative_by_index[
                canonical_segment['alternativeIndexes'][0]
            ]
            canonical_classifications = canonical['classifications']
            canonical_unknown = canonical_classifications.count('unknown')
            canonical_noops = canonical_classifications.count('noop')
            if canonical_unknown:
                segment_failures.append({
                    'segmentIndex': canonical_segment['index'],
                    'reason': 'unknown-reply',
                })
            elif strict_noop and canonical_noops:
                segment_failures.append({
                    'segmentIndex': canonical_segment['index'],
                    'reason': 'strict-noop',
                })
                unexpected_noops += canonical_noops
            elif canonical_noops:
                tolerated_non_strict_noops += canonical_noops

            for segment in group['transitionSegments'][1:]:
                candidates = [
                    alternative_by_index[index]
                    for index in segment['alternativeIndexes']
                ]
                matched = [
                    candidate for candidate in candidates
                    if candidate['allSuccess']
                ]
                every_known = all(
                    candidate['allSuccess'] or candidate['allNoop']
                    for candidate in candidates
                )
                if len(matched) == 1 and every_known:
                    selected = matched[0]
                    selected_segments.append({
                        'segmentIndex': segment['index'],
                        'point': segment['point'],
                        'alternativeIndex': selected['index'],
                        'state': selected['state'],
                    })
                    expected_alternative_noops += sum(
                        len(candidate['classifications'])
                        for candidate in candidates
                        if candidate['index'] != selected['index']
                    )
                elif (
                    not strict_noop
                    and len(matched) == 0
                    and all(candidate['allNoop'] for candidate in candidates)
                ):
                    tolerated = sum(
                        len(candidate['classifications'])
                        for candidate in candidates
                    )
                    tolerated_non_strict_noops += tolerated
                else:
                    noops = sum(
                        candidate['classifications'].count('noop')
                        for candidate in candidates
                    )
                    unexpected_noops += noops
                    if any(candidate['hasUnknown'] for candidate in candidates):
                        reason = 'unknown-reply'
                    elif len(matched) == 0:
                        reason = 'no-alternative-matched'
                    elif len(matched) > 1:
                        reason = 'multiple-alternatives-matched'
                    else:
                        reason = 'partial-alternative-match'
                    segment_failures.append({
                        'segmentIndex': segment['index'],
                        'point': segment['point'],
                        'reason': reason,
                    })
            passed = not segment_failures
            selected = None
            reason = (
                None if passed
                else f'policy-transition-segment-failed:'
                f'{segment_failures[0]["reason"]}'
            )
            if passed:
                policy_transition_matches.append({
                    'groupIndex': group['index'],
                    'line': group['line'],
                    'ruleId': group['transitionPolicyRuleId'],
                    'segments': selected_segments,
                })
        elif group.get('finiteUnion'):
            matched = [
                alternative for alternative in alternative_results
                if alternative['allSuccess']
            ]
            every_unmatched_noop = all(
                alternative['allSuccess'] or alternative['allNoop']
                for alternative in alternative_results
            )
            passed = len(matched) == 1 and every_unmatched_noop
            if passed:
                selected = matched[0]
                expected_alternative_noops += sum(
                    len(alternative['classifications'])
                    for alternative in alternative_results
                    if alternative['index'] != selected['index']
                )
                union_matches.append({
                    'groupIndex': group['index'],
                    'line': group['line'],
                    'alternativeIndex': selected['index'],
                    'state': selected['state'],
                })
                reason = None
            else:
                selected = None
                unexpected_noops += sum(
                    classifications.count('noop')
                    for classifications in (
                        alternative['classifications']
                        for alternative in alternative_results
                    )
                )
                if any(item['hasUnknown'] for item in alternative_results):
                    reason = 'unknown-reply'
                elif len(matched) == 0:
                    reason = 'no-alternative-matched'
                elif len(matched) > 1:
                    reason = 'multiple-alternatives-matched'
                else:
                    reason = 'partial-alternative-match'
        else:
            classifications = alternative_results[0]['classifications']
            unknown = classifications.count('unknown')
            noops = classifications.count('noop')
            passed = unknown == 0 and (not strict_noop or noops == 0)
            selected = alternative_results[0] if passed else None
            reason = None
            if unknown:
                reason = 'unknown-reply'
            elif strict_noop and noops:
                reason = 'strict-noop'
            if noops:
                if strict_noop:
                    unexpected_noops += noops
                else:
                    tolerated_non_strict_noops += noops

        results.append({
            'groupIndex': group['index'],
            'line': group['line'],
            'kind': group['kind'],
            'finiteUnion': group.get('finiteUnion', False),
            'passed': passed,
            'reason': reason,
            'matchedAlternativeIndex': selected['index'] if selected else None,
            'matchedAlternativeState': selected['state'] if selected else None,
            'alternatives': alternative_results,
            'policyTransition': group.get('policyTransition', False),
            'policyTransitionSegments': (
                selected_segments if group.get('policyTransition') else []
            ),
            'policyTransitionSegmentFailures': (
                segment_failures if group.get('policyTransition') else []
            ),
        })

    successful_commands = sum(
        record['classification'] == 'success' for record in reply_records
    )
    noop_commands = sum(
        record['classification'] == 'noop' for record in reply_records
    )
    unknown_commands = sum(
        record['classification'] == 'unknown' for record in reply_records
    )
    failures = [result for result in results if not result['passed']]
    return {
        'groups': results,
        'successfulGroups': len(results) - len(failures),
        'failedGroups': len(failures),
        'successfulCommands': successful_commands,
        'noopCommands': noop_commands,
        'unknownReplyCommands': unknown_commands,
        'expectedAlternativeNoopCommands': expected_alternative_noops,
        'toleratedNonStrictNoopCommands': tolerated_non_strict_noops,
        'unexpectedNoopCommands': unexpected_noops,
        'unionMatches': union_matches,
        'policyTransitionMatches': policy_transition_matches,
        'groupFailures': failures,
        'replyRecords': reply_records,
    }


def bounds(ops):
    xs, ys, zs = [], [], []
    for _, f in ops:
        if f[0] in ('SET', 'REPL') and len(f) >= 8:
            v = [int(t) for t in f[1:7]]
            xs += [v[0], v[3]]
            ys += [v[1], v[4]]
            zs += [v[2], v[5]]
    return (min(xs), min(zs), max(xs), max(zs)) if xs else None


def parse_force_load_chunks(reply):
    chunks = {
        (int(chunk_x), int(chunk_z))
        for chunk_x, chunk_z in re.findall(r'\[(-?\d+),\s*(-?\d+)\]', reply)
    }
    normalized = reply.strip().lower()
    if chunks and (
        'marked for force loading' in normalized
        or 'force loaded chunks were found' in normalized
        or 'force loaded chunk was found' in normalized
    ):
        return chunks
    if not chunks and (
        'no force loaded chunks' in normalized
        or 'no chunks are marked for force loading' in normalized
    ):
        return set()
    raise ValueError(f'unrecognized forceload query reply: {reply!r}')


def write_json_atomic(filename, payload):
    parent = os.path.dirname(os.path.abspath(filename))
    os.makedirs(parent, exist_ok=True)
    temporary = f'{filename}.tmp.{os.getpid()}.{time.time_ns()}'
    with open(temporary, 'x', encoding='utf-8') as handle:
        json.dump(payload, handle, indent=2)
        handle.write('\n')
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(temporary, filename)
    directory_fd = os.open(parent, os.O_RDONLY | os.O_DIRECTORY)
    try:
        os.fsync(directory_fd)
    finally:
        os.close(directory_fd)


def file_sha256(filename):
    digest = hashlib.sha256()
    with open(filename, 'rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def empty_evaluation():
    return {
        'successfulGroups': 0,
        'failedGroups': 0,
        'successfulCommands': 0,
        'noopCommands': 0,
        'unknownReplyCommands': 0,
        'expectedAlternativeNoopCommands': 0,
        'toleratedNonStrictNoopCommands': 0,
        'unexpectedNoopCommands': 0,
        'unionMatches': [],
        'policyTransitionMatches': [],
        'groupFailures': [],
    }


def merge_evaluation(total, partial):
    for field in (
        'successfulGroups',
        'failedGroups',
        'successfulCommands',
        'noopCommands',
        'unknownReplyCommands',
        'expectedAlternativeNoopCommands',
        'toleratedNonStrictNoopCommands',
        'unexpectedNoopCommands',
    ):
        total[field] += partial[field]
    total['unionMatches'].extend(partial['unionMatches'])
    total['policyTransitionMatches'].extend(
        partial['policyTransitionMatches']
    )
    total['groupFailures'].extend(partial['groupFailures'])


def build_transition_plan_audit(
    transition_policy,
    groups,
    expanded,
    *,
    operation_file,
    operation_sha256,
    source_group_plan_sha256,
    expanded_command_sha256,
):
    """Create compact proof that policy groups compile to exact one-cell guards."""
    policy_groups = [
        group for group in groups if group.get('policyTransition')
    ]
    details = []
    for group in policy_groups:
        entries = expanded[group['expandedStart']:group['expandedEnd']]
        canonical_entries = [
            entry for entry in entries
            if entry.get('transitionSegmentIndex') == 0
        ]
        point_segments = group['transitionSegments'][1:]
        alternatives_by_index = {
            alternative['index']: alternative
            for alternative in group['alternatives']
        }
        point_entries = [
            entry for entry in entries
            if entry.get('transitionSegmentIndex', 0) > 0
        ]
        canonical_volume = (
            volume(tuple(group['box']))
            - len(point_segments)
        )
        all_canonical_one_cell = all(
            (
                match := FILL_COORDINATE.search(entry['command'])
            ) is not None
            and match.group(1) == match.group(4)
            and match.group(2) == match.group(5)
            and match.group(3) == match.group(6)
            for entry in canonical_entries
        )
        all_point_one_cell = all(
            (
                match := FILL_COORDINATE.search(entry['command'])
            ) is not None
            and match.group(1) == match.group(4)
            and match.group(2) == match.group(5)
            and match.group(3) == match.group(6)
            for entry in point_entries
        )
        expected_alternative_count = 1 + len(
            transition_policy['ruleByLine'][group['line']][
                'allowedActualStates'
            ]
        )
        exact_declared_point_unions = all(
            len(segment['alternativeIndexes']) == expected_alternative_count
            for segment in point_segments
        )
        passed = (
            len(canonical_entries) == canonical_volume
            and len(point_entries)
            == len(point_segments) * expected_alternative_count
            and all_canonical_one_cell
            and all_point_one_cell
            and exact_declared_point_unions
            and all(entry['command'].endswith(' strict') for entry in entries)
        )
        details.append({
            'line': group['line'],
            'ruleId': group['transitionPolicyRuleId'],
            'box': group['box'],
            'canonicalSource': group['sourceMask'],
            'replacement': group['replacement'],
            'canonicalRemainderCellCount': canonical_volume,
            'canonicalRemainderCommandCount': len(canonical_entries),
            'declaredPointCount': len(point_segments),
            'pointAlternativeCommandCount': len(point_entries),
            'pointGuards': [
                {
                    'point': segment['point'],
                    'alternatives': [
                        alternatives_by_index[index]['state']
                        for index in segment['alternativeIndexes']
                    ],
                }
                for segment in point_segments
            ],
            'allCanonicalRemainderCommandsOneCell':
                all_canonical_one_cell,
            'allPointAlternativeCommandsOneCell': all_point_one_cell,
            'exactDeclaredPointFiniteUnions':
                exact_declared_point_unions,
            'paperStrictEveryCommand': all(
                entry['command'].endswith(' strict') for entry in entries
            ),
            'passed': passed,
        })
    passed = (
        len(policy_groups) == len(transition_policy['rules'])
        and sum(item['declaredPointCount'] for item in details)
        == transition_policy['declaredPointCount']
        and all(item['passed'] for item in details)
    )
    return {
        'schemaVersion': 1,
        'status': 'PASS' if passed else 'FAIL',
        'passed': passed,
        'dryRunOrExecutionPlanOnly': True,
        'liveWorldMutated': False,
        'operation': {
            'path': os.path.abspath(operation_file),
            'sha256': operation_sha256,
            'executionRole': 'rollback',
        },
        'policy': {
            'path': transition_policy['path'],
            'sha256': transition_policy['sha256'],
            'operationSha256': transition_policy['operationSha256'],
            'matchMode': 'exact-declared-points',
            'propertyPolicy': 'identical',
            'declaredPointCount': transition_policy['declaredPointCount'],
        },
        'plan': {
            'sourceGroupPlanSha256': source_group_plan_sha256,
            'expandedCommandSha256': expanded_command_sha256,
            'sourceGroupCount': len(groups),
            'expandedCommandCount': len(expanded),
            'policyTransitionGroupCount': len(policy_groups),
            'canonicalRemainderOneCellCommands': sum(
                item['canonicalRemainderCommandCount']
                for item in details
            ),
            'pointAlternativeOneCellCommands': sum(
                item['pointAlternativeCommandCount'] for item in details
            ),
        },
        'groups': details,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('file')
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--keep-loaded', action='store_true',
                    help='leave the force-loaded chunks in place (for a following run)')
    ap.add_argument(
        '--strict-noop',
        action='store_true',
        help='count a "nothing changed" reply as a failure (required for guarded releases)',
    )
    ap.add_argument(
        '--report',
        help='write a machine-readable execution report (live or dry-run)',
    )
    ap.add_argument(
        '--stream-journal',
        help=(
            'durable exact-chunk streaming journal; defaults beside --report '
            'or the operation file'
        ),
    )
    ap.add_argument(
        '--natural-transition-policy',
        help=(
            'opt-in exact-point rollback source-transition policy; the '
            'policy is hash/evidence bound and is never applied to forward runs'
        ),
    )
    ap.add_argument(
        '--operation-role',
        choices=('forward', 'rollback'),
        default='forward',
        help='explicit operation role; transition policies require rollback',
    )
    ap.add_argument(
        '--policy-audit-report',
        help='write compact hash-bound proof of exact executable policy commands',
    )
    a = ap.parse_args()
    if a.strict_noop and a.keep_loaded:
        ap.error('--strict-noop cannot be combined with --keep-loaded')
    if a.natural_transition_policy and a.operation_role != 'rollback':
        ap.error(
            '--natural-transition-policy requires --operation-role rollback'
        )
    if a.policy_audit_report and not a.natural_transition_policy:
        ap.error('--policy-audit-report requires --natural-transition-policy')

    ops = parse(a.file)
    operation_sha256 = file_sha256(a.file)
    transition_policy = None
    if a.natural_transition_policy:
        try:
            transition_policy = load_natural_state_transition_policy(
                a.natural_transition_policy,
                operation_sha256=operation_sha256,
                operation_path=a.file,
                ops=ops,
            )
        except (OSError, ValueError, json.JSONDecodeError) as error:
            ap.error(f'invalid natural transition policy: {error}')
    groups, expanded, leftover = command_plan(ops, transition_policy)
    cmds = [(entry['line'], entry['command']) for entry in expanded]
    started_at = time.time()
    source_group_plan = json.dumps(
        groups, sort_keys=True, separators=(',', ':')
    ).encode()
    expanded_command_plan = '\n'.join(
        entry['command'] for entry in expanded
    ).encode()
    source_group_plan_sha256 = hashlib.sha256(source_group_plan).hexdigest()
    expanded_command_sha256 = hashlib.sha256(expanded_command_plan).hexdigest()
    transition_plan_audit = None
    if transition_policy:
        transition_plan_audit = build_transition_plan_audit(
            transition_policy,
            groups,
            expanded,
            operation_file=a.file,
            operation_sha256=operation_sha256,
            source_group_plan_sha256=source_group_plan_sha256,
            expanded_command_sha256=expanded_command_sha256,
        )
        if not transition_plan_audit['passed']:
            raise SystemExit('natural transition executable plan audit failed')
        if a.policy_audit_report:
            write_json_atomic(a.policy_audit_report, transition_plan_audit)
            transition_plan_audit['artifact'] = {
                'path': os.path.abspath(a.policy_audit_report),
                'sha256': file_sha256(a.policy_audit_report),
            }

    def write_report(status, **extra):
        if not a.report:
            return
        report = {
            'schemaVersion': 2 if a.dry_run else 3,
            'file': a.file,
            'operationSha256': operation_sha256,
            'sourceGroupPlanSha256': source_group_plan_sha256,
            'expandedCommandSha256': expanded_command_sha256,
            'status': status,
            'dryRun': a.dry_run,
            'strictNoop': a.strict_noop,
            'operationRole': a.operation_role,
            'sourceOperationCount': len(ops),
            'sourceGroupCount': len(groups),
            'commandCount': len(cmds),
            'expandedCommandCount': len(expanded),
            'finiteUnionGroupCount': sum(
                bool(group.get('finiteUnion')) for group in groups
            ),
            'policyTransitionGroupCount': sum(
                bool(group.get('policyTransition')) for group in groups
            ),
            'naturalStateTransitionPolicy': (
                {
                    'path': transition_policy['path'],
                    'sha256': transition_policy['sha256'],
                    'bytes': transition_policy['bytes'],
                    'operationSha256':
                        transition_policy['operationSha256'],
                    'executionRole': 'rollback',
                    'matchMode': 'exact-declared-points',
                    'propertyPolicy': 'identical',
                    'ruleCount': len(transition_policy['rules']),
                    'declaredPointCount':
                        transition_policy['declaredPointCount'],
                    'evidence': transition_policy['evidence'],
                    'planAudit': (
                        transition_plan_audit.get('artifact')
                        if transition_plan_audit else None
                    ),
                }
                if transition_policy else None
            ),
            'worldEditLeftoverCount': len(leftover),
            'sourceGroups': groups,
            'expandedCommands': expanded,
            'startedAtUtc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(started_at)),
            'completedAtUtc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            **extra,
        }
        write_json_atomic(a.report, report)

    print(f'{os.path.basename(a.file)}: {len(ops)} ops -> {len(cmds)} /fill commands, '
          f'{len(leftover)} left for WorldEdit')
    unlocated_groups = [
        group['index']
        for group in groups
        if group.get('unlocatedCommand')
        or group.get('unsupportedCoordinateGrammar')
    ]
    if a.dry_run:
        for _, c in cmds[:5]:
            print('   ', c)
        failures = []
        if leftover:
            failures.append(
                f'{len(leftover)} operation(s) require unsupported WorldEdit handling'
            )
        if unlocated_groups:
            failures.append(
                'CMD source groups lack a complete absolute-coordinate contract: '
                + ','.join(str(index) for index in unlocated_groups[:16])
            )
        write_report(
            'dry_run' if not failures else 'dry_run_failed',
            successfulCommands=0,
            noopCommands=0,
            unknownReplyCommands=0,
            expectedAlternativeNoopCommands=0,
            toleratedNonStrictNoopCommands=0,
            unexpectedNoopCommands=0,
            successfulGroups=0,
            failedGroups=0,
            unionMatches=[],
            policyTransitionMatches=[],
            groupFailures=[],
            failedCommands=len(leftover) + len(unlocated_groups),
            durationSeconds=round(time.time() - started_at, 3),
            failures=failures,
        )
        return 0 if not failures else 1
    if leftover or unlocated_groups:
        failures = []
        if leftover:
            failures.append(
                f'{len(leftover)} operation(s) require unsupported WorldEdit handling'
            )
        if unlocated_groups:
            failures.append(
                'CMD source groups lack a complete absolute-coordinate contract: '
                + ','.join(str(index) for index in unlocated_groups[:16])
            )
        write_report(
            'failed_pre_execution',
            **empty_evaluation(),
            failedCommands=len(leftover) + len(unlocated_groups),
            stoppedAtFirstFailedGroup=False,
            durationSeconds=round(time.time() - started_at, 3),
            failures=failures,
        )
        for failure in failures:
            print(f'  REFUSED: {failure}')
        return 1
    if not cmds:
        write_report(
            'no_commands',
            **empty_evaluation(),
            failedCommands=0,
            stoppedAtFirstFailedGroup=False,
            durationSeconds=round(time.time() - started_at, 3),
            failures=[],
        )
        return 0

    journal_path = (
        a.stream_journal
        or (f'{a.report}.stream-journal.jsonl' if a.report
            else f'{a.file}.stream-journal.jsonl')
    )
    journal = {
        'schemaVersion': 1,
        'operationFile': os.path.abspath(a.file),
        'operationSha256': operation_sha256,
        'sourceGroupPlanSha256': source_group_plan_sha256,
        'expandedCommandSha256': expanded_command_sha256,
        'startedAtUtc': time.strftime(
            '%Y-%m-%dT%H:%M:%SZ',
            time.gmtime(started_at),
        ),
        'status': 'initializing',
        'batches': [],
    }
    journal_handle = None
    journal_sequence = 0

    def persist_journal():
        nonlocal journal_handle, journal_sequence
        if journal_handle is None:
            parent = os.path.dirname(os.path.abspath(journal_path))
            os.makedirs(parent, exist_ok=True)
            journal_handle = open(
                journal_path,
                'x',
                encoding='utf-8',
            )
            directory_fd = os.open(parent, os.O_RDONLY | os.O_DIRECTORY)
            try:
                os.fsync(directory_fd)
            finally:
                os.close(directory_fd)
        journal_sequence += 1
        journal['updatedAtUtc'] = time.strftime(
            '%Y-%m-%dT%H:%M:%SZ',
            time.gmtime(),
        )
        event = {
            'schemaVersion': journal['schemaVersion'],
            'sequence': journal_sequence,
            'atUtc': journal['updatedAtUtc'],
            'status': journal['status'],
            'operationFile': journal['operationFile'],
            'operationSha256': journal['operationSha256'],
            'sourceGroupPlanSha256': journal['sourceGroupPlanSha256'],
            'expandedCommandSha256': journal['expandedCommandSha256'],
        }
        if 'preExistingChunks' in journal:
            event['preExistingChunks'] = journal['preExistingChunks']
        if 'plannedBatches' in journal:
            event['plannedBatchCount'] = len(journal['plannedBatches'])
        if journal.get('batches'):
            batch = journal['batches'][-1]
            event['batch'] = {
                key: batch[key]
                for key in (
                    'index',
                    'status',
                    'completedGroupCount',
                    'activeGroupIndex',
                    'activeGroupResult',
                    'failedGroupIndex',
                    'ownedTemporaryChunks',
                    'releasedOwnedChunks',
                )
                if key in batch
            }
            if batch['status'] in ('load-intent', 'temporary-load-intent'):
                event['batch']['groupIndexes'] = batch['groupIndexes']
                event['batch']['requiredChunks'] = batch['requiredChunks']
                event['batch']['temporaryLoadIntent'] = batch.get(
                    'temporaryLoadIntent',
                    [],
                )
        journal_handle.write(
            json.dumps(event, sort_keys=True, separators=(',', ':')) + '\n'
        )
        journal_handle.flush()
        os.fsync(journal_handle.fileno())

    evaluation = empty_evaluation()
    stopped_at_first_failed_group = False
    execution_error = None
    failures = []
    force_load_audit = {
        'mode': 'exact-command-chunk-streaming',
        'serverLimit': SERVER_FORCELOAD_LIMIT,
        'preExistingChunks': [],
        'plannedBatchCount': 0,
        'completedBatchCount': 0,
        'maxTemporaryChunks': 0,
        'maximumForceLoadedChunkCount': 0,
        'allRequiredChunksLoadedBeforeCommands': True,
        'missingRequiredChunks': [],
        'ownedTemporaryChunks': [],
        'releasedTemporaryChunks': [],
        'restoredPreExistingChunks': 0,
        'cleanupErrors': [],
        'allTemporaryReleased': False,
        'finalChunks': [],
        'finalSetMatchesPreExistingSet': False,
    }
    before = set()
    all_owned = set()
    released_owned = set()
    rc = None
    batches = []
    t0 = time.time()
    executed_commands = 0

    def current_force_loads():
        return parse_force_load_chunks(rc.cmd('forceload query'))

    def restore_pre_existing():
        current = current_force_loads()
        restored = 0
        for chunk_x, chunk_z in sorted(before - current):
            reply = rc.cmd(
                f'forceload add {chunk_x * 16} {chunk_z * 16}'
            )
            if 'Marked' not in reply or reply.startswith('No chunks'):
                force_load_audit['cleanupErrors'].append(
                    f'failed restoring pre-existing chunk '
                    f'[{chunk_x},{chunk_z}]: {reply.strip()}'
                )
            else:
                restored += 1
        force_load_audit['restoredPreExistingChunks'] += restored

    def release_owned(owned):
        if a.keep_loaded:
            return
        for chunk_x, chunk_z in sorted(owned):
            reply = rc.cmd(
                f'forceload remove {chunk_x * 16} {chunk_z * 16}'
            )
            after_reply = current_force_loads()
            if (chunk_x, chunk_z) in after_reply:
                force_load_audit['cleanupErrors'].append(
                    f'failed releasing owned chunk [{chunk_x},{chunk_z}]: '
                    f'{reply.strip()}'
                )
            else:
                released_owned.add((chunk_x, chunk_z))
        restore_pre_existing()

    try:
        rc = Rcon(connect())
        before = current_force_loads()
        force_load_audit['preExistingChunks'] = [
            list(chunk) for chunk in sorted(before)
        ]
        force_load_audit['maximumForceLoadedChunkCount'] = len(before)
        batches = stream_group_batches(
            groups,
            expanded,
            before,
            capacity=SERVER_FORCELOAD_LIMIT,
        )
        force_load_audit['plannedBatchCount'] = len(batches)
        journal['preExistingChunks'] = [
            list(chunk) for chunk in sorted(before)
        ]
        journal['plannedBatches'] = batches
        journal['status'] = 'planned'
        persist_journal()

        for batch in batches:
            required = {
                tuple(chunk) for chunk in batch['requiredChunks']
            }
            batch_record = {
                'index': batch['index'],
                'groupIndexes': batch['groupIndexes'],
                'requiredChunks': batch['requiredChunks'],
                'status': 'load-intent',
                'completedGroupCount': 0,
                'possiblyAppliedGroupIndexes': batch['groupIndexes'],
                'ownedTemporaryChunks': [],
            }
            journal['batches'].append(batch_record)
            journal['status'] = 'executing'
            journal['activeBatchIndex'] = batch['index']
            persist_journal()

            current = current_force_loads()
            missing_pre_existing = before - current
            if missing_pre_existing:
                restore_pre_existing()
                current = current_force_loads()
            missing = required - current
            if len(current) + len(missing) > SERVER_FORCELOAD_LIMIT:
                raise RuntimeError(
                    f'batch {batch["index"]} exceeds live force-load capacity '
                    f'({len(current)} + {len(missing)} > '
                    f'{SERVER_FORCELOAD_LIMIT})'
                )

            owned = set()
            try:
                batch_record['temporaryLoadIntent'] = [
                    list(chunk) for chunk in sorted(missing)
                ]
                batch_record['status'] = 'temporary-load-intent'
                persist_journal()
                for chunk_x, chunk_z in sorted(missing):
                    reply = rc.cmd(
                        f'forceload add {chunk_x * 16} {chunk_z * 16}'
                    )
                    query = rc.cmd(
                        f'forceload query {chunk_x * 16} {chunk_z * 16}'
                    )
                    loaded = (
                        'is marked for force loading' in query.lower()
                        and 'not marked' not in query.lower()
                    )
                    added_by_runner = (
                        'Marked' in reply
                        and not reply.startswith('No chunks')
                    )
                    if added_by_runner:
                        # Record ownership before validating the follow-up
                        # query so an unknown query reply cannot leak a chunk
                        # that this process demonstrably marked.
                        owned.add((chunk_x, chunk_z))
                        all_owned.add((chunk_x, chunk_z))
                    if not loaded or not added_by_runner:
                        raise RuntimeError(
                            f'could not acquire exact chunk '
                            f'[{chunk_x},{chunk_z}]: {reply.strip()} / '
                            f'{query.strip()}'
                        )
                batch_record['ownedTemporaryChunks'] = [
                    list(chunk) for chunk in sorted(owned)
                ]
                force_load_audit['maxTemporaryChunks'] = max(
                    force_load_audit['maxTemporaryChunks'],
                    len(owned),
                )
                loaded_now = current_force_loads()
                force_load_audit['maximumForceLoadedChunkCount'] = max(
                    force_load_audit['maximumForceLoadedChunkCount'],
                    len(loaded_now),
                )
                missing_required = required - loaded_now
                if missing_required:
                    force_load_audit[
                        'allRequiredChunksLoadedBeforeCommands'
                    ] = False
                    force_load_audit['missingRequiredChunks'].extend(
                        list(chunk) for chunk in sorted(missing_required)
                    )
                    raise RuntimeError(
                        f'batch {batch["index"]} is missing required chunks'
                    )
                if len(loaded_now) > SERVER_FORCELOAD_LIMIT:
                    raise RuntimeError(
                        f'force-load server limit exceeded: {len(loaded_now)}'
                    )

                batch_record['status'] = 'commands-in-progress'
                persist_journal()
                for offset, group_index in enumerate(batch['groupIndexes']):
                    group = groups[group_index]
                    group_entries = expanded[
                        group['expandedStart']:group['expandedEnd']
                    ]
                    batch_record['status'] = 'group-intent'
                    batch_record['activeGroupIndex'] = group_index
                    batch_record.pop('activeGroupResult', None)
                    persist_journal()
                    replies = [
                        rc.cmd(entry['command'])
                        for entry in group_entries
                    ]
                    executed_commands += len(replies)
                    partial = evaluate_command_groups(
                        [group],
                        group_entries,
                        replies,
                        a.strict_noop,
                    )
                    merge_evaluation(evaluation, partial)
                    batch_record['completedGroupCount'] = offset + 1
                    batch_record['possiblyAppliedGroupIndexes'] = (
                        batch['groupIndexes'][offset + 1:]
                    )
                    batch_record['status'] = 'group-result'
                    batch_record['activeGroupResult'] = (
                        'failed'
                        if partial['failedGroups'] else 'passed'
                    )
                    persist_journal()
                    if partial['failedGroups']:
                        stopped_at_first_failed_group = True
                        batch_record['failedGroupIndex'] = group_index
                        break
                    if executed_commands % 400 < len(replies):
                        print(
                            f'  {executed_commands}/{len(cmds)} '
                            f'({(time.time() - t0) / max(executed_commands, 1):.3f}s '
                            'per command)'
                        )
            finally:
                release_owned(owned)
                batch_record['releasedOwnedChunks'] = [
                    list(chunk)
                    for chunk in sorted(owned & released_owned)
                ]
                batch_record['status'] = (
                    'failed-group-cleaned'
                    if stopped_at_first_failed_group
                    else 'completed-cleaned'
                )
                force_load_audit['completedBatchCount'] += (
                    0 if stopped_at_first_failed_group else 1
                )
                persist_journal()
            if stopped_at_first_failed_group:
                break
    except Exception as error:  # report and clean up every live safety failure
        execution_error = f'{type(error).__name__}: {error}'
        failures.append(execution_error)
        if rc is not None:
            try:
                release_owned(all_owned - released_owned)
            except Exception as cleanup_error:
                force_load_audit['cleanupErrors'].append(
                    f'{type(cleanup_error).__name__}: {cleanup_error}'
                )
    finally:
        if rc is not None:
            try:
                restore_pre_existing()
                final_chunks = current_force_loads()
                force_load_audit['finalChunks'] = [
                    list(chunk) for chunk in sorted(final_chunks)
                ]
                force_load_audit['finalSetMatchesPreExistingSet'] = (
                    final_chunks == before
                )
                force_load_audit['allTemporaryReleased'] = (
                    not bool(all_owned & final_chunks)
                    if not a.keep_loaded else False
                )
            except Exception as cleanup_error:
                force_load_audit['cleanupErrors'].append(
                    f'{type(cleanup_error).__name__}: {cleanup_error}'
                )
        force_load_audit['ownedTemporaryChunks'] = [
            list(chunk) for chunk in sorted(all_owned)
        ]
        force_load_audit['releasedTemporaryChunks'] = [
            list(chunk) for chunk in sorted(released_owned)
        ]
        journal['status'] = (
            'complete'
            if (
                execution_error is None
                and not stopped_at_first_failed_group
                and not force_load_audit['cleanupErrors']
                and force_load_audit['allTemporaryReleased']
                and force_load_audit['finalSetMatchesPreExistingSet']
            )
            else 'failed-or-interrupted'
        )
        journal.pop('activeBatchIndex', None)
        try:
            persist_journal()
        except Exception as journal_error:
            execution_error = execution_error or (
                f'journal finalization failed: {journal_error}'
            )
            failures.append(f'journal finalization failed: {journal_error}')
        finally:
            if journal_handle is not None:
                journal_handle.close()

    for failure in evaluation['groupFailures'][:8]:
        classifications = [
            item
            for alternative in failure['alternatives']
            for item in alternative['classifications']
        ]
        failures.append(
            f"line {failure['line']}: {failure['reason']} "
            f"({','.join(classifications)})"
        )
    audit_passed = (
        execution_error is None
        and not force_load_audit['cleanupErrors']
        and force_load_audit['allRequiredChunksLoadedBeforeCommands']
        and force_load_audit['allTemporaryReleased']
        and force_load_audit['finalSetMatchesPreExistingSet']
        and force_load_audit['maximumForceLoadedChunkCount']
        <= SERVER_FORCELOAD_LIMIT
    )
    bad = evaluation['failedGroups']
    status = (
        'complete'
        if bad == 0
        and not stopped_at_first_failed_group
        and executed_commands == len(cmds)
        and audit_passed
        else 'failed'
    )
    journal_hash = (
        file_sha256(journal_path)
        if os.path.exists(journal_path)
        else None
    )
    dt = time.time() - t0
    print(
        f'\n  {evaluation["successfulGroups"]} groups passed, '
        f'{bad} groups FAILED; {evaluation["successfulCommands"]} changed, '
        f'{evaluation["noopCommands"]} no-op in {dt:.0f}s'
    )
    for failure in failures[:8]:
        print(f'    {failure}')
    write_report(
        status,
        successfulCommands=evaluation['successfulCommands'],
        noopCommands=evaluation['noopCommands'],
        unknownReplyCommands=evaluation['unknownReplyCommands'],
        expectedAlternativeNoopCommands=(
            evaluation['expectedAlternativeNoopCommands']
        ),
        toleratedNonStrictNoopCommands=(
            evaluation['toleratedNonStrictNoopCommands']
        ),
        unexpectedNoopCommands=evaluation['unexpectedNoopCommands'],
        successfulGroups=evaluation['successfulGroups'],
        failedGroups=evaluation['failedGroups'],
        unionMatches=evaluation['unionMatches'],
        policyTransitionMatches=evaluation['policyTransitionMatches'],
        groupFailures=evaluation['groupFailures'],
        failedCommands=bad + (1 if execution_error else 0),
        executedCommandCount=executed_commands,
        stoppedAtFirstFailedGroup=stopped_at_first_failed_group,
        forceLoadAudit=force_load_audit,
        streamJournal=os.path.abspath(journal_path),
        streamJournalSha256=journal_hash,
        durationSeconds=round(time.time() - started_at, 3),
        failures=failures,
    )
    return 0 if status == 'complete' else 1


if __name__ == '__main__':
    sys.exit(main())
