import copy
import importlib.util
import json
import os
import subprocess
import tempfile
import unittest
from datetime import datetime, timedelta, timezone


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SCRIPT = os.path.join(ROOT, 'scripts', 'run_town_entity_evacuation.py')
SOURCE_MANIFEST = os.path.join(
    ROOT,
    'data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.manifest.json',
)
MANIFEST = SOURCE_MANIFEST
SPEC = importlib.util.spec_from_file_location('town_entity_evacuation', SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class FakeForceLoadRcon:
    def __init__(self, chunks):
        self.chunks = set(chunks)
        self.commands = []

    def cmd(self, command):
        self.commands.append(command)
        if command == 'forceload query':
            body = ', '.join(
                f'[{chunk_x}, {chunk_z}]'
                for chunk_x, chunk_z in sorted(self.chunks)
            )
            return f'Forced chunks: {body}'
        fields = command.split()
        if fields[:2] == ['forceload', 'remove']:
            self.chunks.discard((int(fields[2]) // 16, int(fields[3]) // 16))
            return 'No chunks are marked for force loading'
        if fields[:2] == ['forceload', 'add']:
            self.chunks.add((int(fields[2]) // 16, int(fields[3]) // 16))
            return 'Marked chunk for force loading'
        raise AssertionError(command)


class FailureTransaction(MODULE.LiveTransaction):
    def __init__(self, manifest, manifest_path, journal_path):
        super().__init__(manifest, manifest_path, journal_path)
        self.loaded_sets = []
        self.rollback_called = False

    def open(self):
        class FailedTeleport:
            @staticmethod
            def cmd(command):
                if command.startswith('tp '):
                    return 'No entity was found'
                raise AssertionError(command)

        self.rcon = FailedTeleport()

    def close(self):
        return None

    def force_set(self):
        return set()

    def ensure_loaded(self, chunks):
        self.loaded_sets.append(set(chunks))
        return []

    def release(self, chunks):
        return None

    def identity_count(self, row):
        return 1

    def position(self, row):
        return list(row['currentIdentity']['lastCapturedPosition'])

    def rotation(self, row):
        return [45.0, 10.0]

    def projection(self, row):
        return MODULE.expected_projection(row['immutableProjection'])

    def verify_footing(self, row):
        return None

    def set_rail(self, row):
        return None

    def restore_force_set(self):
        return None

    def rollback_rows(self):
        self.rollback_called = True
        for row in self.journal['rows']:
            if row.get('teleportIssued'):
                row['state'] = 'rolled-back'
        return []


class RailIntentTransaction(MODULE.LiveTransaction):
    def __init__(self, manifest):
        super().__init__(manifest, MANIFEST, '/unused')
        self.removed = []

    def ensure_loaded(self, chunks):
        return []

    def release(self, chunks):
        return None

    def remove_rail(self, row, tolerate_absent=False):
        self.removed.append((row['uuidKey'], tolerate_absent))

    def identity_count(self, row):
        raise AssertionError('rail-only crash recovery must not teleport')

    def save(self):
        return None


class VolatileRotationRollbackTransaction(MODULE.LiveTransaction):
    def __init__(self, manifest):
        super().__init__(manifest, MANIFEST, '/unused')
        self.teleports = []

        class TeleportRcon:
            def __init__(inner_self, outer):
                inner_self.outer = outer

            def cmd(inner_self, command):
                if command.startswith('tp '):
                    inner_self.outer.teleports.append(command)
                    return 'Teleported entity'
                raise AssertionError(command)

        self.rcon = TeleportRcon(self)

    def ensure_loaded(self, chunks):
        return []

    def release(self, chunks):
        return None

    def identity_count(self, row):
        return 1

    def position(self, row):
        return self.current_journal_row['beforePos']

    def projection(self, row):
        return self.current_journal_row['immutableBefore']

    def rotation(self, row):
        raise AssertionError('volatile Rotation must not be an acceptance check')

    def remove_rail(self, row, tolerate_absent=False):
        return None

    def save(self):
        return None

    def rollback_rows(self):
        failures = []
        for journal_row in reversed(self.journal['rows']):
            self.current_journal_row = journal_row
            one_row_journal = {
                **self.journal,
                'rows': [journal_row],
            }
            original = self.journal
            self.journal = one_row_journal
            failures.extend(super().rollback_rows())
            self.journal = original
        return failures


class DestinationPreflightTransaction(MODULE.LiveTransaction):
    def __init__(self, manifest, failed_uuid):
        super().__init__(manifest, MANIFEST, '/unused')
        self.failed_uuid = failed_uuid
        self.restored = False
        self.released = []

    def open(self):
        return None

    def close(self):
        return None

    def force_set(self):
        return set()

    def ensure_loaded(self, chunks):
        return list(chunks)

    def release(self, chunks):
        self.released.extend(chunks)

    def restore_force_set(self):
        self.restored = True

    def verify_footing(self, row, full_footing=False):
        if row['uuidKey'] == self.failed_uuid:
            raise RuntimeError('synthetic footing drift')
        return 25 if full_footing else 1


class TownEntityEvacuationExecutorTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        global MANIFEST
        with open(SOURCE_MANIFEST, encoding='utf-8') as handle:
            cls.manifest = json.load(handle)
        operations = cls.manifest['source']['operations']
        cls.manifest['source']['operationSha256'] = MODULE.sha256_file(
            operations
        )
        cls.fixture_directory = tempfile.TemporaryDirectory()
        MANIFEST = os.path.join(
            cls.fixture_directory.name,
            'entity-evacuation.manifest.json',
        )
        with open(MANIFEST, 'w', encoding='utf-8') as handle:
            json.dump(cls.manifest, handle, indent=2)
            handle.write('\n')

    @classmethod
    def tearDownClass(cls):
        global MANIFEST
        MANIFEST = SOURCE_MANIFEST
        cls.fixture_directory.cleanup()

    def test_manifest_validates_unique_uuid_and_destination_chunks(self):
        report = MODULE.validate_manifest(self.manifest, MANIFEST)
        self.assertTrue(report['valid'], report['errors'])
        self.assertEqual(report['transactionRows'], 174)
        self.assertEqual(report['uniqueUuids'], 174)
        self.assertEqual(report['uniqueDestinationChunks'], 174)
        self.assertTrue(report['authorizedForPartialEvacuation'])
        self.assertFalse(report['worldReleaseAuthorized'])

    def test_source_chunk_neighborhood_is_exactly_three_by_three(self):
        row = copy.deepcopy(self.manifest['transactionRows'][0])
        row['currentIdentity']['sourceChunk'] = [-10, 20]
        self.assertEqual(
            MODULE.source_chunk_neighborhood(row),
            {
                (-11, 19), (-11, 20), (-11, 21),
                (-10, 19), (-10, 20), (-10, 21),
                (-9, 19), (-9, 20), (-9, 21),
            },
        )

    def test_accepts_paper_force_load_success_wording(self):
        self.assertTrue(MODULE.force_load_add_succeeded(
            'Marked chunk [-22, -50] in minecraft:overworld to be force loaded'
        ))
        self.assertFalse(MODULE.force_load_add_succeeded(
            'That position is not loaded'
        ))

    def test_stale_gate_is_refused_before_live_connection(self):
        with open(self.manifest['source']['gate'], encoding='utf-8') as handle:
            gate = json.load(handle)
        generated = datetime.fromisoformat(
            gate['generatedAtUtc'].replace('Z', '+00:00')
        )
        with self.assertRaisesRegex(RuntimeError, 'gate is stale'):
            MODULE.validate_gate_freshness(
                self.manifest, 300, now=generated + timedelta(seconds=301)
            )

    def test_failed_teleport_triggers_compensation_and_journals_intent(self):
        manifest = copy.deepcopy(self.manifest)
        manifest['transactionRows'] = [manifest['transactionRows'][0]]
        with tempfile.TemporaryDirectory() as directory:
            journal = os.path.join(directory, 'transaction.json')
            transaction = FailureTransaction(manifest, MANIFEST, journal)
            with self.assertRaisesRegex(RuntimeError, 'teleport command'):
                transaction.execute()
            self.assertTrue(transaction.rollback_called)
            with open(journal, encoding='utf-8') as handle:
                saved = json.load(handle)
            self.assertEqual(saved['status'], 'failed-rolled-back')
            self.assertTrue(saved['rows'][0]['teleportIssued'])
            source_neighbors = MODULE.source_chunk_neighborhood(
                manifest['transactionRows'][0]
            )
            self.assertTrue(source_neighbors.issubset(transaction.loaded_sets[0]))

    def test_rail_placement_intent_is_recoverable_without_entity_move(self):
        manifest = copy.deepcopy(self.manifest)
        minecart_index = next(
            index
            for index, row in enumerate(manifest['transactionRows'])
            if row['entityType'] == 'minecraft:chest_minecart'
        )
        row = manifest['transactionRows'][minecart_index]
        transaction = RailIntentTransaction(manifest)
        transaction.journal = {
            'preExistingForceLoads': [],
            'rows': [{
                'manifestIndex': minecart_index,
                'uuidKey': row['uuidKey'],
                'beforePos': row['currentIdentity']['lastCapturedPosition'],
                'beforeChunk': row['currentIdentity']['sourceChunk'],
                'railPlacementIntended': True,
                'teleportIssued': False,
                'state': 'rollback-failed',
            }],
        }
        self.assertEqual(transaction.rollback_rows(), [])
        self.assertEqual(transaction.removed, [(row['uuidKey'], True)])
        self.assertEqual(transaction.journal['rows'][0]['state'], 'rolled-back')

    def test_rollback_accepts_position_and_immutable_nbt_despite_rotation_drift(self):
        manifest = copy.deepcopy(self.manifest)
        row = manifest['transactionRows'][0]
        transaction = VolatileRotationRollbackTransaction(manifest)
        projection = MODULE.expected_projection(row['immutableProjection'])
        transaction.journal = {
            'preExistingForceLoads': [],
            'rows': [
                {
                    'manifestIndex': 0,
                    'uuidKey': row['uuidKey'],
                    'beforePos': row['currentIdentity']['lastCapturedPosition'],
                    'beforeRotation': [90.0, 0.0],
                    'beforeChunk': row['currentIdentity']['sourceChunk'],
                    'immutableBefore': projection,
                    'railPlacementIntended': False,
                    'teleportIssued': True,
                    'state': 'rollback-failed',
                },
                {
                    'manifestIndex': 0,
                    'uuidKey': row['uuidKey'],
                    'beforePos': row['currentIdentity']['lastCapturedPosition'],
                    'beforeRotation': [90.0, 0.0],
                    'beforeChunk': row['currentIdentity']['sourceChunk'],
                    'immutableBefore': projection,
                    'railPlacementIntended': False,
                    'teleportIssued': True,
                    'state': 'rolled-back',
                },
            ],
        }
        self.assertEqual(transaction.rollback_rows(), [])
        self.assertEqual(len(transaction.teleports), 1)
        self.assertEqual(transaction.journal['rows'][0]['state'], 'rolled-back')

    def test_force_load_restore_removes_only_owned_chunks(self):
        transaction = MODULE.LiveTransaction(self.manifest, MANIFEST, '/unused')
        transaction.rcon = FakeForceLoadRcon({(2, 2), (3, 3), (9, 9)})
        transaction.journal = {
            'preExistingForceLoads': [[1, 1], [2, 2]],
            'rows': [{
                'plannedForceLoads': [[3, 3]],
                'temporaryForceLoads': [[3, 3]],
            }],
        }
        with self.assertRaisesRegex(RuntimeError, 'unowned concurrent addition'):
            transaction.restore_force_set()
        self.assertEqual(transaction.rcon.chunks, {(1, 1), (2, 2), (9, 9)})
        self.assertNotIn(
            'forceload remove 144 144',
            transaction.rcon.commands,
        )

    def test_all_destination_preflight_reports_every_row_before_movement(self):
        manifest = copy.deepcopy(self.manifest)
        manifest['transactionRows'] = manifest['transactionRows'][:3]
        failed = manifest['transactionRows'][1]
        transaction = DestinationPreflightTransaction(
            manifest, failed['uuidKey']
        )
        with tempfile.TemporaryDirectory() as directory:
            report_path = os.path.join(directory, 'preflight.json')
            report = transaction.preflight_destinations(
                report_path, batch_limit=2
            )
            self.assertEqual(report['status'], 'FAIL')
            self.assertEqual(report['counts'], {
                'destinations': 3,
                'passed': 2,
                'failed': 1,
                'reportErrors': 0,
            })
            self.assertEqual(
                report['badDestinationChunks'],
                [failed['sanctuarySlot']['destinationChunk']],
            )
            self.assertTrue(transaction.restored)
            self.assertEqual(len(transaction.released), 3)
            with open(report_path, encoding='utf-8') as handle:
                self.assertEqual(json.load(handle)['rows'], report['rows'])

    def test_execute_accepts_only_bound_preflight_completed_within_60_seconds(self):
        completed = datetime.now(timezone.utc).replace(microsecond=0)
        report = {
            'status': 'PASS',
            'manifestSha256': MODULE.sha256_file(MANIFEST),
            'gateSha256': self.manifest['source']['gateSha256'],
            'executorSha256': MODULE.sha256_file(SCRIPT),
            'completedAtUtc': completed.isoformat().replace('+00:00', 'Z'),
            'rows': [
                {'status': 'PASS', 'verifiedFootingColumns': 25}
                for _ in self.manifest['transactionRows']
            ],
        }
        self.assertEqual(
            MODULE.validate_destination_preflight(
                report, self.manifest, MANIFEST,
                now=completed + timedelta(seconds=60),
            ),
            [],
        )
        errors = MODULE.validate_destination_preflight(
            report, self.manifest, MANIFEST,
            now=completed + timedelta(seconds=61),
        )
        self.assertTrue(any('outside 0..60s' in error for error in errors))

    def test_bee_navigation_links_are_volatile_but_identity_state_is_not(self):
        before = {
            'entityType': 'minecraft:bee',
            'paths': ['HasNectar', 'HivePos', 'hive_pos'],
            'values': {
                'HasNectar': {'present': True, 'value': '1b'},
                'HivePos': {'present': True, 'value': '[I; 1, 2, 3]'},
                'hive_pos': {'present': False},
            },
            'vehicleRelationPresent': False,
            'passengerRelationPresent': False,
        }
        after = copy.deepcopy(before)
        after['values']['HivePos'] = {'present': False}
        self.assertTrue(MODULE.projections_equal(before, after))
        after['values']['HasNectar'] = {'present': True, 'value': '0b'}
        self.assertFalse(MODULE.projections_equal(before, after))

    def test_exclusive_journal_creation_refuses_existing_file(self):
        with tempfile.TemporaryDirectory() as directory:
            filename = os.path.join(directory, 'journal.json')
            MODULE.create_json_exclusive(filename, {'owner': 1})
            with self.assertRaises(FileExistsError):
                MODULE.create_json_exclusive(filename, {'owner': 2})
            with open(filename, encoding='utf-8') as handle:
                self.assertEqual(json.load(handle), {'owner': 1})

    def test_preflight_memory_ledger_cannot_overwrite_existing_move_journal(self):
        manifest = copy.deepcopy(self.manifest)
        manifest['transactionRows'] = [manifest['transactionRows'][0]]
        with tempfile.TemporaryDirectory() as directory:
            filename = os.path.join(directory, 'journal.json')
            MODULE.create_json_exclusive(filename, {'owner': 'existing'})
            transaction = FailureTransaction(manifest, MANIFEST, filename)
            transaction.journal = {
                'preExistingForceLoads': [],
                'rows': [],
                'status': 'preflight-memory-only',
            }
            with self.assertRaises(FileExistsError):
                transaction.execute()
            with open(filename, encoding='utf-8') as handle:
                self.assertEqual(json.load(handle), {'owner': 'existing'})

    def test_gate_freshness_limit_cannot_be_relaxed_past_300_seconds(self):
        result = subprocess.run(
            [
                'python3',
                SCRIPT,
                '--manifest',
                MANIFEST,
                '--verify',
                '--max-gate-age-seconds',
                '301',
            ],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('between 1 and 300', result.stderr)


if __name__ == '__main__':
    unittest.main()
