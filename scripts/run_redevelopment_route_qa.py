#!/usr/bin/env python3
"""Live normal-pathfinding acceptance for redevelopment routes and garages.

Uses one paused fleet bot as an instrumented walker. The script preserves its
starting position, performs both-direction route tests, samples every completed
rear/side garage connection, and writes the full position trace. It does not
place or remove blocks.
"""

import argparse
import hashlib
import json
import math
import os
import sys
import time
import urllib.request
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mc_admin import Rcon, connect  # noqa: E402


API = 'http://127.0.0.1:3001'
MAINSTREET_REPORT = (
    'data/buildops/mainstreet-redevelopment-r4-r5-runtime-safe-2026-07-27.report.json'
)
PACKAGE_FILES = {
    'VEN-WL-01': 'data/buildops/westlight-infinity-screen-2026-07-27.txt',
    'INF-RR-01': 'data/buildops/ravenrock-s1-section-pilot-2026-07-27.txt',
    'mainstreet-america-redevelopment-r4-r5':
        'data/buildops/mainstreet-redevelopment-r4-r5-runtime-safe-2026-07-27.txt',
    'mainstreet-bunker-surface-phase1-2026-07-27':
        'data/buildops/mainstreet-bunker-surface-phase1-2026-07-27.txt',
    'mainstreet-bunker-recessed-portal-phase2-2026-07-27':
        'data/buildops/mainstreet-bunker-recessed-portal-phase2-2026-07-27.txt',
}


def utc_now():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z')


