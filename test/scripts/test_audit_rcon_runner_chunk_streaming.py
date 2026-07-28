import importlib.util
import pathlib
import unittest


ROOT = pathlib.Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location(
    'audit_rcon_runner_chunk_streaming',
    ROOT / 'scripts' / 'audit_rcon_runner_chunk_streaming.py',
)
AUDIT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(AUDIT)


class RconRunnerChunkStreamingAuditTest(unittest.TestCase):
    def test_box_chunks_handles_negative_boundaries_exactly(self):
        self.assertEqual(
            AUDIT.box_chunks((-17, 0, -16, 16, 1, 15)),
            {
                (-2, -1), (-1, -1), (0, -1), (1, -1),
                (-2, 0), (-1, 0), (0, 0), (1, 0),
            },
        )

    def test_town_cmd_parser_covers_source_guards_and_write_target(self):
        command = (
            'execute if block -116 68 -379 minecraft:barrel '
            'if block -131 70 -303 minecraft:barrel '
            'run data merge block -131 70 -303 {Items:[]}'
        )
        self.assertEqual(
            AUDIT.command_coordinates(command),
            [
                (-116, 68, -379),
                (-131, 70, -303),
                (-131, 70, -303),
            ],
        )
        self.assertEqual(
            AUDIT.command_chunks(command),
            {(-8, -24), (-9, -19)},
        )

    def test_unknown_or_relative_cmd_fails_closed(self):
        for command in (
            'say hello',
            'data merge block ~ ~ ~ {Items:[]}',
            'execute if block 1 2 3 minecraft:stone run setblock 4 5 6 air',
        ):
            with self.assertRaises(ValueError):
                AUDIT.command_coordinates(command)

    def test_current_canonical_package_census_is_exact(self):
        result = AUDIT.build_audit(AUDIT.DEFAULT_OPERATIONS, 104)
        self.assertEqual(
            result['census']['sourceKindCounts']['REPL'],
            483016,
        )
        self.assertEqual(
            result['census']['sourceKindCounts']['CMD'],
            1660,
        )
        self.assertEqual(
            result['census']['executableKindCounts']['REPL'],
            483016,
        )
        self.assertEqual(result['census']['leftoverOperations'], 0)
        self.assertEqual(result['census']['exactPackageChunks'], 2265)
        self.assertEqual(result['census']['exactReplChunks'], 2243)
        self.assertEqual(result['census']['denseEnvelopeChunks'], 8128)
        self.assertEqual(result['census']['maximumSourceGroupChunks'], 25)
        self.assertEqual(
            result['capacityScenario']['availableTemporaryChunks'],
            152,
        )
        statuses = {
            check['id']: check['status']
            for check in result['checks']
        }
        self.assertEqual(statuses['RCS-001'], 'PASS')
        self.assertEqual(statuses['RCS-002'], 'PASS')


if __name__ == '__main__':
    unittest.main()
