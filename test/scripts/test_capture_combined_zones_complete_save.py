import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import stat
import subprocess
import tarfile
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / 'scripts' / 'capture_combined_zones_complete_save.py'
SPEC = importlib.util.spec_from_file_location('capture_combined_zones_complete_save', SCRIPT)
assert SPEC is not None and SPEC.loader is not None
capture = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(capture)


def fixture_archive(*, traversal=False, hardlink=False):
    output = io.BytesIO()
    with tarfile.open(fileobj=output, mode='w') as archive:
        members = {
            'level.dat': b'level-data',
            'region/r.0.0.mca': b'region-data',
            'entities/r.0.0.mca': b'entity-data',
            'poi/r.0.0.mca': b'poi-data',
        }
        if traversal:
            members['../escape.txt'] = b'escape'
        for name, data in members.items():
            info = tarfile.TarInfo(name)
            info.size = len(data)
            archive.addfile(info, io.BytesIO(data))
        if hardlink:
            info = tarfile.TarInfo('region/r.1.1.mca')
            info.type = tarfile.LNKTYPE
            info.linkname = 'region/r.0.0.mca'
            archive.addfile(info)
    return output.getvalue()


class FakeChannel:
    def __init__(self, stdout=b'', stderr=b'', status=0, never_exit=False):
        self.stdout = bytearray(stdout)
        self.stderr = bytearray(stderr)
        self.status = status
        self.never_exit = never_exit
        self.closed = False

    def recv_ready(self):
        return bool(self.stdout)

    def recv(self, size):
        chunk = bytes(self.stdout[:size])
        del self.stdout[:size]
        return chunk

    def recv_stderr_ready(self):
        return bool(self.stderr)

    def recv_stderr(self, size):
        chunk = bytes(self.stderr[:size])
        del self.stderr[:size]
        return chunk

    def exit_status_ready(self):
        return not self.never_exit and not self.stdout and not self.stderr

    def recv_exit_status(self):
        return self.status

    def close(self):
        self.closed = True


class FakeStream:
    def __init__(self, channel):
        self.channel = channel


class FakeClient:
    def __init__(self, responses):
        self.responses = {command: list(values) for command, values in responses.items()}
        self.commands = []
        self.closed = False

    def exec_command(self, command, get_pty=False, timeout=None):
        self.commands.append((command, get_pty, timeout))
        values = self.responses.get(command)
        if not values:
            raise AssertionError(f'Unexpected command: {command}')
        response = values.pop(0)
        channel = FakeChannel(**response)
        stream = FakeStream(channel)
        return FakeStream(channel), stream, FakeStream(channel)

    def close(self):
        self.closed = True


def preflight_payload(helper_sha):
    return {
        'schemaVersion': 1,
        'id': capture.REMOTE_HELPER_ID,
        'mode': 'preflight',
        'status': 'PASS',
        'helperSha256': helper_sha,
        'sourceWorldRoot': capture.REMOTE_WORLD_ROOT,
        'memberCount': 4,
        'totalBytes': 40,
        'inventoryShapeSha256': 'a' * 64,
    }


def stream_payload(helper_sha, *, monotonic=True):
    timestamps = [
        '2026-08-05T10:00:00.000Z',
        '2026-08-05T10:00:01.000Z',
        '2026-08-05T10:00:02.000Z',
        '2026-08-05T10:00:03.000Z',
        '2026-08-05T10:00:04.000Z',
    ]
    if not monotonic:
        timestamps[3] = '2026-08-05T09:59:59.000Z'
    return {
        'schemaVersion': 1,
        'id': capture.REMOTE_HELPER_ID,
        'mode': 'stream',
        'status': 'CAPTURED',
        'captureId': 'combined-zones-fixture',
        'helperSha256': helper_sha,
        'sourceWorldRoot': capture.REMOTE_WORLD_ROOT,
        'memberCount': 4,
        'initialSaveState': 'ENABLED',
        'restorationAction': 'SAVE_ON_CONFIRMED',
        'captureProtocol': {
            'saveOffConfirmedAtUtc': timestamps[0],
            'saveAllFlushCompletedAtUtc': timestamps[1],
            'copyStartedAtUtc': timestamps[2],
            'copyCompletedAtUtc': timestamps[3],
            'saveOnRestoredAtUtc': timestamps[4],
            'initialSaveState': 'ENABLED',
            'restorationAction': 'SAVE_ON_CONFIRMED',
        },
    }


