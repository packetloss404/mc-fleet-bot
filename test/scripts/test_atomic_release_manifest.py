import importlib.util
import json
import pathlib
import tempfile
import unittest


ROOT = pathlib.Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location(
    'run_redevelopment_atomic_release',
    ROOT / 'scripts' / 'run_redevelopment_atomic_release.py',
)
ATOMIC_RELEASE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(ATOMIC_RELEASE)


class AtomicReleaseManifestTest(unittest.TestCase):
    def test_stream_journal_binds_complete_exact_group_prefix(self):
        execution = {
            'operationSha256': 'a' * 64,
            'sourceGroupPlanSha256': 'b' * 64,
            'expandedCommandSha256': 'c' * 64,
            'sourceGroupCount': 2,
        }
        events = []
        for sequence, (status, group, result) in enumerate((
            ('group-intent', 0, None),
            ('group-result', 0, 'passed'),
            ('group-intent', 1, None),
            ('group-result', 1, 'passed'),
        ), start=1):
            events.append({
                'sequence': sequence,
                'status': 'executing',
                **{
                    key: execution[key]
                    for key in (
                        'operationSha256',
                        'sourceGroupPlanSha256',
                        'expandedCommandSha256',
                    )
                },
                'batch': {
                    'status': status,
                    'activeGroupIndex': group,
                    **(
                        {'activeGroupResult': result}
                        if result else {}
                    ),
                },
            })
        events.append({
            'sequence': 5,
            'status': 'complete',
            **{
                key: execution[key]
                for key in (
                    'operationSha256',
                    'sourceGroupPlanSha256',
                    'expandedCommandSha256',
                )
            },
        })
        with tempfile.TemporaryDirectory() as directory:
            filename = pathlib.Path(directory) / 'stream.jsonl'
            filename.write_text(
                ''.join(
                    json.dumps(event) + '\n'
                    for event in events
                ),
                encoding='utf-8',
            )
            result = ATOMIC_RELEASE.validate_stream_journal(
                str(filename),
                execution,
            )
        self.assertTrue(result['passed'])
        self.assertEqual(result['committedGroupCount'], 2)
        self.assertRegex(result['sha256'], r'^[0-9a-f]{64}$')

    def test_stream_journal_rejects_missing_group_result(self):
        execution = {
            'operationSha256': 'a' * 64,
            'sourceGroupPlanSha256': 'b' * 64,
            'expandedCommandSha256': 'c' * 64,
            'sourceGroupCount': 1,
        }
        common = {
            key: execution[key]
            for key in (
                'operationSha256',
                'sourceGroupPlanSha256',
                'expandedCommandSha256',
            )
        }
        with tempfile.TemporaryDirectory() as directory:
            filename = pathlib.Path(directory) / 'stream.jsonl'
            filename.write_text(
                json.dumps({
                    'sequence': 1,
                    'status': 'executing',
                    **common,
                    'batch': {
                        'status': 'group-intent',
                        'activeGroupIndex': 0,
                    },
                }) + '\n'
                + json.dumps({
                    'sequence': 2,
                    'status': 'complete',
                    **common,
                }) + '\n',
                encoding='utf-8',
            )
            result = ATOMIC_RELEASE.validate_stream_journal(
                str(filename),
                execution,
            )
        self.assertFalse(result['passed'])

    def test_default_plan_preserves_r1_package_definition(self):
        plan = ATOMIC_RELEASE.load_release_plan(None)
        self.assertEqual(plan['schemaVersion'], 1)
        self.assertEqual(
            plan['transactionId'],
            'redevelopment-atomic-release-2026-07-27',
        )
        self.assertEqual(plan['packages'], ATOMIC_RELEASE.PACKAGES)

    def test_manifest_loads_ordered_packages_and_records_identity(self):
        with tempfile.TemporaryDirectory() as directory:
            filename = pathlib.Path(directory) / 'release.json'
            filename.write_text(json.dumps({
                'schemaVersion': 1,
                'transactionId': 'wave-2-test',
                'packages': [
                    {
                        'key': 'tunnel',
                        'forward': 'data/buildops/tunnel.txt',
                        'rollback': 'data/buildops/tunnel.rollback.txt',
                    },
                    {
                        'key': 'street',
                        'forward': 'data/buildops/street.txt',
                        'rollback': 'data/buildops/street.rollback.txt',
                    },
                ],
            }), encoding='utf-8')
            plan = ATOMIC_RELEASE.load_release_plan(str(filename))
        self.assertEqual(plan['transactionId'], 'wave-2-test')
        self.assertEqual(
            [package['key'] for package in plan['packages']],
            ['tunnel', 'street'],
        )
        self.assertRegex(plan['manifestSha256'], r'^[0-9a-f]{64}$')

    def test_duplicate_package_key_fails_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            filename = pathlib.Path(directory) / 'release.json'
            filename.write_text(json.dumps({
                'schemaVersion': 1,
                'transactionId': 'wave-2-test',
                'packages': [
                    {
                        'key': 'duplicate',
                        'forward': 'one.txt',
                        'rollback': 'one.rollback.txt',
                    },
                    {
                        'key': 'duplicate',
                        'forward': 'two.txt',
                        'rollback': 'two.rollback.txt',
                    },
                ],
            }), encoding='utf-8')
            with self.assertRaises(SystemExit):
                ATOMIC_RELEASE.load_release_plan(str(filename))

    def test_reused_operation_path_fails_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            filename = pathlib.Path(directory) / 'release.json'
            filename.write_text(json.dumps({
                'schemaVersion': 1,
                'transactionId': 'wave-2-test',
                'packages': [
                    {
                        'key': 'first',
                        'forward': 'same.txt',
                        'rollback': 'first.rollback.txt',
                    },
                    {
                        'key': 'second',
                        'forward': 'second.txt',
                        'rollback': 'same.txt',
                    },
                ],
            }), encoding='utf-8')
            with self.assertRaises(SystemExit):
                ATOMIC_RELEASE.load_release_plan(str(filename))


if __name__ == '__main__':
    unittest.main()
