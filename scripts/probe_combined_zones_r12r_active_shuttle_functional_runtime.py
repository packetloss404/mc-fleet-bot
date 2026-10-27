#!/usr/bin/env python3
"""Run the final R12R functional helper against isolated disposable Paper."""

import argparse
import hashlib
import json
import os
import secrets
import select
import shutil
import socket
import subprocess
import sys
import tempfile
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import run_combined_zones_r12r_b09_active_shuttle_functional as functional  # noqa: E402
import run_guarded_tagged_minecart_transaction as entity_kernel  # noqa: E402


EXPECTED_JAR = 'cf374f2af9d71dfcc75343f37b722a7abcb091c574131b95e3b13c6fc2cb8fae'
EXPECTED_VERSION = '1.21.11-69-main@94d0c97'
DEFAULT_JAR = '/home/ianwalmsley/.local/share/Trash/files/cz-paper-runtime.b0V9Yp/paper.jar'
DEFAULT_SEED = '/home/ianwalmsley/.local/share/Trash/files/cz-bee-runtime-XU5vdj'
DEFAULT_JAVA = '/home/ianwalmsley/.local/share/Trash/files/cz-openjdk21/usr/lib/jvm/java-21-openjdk-amd64/bin/java'
DEFAULT_OUT = ('data/world-review/combined-zones-r12-b09-active-transport-readiness-'
               '20260822T050000Z/final-functional-helper-paper-proof.json')
FIXED_TIME = '2026-08-22T05:40:00Z'