def helper_responses(*, archive=None, preflight_sha=None, stream=None, stream_status=0):
    helper_sha = preflight_sha or capture.expected_remote_helper_sha256()
    preflight = json.dumps(preflight_payload(helper_sha)).encode('utf8')
    stream_metadata = stream or stream_payload(capture.expected_remote_helper_sha256())
    stream_stderr = (
        capture.REMOTE_METADATA_PREFIX + json.dumps(stream_metadata) + '\n'
    ).encode('utf8')
    return {
        capture.REMOTE_HELPER_PREFLIGHT_COMMAND: [
            {'stdout': preflight, 'stderr': b'', 'status': 0},
        ],
        capture.REMOTE_HELPER_STREAM_COMMAND: [
            {
                'stdout': archive if archive is not None else fixture_archive(),
                'stderr': stream_stderr,
                'status': stream_status,
            },
        ],
    }


class CaptureCompleteSaveTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='complete-save-capture-')
        self.root = Path(self.temp.name)

    def tearDown(self):
        for path in sorted(self.root.rglob('*'), key=lambda item: len(item.parts), reverse=True):
            if path.is_dir() and not path.is_symlink():
                path.chmod(0o755)
            elif path.exists() and not path.is_symlink():
                path.chmod(0o644)
        self.temp.cleanup()

    def test_captures_hash_bound_allowlist_seals_and_passes_node_auditor(self):
        client = FakeClient(helper_responses())
        destination = self.root / 'world-copy'
        result = capture.capture_saved_world(
            destination=destination,
            connect_fn=lambda: client,
            world_identity='fixture-world',
            source_authority='fixture-authority',
            capture_uuid='fixture',
        )

        self.assertEqual(result['requiredMemberCount'], 4)
        self.assertTrue(result['sealedReadOnly'])
        self.assertTrue(client.closed)
        self.assertEqual(
            [command for command, _pty, _timeout in client.commands],
            [capture.REMOTE_HELPER_PREFLIGHT_COMMAND, capture.REMOTE_HELPER_STREAM_COMMAND],
        )
        self.assertFalse((destination / '.complete-save.tar').exists())
        self.assertEqual(stat.S_IMODE(destination.stat().st_mode), 0o555)
        self.assertEqual(stat.S_IMODE((destination / 'level.dat').stat().st_mode), 0o444)
        manifest = json.loads((destination / capture.MANIFEST_NAME).read_text())
        self.assertTrue(manifest['immutableCopy'])
        self.assertEqual(manifest['capturedAtUtc'], '2026-08-05T10:00:03.000Z')
        self.assertEqual(manifest['captureProtocol']['saveOnRestoredAtUtc'], '2026-08-05T10:00:04.000Z')
        self.assertEqual(
            [member['path'] for member in manifest['requiredMembers']],
            ['entities/r.0.0.mca', 'level.dat', 'poi/r.0.0.mca', 'region/r.0.0.mca'],
        )
        for member in manifest['requiredMembers']:
            data = (destination / member['path']).read_bytes()
            self.assertEqual(member['bytes'], len(data))
            self.assertEqual(member['sha256'], hashlib.sha256(data).hexdigest())

        audit_json = self.root / 'fixture-audit.json'
        audit_markdown = self.root / 'fixture-audit.md'
        completed = subprocess.run(
            [
                'node',
                str(ROOT / 'scripts/audit_combined_zones_complete_save.mjs'),
                '--world-root',
                str(destination),
                '--out',
                str(audit_json),
                '--markdown',
                str(audit_markdown),
                '--generated-at',
                '2026-08-05T10:01:00Z',
            ],
            cwd=ROOT,
            check=True,
            capture_output=True,
            text=True,
        )
        self.assertIn('PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE', completed.stdout)
        self.assertEqual(json.loads(audit_json.read_text())['status'], 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE')

    def test_stream_failure_leaves_unattested_incomplete_staging(self):
        responses = helper_responses(stream_status=1)
        responses[capture.REMOTE_HELPER_STREAM_COMMAND][0]['stderr'] = (
            b'CZCAPTURE_ERROR {"status":"HOLD","error":"injected archive failure"}\n'
        )
        client = FakeClient(responses)
        destination = self.root / 'failed-copy'

        with self.assertRaisesRegex(capture.CaptureError, 'stream exited 1'):
            capture.capture_saved_world(
                destination=destination,
                connect_fn=lambda: client,
                world_identity='fixture-world',
                source_authority='fixture-authority',
                capture_uuid='failure',
            )

        self.assertFalse(destination.exists())
        staging = self.root / '.failed-copy.capture-incomplete-failure'
        self.assertTrue(staging.is_dir())
        self.assertFalse((staging / capture.MANIFEST_NAME).exists())

    def test_rejects_traversal_and_hardlink_archives_after_remote_restoration(self):
        for label, archive in (
            ('traversal', fixture_archive(traversal=True)),
            ('hardlink', fixture_archive(hardlink=True)),
        ):
            with self.subTest(label=label):
                client = FakeClient(helper_responses(archive=archive))
                with self.assertRaisesRegex(capture.CaptureError, 'non-allowlisted member'):
                    capture.capture_saved_world(
                        destination=self.root / f'{label}-copy',
                        connect_fn=lambda: client,
                        world_identity='fixture-world',
                        source_authority='fixture-authority',
                        capture_uuid=label,
                    )
                self.assertFalse((self.root / 'escape.txt').exists())

    def test_refuses_existing_destination_and_invalid_identity_before_contact(self):
        destination = self.root / 'existing'
        destination.mkdir()
        contacted = False

        def connect():
            nonlocal contacted
            contacted = True
            return FakeClient(helper_responses())

        with self.assertRaisesRegex(capture.CaptureError, 'will not be overwritten'):
            capture.capture_saved_world(
                destination=destination,
                connect_fn=connect,
                world_identity='fixture-world',
                source_authority='fixture-authority',
            )
        self.assertFalse(contacted)

        with self.assertRaisesRegex(capture.CaptureError, 'world_identity'):
            capture.capture_saved_world(
                destination=self.root / 'invalid',
                connect_fn=connect,
                world_identity='\n',
                source_authority='fixture-authority',
            )
        self.assertFalse(contacted)

    def test_helper_hash_mismatch_fails_before_stream_or_staging(self):
        client = FakeClient(helper_responses(preflight_sha='0' * 64))
        destination = self.root / 'hash-mismatch'
        with self.assertRaisesRegex(capture.CaptureError, 'identity/contract mismatch'):
            capture.capture_saved_world(
                destination=destination,
                connect_fn=lambda: client,
                world_identity='fixture-world',
                source_authority='fixture-authority',
            )
        self.assertEqual(len(client.commands), 1)
        self.assertFalse(destination.exists())
        self.assertFalse(any(path.name.startswith('.hash-mismatch') for path in self.root.iterdir()))

    def test_nonmonotonic_remote_protocol_fails_without_manifest(self):
        metadata = stream_payload(capture.expected_remote_helper_sha256(), monotonic=False)
        client = FakeClient(helper_responses(stream=metadata))
        with self.assertRaisesRegex(capture.CaptureError, 'not monotonic'):
            capture.capture_saved_world(
                destination=self.root / 'clock-drift',
                connect_fn=lambda: client,
                world_identity='fixture-world',
                source_authority='fixture-authority',
                capture_uuid='clock',
            )
        self.assertFalse((self.root / '.clock-drift.capture-incomplete-clock' / capture.MANIFEST_NAME).exists())

    def test_remote_channel_timeout_is_bounded(self):
        client = FakeClient({
            capture.REMOTE_HELPER_PREFLIGHT_COMMAND: [
                {'stdout': b'', 'stderr': b'', 'status': 0, 'never_exit': True},
            ],
        })
        with self.assertRaisesRegex(capture.CaptureError, 'bounded'):
            capture.run_remote_command(
                client,
                capture.REMOTE_HELPER_PREFLIGHT_COMMAND,
                timeout_seconds=0.01,
                sleep_fn=lambda _seconds: None,
            )


if __name__ == '__main__':
    unittest.main()
