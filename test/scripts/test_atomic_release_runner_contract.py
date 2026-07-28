import hashlib
import importlib.util
import json
import pathlib
import tempfile
import types
import unittest
from unittest import mock


ROOT = pathlib.Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location(
    'run_redevelopment_atomic_release',
    ROOT / 'scripts' / 'run_redevelopment_atomic_release.py',
)
ATOMIC = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(ATOMIC)


class AtomicReleaseRunnerContractTest(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        root = pathlib.Path(self.directory.name)
        self.operations = root / 'operations.txt'
        self.report = root / 'execution.json'
        self.journal = pathlib.Path(f'{self.report}.stream-journal.jsonl')
        self.operations.write_text(
            'REPL 1 2 3 1 2 3 minecraft:stone minecraft:air\n',
            encoding='utf-8',
        )

    def tearDown(self):
        self.directory.cleanup()

    def execution_payload(self):
        operation_sha = hashlib.sha256(
            self.operations.read_bytes()
        ).hexdigest()
        payload = {
            'schemaVersion': 3,
            'file': str(self.operations),
            'operationSha256': operation_sha,
            'sourceGroupPlanSha256': '1' * 64,
            'expandedCommandSha256': '2' * 64,
            'status': 'complete',
            'operationRole': 'forward',
            'sourceGroupCount': 1,
            'worldEditLeftoverCount': 0,
            'failedGroups': 0,
            'stoppedAtFirstFailedGroup': False,
            'executedCommandCount': 1,
            'expandedCommandCount': 1,
            'streamJournal': str(self.journal.resolve()),
            'forceLoadAudit': {
                'mode': 'exact-command-chunk-streaming',
                'serverLimit': 256,
                'allRequiredChunksLoadedBeforeCommands': True,
                'cleanupErrors': [],
                'allTemporaryReleased': True,
                'finalSetMatchesPreExistingSet': True,
                'maximumForceLoadedChunkCount': 256,
            },
        }
        common = {
            'schemaVersion': 1,
            'operationSha256': operation_sha,
            'sourceGroupPlanSha256': payload['sourceGroupPlanSha256'],
            'expandedCommandSha256': payload['expandedCommandSha256'],
        }
        events = [
            {**common, 'sequence': 1, 'status': 'planned'},
            {
                **common,
                'sequence': 2,
                'status': 'executing',
                'batch': {
                    'status': 'group-intent',
                    'activeGroupIndex': 0,
                },
            },
            {
                **common,
                'sequence': 3,
                'status': 'executing',
                'batch': {
                    'status': 'group-result',
                    'activeGroupIndex': 0,
                    'activeGroupResult': 'passed',
                },
            },
            {**common, 'sequence': 4, 'status': 'complete'},
        ]
        self.journal.write_text(
            ''.join(json.dumps(event) + '\n' for event in events),
            encoding='utf-8',
        )
        payload['streamJournalSha256'] = hashlib.sha256(
            self.journal.read_bytes()
        ).hexdigest()
        return payload

    def run_with_payload(self, payload, returncode=0):
        def fake_run(command, **_kwargs):
            journal = pathlib.Path(
                command[command.index('--stream-journal') + 1]
            )
            journal.write_bytes(self.journal.read_bytes())
            payload['streamJournal'] = str(journal.resolve())
            self.report.write_text(
                json.dumps(payload) + '\n',
                encoding='utf-8',
            )
            return types.SimpleNamespace(returncode=returncode)

        with mock.patch.object(ATOMIC.subprocess, 'run', side_effect=fake_run):
            return ATOMIC.run_package(
                str(self.operations),
                str(self.report),
                strict=True,
            )

    def test_exact_schema_operation_journal_and_cleanup_contract_passes(self):
        payload = self.execution_payload()
        code, execution, passed = self.run_with_payload(payload)
        self.assertEqual(code, 0)
        self.assertTrue(passed)
        self.assertEqual(
            execution['atomicWrapperJournalValidation']['committedGroupCount'],
            1,
        )

    def test_stale_operation_identity_fails_closed(self):
        payload = self.execution_payload()
        payload['operationSha256'] = '0' * 64
        _, _, passed = self.run_with_payload(payload)
        self.assertFalse(passed)

    def test_journal_or_cleanup_drift_fails_closed(self):
        payload = self.execution_payload()
        payload['streamJournalSha256'] = '0' * 64
        _, _, passed = self.run_with_payload(payload)
        self.assertFalse(passed)

        payload = self.execution_payload()
        payload['forceLoadAudit']['finalSetMatchesPreExistingSet'] = False
        _, _, passed = self.run_with_payload(payload)
        self.assertFalse(passed)

    def test_nonzero_runner_exit_never_passes_stale_complete_report(self):
        payload = self.execution_payload()
        _, _, passed = self.run_with_payload(payload, returncode=137)
        self.assertFalse(passed)

    def test_rollback_transition_policy_is_propagated_and_hash_bound(self):
        policy = pathlib.Path(self.directory.name) / 'policy.json'
        policy.write_text('{"schemaVersion":1}\n', encoding='utf-8')
        payload = self.execution_payload()
        payload['operationRole'] = 'rollback'
        payload['naturalStateTransitionPolicy'] = {
            'path': str(policy.resolve()),
            'sha256': hashlib.sha256(policy.read_bytes()).hexdigest(),
            'operationSha256': payload['operationSha256'],
            'executionRole': 'rollback',
        }
        observed = {}

        def fake_run(command, **_kwargs):
            observed['command'] = command
            audit = pathlib.Path(
                command[command.index('--policy-audit-report') + 1]
            )
            audit.write_text(json.dumps({
                'schemaVersion': 1,
                'status': 'PASS',
                'passed': True,
                'operation': {
                    'sha256': payload['operationSha256'],
                },
                'policy': {
                    'sha256': hashlib.sha256(policy.read_bytes()).hexdigest(),
                },
            }) + '\n', encoding='utf-8')
            payload['naturalStateTransitionPolicy']['planAudit'] = {
                'path': str(audit.resolve()),
                'sha256': hashlib.sha256(audit.read_bytes()).hexdigest(),
            }
            journal = pathlib.Path(
                command[command.index('--stream-journal') + 1]
            )
            journal.write_bytes(self.journal.read_bytes())
            payload['streamJournal'] = str(journal.resolve())
            self.report.write_text(
                json.dumps(payload) + '\n',
                encoding='utf-8',
            )
            return types.SimpleNamespace(returncode=0)

        with mock.patch.object(ATOMIC.subprocess, 'run', side_effect=fake_run):
            _, _, passed = ATOMIC.run_package(
                str(self.operations),
                str(self.report),
                strict=True,
                operation_role='rollback',
                transition_policy=str(policy),
            )
        self.assertTrue(passed)
        self.assertEqual(
            observed['command'][
                observed['command'].index('--operation-role') + 1
            ],
            'rollback',
        )
        self.assertEqual(
            observed['command'][
                observed['command'].index(
                    '--natural-transition-policy'
                ) + 1
            ],
            str(policy),
        )

        payload['naturalStateTransitionPolicy']['sha256'] = '0' * 64
        with mock.patch.object(ATOMIC.subprocess, 'run', side_effect=fake_run):
            _, _, passed = ATOMIC.run_package(
                str(self.operations),
                str(self.report),
                strict=True,
                operation_role='rollback',
                transition_policy=str(policy),
            )
        self.assertFalse(passed)


if __name__ == '__main__':
    unittest.main()
