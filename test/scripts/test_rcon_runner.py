import importlib.util
import json
import pathlib
import subprocess
import sys
import tempfile
import unittest
from unittest import mock


ROOT = pathlib.Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location(
    'rcon_runner',
    ROOT / 'scripts' / 'rcon_runner.py',
)
RCON_RUNNER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(RCON_RUNNER)

SNAPSHOT = (
    'minecraft:birch_fence['
    'east=true,north=false,south=false,waterlogged=false,west=true]'
)
RUNTIME = (
    'minecraft:birch_fence['
    'east=false,north=false,south=false,waterlogged=false,west=true]'
)
SUCCESS = 'Successfully filled 1 block'
NOOP = 'No blocks were filled'
UNKNOWN = 'Unknown or incomplete command'


def force_load_reply(chunks):
    coordinates = ', '.join(
        f'[{chunk_x}, {chunk_z}]'
        for chunk_x, chunk_z in sorted(chunks)
    )
    return (
        f'{len(chunks)} chunks are marked for force loading: {coordinates}'
        if chunks
        else 'No force loaded chunks were found'
    )


PAPER_FORCE_LOAD_REPLY = (
    '104 force loaded chunks were found in minecraft:overworld at: '
    '[-10, -29], [0, -21], [-2, -19]'
)


