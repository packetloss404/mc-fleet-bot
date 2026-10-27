import importlib.util
import os
import re
import unittest


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
FUNCTIONAL_PATH = os.path.join(
    ROOT, 'scripts', 'run_combined_zones_r12r_b09_active_shuttle_functional.py'
)
ENTITY_PATH = os.path.join(ROOT, 'scripts', 'run_guarded_tagged_minecart_transaction.py')


def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


ENTITY = load('entity_kernel_for_functional_test', ENTITY_PATH)
FUNCTIONAL = load('r12r_functional', FUNCTIONAL_PATH)
UUID = [101, -202, 303, -404]


def forward_report():
    spec = ENTITY.validate_spec({
        'transactionId': FUNCTIONAL.TRANSACTION_ID,
        'aabb': {
            'minX': 2058, 'minY': 130, 'minZ': -748,
            'maxX': 2073, 'maxY': 131, 'maxZ': -747,
        },
        'spawn': [2058.5, 130.0625, -747.5],
        'positionTolerance': 0.05,
    })
    report = {
        'schemaVersion': 1,
        'transactionId': FUNCTIONAL.TRANSACTION_ID,
        'mode': 'EXECUTE_FORWARD',
        'status': 'EXECUTED_POSTCONDITION_VERIFIED',
        'generatedAtUtc': '2026-08-22T05:30:00Z',
        'spec': spec,
        'capturedIdentity': {
            'uuidIntArray': UUID,
            'entityType': 'minecraft:minecart',
            'tag': FUNCTIONAL.TAG,
            'position': [2058.5, 130.0625, -747.5],
        },
        'failure': None,
        'compensation': None,
        'journal': [],
        'journalBinding': None,
        'safetyBoundary': {
            'broadMinecartKillUsed': False,
            'tagOnlyKillUsed': False,
            'exactUuidKillRequired': True,
        },
    }
    report['reportPayloadSha256'] = ENTITY.payload_hash(report)
    return report


class FakeRcon:
    def __init__(self, traverse=True):
        self.controls = {x: False for x in FUNCTIONAL.CONTROL_X}
        self.traverse = traverse
        self.positions = [[2058.5, 130.0625, -747.5]]
        if traverse:
            self.positions += [
                [2071.5, 130.0625, -747.5],
                [2058.75, 130.0625, -747.5],
            ]
        self.last = self.positions[-1]
        self.commands = []
        self.closed = False

    def cmd(self, command):
        self.commands.append(command)
        if command.startswith('execute if entity '):
            return 'Test passed, count: 1'
        if command.startswith('execute if block '):
            match = re.match(r'execute if block (-?\d+) (-?\d+) (-?\d+) (\S+)(?: run setblock .* (\S+))?$', command)
            if not match:
                raise AssertionError(command)
            x, _, z = map(int, match.group(1, 2, 3))
            expected = match.group(4)
            target = match.group(5)
            if z == FUNCTIONAL.CONTROL_Z:
                current = FUNCTIONAL.LEVER_ON if self.controls[x] else FUNCTIONAL.LEVER_OFF
                matches = current == expected
                if target and matches:
                    self.controls[x] = target == FUNCTIONAL.LEVER_ON
            else:
                powered = all(self.controls.values())
                current = FUNCTIONAL.RAIL_ON if powered else FUNCTIONAL.RAIL_OFF
                matches = current == expected
            if not matches:
                return 'Test failed'
            return 'Set the block' if target else 'Test passed'
        if command.endswith(' Pos'):
            if len(self.positions) > 1:
                self.last = self.positions.pop(0)
            else:
                self.last = self.positions[0]
            return 'Minecart has the following entity data: [' + ', '.join(
                f'{value}d' for value in self.last
            ) + ']'
        if command.endswith(' Motion'):
            return 'Minecart has the following entity data: [0.0d, 0.0d, 0.0d]'
        raise AssertionError(command)

    def close(self):
        self.closed = True


