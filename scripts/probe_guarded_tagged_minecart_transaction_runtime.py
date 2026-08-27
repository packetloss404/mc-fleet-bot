#!/usr/bin/env python3
"""Runtime-prove exact UUID minecart execution/rollback on disposable Paper."""

import argparse
import hashlib
import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import run_guarded_tagged_minecart_transaction as transaction  # noqa: E402


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DEFAULT_JAR = '/home/ianwalmsley/.local/share/Trash/files/cz-paper-runtime.b0V9Yp/paper.jar'
DEFAULT_SEED = '/home/ianwalmsley/.local/share/Trash/files/cz-bee-runtime-XU5vdj'
DEFAULT_JAVA = '/home/ianwalmsley/.local/share/Trash/files/cz-openjdk21/usr/lib/jvm/java-21-openjdk-amd64/bin/java'
EXPECTED_JAR_SHA256 = 'cf374f2af9d71dfcc75343f37b722a7abcb091c574131b95e3b13c6fc2cb8fae'
EXPECTED_VERSION = '1.21.11-69-main@94d0c97'
DEFAULT_OUT = (
    'data/world-review/combined-zones-r12-tagged-minecart-executor-runtime-proof-'
    '20260822T051000Z/runtime-proof.json'
)


def free_port():
    server = socket.socket()
    server.bind(('127.0.0.1', 0))
    port = server.getsockname()[1]
    server.close()
    return port