def sha256_file(filename):
    digest = hashlib.sha256()
    with open(filename, 'rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def free_port():
    handle = socket.socket()
    handle.bind(('127.0.0.1', 0))
    port = handle.getsockname()[1]
    handle.close()
    return port


def exact_spec():
    return {
        'transactionId': functional.TRANSACTION_ID,
        'aabb': {
            'minX': 2058, 'minY': 130, 'minZ': -748,
            'maxX': 2073, 'maxY': 131, 'maxZ': -747,
        },
        'spawn': [2058.5, 130.0625, -747.5],
        'positionTolerance': 0.05,
    }


def checked(rcon, command, transcript):
    reply = rcon.cmd(command)
    transcript.append({'command': command, 'reply': reply})
    if any(token in reply.lower() for token in (
            'unknown command', 'incorrect argument', 'not loaded', 'error')):
        raise RuntimeError(f'{command}: {reply}')
    return reply


def start_server(jar, seed, java):
    directory = tempfile.mkdtemp(prefix='cz-r12r-final-functional-')
    shutil.copytree(os.path.join(seed, 'cache'), os.path.join(directory, 'cache'))
    shutil.copytree(os.path.join(seed, 'versions'), os.path.join(directory, 'versions'))
    server_port = free_port()
    rcon_port = free_port()
    password = secrets.token_hex(24)
    with open(os.path.join(directory, 'eula.txt'), 'w', encoding='utf-8') as handle:
        handle.write('eula=true\n')
    properties = [
        'allow-flight=true', 'difficulty=peaceful', 'enable-query=false', 'enable-rcon=true',
        'enforce-secure-profile=false', 'force-gamemode=true', 'gamemode=creative',
        'generate-structures=false', 'level-name=rail-proof-world', 'level-type=minecraft:flat',
        'max-players=1', 'online-mode=false', f'rcon.password={password}',
        f'rcon.port={rcon_port}', f'server-port={server_port}', 'simulation-distance=3',
        'spawn-protection=0', 'sync-chunk-writes=true', 'view-distance=3', 'white-list=false',
    ]
    with open(os.path.join(directory, 'server.properties'), 'w', encoding='utf-8') as handle:
        handle.write('\n'.join(properties) + '\n')
    process = subprocess.Popen(
        [java, '-Xms512M', '-Xmx1G', '-jar', jar, '--nogui'], cwd=directory,
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1,
    )
    logs = []
    deadline = time.monotonic() + 120
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError(f'Paper exited early: {"".join(logs)[-4000:]}')
        ready, _, _ = select.select([process.stdout], [], [], 0.25)
        if ready:
            line = process.stdout.readline()
            logs.append(line)
            if 'Done (' in line:
                return directory, process, rcon_port, password, ''.join(logs)
    raise RuntimeError('Paper startup timed out')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--server-jar', default=DEFAULT_JAR)
    parser.add_argument('--runtime-seed', default=DEFAULT_SEED)
    parser.add_argument('--java', default=DEFAULT_JAVA)
    parser.add_argument('--out', default=DEFAULT_OUT)
    args = parser.parse_args()
    for filename in (args.server_jar, args.java):
        if not os.path.isfile(filename):
            raise RuntimeError(f'missing runtime input {filename}')
    if sha256_file(args.server_jar) != EXPECTED_JAR:
        raise RuntimeError('Paper jar identity drifted')
    directory = None
    process = None
    rcon = None
    transcript = []
    try:
        directory, process, port, password, logs = start_server(
            args.server_jar, args.runtime_seed, args.java
        )
        factory = lambda: entity_kernel.DirectRcon('127.0.0.1', port, password, 10)
        rcon = factory()
        version = checked(rcon, 'version', transcript)
        if EXPECTED_VERSION not in f'{logs}\n{version}':
            raise RuntimeError(f'Paper version drifted: {version}')
        checked(rcon, 'forceload add 2048 -752 2079 -737', transcript)
        checked(rcon, 'fill 2055 128 -750 2075 133 -745 minecraft:air', transcript)
        for x in range(2057, 2074):
            checked(rcon, f'setblock {x} 129 -748 minecraft:polished_diorite', transcript)
            checked(rcon, f'setblock {x} 130 -749 minecraft:polished_diorite', transcript)
            checked(rcon, f'setblock {x} 130 -748 minecraft:rail[shape=east_west,waterlogged=false]', transcript)
            checked(rcon, f'setblock {x} 130 -747 minecraft:polished_diorite', transcript)
            checked(rcon, f'setblock {x} 130 -746 minecraft:stone', transcript)
        for x in functional.CONTROL_X:
            checked(rcon, f'setblock {x} 130 -747 {functional.LEVER_OFF}', transcript)
        for x in (2057, 2073):
            checked(rcon, f'setblock {x} 130 -748 minecraft:polished_diorite', transcript)
        for x in functional.RAIL_X:
            checked(rcon, f'setblock {x} 130 -748 {functional.RAIL_OFF}', transcript)
        rcon.close()
        rcon = None

        executor = entity_kernel.TaggedMinecartExecutor(
            exact_spec(), factory, clock=lambda: FIXED_TIME
        )
        forward = executor.execute_forward(entity_kernel.JsonlJournal(clock=lambda: FIXED_TIME))
        if forward['status'] != 'EXECUTED_POSTCONDITION_VERIFIED':
            raise RuntimeError(f'final entity executor forward failed: {forward}')
        result = functional.FunctionalVerifier(
            factory, clock=lambda: FIXED_TIME, sleeper=time.sleep
        ).execute(forward, timeout_seconds=30, poll_seconds=0.25)
        if result['status'] != 'PASS_WEST_EAST_WEST_FAIL_CLOSED_PARK_VERIFIED':
            raise RuntimeError(f'final functional helper failed: {result}')
        rollback = executor.execute_rollback(
            forward, entity_kernel.JsonlJournal(clock=lambda: FIXED_TIME)
        )
        if rollback['status'] != 'ROLLBACK_POSTCONDITION_VERIFIED':
            raise RuntimeError(f'entity rollback failed: {rollback}')

        rcon = factory()
        checked(rcon, 'fill 2055 128 -750 2075 133 -745 minecraft:air', transcript)
        checked(rcon, 'forceload remove 2048 -752 2079 -737', transcript)
        report = {
            'schemaVersion': 1,
            'proofId': 'CZ-R12R-FINAL-FUNCTIONAL-HELPER-DISPOSABLE-PAPER-PROOF',
            'generatedAtUtc': FIXED_TIME,
            'status': 'PASS_FINAL_FUNCTIONAL_HELPER_EXACT_PAPER_RUNTIME_AND_CLEANUP',
            'runtime': {
                'paperJarSha256': EXPECTED_JAR,
                'paperVersion': EXPECTED_VERSION,
                'loopbackOnly': True,
                'productionConnection': False,
                'temporaryWorldDeletedAfterProof': True,
            },
            'bindings': {
                'functionalHelperSha256': sha256_file(functional.__file__),
                'taggedEntityExecutorSha256': sha256_file(entity_kernel.__file__),
            },
            'entityForward': forward,
            'functionalAcceptance': result,
            'entityExactRollback': rollback,
            'setupAndCleanupTranscript': transcript,
            'safetyBoundary': {
                'exactUuidTypeTagRollback': True,
                'broadOrTagOnlyCleanup': False,
                'controlsOffAndFifteenRailsUnpowered': True,
                'productionWorldMutationPerformed': False,
                'productionRconContacted': False,
                'disposableWorldMutationPerformed': True,
                'disposableWorldDeletedAfterProof': True,
            },
        }
        report['proofPayloadSha256'] = entity_kernel.sha256_bytes(entity_kernel.canonical(report))
        output = os.path.abspath(args.out)
        os.makedirs(os.path.dirname(output), exist_ok=True)
        entity_kernel.durable_json(output, report, exclusive=False)
        print(json.dumps({
            'status': report['status'],
            'report': os.path.relpath(output, os.getcwd()),
            'proofPayloadSha256': report['proofPayloadSha256'],
        }, indent=2, sort_keys=True))
    finally:
        if rcon:
            rcon.close()
        if process and process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=5)
        if directory:
            shutil.rmtree(directory, ignore_errors=True)


if __name__ == '__main__':
    try:
        main()
    except (ValueError, RuntimeError, OSError) as error:
        print(f'ERROR: {error}', file=sys.stderr)
        raise SystemExit(1)