class FunctionalVerifierTest(unittest.TestCase):
    def test_dry_plan_never_connects(self):
        calls = []
        report = FUNCTIONAL.FunctionalVerifier(
            lambda: calls.append(True), clock=lambda: '2026-08-22T05:30:00Z'
        ).plan()
        self.assertEqual(report['status'], 'PLAN_VALIDATED_NO_RCON_CONNECTION')
        self.assertEqual(calls, [])
        self.assertFalse(report['safetyBoundary']['worldMutationPerformed'])
        self.assertEqual(report['reportPayloadSha256'], FUNCTIONAL.payload_hash(report))

    def test_pass_observes_round_trip_and_fail_closed_park(self):
        fake = FakeRcon()
        report = FUNCTIONAL.FunctionalVerifier(
            lambda: fake, clock=lambda: '2026-08-22T05:30:00Z', sleeper=lambda _: None
        ).execute(forward_report(), timeout_seconds=1, poll_seconds=0)
        self.assertEqual(report['status'], 'PASS_WEST_EAST_WEST_FAIL_CLOSED_PARK_VERIFIED')
        self.assertTrue(report['terminal']['controlsOff'])
        self.assertEqual(report['terminal']['railsUnpoweredCount'], 15)
        self.assertTrue(report['terminal']['stationary'])
        self.assertTrue(report['terminal']['insideWestParkEnvelope'])
        self.assertFalse(report['safetyBoundary']['entityKillUsed'])
        self.assertTrue(fake.closed)

    def test_motion_failure_still_deenergizes_both_controls(self):
        fake = FakeRcon(traverse=False)
        report = FUNCTIONAL.FunctionalVerifier(
            lambda: fake, clock=lambda: '2026-08-22T05:30:00Z', sleeper=lambda _: None
        ).execute(forward_report(), timeout_seconds=0, poll_seconds=0)
        self.assertEqual(report['status'], 'FAIL_FUNCTIONAL_OR_FAIL_CLOSED_TERMINAL_UNVERIFIED')
        self.assertTrue(report['terminal']['controlsOff'])
        self.assertEqual(report['terminal']['railsUnpoweredCount'], 15)
        self.assertEqual(fake.controls, {2061: False, 2070: False})
        on_commands = [command for command in fake.commands
                       if ' run setblock ' in command
                       and command.endswith(FUNCTIONAL.LEVER_ON)]
        off_commands = [command for command in fake.commands
                        if ' run setblock ' in command
                        and command.endswith(FUNCTIONAL.LEVER_OFF)]
        self.assertEqual(len(on_commands), 2)
        self.assertEqual(len(off_commands), 2)
        self.assertFalse(any(command.startswith('kill ') for command in fake.commands))

    def test_not_loaded_or_unknown_block_reply_fails_closed(self):
        class NotLoaded(FakeRcon):
            def cmd(self, command):
                if command.startswith('execute if block '):
                    return 'That position is not loaded'
                return super().cmd(command)

        fake = NotLoaded()
        report = FUNCTIONAL.FunctionalVerifier(
            lambda: fake, sleeper=lambda _: None
        ).execute(forward_report(), timeout_seconds=0, poll_seconds=0)
        self.assertEqual(report['status'], 'FAIL_FUNCTIONAL_OR_FAIL_CLOSED_TERMINAL_UNVERIFIED')
        self.assertIn('not initially OFF', report['failure'])
        self.assertFalse(report['terminal']['controlsOff'])

    def test_rejects_forward_report_hash_drift_before_connection(self):
        calls = []
        report = forward_report()
        report['capturedIdentity']['uuidIntArray'][0] += 1
        with self.assertRaisesRegex(ValueError, 'payload hash drifted'):
            FUNCTIONAL.FunctionalVerifier(lambda: calls.append(True)).execute(report)
        self.assertEqual(calls, [])


if __name__ == '__main__':
    unittest.main()
