import importlib.util
import io
import os
from pathlib import Path
from contextlib import redirect_stderr
import subprocess
import tempfile
import unittest
from unittest import mock


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / 'scripts' / 'packetcraft_complete_save_capture_helper.py'
SPEC = importlib.util.spec_from_file_location('packetcraft_complete_save_capture_helper', SCRIPT)
assert SPEC is not None and SPEC.loader is not None
helper = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(helper)


class FakeRcon:
    def __init__(self, replies):
        self.replies = dict(replies)
        self.commands = []
        self.closed = False

    def command(self, command):
        self.commands.append(command)
        reply = self.replies[command]
        if isinstance(reply, BaseException):
            raise reply
        return reply

    def close(self):
        self.closed = True

    def __enter__(self):
        return self

    def __exit__(self, _exc_type, _exc, _traceback):
        self.close()


class CompleteSaveRemoteHelperTest(unittest.TestCase):
    def test_semantic_paper_save_replies(self):
        self.assertEqual(
            helper.classify_save_off_reply('Automatic saving is now disabled'),
            'DISABLED_BY_HELPER',
        )
        self.assertEqual(
            helper.classify_save_off_reply('Saving the game is already turned off'),
            'ALREADY_DISABLED',
        )
        self.assertEqual(
            helper.validate_flush_reply('Saving the game (this may take a moment!)\nSaved the game'),
            'Saving the game (this may take a moment!)\nSaved the game',
        )
        self.assertEqual(
            helper.validate_save_on_reply('Automatic saving is now enabled'),
            'Automatic saving is now enabled',
        )
        for command, reply in (
            ('save-off', 'command accepted'),
            ('save-all flush', 'Saving the game (this may take a moment!)'),
            ('save-on', 'command accepted'),
        ):
            with self.subTest(command=command):
                validator = {
                    'save-off': helper.classify_save_off_reply,
                    'save-all flush': helper.validate_flush_reply,
                    'save-on': helper.validate_save_on_reply,
                }[command]
                with self.assertRaises(helper.HelperError):
                    validator(reply)

    def test_lease_restores_enabled_state_on_parent_request(self):
        rcon = FakeRcon({
            'save-off': 'Automatic saving is now disabled',
            'save-all flush': 'Saved the game',
            'save-on': 'Automatic saving is now enabled',
        })
        messages = []
        times = iter([
            '2026-08-05T10:00:00.000Z',
            '2026-08-05T10:00:01.000Z',
            '2026-08-05T10:00:02.000Z',
        ])
        helper.run_save_state_lease(
            rcon_factory=lambda: rcon,
            wait_for_parent=lambda _timeout: 'RESTORE',
            emit=messages.append,
            now_fn=lambda: next(times),
        )
        self.assertEqual(rcon.commands, ['save-off', 'save-all flush', 'save-on'])
        self.assertEqual([message['type'] for message in messages], ['READY', 'RESTORED'])
        self.assertEqual(messages[1]['restorationAction'], 'SAVE_ON_CONFIRMED')
        self.assertEqual(messages[1]['restorationReason'], 'RESTORE')

    def test_lease_deadman_restores_enabled_state(self):
        rcon = FakeRcon({
            'save-off': 'Automatic saving is now disabled',
            'save-all flush': 'Saved the world',
            'save-on': 'Saving is already turned on',
        })
        messages = []
        helper.run_save_state_lease(
            rcon_factory=lambda: rcon,
            wait_for_parent=lambda _timeout: 'DEADMAN',
            emit=messages.append,
        )
        self.assertEqual(rcon.commands, ['save-off', 'save-all flush', 'save-on'])
        self.assertEqual(messages[-1]['restorationReason'], 'DEADMAN')

    def test_lease_preserves_preexisting_save_off(self):
        rcon = FakeRcon({
            'save-off': 'Saving the game is already turned off',
            'save-all flush': 'Saved the game',
        })
        messages = []
        helper.run_save_state_lease(
            rcon_factory=lambda: rcon,
            wait_for_parent=lambda _timeout: 'PARENT_CLOSED',
            emit=messages.append,
        )
        self.assertEqual(rcon.commands, ['save-off', 'save-all flush'])
        self.assertEqual(messages[-1]['restorationAction'], 'PREEXISTING_SAVE_OFF_PRESERVED')
        self.assertEqual(messages[-1]['restorationReason'], 'PARENT_CLOSED')

    def test_independent_lease_restores_after_parent_pipe_closes(self):
        def rcon_factory():
            return FakeRcon({
                'save-off': 'Automatic saving is now disabled',
                'save-all flush': 'Saved the game',
                'save-on': 'Automatic saving is now enabled',
            })

        child_pid, control_write, status_read = helper.start_independent_lease(rcon_factory)
        try:
            ready = helper.read_pipe_message(status_read, 2)
            self.assertEqual(ready['type'], 'READY')
            os.close(control_write)
            control_write = -1
            restored = helper.read_pipe_message(status_read, 2)
            self.assertEqual(restored['type'], 'RESTORED')
            self.assertEqual(restored['restorationReason'], 'PARENT_CLOSED')
            self.assertEqual(restored['restorationAction'], 'SAVE_ON_CONFIRMED')
            helper.reap_child(child_pid, 2)
            child_pid = -1
        finally:
            if control_write >= 0:
                os.close(control_write)
            os.close(status_read)
            if child_pid >= 0:
                try:
                    os.waitpid(child_pid, 0)
                except ChildProcessError:
                    pass

    def test_flush_failure_restores_when_helper_disabled_saving(self):
        primary = FakeRcon({
            'save-off': 'Automatic saving is now disabled',
            'save-all flush': 'Saving the game (this may take a moment!)',
        })
        recovery = FakeRcon({'save-on': 'Automatic saving is now enabled'})
        rcons = iter([primary, recovery])
        messages = []
        helper.run_save_state_lease(
            rcon_factory=lambda: next(rcons),
            wait_for_parent=lambda _timeout: 'RESTORE',
            emit=messages.append,
        )
        self.assertEqual(primary.commands, ['save-off', 'save-all flush'])
        self.assertEqual(recovery.commands, ['save-on'])
        self.assertEqual(messages[-1]['type'], 'ERROR')
        self.assertIsNone(messages[-1]['restorationError'])

    def test_fixed_world_inventory_and_tar_command_are_allowlisted_without_shell(self):
        with tempfile.TemporaryDirectory(prefix='helper-world-') as temp:
            world = Path(temp)
            for directory in helper.REQUIRED_DIRECTORIES:
                (world / directory).mkdir()
                (world / directory / 'r.0.0.mca').write_bytes(directory.encode('ascii'))
            (world / 'level.dat').write_bytes(b'level')
            inventory = helper.inspect_fixed_world(world)
            command = helper.build_tar_command(inventory, world)
        self.assertEqual(command[0], '/usr/bin/tar')
        self.assertNotIn('/bin/sh', command)
        self.assertNotIn('-c', command)
        self.assertIn('level.dat', command)
        self.assertIn('entities/r.0.0.mca', command)
        self.assertEqual(inventory['memberCount'], 4)

    def test_fixed_archive_timeout_fails_closed(self):
        inventory = {
            'members': [{'path': 'level.dat', 'bytes': 1}],
        }
        with mock.patch.object(
            helper.subprocess,
            'run',
            side_effect=subprocess.TimeoutExpired(['/usr/bin/tar'], 1),
        ):
            with self.assertRaisesRegex(helper.HelperError, 'exceeded 1 seconds'):
                helper.run_fixed_archive(inventory, output=io.BytesIO(), timeout_seconds=1)

    def test_helper_accepts_only_one_fixed_mode(self):
        self.assertEqual(helper.parse_mode(['--preflight']), 'preflight')
        self.assertEqual(helper.parse_mode(['--stream']), 'stream')
        for argv in ([], ['--preflight', '--stream'], ['--stream', '--world', 'other']):
            with self.subTest(argv=argv), self.assertRaises(SystemExit), redirect_stderr(io.StringIO()):
                helper.parse_mode(argv)


if __name__ == '__main__':
    unittest.main()