def file_sha256(filename):
    digest = hashlib.sha256()
    with open(filename, 'rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def snapshot_hash(directory):
    digest = hashlib.sha256()
    files = sorted(name for name in os.listdir(directory) if name.endswith('.mca'))
    byte_count = 0
    for name in files:
        content = open(os.path.join(directory, name), 'rb').read()
        digest.update(name.encode())
        digest.update(b'\0')
        digest.update(content)
        digest.update(b'\0')
        byte_count += len(content)
    return {
        'directory': os.path.relpath(directory),
        'sha256': digest.hexdigest(),
        'regionFileCount': len(files),
        'bytes': byte_count,
        'algorithm': 'sha256(filename + NUL + bytes + NUL, sorted by filename)',
    }


def api(path, payload=None):
    data = None if payload is None else json.dumps(payload).encode()
    request = urllib.request.Request(
        f'{API}{path}',
        data=data,
        headers={'Content-Type': 'application/json'},
        method='GET' if payload is None else 'POST',
    )
    with urllib.request.urlopen(request, timeout=10) as response:
        return json.load(response)


def bot_state(name):
    for bot in api('/api/bots').get('bots', []):
        if bot.get('name', '').lower() == name.lower():
            return bot
    raise RuntimeError(f'bot not found: {name}')


def distance(position, target):
    return math.sqrt(sum(
        (float(position[axis]) - float(target[index])) ** 2
        for index, axis in enumerate(('x', 'y', 'z'))
    ))


def wait_for_position(name, target, radius=2.6, timeout=38):
    trace = []
    started = time.monotonic()
    while time.monotonic() - started < timeout:
        state = bot_state(name)
        position = state.get('position') or {}
        sample = {
            'elapsedSeconds': round(time.monotonic() - started, 3),
            'position': {
                'x': position.get('x'),
                'y': position.get('y'),
                'z': position.get('z'),
            },
            'state': state.get('state'),
        }
        trace.append(sample)
        if all(position.get(axis) is not None for axis in ('x', 'y', 'z')):
            if distance(position, target) <= radius:
                return True, trace
        time.sleep(0.75)
    return False, trace


def sample_polyline(centerline, maximum_segment=65):
    if not centerline:
        return []
    points = [centerline[0]]
    last = 0
    for index in range(1, len(centerline) - 1):
        if index - last >= maximum_segment:
            points.append(centerline[index])
            last = index
    points.append(centerline[-1])
    return [[point[0], point[1] + 1, point[2]] for point in points]


def garage_points(garage):
    x1, x2, z1, z2 = garage['garageBounds']
    floor_y = garage['floorY'] + 1
    center = [(x1 + x2) // 2, floor_y, (z1 + z2) // 2]
    road = garage['roadConnection']
    connection = [road['x'], road['y'] + 1, road['z']]
    return center, connection


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--bot', default='Surveyor')
    parser.add_argument(
        '--report',
        default='data/world-review/redevelopment-route-qa-2026-07-27.json',
    )
    parser.add_argument('--post-regions', required=True)
    args = parser.parse_args()
    post_regions = os.path.abspath(args.post_regions)
    if not os.path.isdir(post_regions):
        raise FileNotFoundError(post_regions)
    mainstreet = json.load(open(MAINSTREET_REPORT, encoding='utf-8'))
    original = bot_state(args.bot).get('position')
    if not original:
        raise RuntimeError(f'{args.bot} has no reported position')

    tests = [
        {
            'id': 'ravenrock-s1-west-to-east',
            'points': [[138, -11, -14], [148, -11, -14]],
            'reverse': True,
            'standard': '7-wide x 8-high standardized tunnel pilot',
        },
        {
            'id': 'bunker-recessed-portal-mouth-to-lobby',
            'points': [[143, 65, 199], [143, 63, 191], [143, 63, 171], [140, 65, 166]],
            'reverse': True,
            'standard': '5-wide x 4-high stair-backed dogleg',
        },
    ]
    for alley in mainstreet['sharedAlleys']['matrix']:
        tests.append({
            'id': f"{alley['id'].lower()}-full-length",
            'points': sample_polyline(alley['centerline']),
            'reverse': True,
            'standard': '3-wide shared rear lane, adjacent step <=1, smoothed grade runs',
        })
    for garage in mainstreet['garages']['matrix']:
        start, end = garage_points(garage)
        tests.append({
            'id': f"{garage['garageId'].lower()}-connection",
            'points': [start, end],
            'reverse': True,
            'standard': '3-wide garage opening and continuous driveway/alley connection',
        })

    client = connect()
    rcon = Rcon(client)
    results = []
    try:
        api(f'/api/bots/{args.bot}/pause', {'reason': 'redevelopment-route-qa'})
        api(f'/api/bots/{args.bot}/stop', {})
        for definition in tests:
            points = definition['points']
            rcon.cmd(
                f'teleport {args.bot} {points[0][0]} {points[0][1]} {points[0][2]}'
            )
            positioned, initial_trace = wait_for_position(
                args.bot,
                points[0],
                radius=1.8,
                timeout=8,
            )
            legs = []
            route = points[1:] + (list(reversed(points[:-1])) if definition['reverse'] else [])
            for index, target in enumerate(route, 1):
                api(
                    f'/api/bots/{args.bot}/walkto',
                    {'x': target[0], 'y': target[1], 'z': target[2]},
                )
                reached, trace = wait_for_position(args.bot, target)
                legs.append({
                    'leg': index,
                    'target': target,
                    'reached': reached,
                    'samples': trace,
                })
                if not reached:
                    api(f'/api/bots/{args.bot}/stop', {})
                    break
            passed = positioned and len(legs) == len(route) and all(
                leg['reached'] for leg in legs
            )
            results.append({
                **definition,
                'initialPositionReached': positioned,
                'initialTrace': initial_trace,
                'legs': legs,
                'passed': passed,
            })
            print(f"{definition['id']}: {'PASS' if passed else 'FAIL'}")
    finally:
        api(f'/api/bots/{args.bot}/stop', {})
        rcon.cmd(
            f"teleport {args.bot} {original['x']} {original['y']} {original['z']}"
        )
        client.close()

    passed = all(result['passed'] for result in results)
    report = {
        'schemaVersion': 1,
        'generatedAtUtc': utc_now(),
        'status': 'PASS' if passed else 'FAIL',
        'passed': passed,
        'instrumentedBot': args.bot,
        'originalPosition': original,
        'originalPositionRestored': True,
        'postSnapshot': snapshot_hash(post_regions),
        'packageOperationSha256': {
            package_id: file_sha256(filename)
            for package_id, filename in PACKAGE_FILES.items()
        },
        'bidirectionalWalk': {
            'passed': passed,
            'tests': len(results),
            'passedTests': sum(1 for result in results if result['passed']),
            'failedTests': sum(1 for result in results if not result['passed']),
        },
        'coverage': {
            'ravenrockStandardSection': 1,
            'bunkerRecessedPortal': 1,
            'mainstreetSharedAlleys': len(mainstreet['sharedAlleys']['matrix']),
            'mainstreetGarages': len(mainstreet['garages']['matrix']),
        },
        'tests': results,
    }
    os.makedirs(os.path.dirname(os.path.abspath(args.report)), exist_ok=True)
    with open(args.report, 'w', encoding='utf-8') as handle:
        json.dump(report, handle, indent=2)
        handle.write('\n')
    print(json.dumps({
        'status': report['status'],
        'report': args.report,
        'bidirectionalWalk': report['bidirectionalWalk'],
    }, indent=2))
    return 0 if passed else 1


if __name__ == '__main__':
    sys.exit(main())