def file_sha256(filename):
    digest = hashlib.sha256()
    with open(filename, 'rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


class RecordingRcon:
    def __init__(self, port, password, transcript, fault_second_global=None):
        self.inner = transaction.DirectRcon('127.0.0.1', port, password)
        self.transcript = transcript
        self.fault_second_global = fault_second_global
        self.global_queries = 0

    def cmd(self, command):
        if self.fault_second_global and command == self.fault_second_global:
            self.global_queries += 1
            if self.global_queries == 2:
                reply = 'Test passed, count: 2'
                self.transcript.append({
                    'command': command, 'reply': reply,
                    'injectedObservationFailure': True,
                })
                return reply
        reply = self.inner.cmd(command)
        self.transcript.append({'command': command, 'reply': reply})
        return reply

    def close(self):
        self.inner.close()


def capture_control(rcon, tag):
    spec = {'tag': tag}
    selector = transaction.global_tag_selector(spec, limit=1)
    count = transaction.parse_count(rcon.cmd(
        transaction.count_command(transaction.global_tag_selector(spec))
    ))
    if count != 1:
        raise RuntimeError(f'control minecart count is {count}, expected one')
    uuid = transaction.parse_uuid(rcon.cmd(f'data get entity {selector} UUID'))
    position = transaction.parse_position(rcon.cmd(f'data get entity {selector} Pos'))
    return {'uuidIntArray': uuid, 'position': position, 'tag': tag}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--server-jar', default=DEFAULT_JAR)
    parser.add_argument('--runtime-seed', default=DEFAULT_SEED)
    parser.add_argument('--java', default=DEFAULT_JAVA)
    parser.add_argument('--out', default=DEFAULT_OUT)
    parser.add_argument('--generated-at', default='2026-08-22T05:10:00Z')
    args = parser.parse_args(argv)
    jar = os.path.abspath(args.server_jar)
    seed = os.path.abspath(args.runtime_seed)
    java = os.path.abspath(args.java)
    if file_sha256(jar) != EXPECTED_JAR_SHA256:
        raise RuntimeError('Paper jar identity drifted')
    if not all(os.path.isdir(os.path.join(seed, name)) for name in ('cache', 'versions')):
        raise RuntimeError('runtime seed is incomplete')
    temporary = tempfile.mkdtemp(prefix='cz-tagged-minecart-runtime-')
    server = None
    transcript = []
    try:
        shutil.copytree(os.path.join(seed, 'cache'), os.path.join(temporary, 'cache'))
        shutil.copytree(os.path.join(seed, 'versions'), os.path.join(temporary, 'versions'))
        server_port = free_port()
        rcon_port = free_port()
        password = os.urandom(24).hex()
        with open(os.path.join(temporary, 'eula.txt'), 'w', encoding='utf-8') as handle:
            handle.write('eula=true\n')
        with open(os.path.join(temporary, 'server.properties'), 'w', encoding='utf-8') as handle:
            handle.write('\n'.join([
                'allow-flight=true', 'difficulty=peaceful', 'enable-query=false',
                'enable-rcon=true', 'enforce-secure-profile=false', 'force-gamemode=true',
                'gamemode=creative', 'generate-structures=false', 'level-name=proof-world',
                'level-type=minecraft:flat', 'max-players=1', 'online-mode=false',
                f'rcon.password={password}', f'rcon.port={rcon_port}',
                f'server-port={server_port}', 'simulation-distance=3', 'spawn-protection=0',
                'sync-chunk-writes=true', 'view-distance=3', 'white-list=false', '',
            ]))
        server = subprocess.Popen(
            [java, '-Xms512M', '-Xmx1G', '-jar', jar, '--nogui'],
            cwd=temporary, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            text=True, bufsize=1,
        )
        logs = []
        deadline = time.time() + 120
        while time.time() < deadline:
            line = server.stdout.readline()
            if line:
                logs.append(line)
                if 'Done (' in line:
                    break
            elif server.poll() is not None:
                raise RuntimeError('Paper exited early: ' + ''.join(logs[-50:]))
        else:
            raise RuntimeError('Paper startup timed out')
        setup = transaction.DirectRcon('127.0.0.1', rcon_port, password)
        version = setup.cmd('version')
        if EXPECTED_VERSION not in version and EXPECTED_VERSION not in ''.join(logs):
            raise RuntimeError('Paper version drifted')
        for command in (
            'forceload add -16 -16 31 15',
            'setblock 1 64 0 minecraft:stone',
            'setblock 1 65 0 minecraft:rail[shape=east_west,waterlogged=false]',
            'setblock 2 64 0 minecraft:stone',
            'setblock 2 65 0 minecraft:rail[shape=east_west,waterlogged=false]',
            'setblock 10 64 0 minecraft:stone',
            'setblock 10 65 0 minecraft:rail[shape=east_west,waterlogged=false]',
            'summon minecraft:minecart 10.5 65.0625 0.5 '
            '{Tags:["cz_r12_uuid_control_keep"],Motion:[0.0d,0.0d,0.0d]}',
        ):
            transcript.append({'command': command, 'reply': setup.cmd(command)})
        control_before = capture_control(setup, 'cz_r12_uuid_control_keep')
        setup.close()

        spec = transaction.validate_spec({
            'transactionId': 'CZ-R12-TAGGED-MINECART-RUNTIME-PROOF-V1',
            'aabb': {
                'minX': 1, 'minY': 65, 'minZ': 0,
                'maxX': 3, 'maxY': 66, 'maxZ': 1,
            },
            'spawn': [1.5, 65.0625, 0.5],
            'positionTolerance': 0.05,
        })
        forward = transaction.TaggedMinecartExecutor(
            spec,
            lambda: RecordingRcon(rcon_port, password, transcript),
            clock=lambda: args.generated_at,
        ).execute_forward(transaction.JsonlJournal(clock=lambda: args.generated_at))
        if forward['status'] != 'EXECUTED_POSTCONDITION_VERIFIED':
            raise RuntimeError(f'forward runtime proof failed: {forward}')
        mover = transaction.DirectRcon('127.0.0.1', rcon_port, password)
        move_selector = transaction.bounded_selector(
            spec,
            tag=True,
            uuid=forward['capturedIdentity']['uuidIntArray'],
            limit=1,
        )
        move_reply = mover.cmd(f'tp {move_selector} 2.5 65.0625 0.5')
        transcript.append({
            'command': f'tp {move_selector} 2.5 65.0625 0.5',
            'reply': move_reply,
            'purpose': 'prove rollback permits the captured identity elsewhere in full AABB',
        })
        mover.close()
        rollback = transaction.TaggedMinecartExecutor(
            spec,
            lambda: RecordingRcon(rcon_port, password, transcript),
            clock=lambda: args.generated_at,
        ).execute_rollback(forward, transaction.JsonlJournal(clock=lambda: args.generated_at))
        if rollback['status'] != 'ROLLBACK_POSTCONDITION_VERIFIED':
            raise RuntimeError(f'rollback runtime proof failed: {rollback}')

        fault_command = transaction.count_command(transaction.global_tag_selector(spec))
        compensated = transaction.TaggedMinecartExecutor(
            spec,
            lambda: RecordingRcon(
                rcon_port, password, transcript, fault_second_global=fault_command
            ),
            clock=lambda: args.generated_at,
        ).execute_forward(transaction.JsonlJournal(clock=lambda: args.generated_at))
        if compensated['status'] != 'FAILED_COMPENSATED_TO_ZERO':
            raise RuntimeError(f'compensation runtime proof failed: {compensated}')

        final = transaction.DirectRcon('127.0.0.1', rcon_port, password)
        target_global = transaction.parse_count(final.cmd(
            transaction.count_command(transaction.global_tag_selector(spec))
        ))
        target_bounded = transaction.parse_count(final.cmd(
            transaction.count_command(transaction.bounded_selector(spec, tag=False))
        ))
        control_after = capture_control(final, 'cz_r12_uuid_control_keep')
        final.close()
        if target_global != 0 or target_bounded != 0:
            raise RuntimeError('target minecart was not removed to exact zero')
        if control_after != control_before:
            raise RuntimeError('foreign control minecart UUID/position changed')
        kill_commands = [entry['command'] for entry in transcript if entry['command'].startswith('kill ')]
        if len(kill_commands) != 2:
            raise RuntimeError(f'expected exact rollback and compensation kills, got {kill_commands}')
        if any('UUID:[I;' not in command or f'tag={spec["tag"]}' not in command
               or 'x=1' not in command for command in kill_commands):
            raise RuntimeError('a kill command was not exact UUID+tag+bounded selector')
        if any(command in ('kill @e', 'kill @e[type=minecraft:minecart]')
               for command in kill_commands):
            raise RuntimeError('broad kill command detected')

        payload = {
            'schemaVersion': 1,
            'proofId': 'CZ-R12-GUARDED-TAGGED-MINECART-EXACT-UUID-RUNTIME-PROOF',
            'status': 'PASS_EXACT_PAPER_1_21_11_UUID_TARGETED_FORWARD_ROLLBACK_AND_COMPENSATION',
            'generatedAtUtc': args.generated_at,
            'runtime': {
                'mode': 'ISOLATED_DISPOSABLE_FLAT_WORLD_NO_PRODUCTION_CONNECTION',
                'paperJarSha256': EXPECTED_JAR_SHA256,
                'expectedVersion': EXPECTED_VERSION,
                'observedVersionReply': version,
                'loopbackOnly': True,
                'productionWorldLoaded': False,
                'productionRconContacted': False,
            },
            'spec': spec,
            'forward': forward,
            'rollback': rollback,
            'compensation': compensated,
            'foreignControl': {
                'before': control_before, 'after': control_after,
                'uuidAndPositionPreserved': True,
            },
            'exactKillCommands': kill_commands,
            'commandTranscript': transcript,
            'disposition': {
                'globalAnyEntityTagZeroPreconditionProven': True,
                'boundedForeignMinecartZeroPreconditionProven': True,
                'exactUuidTypeTagBoundsKillProven': True,
                'rollbackAfterInBoundsMovementProven': True,
                'exactRollbackToZeroProven': True,
                'failureCompensationToZeroProven': True,
                'foreignControlMinecartPreserved': True,
                'broadMinecartKillUsed': False,
                'tagOnlyKillUsed': False,
                'productionMutationPerformed': False,
            },
        }
        payload['proofPayloadSha256'] = transaction.sha256_bytes(transaction.canonical(payload))
        output = os.path.abspath(os.path.join(ROOT, args.out))
        transaction.durable_json(output, payload, exclusive=True)
        print(json.dumps({
            'status': payload['status'],
            'output': os.path.relpath(output, ROOT),
            'proofPayloadSha256': payload['proofPayloadSha256'],
            'exactKillCommandCount': len(kill_commands),
        }, indent=2, sort_keys=True))
        return 0
    finally:
        if server and server.poll() is None:
            server.terminate()
            try:
                server.wait(timeout=10)
            except subprocess.TimeoutExpired:
                server.kill()
                server.wait(timeout=5)
        shutil.rmtree(temporary, ignore_errors=True)


if __name__ == '__main__':
    raise SystemExit(main())
