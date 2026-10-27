import importlib.util
import os
import re
import unittest


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SCRIPT = os.path.join(ROOT, 'scripts', 'run_guarded_tagged_minecart_transaction.py')
SPEC = importlib.util.spec_from_file_location('guarded_tagged_minecart', SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)
FIXED_TIME = '2026-08-22T05:00:00Z'
UUID = [101, -202, 303, -404]


def base_spec(tag=None):
    spec = {
        'transactionId': 'CZ-R12-B09-ACTIVE-SHUTTLE-MINECART-V1',
        'aabb': {
            'minX': 2058, 'minY': 130, 'minZ': -748,
            'maxX': 2073, 'maxY': 131, 'maxZ': -747,
        },
        'spawn': [2058.5, 130.0625, -747.5],
        'positionTolerance': 0.05,
    }
    if tag is not None:
        spec['tag'] = tag
    return spec


TAG = MODULE.validate_spec(base_spec())['tag']


class FakeRcon:
    def __init__(self, entities=None, failure=None):
        self.entities = list(entities or [])
        self.failure = failure
        self.commands = []
        self.closed = False
        self.uuid_reads = 0
        self.exact_count_reads = 0
        self.global_post_reads = 0

    @staticmethod
    def entity(uuid=UUID, tag=TAG, pos=(2058.5, 130.0625, -747.5),
               entity_type='minecraft:minecart'):
        return {
            'uuid': list(uuid), 'type': entity_type,
            'tag': tag, 'pos': list(pos),
        }

    @staticmethod
    def _selector(command):
        match = re.search(r'@e\[(.*)\]', command)
        if not match:
            raise AssertionError(f'command has no selector: {command}')
        return match.group(1)

    def _matches(self, command):
        selector = self._selector(command)
        tag_match = re.search(r'(?:^|,)tag=([a-z0-9_.+-]+)', selector)
        uuid_match = re.search(
            r'UUID:\[I;(-?\d+),(-?\d+),(-?\d+),(-?\d+)\]', selector
        )
        values = {}
        for key in ('x', 'y', 'z', 'dx', 'dy', 'dz'):
            match = re.search(rf'(?:^|,){key}=(-?(?:\d+(?:\.\d*)?|\.\d+))', selector)
            if match:
                values[key] = float(match.group(1))
        output = []
        for entity in self.entities:
            if 'type=minecraft:minecart' in selector and entity['type'] != 'minecraft:minecart':
                continue
            if tag_match and entity['tag'] != tag_match.group(1):
                continue
            if uuid_match and entity['uuid'] != [int(uuid_match.group(i)) for i in range(1, 5)]:
                continue
            if {'x', 'y', 'z', 'dx', 'dy', 'dz'} <= set(values):
                if not all(
                    values[axis] <= entity['pos'][index] <= values[axis] + values[f'd{axis}']
                    for index, axis in enumerate(('x', 'y', 'z'))
                ):
                    continue
            output.append(entity)
        return output

    def cmd(self, command):
        self.commands.append(command)
        if command.startswith('summon minecraft:minecart '):
            self.entities.append(self.entity())
            return 'Summon rejected after server acceptance' if self.failure == 'summon-reply' else 'Summoned new Minecart'
        if command.startswith('execute if entity '):
            matches = self._matches(command)
            if 'nbt={UUID:' in command:
                self.exact_count_reads += 1
                if self.failure == 'first-exact-count' and self.exact_count_reads == 1:
                    return 'Test failed'
            if command.endswith(f'tag={TAG}]'):
                self.global_post_reads += 1
                if self.failure == 'first-post-global-duplicate' and self.global_post_reads == 2:
                    return 'Test passed, count: 2'
            return 'Test failed' if not matches else f'Test passed, count: {len(matches)}'
        if command.startswith('data get entity ') and command.endswith(' UUID'):
            self.uuid_reads += 1
            if self.failure == 'first-uuid-read' and self.uuid_reads == 1:
                return 'Malformed UUID reply'
            matches = self._matches(command)
            if len(matches) != 1:
                return 'No entity was found'
            return 'Minecart has the following entity data: [I;' + ','.join(
                str(value) for value in matches[0]['uuid']
            ) + ']'
        if command.startswith('data get entity ') and command.endswith(' Pos'):
            matches = self._matches(command)
            if len(matches) != 1:
                return 'No entity was found'
            position = matches[0]['pos']
            if self.failure == 'position-mismatch':
                position = [position[0] + 0.2, position[1], position[2]]
            return 'Minecart has the following entity data: [' + ', '.join(
                f'{value}d' for value in position
            ) + ']'
        if command.startswith('kill '):
            matches = self._matches(command)
            if self.failure == 'kill-reply':
                return 'No entity was found'
            if len(matches) != 1:
                return f'Killed {len(matches)} entities'
            self.entities.remove(matches[0])
            return 'Killed 1 entities'
        raise AssertionError(command)

    def close(self):
        self.closed = True


def executor(fake, spec=None):
    return MODULE.TaggedMinecartExecutor(
        spec or base_spec(), lambda: fake, clock=lambda: FIXED_TIME
    )