class FakeRcon:
    """Small stateful Paper/RCON double; it never opens a network connection."""

    def __init__(
        self,
        initial_force_loads=(),
        replies=None,
        remove_pre_existing_after_first_world_command=None,
    ):
        self.initial_force_loads = set(initial_force_loads)
        self.force_loads = set(initial_force_loads)
        self.replies = replies or {}
        self.remove_pre_existing_after_first_world_command = (
            remove_pre_existing_after_first_world_command
        )
        self.commands = []
        self.world_commands = []
        self.max_force_load_count = len(self.force_loads)
        self.world_command_force_loads = []
        self._world_command_count = 0

    @staticmethod
    def _chunk_range(parts):
        x1, z1 = int(parts[2]), int(parts[3])
        x2, z2 = (
            (int(parts[4]), int(parts[5]))
            if len(parts) == 6
            else (x1, z1)
        )
        return {
            (chunk_x, chunk_z)
            for chunk_x in range(min(x1, x2) // 16, max(x1, x2) // 16 + 1)
            for chunk_z in range(min(z1, z2) // 16, max(z1, z2) // 16 + 1)
        }

    def cmd(self, command):
        self.commands.append(command)
        parts = command.split()
        if command == 'forceload query':
            return force_load_reply(self.force_loads)
        if parts[:2] == ['forceload', 'query'] and len(parts) == 4:
            chunk = (int(parts[2]) // 16, int(parts[3]) // 16)
            if chunk in self.force_loads:
                return (
                    f'Chunk at [{chunk[0]}, {chunk[1]}] is marked '
                    'for force loading'
                )
            return (
                f'Chunk at [{chunk[0]}, {chunk[1]}] is not marked '
                'for force loading'
            )
        if parts[:2] == ['forceload', 'add']:
            self.force_loads.update(self._chunk_range(parts))
            self.max_force_load_count = max(
                self.max_force_load_count,
                len(self.force_loads),
            )
            return 'Marked chunk(s) for force loading'
        if parts[:2] == ['forceload', 'remove']:
            self.force_loads.difference_update(self._chunk_range(parts))
            return 'Chunk(s) are no longer force loaded'

        self.world_commands.append(command)
        self.world_command_force_loads.append(set(self.force_loads))
        self._world_command_count += 1
        if (
            self._world_command_count == 1
            and self.remove_pre_existing_after_first_world_command is not None
        ):
            self.force_loads.discard(
                self.remove_pre_existing_after_first_world_command
            )
        reply = self.replies.get(command, SUCCESS)
        return reply(command) if callable(reply) else reply


def run_main_with_fake_rcon(operation_text, fake, *arguments):
    with tempfile.TemporaryDirectory() as directory:
        operation_path = pathlib.Path(directory) / 'operations.txt'
        report_path = pathlib.Path(directory) / 'report.json'
        operation_path.write_text(operation_text, encoding='utf-8')
        argv = [
            'rcon_runner.py',
            str(operation_path),
            '--report',
            str(report_path),
            *arguments,
        ]
        fake_client = mock.Mock()
        with (
            mock.patch.object(sys, 'argv', argv),
            mock.patch.object(RCON_RUNNER, 'connect', return_value=fake_client),
            mock.patch.object(RCON_RUNNER, 'Rcon', return_value=fake),
            mock.patch.object(RCON_RUNNER.time, 'sleep', return_value=None),
        ):
            return_code = RCON_RUNNER.main()
        report = json.loads(report_path.read_text(encoding='utf-8'))
    return return_code, report


def union_plan():
    operation = (
        7,
        [
            'REPL',
            '120', '65', '231', '120', '65', '231',
            f'{SNAPSHOT},{RUNTIME}',
            'minecraft:air',
        ],
    )
    groups, expanded, leftover = RCON_RUNNER.command_plan([operation])
    return groups, expanded, leftover


class RconRunnerFiniteUnionTest(unittest.TestCase):
    def test_exact_point_transition_policy_partitions_without_fuzzy_box_mask(self):
        operation = (
            7,
            [
                'REPL',
                '1', '64', '1', '3', '64', '1',
                'minecraft:cut_copper',
                'minecraft:air',
            ],
        )
        policy = {
            'ruleByLine': {
                7: {
                    'id': 'one-observed-point',
                    'canonicalSource': 'minecraft:cut_copper',
                    'allowedActualStates': [
                        'minecraft:exposed_cut_copper',
                    ],
                    'points': [[3, 64, 1]],
                },
            },
        }
        groups, expanded, leftover = RCON_RUNNER.command_plan(
            [operation],
            policy,
        )
        self.assertEqual(leftover, [])
        self.assertTrue(groups[0]['policyTransition'])
        self.assertEqual(
            [entry['command'] for entry in expanded],
            [
                'fill 1 64 1 1 64 1 minecraft:air '
                'replace minecraft:cut_copper strict',
                'fill 2 64 1 2 64 1 minecraft:air '
                'replace minecraft:cut_copper strict',
                'fill 3 64 1 3 64 1 minecraft:air '
                'replace minecraft:cut_copper strict',
                'fill 3 64 1 3 64 1 minecraft:air '
                'replace minecraft:exposed_cut_copper strict',
            ],
        )
        accepted = RCON_RUNNER.evaluate_command_groups(
            groups,
            expanded,
            [SUCCESS, SUCCESS, NOOP, SUCCESS],
            strict_noop=True,
        )
        self.assertEqual(accepted['failedGroups'], 0)
        self.assertEqual(
            accepted['policyTransitionMatches'][0]['segments'][0]['state'],
            'minecraft:exposed_cut_copper',
        )
        undeclared_point = RCON_RUNNER.evaluate_command_groups(
            groups,
            expanded,
            [SUCCESS, NOOP, NOOP, SUCCESS],
            strict_noop=True,
        )
        self.assertEqual(undeclared_point['failedGroups'], 1)
        self.assertIn(
            'strict-noop',
            undeclared_point['groupFailures'][0]['reason'],
        )
        undeclared_state = RCON_RUNNER.evaluate_command_groups(
            groups,
            expanded,
            [SUCCESS, SUCCESS, NOOP, NOOP],
            strict_noop=True,
        )
        self.assertEqual(undeclared_state['failedGroups'], 1)
        self.assertIn(
            'no-alternative-matched',
            undeclared_state['groupFailures'][0]['reason'],
        )

    def test_forward_plan_is_byte_for_byte_unchanged_without_opt_in_policy(self):
        operation = (
            9,
            [
                'REPL',
                '1', '64', '1', '2', '64', '1',
                'minecraft:cut_copper',
                'minecraft:air',
            ],
        )
        groups, expanded, leftover = RCON_RUNNER.command_plan([operation])
        self.assertEqual(leftover, [])
        self.assertFalse(groups[0].get('policyTransition', False))
        self.assertEqual([entry['command'] for entry in expanded], [
            'fill 1 64 1 2 64 1 minecraft:air '
            'replace minecraft:cut_copper strict',
        ])

    def test_parser_preserves_property_commas_and_splits_top_level_union(self):
        self.assertEqual(
            RCON_RUNNER.split_masks(f'{SNAPSHOT},{RUNTIME}'),
            [SNAPSHOT, RUNTIME],
        )
        groups, expanded, leftover = union_plan()
        self.assertEqual(leftover, [])
        self.assertEqual(len(groups), 1)
        self.assertTrue(groups[0]['finiteUnion'])
        self.assertEqual(
            [item['state'] for item in groups[0]['alternatives']],
            [SNAPSHOT, RUNTIME],
        )
        self.assertEqual(len(expanded), 2)
        self.assertTrue(all(
            item['command'].endswith(' strict')
            for item in expanded
        ))

    def test_property_order_semantic_noop_is_rejected_before_connection(self):
        source = (
            'minecraft:smooth_quartz_stairs['
            'facing=south,half=bottom,shape=straight,waterlogged=false]'
        )
        replacement = (
            'minecraft:smooth_quartz_stairs['
            'waterlogged=false,facing=south,half=bottom,shape=straight]'
        )
        with tempfile.TemporaryDirectory() as tmp:
            operation_path = pathlib.Path(tmp) / 'semantic-noop.txt'
            operation_path.write_text(
                f'REPL 1 2 3 1 2 3 {source} {replacement}\n',
                encoding='utf-8',
            )
            with (
                mock.patch.object(
                    sys,
                    'argv',
                    ['rcon_runner.py', str(operation_path), '--strict-noop'],
                ),
                mock.patch.object(RCON_RUNNER, 'connect') as connect_mock,
            ):
                with self.assertRaisesRegex(
                    ValueError,
                    r'line 1: REPL replacement .* semantically identical',
                ):
                    RCON_RUNNER.main()
            connect_mock.assert_not_called()

    def test_exact_and_union_semantic_noops_are_rejected(self):
        with self.assertRaisesRegex(
            ValueError,
            r'line 13: REPL replacement minecraft:stone is semantically identical',
        ):
            RCON_RUNNER.command_plan([(
                13,
                [
                    'REPL',
                    '1', '2', '3', '1', '2', '3',
                    'minecraft:stone',
                    'minecraft:stone',
                ],
            )])

        with self.assertRaisesRegex(
            ValueError,
            r'line 14: REPL replacement minecraft:dirt is semantically identical',
        ):
            RCON_RUNNER.command_plan([(
                14,
                [
                    'REPL',
                    '1', '2', '3', '1', '2', '3',
                    'minecraft:stone,minecraft:dirt',
                    'minecraft:dirt',
                ],
            )])

    def test_genuinely_different_block_state_remains_executable(self):
        source = (
            'minecraft:smooth_quartz_stairs['
            'facing=south,half=bottom,shape=straight,waterlogged=false]'
        )
        replacement = (
            'minecraft:smooth_quartz_stairs['
            'waterlogged=false,facing=north,half=bottom,shape=straight]'
        )
        groups, expanded, leftover = RCON_RUNNER.command_plan([(
            12,
            [
                'REPL',
                '1', '2', '3', '1', '2', '3',
                source,
                replacement,
            ],
        )])

        self.assertEqual(leftover, [])
        self.assertEqual(len(groups), 1)
        self.assertEqual([entry['command'] for entry in expanded], [
            f'fill 1 2 3 1 2 3 {replacement} replace {source} strict',
        ])

    def test_exactly_one_union_alternative_may_change(self):
        groups, expanded, _ = union_plan()
        result = RCON_RUNNER.evaluate_command_groups(
            groups,
            expanded,
            [NOOP, SUCCESS],
            strict_noop=True,
        )
        self.assertEqual(result['successfulGroups'], 1)
        self.assertEqual(result['failedGroups'], 0)
        self.assertEqual(result['expectedAlternativeNoopCommands'], 1)
        self.assertEqual(result['unexpectedNoopCommands'], 0)
        self.assertEqual(result['unionMatches'], [{
            'groupIndex': 0,
            'line': 7,
            'alternativeIndex': 1,
            'state': RUNTIME,
        }])

    def test_all_union_alternatives_noop_fails_closed(self):
        groups, expanded, _ = union_plan()
        result = RCON_RUNNER.evaluate_command_groups(
            groups,
            expanded,
            [NOOP, NOOP],
            strict_noop=True,
        )
        self.assertEqual(result['successfulGroups'], 0)
        self.assertEqual(result['failedGroups'], 1)
        self.assertEqual(
            result['groupFailures'][0]['reason'],
            'no-alternative-matched',
        )
        self.assertEqual(result['unexpectedNoopCommands'], 2)

    def test_two_successful_union_alternatives_fail_closed(self):
        groups, expanded, _ = union_plan()
        result = RCON_RUNNER.evaluate_command_groups(
            groups,
            expanded,
            [SUCCESS, SUCCESS],
            strict_noop=True,
        )
        self.assertEqual(result['failedGroups'], 1)
        self.assertEqual(
            result['groupFailures'][0]['reason'],
            'multiple-alternatives-matched',
        )
        self.assertEqual(result['unionMatches'], [])

    def test_unknown_union_reply_fails_closed(self):
        groups, expanded, _ = union_plan()
        result = RCON_RUNNER.evaluate_command_groups(
            groups,
            expanded,
            [UNKNOWN, NOOP],
            strict_noop=True,
        )
        self.assertEqual(result['unknownReplyCommands'], 1)
        self.assertEqual(result['failedGroups'], 1)
        self.assertEqual(
            result['groupFailures'][0]['reason'],
            'unknown-reply',
        )

    def test_single_mask_strict_behavior_is_preserved(self):
        groups, expanded, leftover = RCON_RUNNER.command_plan([(
            11,
            [
                'REPL',
                '1', '2', '3', '1', '2', '3',
                'minecraft:stone',
                'minecraft:air',
            ],
        )])
        self.assertEqual(leftover, [])
        success = RCON_RUNNER.evaluate_command_groups(
            groups,
            expanded,
            [SUCCESS],
            strict_noop=True,
        )
        self.assertEqual(success['successfulGroups'], 1)
        self.assertEqual(success['failedGroups'], 0)

        strict_noop = RCON_RUNNER.evaluate_command_groups(
            groups,
            expanded,
            [NOOP],
            strict_noop=True,
        )
        self.assertEqual(strict_noop['failedGroups'], 1)
        self.assertEqual(strict_noop['unexpectedNoopCommands'], 1)
        self.assertEqual(
            strict_noop['groupFailures'][0]['reason'],
            'strict-noop',
        )

        tolerated_noop = RCON_RUNNER.evaluate_command_groups(
            groups,
            expanded,
            [NOOP],
            strict_noop=False,
        )
        self.assertEqual(tolerated_noop['successfulGroups'], 1)
        self.assertEqual(tolerated_noop['failedGroups'], 0)
        self.assertEqual(tolerated_noop['toleratedNonStrictNoopCommands'], 1)

    def test_empty_conditional_command_reply_is_a_recognized_noop(self):
        command = (
            'execute if block 1 2 3 minecraft:stone run '
            'data merge block 1 2 3 {keepPacked:0b}'
        )
        groups, expanded, leftover = RCON_RUNNER.command_plan([(
            12,
            ['CMD', *command.split()],
        )])
        self.assertEqual(leftover, [])

        strict = RCON_RUNNER.evaluate_command_groups(
            groups,
            expanded,
            [''],
            strict_noop=True,
        )
        self.assertEqual(strict['failedGroups'], 1)
        self.assertEqual(strict['unknownReplyCommands'], 0)
        self.assertEqual(strict['unexpectedNoopCommands'], 1)
        self.assertEqual(
            strict['groupFailures'][0]['reason'],
            'strict-noop',
        )

        rollback = RCON_RUNNER.evaluate_command_groups(
            groups,
            expanded,
            [''],
            strict_noop=False,
        )
        self.assertEqual(rollback['successfulGroups'], 1)
        self.assertEqual(rollback['failedGroups'], 0)
        self.assertEqual(rollback['unknownReplyCommands'], 0)
        self.assertEqual(
            rollback['toleratedNonStrictNoopCommands'],
            1,
        )

    def test_empty_fill_reply_still_fails_closed(self):
        groups, expanded, _ = RCON_RUNNER.command_plan([(
            13,
            [
                'REPL',
                '1', '2', '3', '1', '2', '3',
                'minecraft:stone',
                'minecraft:air',
            ],
        )])
        result = RCON_RUNNER.evaluate_command_groups(
            groups,
            expanded,
            [''],
            strict_noop=False,
        )
        self.assertEqual(result['failedGroups'], 1)
        self.assertEqual(result['unknownReplyCommands'], 1)
        self.assertEqual(
            result['groupFailures'][0]['reason'],
            'unknown-reply',
        )

    def test_dry_run_reports_group_and_expanded_plan_hashes(self):
        with tempfile.TemporaryDirectory() as directory:
            operations = pathlib.Path(directory) / 'union.txt'
            report = pathlib.Path(directory) / 'report.json'
            operations.write_text(
                'REPL 120 65 231 120 65 231 '
                f'{SNAPSHOT},{RUNTIME} minecraft:air\n',
                encoding='utf-8',
            )
            subprocess.run(
                [
                    sys.executable,
                    str(ROOT / 'scripts' / 'rcon_runner.py'),
                    str(operations),
                    '--dry-run',
                    '--strict-noop',
                    '--report',
                    str(report),
                ],
                cwd=ROOT,
                check=True,
                capture_output=True,
                text=True,
            )
            evidence = json.loads(report.read_text(encoding='utf-8'))
        self.assertEqual(evidence['schemaVersion'], 2)
        self.assertEqual(evidence['sourceOperationCount'], 1)
        self.assertEqual(evidence['sourceGroupCount'], 1)
        self.assertEqual(evidence['commandCount'], 2)
        self.assertEqual(evidence['expandedCommandCount'], 2)
        self.assertEqual(evidence['finiteUnionGroupCount'], 1)
        self.assertEqual(len(evidence['sourceGroups']), 1)
        self.assertEqual(len(evidence['expandedCommands']), 2)
        for field in (
            'operationSha256',
            'sourceGroupPlanSha256',
            'expandedCommandSha256',
        ):
            self.assertRegex(evidence[field], r'^[0-9a-f]{64}$')


class RconRunnerExactChunkStreamingTest(unittest.TestCase):
    def test_parses_paper_force_loaded_chunks_were_found_reply(self):
        self.assertEqual(
            RCON_RUNNER.parse_force_load_chunks(PAPER_FORCE_LOAD_REPLY),
            {(-10, -29), (0, -21), (-2, -19)},
        )

    def test_unknown_whole_force_load_query_fails_closed(self):
        with self.assertRaisesRegex(ValueError, 'unrecognized'):
            RCON_RUNNER.parse_force_load_chunks(
                'Plugin intercepted command unexpectedly'
            )

    def test_unknown_exact_force_load_query_cleans_acquired_chunk(self):
        class UnknownExactQueryRcon(FakeRcon):
            def cmd(self, command):
                parts = command.split()
                if (
                    parts[:2] == ['forceload', 'query']
                    and len(parts) == 4
                ):
                    self.commands.append(command)
                    return 'Plugin intercepted command unexpectedly'
                return super().cmd(command)

        fake = UnknownExactQueryRcon()
        return_code, report = run_main_with_fake_rcon(
            'SET 16000 64 0 16000 64 0 minecraft:stone\n',
            fake,
            '--strict-noop',
        )
        self.assertEqual(return_code, 1)
        self.assertEqual(fake.world_commands, [])
        self.assertEqual(fake.force_loads, set())
        self.assertTrue(report['forceLoadAudit']['allTemporaryReleased'])
        self.assertTrue(
            report['forceLoadAudit']['finalSetMatchesPreExistingSet']
        )

    def test_dry_run_rejects_blocked_legacy_material(self):
        with tempfile.TemporaryDirectory() as directory:
            operation_path = pathlib.Path(directory) / 'operations.txt'
            report_path = pathlib.Path(directory) / 'report.json'
            operation_path.write_text(
                'SET 0 64 0 0 64 0 minecraft:chain[axis=y]\n',
                encoding='utf-8',
            )
            result = subprocess.run(
                [
                    sys.executable,
                    str(ROOT / 'scripts' / 'rcon_runner.py'),
                    str(operation_path),
                    '--dry-run',
                    '--strict-noop',
                    '--report',
                    str(report_path),
                ],
                cwd=ROOT,
                check=False,
                capture_output=True,
                text=True,
            )
            report = json.loads(report_path.read_text(encoding='utf-8'))
        self.assertEqual(result.returncode, 1)
        self.assertEqual(report['status'], 'dry_run_failed')
        self.assertEqual(report['worldEditLeftoverCount'], 1)

    def test_cmd_with_unparsed_tail_fails_closed_before_rcon(self):
        command = (
            'execute if block 0 64 0 minecraft:stone run '
            'summon minecraft:pig 1600 64 1600'
        )
        groups, expanded, leftover = RCON_RUNNER.command_plan([(
            1,
            ['CMD', *command.split()],
        )])
        self.assertEqual(leftover, [])
        self.assertTrue(groups[0]['unsupportedCoordinateGrammar'])
        self.assertEqual(
            set(map(tuple, expanded[0]['chunks'])),
            {(0, 0)},
        )

    def test_sparse_source_groups_share_batch_under_remaining_capacity(self):
        operations = [
            (
                1,
                [
                    'SET',
                    '16000', '64', '16000', '16000', '64', '16000',
                    'minecraft:stone',
                ],
            ),
            (
                2,
                [
                    'SET',
                    '-16000', '64', '-16000', '-16000', '64', '-16000',
                    'minecraft:stone',
                ],
            ),
        ]
        groups, expanded, leftover = RCON_RUNNER.command_plan(operations)
        self.assertEqual(leftover, [])
        self.assertEqual(
            [set(map(tuple, entry['chunks'])) for entry in expanded],
            [{(1000, 1000)}, {(-1000, -1000)}],
        )
        pre_existing = {(chunk_x, -50) for chunk_x in range(254)}
        batches = RCON_RUNNER.stream_group_batches(
            groups,
            expanded,
            pre_existing,
            capacity=256,
        )
        self.assertEqual(len(batches), 1)
        self.assertEqual(batches[0]['groupIndexes'], [0, 1])
        self.assertEqual(
            set(map(tuple, batches[0]['requiredChunks'])),
            {(1000, 1000), (-1000, -1000)},
        )
        self.assertEqual(
            set(map(tuple, batches[0]['temporaryChunks'])),
            {(1000, 1000), (-1000, -1000)},
        )

    def test_cmd_extracts_every_absolute_block_coordinate_chunk(self):
        command = (
            'execute if block 0 64 0 minecraft:stone '
            'if block 31 65 -17 minecraft:air run '
            'data merge block 64 66 47 {CustomName:\'"gate"\'}'
        )
        self.assertEqual(
            RCON_RUNNER.command_touched_chunks(command),
            {(0, 0), (1, -2), (4, 2)},
        )
        groups, expanded, leftover = RCON_RUNNER.command_plan([(
            8,
            ['CMD', *command.split()],
        )])
        self.assertEqual(leftover, [])
        self.assertEqual(len(groups), 1)
        self.assertEqual(
            set(map(tuple, expanded[0]['chunks'])),
            {(0, 0), (1, -2), (4, 2)},
        )

    def test_batches_never_exceed_remaining_force_load_capacity(self):
        operations = [
            (
                line,
                [
                    'SET',
                    str(chunk_x * 16), '64', '0',
                    str(chunk_x * 16), '64', '0',
                    'minecraft:stone',
                ],
            )
            for line, chunk_x in enumerate((1000, 1001, 1002), start=1)
        ]
        groups, expanded, _ = RCON_RUNNER.command_plan(operations)
        pre_existing = {(chunk_x, -50) for chunk_x in range(254)}
        batches = RCON_RUNNER.stream_group_batches(
            groups,
            expanded,
            pre_existing,
            capacity=256,
        )
        self.assertEqual(
            [len(batch['temporaryChunks']) for batch in batches],
            [2, 1],
        )
        self.assertTrue(all(
            len(pre_existing) + len(batch['temporaryChunks']) <= 256
            for batch in batches
        ))

    def test_group_larger_than_remaining_capacity_fails_closed(self):
        groups, expanded, _ = RCON_RUNNER.command_plan([(
            1,
            [
                'SET',
                '16000', '64', '0', '16032', '64', '0',
                'minecraft:stone',
            ],
        )])
        pre_existing = {(chunk_x, -50) for chunk_x in range(254)}
        with self.assertRaisesRegex(ValueError, 'capacity'):
            RCON_RUNNER.stream_group_batches(
                groups,
                expanded,
                pre_existing,
                capacity=256,
            )

    def test_strict_failure_stops_later_groups_and_cleans_owned_chunks(self):
        first = 'fill 16000 64 0 16000 64 0 minecraft:stone strict'
        second = 'fill 16016 64 0 16016 64 0 minecraft:stone strict'
        third = 'fill 16032 64 0 16032 64 0 minecraft:stone strict'
        pre_existing = {(chunk_x, -50) for chunk_x in range(254)}
        fake = FakeRcon(
            pre_existing,
            replies={
                first: SUCCESS,
                second: NOOP,
                third: SUCCESS,
            },
        )
        return_code, report = run_main_with_fake_rcon(
            '\n'.join([
                'SET 16000 64 0 16000 64 0 minecraft:stone',
                'SET 16016 64 0 16016 64 0 minecraft:stone',
                'SET 16032 64 0 16032 64 0 minecraft:stone',
                '',
            ]),
            fake,
            '--strict-noop',
        )
        self.assertEqual(return_code, 1)
        self.assertEqual(fake.world_commands, [first, second])
        self.assertNotIn(third, fake.commands)
        self.assertLessEqual(fake.max_force_load_count, 256)
        self.assertEqual(fake.force_loads, pre_existing)
        self.assertEqual(report['schemaVersion'], 3)
        self.assertTrue(report['stoppedAtFirstFailedGroup'])
        self.assertEqual(report['failedGroups'], 1)
        self.assertEqual(report['forceLoadAudit']['serverLimit'], 256)
        self.assertTrue(report['forceLoadAudit']['allTemporaryReleased'])
        self.assertTrue(
            report['forceLoadAudit']['finalSetMatchesPreExistingSet']
        )

    def test_cleanup_restores_lost_original_and_removes_only_owned_chunks(self):
        preserved = (7, 9)
        pre_existing = {preserved}
        fake = FakeRcon(
            pre_existing,
            remove_pre_existing_after_first_world_command=preserved,
        )
        return_code, report = run_main_with_fake_rcon(
            'SET 16000 64 16000 16000 64 16000 minecraft:stone\n',
            fake,
            '--strict-noop',
        )
        self.assertEqual(return_code, 0)
        self.assertEqual(fake.force_loads, pre_existing)
        self.assertTrue(any(
            command.startswith('forceload remove 16000 16000')
            for command in fake.commands
        ))
        self.assertIn(
            f'forceload add {preserved[0] * 16} {preserved[1] * 16}',
            fake.commands,
        )
        audit = report['forceLoadAudit']
        self.assertEqual(audit['mode'], 'exact-command-chunk-streaming')
        self.assertEqual(audit['preExistingChunks'], [[7, 9]])
        self.assertEqual(audit['maxTemporaryChunks'], 1)
        self.assertTrue(audit['allTemporaryReleased'])
        self.assertTrue(audit['finalSetMatchesPreExistingSet'])


if __name__ == '__main__':
    unittest.main()
