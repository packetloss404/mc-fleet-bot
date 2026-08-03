import hashlib
import json
import pathlib
import unittest


ROOT = pathlib.Path(__file__).resolve().parents[2]
OLD_STEM = 'mainstreet-redevelopment-r4-r5-2026-07-27'
NEW_STEM = 'mainstreet-redevelopment-r4-r5-runtime-safe-2026-07-27'


class RedevelopmentRuntimePathContractTest(unittest.TestCase):
    def test_all_operational_consumers_use_runtime_safe_mainstreet_artifacts(self):
        expected_references = {
            'scripts/run_redevelopment_atomic_release.py': [
                f'data/buildops/{NEW_STEM}.txt',
                f'data/buildops/{NEW_STEM}.rollback.txt',
            ],
            'scripts/redevelopment_live_entity_gate.py': [
                f'data/buildops/{NEW_STEM}.txt',
            ],
            'scripts/import_redevelopment_release.mjs': [
                f'data/buildops/{NEW_STEM}.report.json',
            ],
            'scripts/run_redevelopment_route_qa.py': [
                f'data/buildops/{NEW_STEM}.txt',
                f'data/buildops/{NEW_STEM}.report.json',
            ],
            'scripts/qa_redevelopment_atomic_release.mjs': [
                f'data/buildops/{NEW_STEM}.txt',
                f'data/buildops/{NEW_STEM}.rollback.txt',
                f'data/buildops/{NEW_STEM}.report.json',
                'mainstreet-r4-r5-runtime-safe/after',
            ],
            'scripts/generate_mainstreet_garage_camera_manifest.mjs': [
                f'data/buildops/{NEW_STEM}.report.json',
                'mainstreet-r4-r5-runtime-safe/garage-camera-manifest.json',
            ],
            'scripts/capture_mainstreet_r4_r5_before.mjs': [
                f'data/buildops/{NEW_STEM}.report.json',
                'mainstreet-r4-r5-runtime-safe',
            ],
        }
        for relative, references in expected_references.items():
            with self.subTest(file=relative):
                source = (ROOT / relative).read_text(encoding='utf-8')
                for reference in references:
                    self.assertIn(reference, source)
                self.assertNotIn(
                    f'data/buildops/{OLD_STEM}.txt',
                    source,
                )
                self.assertNotIn(
                    f'data/buildops/{OLD_STEM}.report.json',
                    source,
                )

    def test_attempt_one_forensic_analyzer_remains_pinned_to_old_artifacts(self):
        source = (
            ROOT / 'scripts' / 'analyze_mainstreet_redevelopment_runtime_failure.mjs'
        ).read_text(encoding='utf-8')
        self.assertIn(OLD_STEM, source)
        self.assertNotIn(NEW_STEM, source)

    def test_runtime_safe_union_artifacts_and_runner_plan_are_exactly_bound(self):
        base = ROOT / 'data' / 'buildops' / NEW_STEM
        forward_path = base.with_suffix('.txt')
        rollback_path = base.parent / f'{base.name}.rollback.txt'
        report_path = base.parent / f'{base.name}.report.json'
        dry_run_path = base.parent / f'{base.name}.forward-dry-run.json'
        report = json.loads(report_path.read_text(encoding='utf-8'))
        dry_run = json.loads(dry_run_path.read_text(encoding='utf-8'))

        def operation_map(filename):
            output = {}
            for line_number, raw in enumerate(
                filename.read_text(encoding='utf-8').splitlines(),
                1,
            ):
                fields = raw.split()
                if not fields or fields[0] != 'REPL':
                    continue
                coordinates = tuple(map(int, fields[1:7]))
                if coordinates[:3] == coordinates[3:]:
                    output[coordinates[:3]] = {
                        'line': line_number,
                        'source': fields[7],
                        'desired': fields[8],
                    }
            return output

        declarations = (
            report['operations']['runtimeSafety']['finiteExactStateUnionGuards']
        )
        self.assertEqual(len(declarations), 1)
        declaration = declarations[0]
        self.assertEqual(declaration['sourceMaterial'], 'minecraft:birch_fence')
        self.assertEqual(declaration['desired'], 'minecraft:air')
        self.assertFalse(declaration['blockEntityCapable'])
        self.assertEqual(declaration['cellCount'], 27)
        self.assertEqual(len(declaration['cells']), 27)

        forward = operation_map(forward_path)
        rollback = operation_map(rollback_path)
        union_lines = set()
        for cell in declaration['cells']:
            point = tuple(cell['point'])
            operation = forward[point]
            inverse = rollback[point]
            union_lines.add(operation['line'])
            self.assertEqual(
                set(_split_masks(operation['source'])),
                set(cell['allowedExactSources']),
            )
            self.assertGreaterEqual(len(cell['allowedExactSources']), 2)
            self.assertIn(
                cell['snapshotExactSource'],
                cell['allowedExactSources'],
            )
            self.assertEqual(operation['desired'], 'minecraft:air')
            self.assertEqual(inverse['source'], 'minecraft:air')
            self.assertEqual(inverse['desired'], cell['snapshotExactSource'])
        self.assertEqual(len(union_lines), 27)

        operation_sha256 = hashlib.sha256(forward_path.read_bytes()).hexdigest()
        self.assertEqual(dry_run['schemaVersion'], 2)
        self.assertEqual(dry_run['operationSha256'], operation_sha256)
        self.assertEqual(dry_run['sourceOperationCount'], 5561)
        self.assertEqual(dry_run['sourceGroupCount'], 5561)
        self.assertEqual(dry_run['finiteUnionGroupCount'], 27)
        self.assertEqual(dry_run['expandedCommandCount'], 5588)
        self.assertEqual(dry_run['commandCount'], 5588)
        self.assertEqual(len(dry_run['sourceGroups']), 5561)
        self.assertEqual(len(dry_run['expandedCommands']), 5588)
        union_groups = [
            group for group in dry_run['sourceGroups']
            if group.get('finiteUnion')
        ]
        self.assertEqual(
            {group['line'] for group in union_groups},
            union_lines,
        )
        source_group_hash = hashlib.sha256(json.dumps(
            dry_run['sourceGroups'],
            sort_keys=True,
            separators=(',', ':'),
        ).encode()).hexdigest()
        expanded_hash = hashlib.sha256('\n'.join(
            entry['command'] for entry in dry_run['expandedCommands']
        ).encode()).hexdigest()
        self.assertEqual(
            dry_run['sourceGroupPlanSha256'],
            source_group_hash,
        )
        self.assertEqual(dry_run['expandedCommandSha256'], expanded_hash)


def _split_masks(mask):
    output = []
    start = 0
    depth = 0
    for index, character in enumerate(mask):
        if character == '[':
            depth += 1
        elif character == ']':
            depth = max(0, depth - 1)
        elif character == ',' and depth == 0:
            output.append(mask[start:index])
            start = index + 1
    output.append(mask[start:])
    return [entry for entry in output if entry]


if __name__ == '__main__':
    unittest.main()