def journal():
    return MODULE.JsonlJournal(clock=lambda: FIXED_TIME)


class TaggedMinecartExecutorTest(unittest.TestCase):
    def test_rejects_any_tag_other_than_the_derived_transaction_identity(self):
        with self.assertRaisesRegex(ValueError, 'derived deterministic value'):
            MODULE.validate_spec(base_spec('cz_r12_b09_active_shuttle_v1'))

    def test_dry_run_is_default_safe_and_identity_is_deterministic(self):
        calls = []
        tx = MODULE.TaggedMinecartExecutor(
            base_spec(), lambda: calls.append('connected'), clock=lambda: FIXED_TIME
        )
        first = tx.dry_run()
        second = tx.dry_run()
        self.assertEqual(first, second)
        self.assertEqual(calls, [])
        self.assertRegex(first['spec']['tag'], r'^cz_r12_[0-9a-f]{32}$')
        self.assertRegex(first['spec']['name'], r'^CZ R12 minecart [0-9a-f]{16}$')
        self.assertFalse(first['safetyBoundary']['rconConnected'])
        self.assertEqual(first['reportPayloadSha256'], MODULE.payload_hash(first))

    def test_forward_success_captures_exact_uuid_type_position_and_hash_chain(self):
        fake = FakeRcon()
        report = executor(fake).execute_forward(journal())
        self.assertEqual(report['status'], 'EXECUTED_POSTCONDITION_VERIFIED')
        self.assertEqual(report['capturedIdentity']['uuidIntArray'], UUID)
        self.assertEqual(report['capturedIdentity']['entityType'], 'minecraft:minecart')
        self.assertEqual(report['capturedIdentity']['position'], [2058.5, 130.0625, -747.5])
        self.assertEqual(len(fake.entities), 1)
        self.assertFalse(any(command.startswith('kill ') for command in fake.commands))
        self.assertEqual(report['reportPayloadSha256'], MODULE.payload_hash(report))
        self.assertTrue(all(
            entry['previousEntrySha256'] == (None if index == 0 else report['journal'][index - 1]['entrySha256'])
            for index, entry in enumerate(report['journal'])
        ))

    def test_global_tag_collision_outside_aabb_fails_before_summon(self):
        fake = FakeRcon([FakeRcon.entity(pos=(3000, 70, 3000))])
        report = executor(fake).execute_forward(journal())
        self.assertEqual(report['status'], 'FAILED_NO_MUTATION')
        self.assertFalse(any(command.startswith('summon ') for command in fake.commands))
        self.assertFalse(any(command.startswith('kill ') for command in fake.commands))

    def test_global_tag_collision_on_foreign_entity_type_fails_before_summon(self):
        fake = FakeRcon([FakeRcon.entity(pos=(3000, 70, 3000), entity_type='minecraft:pig')])
        report = executor(fake).execute_forward(journal())
        self.assertEqual(report['status'], 'FAILED_NO_MUTATION')
        self.assertFalse(any(command.startswith('summon ') for command in fake.commands))
        self.assertFalse(any(command.startswith('kill ') for command in fake.commands))

    def test_foreign_minecart_in_aabb_fails_before_summon(self):
        fake = FakeRcon([
            FakeRcon.entity(uuid=[9, 8, 7, 6], tag='foreign', pos=(2072.5, 130.0625, -747.5))
        ])
        report = executor(fake).execute_forward(journal())
        self.assertEqual(report['status'], 'FAILED_NO_MUTATION')
        self.assertIn('bounded AABB is occupied', report['failure'])
        self.assertFalse(any(command.startswith('summon ') for command in fake.commands))
        self.assertFalse(any(command.startswith('kill ') for command in fake.commands))

    def test_uncertain_summon_reply_recovers_then_kills_only_exact_uuid(self):
        fake = FakeRcon(failure='summon-reply')
        report = executor(fake).execute_forward(journal())
        self.assertEqual(report['status'], 'FAILED_COMPENSATED_TO_ZERO')
        self.assertEqual(fake.entities, [])
        kills = [command for command in fake.commands if command.startswith('kill ')]
        self.assertEqual(len(kills), 1)
        self.assertIn('UUID:[I;101,-202,303,-404]', kills[0])
        self.assertIn(f'tag={TAG}', kills[0])
        self.assertIn('x=2058', kills[0])
        self.assertNotEqual(kills[0], 'kill @e[type=minecraft:minecart]')

    def test_each_post_summon_observation_failure_compensates_exact_uuid(self):
        for failure in ('first-post-global-duplicate', 'first-uuid-read',
                        'first-exact-count', 'position-mismatch'):
            with self.subTest(failure=failure):
                fake = FakeRcon(failure=failure)
                report = executor(fake).execute_forward(journal())
                self.assertEqual(report['status'], 'FAILED_COMPENSATED_TO_ZERO')
                self.assertEqual(fake.entities, [])
                kills = [command for command in fake.commands if command.startswith('kill ')]
                self.assertEqual(len(kills), 1)
                self.assertIn('UUID:[I;101,-202,303,-404]', kills[0])

    def test_compensation_never_broadens_when_unique_identity_cannot_be_recovered(self):
        class ConcurrentDuplicate(FakeRcon):
            def cmd(self, command):
                reply = super().cmd(command)
                if command.startswith('summon '):
                    self.entities.append(self.entity(uuid=[5, 6, 7, 8]))
                    return 'Summon reply lost'
                return reply

        fake = ConcurrentDuplicate()
        report = executor(fake).execute_forward(journal())
        self.assertEqual(report['status'], 'FAILED_COMPENSATION_INCOMPLETE')
        self.assertFalse(any(command.startswith('kill ') for command in fake.commands))
        self.assertEqual(len(fake.entities), 2)

    def test_failed_exact_kill_reports_incomplete_and_does_not_retry_broadly(self):
        fake = FakeRcon(failure='kill-reply')
        # Force a postcondition failure after the summon so compensation runs.
        original_cmd = fake.cmd
        post_counts = {'global': 0}

        def command(value):
            if value.startswith('execute if entity ') and value.endswith(f'tag={TAG}]'):
                post_counts['global'] += 1
                if post_counts['global'] == 2:
                    return 'Test passed, count: 2'
            return original_cmd(value)

        fake.cmd = command
        report = executor(fake).execute_forward(journal())
        self.assertEqual(report['status'], 'FAILED_COMPENSATION_INCOMPLETE')
        self.assertEqual(len([c for c in fake.commands if c.startswith('kill ')]), 1)
        self.assertEqual(len(fake.entities), 1)

    def test_explicit_rollback_reverifies_and_kills_only_captured_uuid(self):
        forward_fake = FakeRcon()
        forward = executor(forward_fake).execute_forward(journal())
        rollback_fake = FakeRcon([FakeRcon.entity()])
        report = executor(rollback_fake, forward['spec']).execute_rollback(forward, journal())
        self.assertEqual(report['status'], 'ROLLBACK_POSTCONDITION_VERIFIED')
        self.assertEqual(rollback_fake.entities, [])
        kills = [command for command in rollback_fake.commands if command.startswith('kill ')]
        self.assertEqual(len(kills), 1)
        self.assertIn('UUID:[I;101,-202,303,-404]', kills[0])
        self.assertEqual(report['forwardReportPayloadSha256'], forward['reportPayloadSha256'])

    def test_explicit_rollback_accepts_exact_identity_moved_inside_full_shuttle_aabb(self):
        forward_fake = FakeRcon()
        forward = executor(forward_fake).execute_forward(journal())
        rollback_fake = FakeRcon([
            FakeRcon.entity(pos=(2072.5, 130.0625, -747.5))
        ])
        report = executor(rollback_fake, forward['spec']).execute_rollback(forward, journal())
        self.assertEqual(report['status'], 'ROLLBACK_POSTCONDITION_VERIFIED')
        verification = next(
            entry for entry in report['journal']
            if entry['event'] == 'exact-uuid-verified-before-kill'
        )
        self.assertEqual(
            verification['details']['positionPolicy'],
            'ANY_POSITION_INSIDE_FULL_SHUTTLE_AABB',
        )

    def test_explicit_rollback_rejects_exact_identity_outside_full_shuttle_aabb(self):
        forward_fake = FakeRcon()
        forward = executor(forward_fake).execute_forward(journal())
        rollback_fake = FakeRcon([
            FakeRcon.entity(pos=(2073.5, 130.0625, -747.5))
        ])
        report = executor(rollback_fake, forward['spec']).execute_rollback(forward, journal())
        self.assertEqual(report['status'], 'ROLLBACK_FAILED_NO_BROADENED_CLEANUP')
        self.assertFalse(any(command.startswith('kill ') for command in rollback_fake.commands))

    def test_rollback_uuid_mismatch_fails_without_any_broadened_kill(self):
        forward_fake = FakeRcon()
        forward = executor(forward_fake).execute_forward(journal())
        rollback_fake = FakeRcon([FakeRcon.entity(uuid=[1, 2, 3, 5])])
        report = executor(rollback_fake, forward['spec']).execute_rollback(forward, journal())
        self.assertEqual(report['status'], 'ROLLBACK_FAILED_NO_BROADENED_CLEANUP')
        self.assertFalse(any(command.startswith('kill ') for command in rollback_fake.commands))

    def test_tampered_forward_report_is_rejected_before_rollback_rcon(self):
        forward_fake = FakeRcon()
        forward = executor(forward_fake).execute_forward(journal())
        forward['capturedIdentity']['uuidIntArray'][0] += 1
        calls = []
        tx = MODULE.TaggedMinecartExecutor(
            forward['spec'], lambda: calls.append('connected'), clock=lambda: FIXED_TIME
        )
        with self.assertRaisesRegex(ValueError, 'payload hash drifted'):
            tx.execute_rollback(forward, journal())
        self.assertEqual(calls, [])


if __name__ == '__main__':
    unittest.main()
