import copy
import importlib.util
import io
import json
import pathlib
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from unittest import mock


ROOT = pathlib.Path(__file__).resolve().parents[2]


def load_module(name, relative):
    spec = importlib.util.spec_from_file_location(name, ROOT / relative)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


LIVE_GATE = load_module(
    'redevelopment_live_entity_gate',
    'scripts/redevelopment_live_entity_gate.py',
)
ATOMIC_RELEASE = load_module(
    'run_redevelopment_atomic_release_sparse_gate',
    'scripts/run_redevelopment_atomic_release.py',
)


class SparseEntityGateTest(unittest.TestCase):
    def test_ambient_bat_is_nonblocking_only_when_verified_and_unspecial(self):
        boxes = [{'line': 4, 'box': [32, 45, 278, 32, 46, 279]}]
        bat = {
            'category': 'non-player',
            'label': 'Bat',
            'position': [33.6093, 48.1, 279.783],
            'nbtCapture': {
                'entityType': 'minecraft:bat',
                'capturedId': 'minecraft:bat',
                'capturedPosition': [33.5, 48.0, 279.75],
                'identityChecksPassed': True,
                'preservationPaths': {
                    'CustomName': {'present': False, 'reply': 'not found'},
                    'PersistenceRequired': {
                        'present': True,
                        'reply': (
                            'Bat has the following entity data: 0b'
                        ),
                    },
                    'Tags': {'present': False, 'reply': 'not found'},
                },
                'vehicleRelationPresent': False,
                'passengerRelationPresent': False,
            },
        }
        evidence = LIVE_GATE.protected_nonblocking_evidence(bat, boxes)
        self.assertEqual(
            evidence['policy'],
            'ambient-unattached-bat-outside-exact-target',
        )
        for path, value in (
            ('CustomName', '"Protected Bat"'),
            ('PersistenceRequired', '1b'),
            ('Tags', '["protected"]'),
        ):
            special = copy.deepcopy(bat)
            special['nbtCapture']['preservationPaths'][path] = {
                'present': True,
                'reply': f'Bat has the following entity data: {value}',
            }
            self.assertIsNone(
                LIVE_GATE.protected_nonblocking_evidence(special, boxes)
            )
        attached = copy.deepcopy(bat)
        attached['nbtCapture']['vehicleRelationPresent'] = True
        self.assertIsNone(
            LIVE_GATE.protected_nonblocking_evidence(attached, boxes)
        )
        moved_onto_target = copy.deepcopy(bat)
        moved_onto_target['nbtCapture']['capturedPosition'] = [
            32.5,
            45.5,
            278.5,
        ]
        self.assertIsNone(
            LIVE_GATE.protected_nonblocking_evidence(
                moved_onto_target,
                boxes,
            )
        )
        wrong_identity = copy.deepcopy(bat)
        wrong_identity['nbtCapture']['capturedId'] = 'minecraft:bee'
        self.assertIsNone(
            LIVE_GATE.protected_nonblocking_evidence(
                wrong_identity,
                boxes,
            )
        )

    def test_home_linked_bee_is_nonblocking_only_when_halo_only_and_hive_safe(self):
        boxes = [{'line': 17, 'box': [806, 72, -581, 806, 72, -575]}]
        bee = {
            'category': 'non-player',
            'label': 'Bee',
            'position': [806.65, 74.17, -574.71],
            'nbtCapture': {
                'entityType': 'minecraft:bee',
                'capturedId': 'minecraft:bee',
                'capturedPosition': [806.65, 74.17, -574.71],
                'identityChecksPassed': True,
                'preservationPaths': {
                    'hive_pos': {
                        'present': True,
                        'reply': (
                            'Bee has the following entity data: '
                            '[I; 805, 73, -580]'
                        ),
                    },
                },
                'homeHiveBlockProbeReplies': {
                    'minecraft:bee_nest': 'Test passed',
                    'minecraft:beehive': 'Test failed',
                },
            },
        }
        evidence = LIVE_GATE.protected_nonblocking_evidence(bee, boxes)
        self.assertEqual(
            evidence['policy'],
            'home-linked-bee-outside-exact-target',
        )
        self.assertEqual(evidence['homeHive'], [805, 73, -580])
        direct = copy.deepcopy(bee)
        direct['position'] = [806.5, 72.5, -580.5]
        self.assertIsNone(
            LIVE_GATE.protected_nonblocking_evidence(direct, boxes)
        )
        hive_targeted = [
            *boxes,
            {'line': 18, 'box': [805, 73, -580, 805, 73, -580]},
        ]
        self.assertIsNone(
            LIVE_GATE.protected_nonblocking_evidence(bee, hive_targeted)
        )

    def test_home_linked_bee_requires_verified_identity_and_newer_position(self):
        boxes = [{'line': 17, 'box': [806, 72, -581, 806, 72, -575]}]
        bee = {
            'category': 'non-player',
            'label': 'Bee',
            'position': [806.65, 74.17, -574.71],
            'nbtCapture': {
                'entityType': 'minecraft:bee',
                'capturedId': 'minecraft:bee',
                'capturedPosition': [806.65, 74.17, -574.71],
                'identityChecksPassed': True,
                'preservationPaths': {
                    'hive_pos': {
                        'present': True,
                        'reply': (
                            'Bee has the following entity data: '
                            '[I; 805, 73, -580]'
                        ),
                    },
                },
                'homeHiveBlockProbeReplies': {
                    'minecraft:bee_nest': 'Test passed',
                    'minecraft:beehive': 'Test failed',
                },
            },
        }
        identity_failed = copy.deepcopy(bee)
        identity_failed['nbtCapture']['identityChecksPassed'] = False
        self.assertIsNone(
            LIVE_GATE.protected_nonblocking_evidence(
                identity_failed,
                boxes,
            )
        )
        wrong_type = copy.deepcopy(bee)
        wrong_type['nbtCapture']['capturedId'] = 'minecraft:chicken'
        self.assertIsNone(
            LIVE_GATE.protected_nonblocking_evidence(wrong_type, boxes)
        )
        moved_onto_target = copy.deepcopy(bee)
        moved_onto_target['nbtCapture']['capturedPosition'] = [
            806.5,
            72.5,
            -580.5,
        ]
        self.assertIsNone(
            LIVE_GATE.protected_nonblocking_evidence(
                moved_onto_target,
                boxes,
            )
        )
        ambiguous_probe = copy.deepcopy(bee)
        ambiguous_probe['nbtCapture']['homeHiveBlockProbeReplies'][
            'minecraft:bee_nest'
        ] = 'Not passed through an unrelated parser'
        self.assertIsNone(
            LIVE_GATE.protected_nonblocking_evidence(
                ambiguous_probe,
                boxes,
            )
        )

    def test_expired_egg_requires_confirmed_four_block_absence(self):
        egg = {
            'category': 'non-player',
            'label': 'Egg',
            'position': [10.5, 64.5, 10.5],
            'nbtCaptureError': (
                'NBT capture found no minecraft:egg within 1 blocks'
            ),
            'transientAbsenceProof': {
                'entityType': 'minecraft:egg',
                'radius': 4.0,
                'confirmedCount': 0,
            },
        }
        evidence = LIVE_GATE.protected_nonblocking_evidence(
            egg,
            [{'line': 1, 'box': [10, 64, 10, 10, 64, 10]}],
        )
        self.assertEqual(evidence['policy'], 'expired-transient-projectile')
        unsafe = copy.deepcopy(egg)
        unsafe['transientAbsenceProof']['confirmedCount'] = 1
        self.assertIsNone(
            LIVE_GATE.protected_nonblocking_evidence(
                unsafe,
                [{'line': 1, 'box': [10, 64, 10, 10, 64, 10]}],
            )
        )

    def test_expired_egg_probe_does_not_replace_spatial_selector_evidence(self):
        class FakeRcon:
            force_loaded = set()

            def close(self):
                return None

            def cmd(self, command):
                if command == 'forceload query':
                    chunks = ', '.join(
                        f'[{x}, {z}]'
                        for x, z in sorted(self.force_loaded)
                    )
                    return f'Forced chunks: {chunks}'
                if command.startswith('forceload add '):
                    _, _, x, z = command.split()
                    self.force_loaded.add((int(x) // 16, int(z) // 16))
                    return 'Marked chunk for force loading'
                if command.startswith('forceload remove '):
                    _, _, x, z = command.split()
                    self.force_loaded.discard((int(x) // 16, int(z) // 16))
                    return 'No chunks are marked for force loading'
                if command.startswith('forceload query '):
                    _, _, x, z = command.split()
                    chunk = (int(x) // 16, int(z) // 16)
                    return (
                        'That position is marked for force loading'
                        if chunk in self.force_loaded
                        else 'That position is not marked for force loading'
                    )
                if command == 'list':
                    return 'There are 0 of a max of 20 players online'
                if 'type=minecraft:player' in command:
                    return 'Test failed'
                if (
                    command.startswith('execute if entity @e[')
                    and 'type=!minecraft:player' in command
                ):
                    return 'Test passed. Count: 1'
                if (
                    command.startswith('execute as @e[')
                    and 'type=!minecraft:player' in command
                ):
                    return (
                        'Egg has the following entity data: '
                        '[10.5d, 64.5d, 10.5d]'
                    )
                if (
                    command.startswith('execute positioned ')
                    and 'type=minecraft:egg' in command
                ):
                    return 'Test failed'
                raise AssertionError(command)

        FakeRcon.force_loaded = set()
        with tempfile.TemporaryDirectory() as directory:
            operation_path = pathlib.Path(directory) / 'egg.txt'
            report_path = pathlib.Path(directory) / 'gate.json'
            operation_path.write_text(
                'REPL 10 64 10 10 64 10 minecraft:air minecraft:stone\n',
                encoding='utf-8',
            )
            argv = [
                'redevelopment_live_entity_gate.py',
                '--ops',
                str(operation_path),
                '--report',
                str(report_path),
                '--capture-blocker-nbt',
            ]
            with (
                mock.patch.object(LIVE_GATE, 'connect', side_effect=FakeRcon),
                mock.patch.object(LIVE_GATE, 'Rcon', side_effect=lambda value: value),
                mock.patch.object(LIVE_GATE.time, 'sleep'),
                mock.patch.object(sys, 'argv', argv),
                redirect_stdout(io.StringIO()),
            ):
                self.assertEqual(LIVE_GATE.main(), 0)
            report = json.loads(report_path.read_text(encoding='utf-8'))
            self.assertTrue(
                ATOMIC_RELEASE.live_gate_contract_passed(report, 1)
            )
        package = report['packages'][0]
        self.assertEqual(package['blockers'], [])
        self.assertEqual(
            [
                entity['nonBlockingEvidence']['policy']
                for entity in package['protectedNonBlockingEntities']
            ],
            ['expired-transient-projectile'],
        )
        self.assertTrue(all(
            query['selector'].startswith('@e[')
            for query in package['spatialQueries']
        ))

    def test_nbt_capture_parses_paper_path_replies_with_whitespace(self):
        class FakeRcon:
            def __init__(self):
                self.commands = []

            def cmd(self, command):
                self.commands.append(command)
                if command.startswith('execute positioned') and ' if entity ' in command:
                    return 'Test passed, count: 2'
                if command.startswith('execute if entity'):
                    return 'Test passed, count: 1'
                if ' on vehicle ' in command or ' on passengers ' in command:
                    return 'No entity was found'
                if command.endswith(' UUID'):
                    return (
                        'Chicken has the following entity data: '
                        '[I; 1, -2, 3, -4]'
                    )
                if command.endswith(' Pos'):
                    return (
                        'Chicken has the following entity data: '
                        '[10.01d, 64.0d, 10.02d]'
                    )
                return 'Found no elements matching the path'

        rcon = FakeRcon()
        capture = LIVE_GATE.capture_entity_nbt(rcon, {
            'label': 'Chicken',
            'position': [10.0, 64.0, 10.0],
        })
        self.assertEqual(capture['uuidIntArray'], [1, -2, 3, -4])
        self.assertEqual(capture['capturedId'], 'minecraft:chicken')
        self.assertEqual(capture['candidateCountWithinCaptureRadius'], 2)
        self.assertTrue(capture['identityChecksPassed'])
        self.assertFalse(capture['vehicleRelationPresent'])
        self.assertFalse(capture['passengerRelationPresent'])
        self.assertIn('distance=..1', rcon.commands[0])
        self.assertIn('limit=64', rcon.commands[0])

    def test_nbt_capture_records_sanitized_parser_diagnostics(self):
        class FakeRcon:
            def cmd(self, command):
                if command.startswith('execute positioned') and ' if entity ' in command:
                    return 'Test passed, count: 1'
                if command.endswith(' UUID'):
                    return (
                        'Chicken has the following entity data: '
                        '[I; not-valid]'
                    )
                if command.endswith(' Pos'):
                    return (
                        'Chicken has the following entity data: '
                        '[10.0d, 64.0d, 10.0d]'
                    )
                raise AssertionError(command)

        with self.assertRaises(LIVE_GATE.EntityNbtCaptureError) as raised:
            LIVE_GATE.capture_entity_nbt(FakeRcon(), {
                'label': 'Chicken',
                'position': [10.0, 64.0, 10.0],
            })
        diagnostics = raised.exception.diagnostics
        self.assertIn('fieldReplies', diagnostics)
        self.assertIn('sanitized', diagnostics['fieldReplies']['UUID'])
        self.assertRegex(
            diagnostics['fieldReplies']['UUID']['sha256'],
            r'^[a-f0-9]{64}$',
        )

    def test_far_apart_targets_do_not_fill_the_global_envelope(self):
        boxes = [
            {'line': 1, 'box': [8, 64, 8, 8, 64, 8]},
            {'line': 2, 'box': [16008, 70, 8, 16008, 70, 8]},
        ]
        spans = LIVE_GATE.target_halo_spans(boxes)
        self.assertEqual(
            [span['chunk'] for span in spans],
            [[0, 0], [1000, 0]],
        )
        dense_envelope_chunk_count = (
            LIVE_GATE.envelope(boxes)[3] // 16
            - LIVE_GATE.envelope(boxes)[0] // 16
            + 1
        )
        self.assertEqual(len(spans), 2)
        self.assertEqual(dense_envelope_chunk_count, 1001)
        self.assertEqual(
            spans,
            ATOMIC_RELEASE.target_halo_spans([
                entry['box'] for entry in boxes
            ]),
        )

    def test_target_halo_crosses_negative_chunk_edges_exactly(self):
        boxes = [{'line': 1, 'box': [0, 10, 0, 0, 10, 0]}]
        spans = LIVE_GATE.target_halo_spans(boxes)
        self.assertEqual(
            [span['chunk'] for span in spans],
            [[-1, -1], [-1, 0], [0, -1], [0, 0]],
        )
        self.assertEqual(spans[0]['envelope'], [-1, 8, -1, -1, 13, -1])
        self.assertEqual(spans[-1]['envelope'], [0, 8, 0, 2, 13, 2])

    def test_batching_accounts_for_preexisting_server_capacity(self):
        pre_existing = {(index, 0) for index in range(250)}
        required = (
            [(index, 0) for index in range(5)]
            + [(index, 0) for index in range(300, 320)]
        )
        batches = LIVE_GATE.chunk_batches(
            required,
            pre_existing,
            batch_limit=64,
        )
        self.assertEqual(len(batches), 4)
        for batch in batches:
            temporary = [
                chunk for chunk in batch
                if chunk not in pre_existing
            ]
            self.assertLessEqual(len(batch), 64)
            self.assertLessEqual(len(temporary), 6)
            self.assertLessEqual(len(pre_existing) + len(temporary), 256)

    def test_batching_fails_closed_when_no_temporary_capacity_remains(self):
        pre_existing = {(index, 0) for index in range(256)}
        with self.assertRaisesRegex(ValueError, 'no temporary'):
            LIVE_GATE.chunk_batches(
                [(300, 0)],
                pre_existing,
                batch_limit=64,
            )

    def test_atomic_runner_accepts_exact_schema_two_sparse_contract(self):
        with tempfile.TemporaryDirectory() as directory:
            operation_path = pathlib.Path(directory) / 'sparse.txt'
            operation_path.write_text(
                '\n'.join([
                    'REPL 8 64 8 8 64 8 minecraft:air minecraft:stone',
                    'REPL 16008 70 8 16008 70 8 minecraft:air minecraft:stone',
                    '',
                ]),
                encoding='utf-8',
            )
            gate = self._schema_two_gate(operation_path)
            self.assertTrue(
                ATOMIC_RELEASE.live_gate_contract_passed(gate, 1)
            )

    def test_atomic_runner_rejects_fabricated_dense_or_missing_coverage(self):
        with tempfile.TemporaryDirectory() as directory:
            operation_path = pathlib.Path(directory) / 'sparse.txt'
            operation_path.write_text(
                '\n'.join([
                    'REPL 8 64 8 8 64 8 minecraft:air minecraft:stone',
                    'REPL 16008 70 8 16008 70 8 minecraft:air minecraft:stone',
                    '',
                ]),
                encoding='utf-8',
            )
            gate = self._schema_two_gate(operation_path)
            missing = copy.deepcopy(gate)
            missing['packages'][0]['targetHaloChunks'].pop()
            self.assertFalse(
                ATOMIC_RELEASE.live_gate_contract_passed(missing, 1)
            )
            dense = copy.deepcopy(gate)
            dense['packages'][0]['targetHaloChunks'].insert(1, {
                'chunk': [500, 0],
                'envelope': [8000, 62, 7, 8015, 73, 10],
            })
            self.assertFalse(
                ATOMIC_RELEASE.live_gate_contract_passed(dense, 1)
            )

    def test_atomic_runner_rejects_unrestored_force_load_state(self):
        with tempfile.TemporaryDirectory() as directory:
            operation_path = pathlib.Path(directory) / 'sparse.txt'
            operation_path.write_text(
                'REPL 8 64 8 8 64 8 minecraft:air minecraft:stone\n',
                encoding='utf-8',
            )
            gate = self._schema_two_gate(operation_path)
            gate['forceLoadAudit']['finalChunkCoordinates'] = []
            gate['forceLoadAudit']['finalSetMatchesPreExistingSet'] = False
            self.assertFalse(
                ATOMIC_RELEASE.live_gate_contract_passed(gate, 1)
            )

    @staticmethod
    def _schema_two_gate(operation_path):
        boxes = ATOMIC_RELEASE.parse_operation_boxes(str(operation_path))
        spans = ATOMIC_RELEASE.target_halo_spans(boxes)
        pre_existing = {tuple(spans[0]['chunk'])}
        chunk_batch_limit = 2
        batches = ATOMIC_RELEASE.partition_target_chunks(
            [tuple(span['chunk']) for span in spans],
            pre_existing,
            chunk_batch_limit,
            256,
        )
        chunk_batch_indexes = {}
        chunk_batches = []
        force_batches = []
        for batch_index, chunks in enumerate(batches):
            for chunk in chunks:
                chunk_batch_indexes[chunk] = batch_index
            required = [list(chunk) for chunk in chunks]
            temporary = [
                list(chunk) for chunk in chunks
                if chunk not in pre_existing
            ]
            chunk_batches.append({
                'chunkBatchIndex': batch_index,
                'requiredChunks': required,
                'temporaryChunks': temporary,
            })
            force_batches.append({
                'packageFile': str(operation_path),
                'chunkBatchIndex': batch_index,
                'requiredChunks': required,
                'temporaryChunks': temporary,
                'missingRequiredChunks': [],
                'temporaryChunksStillLoadedAfterBatch': [],
                'released': True,
                'passed': True,
            })
        queries = []
        summaries = []
        for category, entity_filter in (
            ('player', 'type=minecraft:player'),
            ('non-player', 'type=!minecraft:player'),
        ):
            summaries.append({
                'category': category,
                'batchCount': len(spans),
                'selectedCount': 0,
                'parsedPositions': 0,
                'selectorLimitReached': False,
            })
            for batch_index, span in enumerate(spans):
                x1, y1, z1, x2, y2, z2 = span['envelope']
                queries.append({
                    'category': category,
                    'batchIndex': batch_index,
                    'chunkBatchIndex': chunk_batch_indexes[
                        tuple(span['chunk'])
                    ],
                    'chunk': span['chunk'],
                    'envelope': span['envelope'],
                    'selector': (
                        f'@e[x={x1},y={y1},z={z1},'
                        f'dx={x2 - x1},dy={y2 - y1},dz={z2 - z1},'
                        f'{entity_filter},limit=64,sort=arbitrary]'
                    ),
                    'selectedCount': 0,
                    'parsedPositions': 0,
                    'selectorLimitReached': False,
                })
        package = {
            'file': str(operation_path),
            'passed': True,
            'envelope': ATOMIC_RELEASE.target_envelope(boxes),
            'targetHaloChunks': spans,
            'targetHaloChunkCount': len(spans),
            'selectorLimit': 64,
            'spatialBatchCount': len(spans),
            'chunkBatchCount': len(batches),
            'chunkBatches': chunk_batches,
            'categoryQueries': summaries,
            'spatialQueries': queries,
            'queryErrors': [],
            'selectorLimitReached': False,
            'blockers': [],
            'entitiesReturnedInEnvelope': 0,
        }
        required = sorted({tuple(span['chunk']) for span in spans})
        pre_existing_list = sorted(pre_existing)
        temporary_additions = sum(
            len(batch['temporaryChunks']) for batch in force_batches
        )
        maximum_simultaneous = max(
            len(batch['temporaryChunks']) for batch in force_batches
        )
        return {
            'schemaVersion': 2,
            'status': 'PASS',
            'passed': True,
            'blockOrEntityMutation': False,
            'temporaryForceLoadMutation': True,
            'halo': {
                'horizontalBlocks': 1,
                'verticalBlocksBelow': 2,
                'verticalBlocksAbove': 2,
                'positiveTargetCellExtentIncluded': True,
            },
            'packages': [package],
            'forceLoadAudit': {
                'mode': 'sparse-target-halo-batched',
                'serverChunkLimit': 256,
                'chunkBatchLimit': chunk_batch_limit,
                'requiredChunks': len(required),
                'requiredChunkCoordinates': [
                    list(chunk) for chunk in required
                ],
                'allRequiredChunksLoadedBeforeQueries': True,
                'missingRequiredChunks': [],
                'preExistingChunks': len(pre_existing_list),
                'preExistingChunkCoordinates': [
                    list(chunk) for chunk in pre_existing_list
                ],
                'temporaryChunkAdditions': temporary_additions,
                'maximumSimultaneousTemporaryChunks': maximum_simultaneous,
                'batchCount': len(force_batches),
                'batches': force_batches,
                'restoredPreExistingChunks': 0,
                'cleanupErrors': [],
                'allTemporaryChunksReleased': True,
                'finalChunkCoordinates': [
                    list(chunk) for chunk in pre_existing_list
                ],
                'finalSetMatchesPreExistingSet': True,
            },
        }


if __name__ == '__main__':
    unittest.main()
