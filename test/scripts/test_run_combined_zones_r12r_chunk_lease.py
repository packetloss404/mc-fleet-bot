import importlib.util
import os
import unittest


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SCRIPT = os.path.join(ROOT, 'scripts', 'run_combined_zones_r12r_chunk_lease.py')
SPEC = importlib.util.spec_from_file_location('r12r_chunk_lease', SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def reply(chunks):
    if not chunks:
        return 'No force loaded chunks were found'
    coords = ', '.join(f'[{x}, {z}]' for x, z in sorted(chunks))
    return f'{len(chunks)} chunks are marked for force loading: {coords}'


class FakeRcon:
    def __init__(self, chunks):
        self.chunks = set(chunks)
        self.commands = []
        self.closed = False

    def cmd(self, command):
        self.commands.append(command)
        fields = command.split()
        if command == 'forceload query':
            return reply(self.chunks)
        if fields[:2] == ['forceload', 'query']:
            chunk = (int(fields[2]) // 16, int(fields[3]) // 16)
            return ('That position is marked for force loading'
                    if chunk in self.chunks
                    else 'That position is not marked for force loading')
        if fields[:2] == ['forceload', 'add']:
            self.chunks.add((int(fields[2]) // 16, int(fields[3]) // 16))
            return 'Marked chunk for force loading'
        if fields[:2] == ['forceload', 'remove']:
            self.chunks.discard((int(fields[2]) // 16, int(fields[3]) // 16))
            return 'Chunk is no longer force loaded'
        raise AssertionError(command)

    def close(self):
        self.closed = True


class ChunkLeaseTest(unittest.TestCase):
    def test_plan_is_read_only(self):
        calls = []
        report = MODULE.ChunkLease(lambda: calls.append(True)).plan()
        self.assertEqual(report['status'], 'PLAN_VALIDATED_NO_RCON_CONNECTION')
        self.assertEqual(calls, [])
        self.assertEqual(report['requiredChunks'], [{'x': 128, 'z': -47}, {'x': 129, 'z': -47}])

    def test_acquire_preserves_preexisting_and_release_removes_only_owned(self):
        fake = FakeRcon({(10, 20), (128, -47)})
        lease = MODULE.ChunkLease(lambda: fake, clock=lambda: 'fixed').acquire()
        self.assertEqual(lease['ownedAdditions'], [{'x': 129, 'z': -47}])
        self.assertEqual(fake.chunks, {(10, 20), (128, -47), (129, -47)})
        release = MODULE.ChunkLease(lambda: fake, clock=lambda: 'fixed').release(lease)
        self.assertEqual(release['status'], 'LEASE_RELEASED_PREEXISTING_SET_EXACTLY_RESTORED')
        self.assertEqual(fake.chunks, {(10, 20), (128, -47)})
        self.assertNotIn('forceload remove all', fake.commands)

    def test_release_refuses_payload_drift_before_connection(self):
        fake = FakeRcon(set())
        lease = MODULE.ChunkLease(lambda: fake).acquire()
        lease['ownedAdditions'].append({'x': 130, 'z': -47})
        calls = []
        with self.assertRaisesRegex(ValueError, 'payload hash drifted'):
            MODULE.ChunkLease(lambda: calls.append(True)).release(lease)
        self.assertEqual(calls, [])

    def test_all_required_preexisting_are_never_removed(self):
        fake = FakeRcon(MODULE.REQUIRED | {(1, 1)})
        lease = MODULE.ChunkLease(lambda: fake).acquire()
        self.assertEqual(lease['ownedAdditions'], [])
        MODULE.ChunkLease(lambda: fake).release(lease)
        self.assertEqual(fake.chunks, MODULE.REQUIRED | {(1, 1)})
        self.assertFalse(any(command.startswith('forceload remove ') for command in fake.commands))

    def test_partial_acquire_failure_removes_exact_uncertain_addition(self):
        class FailSecondAdd(FakeRcon):
            def cmd(self, command):
                if command == 'forceload add 2064 -752':
                    self.commands.append(command)
                    self.chunks.add((129, -47))
                    raise RuntimeError('reply lost after accepted add')
                return super().cmd(command)

        fake = FailSecondAdd(set())
        with self.assertRaisesRegex(RuntimeError, 'reply lost'):
            MODULE.ChunkLease(lambda: fake).acquire()
        self.assertEqual(fake.chunks, set())
        self.assertIn('forceload remove 2048 -752', fake.commands)
        self.assertIn('forceload remove 2064 -752', fake.commands)


if __name__ == '__main__':
    unittest.main()
