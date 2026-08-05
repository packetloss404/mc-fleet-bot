#!/usr/bin/env python3
"""Capture one frozen, complete Paper saved-world package for Combined Zones.

This local orchestrator never owns the Minecraft save state and never invokes a
remote shell as root. It first hash-binds a fixed, root-owned remote helper by
calling its exact ``--preflight`` command, then calls the same helper with exact
``--stream`` arguments. The helper owns save-off, flush, the frozen archive,
save-state restoration, timeouts, and its independent dead-man.

No block operation or service mutation is performed. A failed capture remains
in a clearly named ``.capture-incomplete-*`` staging directory without an
attestation manifest. A successful destination is hash-inventoried, fsynced,
permission-sealed, and only then published for the read-only Node intake audit.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import stat
import sys
import tarfile
import time
from datetime import datetime
from typing import Any, BinaryIO, Callable
import uuid


SCRIPT_ID = 'scripts/capture_combined_zones_complete_save.py'
MANIFEST_NAME = 'combined-zones-complete-save-capture.json'
REMOTE_HELPER_SOURCE_NAME = 'packetcraft_complete_save_capture_helper.py'
REMOTE_HELPER_PATH = '/usr/local/sbin/packetcraft-combined-zones-capture-helper'
REMOTE_HELPER_PREFLIGHT_COMMAND = f'sudo -n {REMOTE_HELPER_PATH} --preflight'
REMOTE_HELPER_STREAM_COMMAND = f'sudo -n {REMOTE_HELPER_PATH} --stream'
REMOTE_WORLD_ROOT = '/opt/packetcraft/paper-server/world'
REMOTE_HELPER_ID = 'packetcraft-complete-save-capture-helper'
REMOTE_METADATA_PREFIX = 'CZCAPTURE_METADATA '
REQUIRED_DIRECTORIES = ('region', 'entities', 'poi')
REQUIRED_MEMBER_RE = re.compile(r'^(?:region|entities|poi)/[^/]+\.mca$')
SSH_CHANNEL_SETUP_TIMEOUT_SECONDS = 20.0
SSH_TOTAL_TIMEOUT_SECONDS = 480.0
SSH_POLL_INTERVAL_SECONDS = 0.02
MAX_PREFLIGHT_STDOUT_BYTES = 1024 * 1024
MAX_REMOTE_STDERR_BYTES = 1024 * 1024
IDENTITY_MAX_LENGTH = 512


class CaptureError(RuntimeError):
    """Fail-closed capture error with no implied evidence acceptance."""


def sha256_stable_file(filename: Path) -> tuple[int, str]:
    before = filename.stat()
    digest = hashlib.sha256()
    with filename.open('rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(chunk)
    after = filename.stat()
    identity_before = (before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns)
    identity_after = (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns)
    if identity_before != identity_after:
        raise CaptureError(f'File changed while hashing: {filename}')
    return after.st_size, digest.hexdigest()


def expected_remote_helper_sha256() -> str:
    helper_source = Path(__file__).resolve().with_name(REMOTE_HELPER_SOURCE_NAME)
    if not helper_source.is_file() or helper_source.is_symlink():
        raise CaptureError(f'Local remote-helper source is absent or unsafe: {helper_source}')
    return hashlib.sha256(helper_source.read_bytes()).hexdigest()


def validate_identity(label: str, value: str) -> str:
    normalized = value.strip()
    if (
        not normalized
        or len(normalized) > IDENTITY_MAX_LENGTH
        or '\n' in value
        or '\r' in value
        or any(ord(character) < 32 for character in normalized)
    ):
        raise CaptureError(
            f'{label} must be a nonempty single-line printable value of at most '
            f'{IDENTITY_MAX_LENGTH} characters.',
        )
    return normalized


def parse_utc(value: Any, label: str) -> datetime:
    if not isinstance(value, str) or not re.fullmatch(
        r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z',
        value,
    ):
        raise CaptureError(f'{label} is not an exact UTC timestamp.')
    try:
        return datetime.fromisoformat(value[:-1] + '+00:00')
    except ValueError as error:
        raise CaptureError(f'{label} is not a valid UTC timestamp.') from error


def validate_capture_protocol(protocol: Any) -> dict[str, Any]:
    if not isinstance(protocol, dict):
        raise CaptureError('Remote helper captureProtocol is not an object.')
    keys = (
        'saveOffConfirmedAtUtc',
        'saveAllFlushCompletedAtUtc',
        'copyStartedAtUtc',
        'copyCompletedAtUtc',
        'saveOnRestoredAtUtc',
    )
    parsed = [parse_utc(protocol.get(key), f'captureProtocol.{key}') for key in keys]
    if any(value < parsed[index - 1] for index, value in enumerate(parsed) if index > 0):
        raise CaptureError('Remote helper captureProtocol timestamps are not monotonic.')
    initial_state = protocol.get('initialSaveState')
    restoration_action = protocol.get('restorationAction')
    expected_action = {
        'ENABLED': 'SAVE_ON_CONFIRMED',
        'DISABLED': 'PREEXISTING_SAVE_OFF_PRESERVED',
    }.get(initial_state)
    if expected_action is None or restoration_action != expected_action:
        raise CaptureError('Remote helper save-state restoration metadata is inconsistent.')
    return {key: protocol[key] for key in keys} | {
        'initialSaveState': initial_state,
        'restorationAction': restoration_action,
    }


def run_remote_command(
    client: Any,
    command: str,
    *,
    stdout_sink: BinaryIO | None = None,
    timeout_seconds: float = SSH_TOTAL_TIMEOUT_SECONDS,
    monotonic_fn: Callable[[], float] = time.monotonic,
    sleep_fn: Callable[[float], None] = time.sleep,
) -> tuple[bytes, bytes, int]:
    """Run one fixed SSH command with bounded stdout/stderr/channel waits."""
    try:
        _stdin, stdout, _stderr = client.exec_command(
            command,
            get_pty=False,
            timeout=SSH_CHANNEL_SETUP_TIMEOUT_SECONDS,
        )
    except BaseException as error:
        raise CaptureError(f'Remote helper channel setup failed: {error}') from error
    channel = stdout.channel
    deadline = monotonic_fn() + timeout_seconds
    stdout_chunks: list[bytes] = []
    stderr_chunks: list[bytes] = []
    stdout_bytes = 0
    stderr_bytes = 0
    try:
        while True:
            progressed = False
            while channel.recv_ready():
                chunk = channel.recv(1024 * 1024)
                if not chunk:
                    break
                progressed = True
                stdout_bytes += len(chunk)
                if stdout_sink is None:
                    if stdout_bytes > MAX_PREFLIGHT_STDOUT_BYTES:
                        raise CaptureError('Remote helper stdout exceeded the bounded maximum.')
                    stdout_chunks.append(chunk)
                else:
                    stdout_sink.write(chunk)
            while channel.recv_stderr_ready():
                chunk = channel.recv_stderr(64 * 1024)
                if not chunk:
                    break
                progressed = True
                stderr_bytes += len(chunk)
                if stderr_bytes > MAX_REMOTE_STDERR_BYTES:
                    raise CaptureError('Remote helper stderr exceeded the bounded maximum.')
                stderr_chunks.append(chunk)
            if channel.exit_status_ready():
                if not channel.recv_ready() and not channel.recv_stderr_ready():
                    break
                continue
            if monotonic_fn() >= deadline:
                raise CaptureError(
                    f'Remote helper exceeded the bounded {timeout_seconds:.0f}-second SSH window.',
                )
            if not progressed:
                sleep_fn(SSH_POLL_INTERVAL_SECONDS)
        status = channel.recv_exit_status()
    finally:
        try:
            channel.close()
        except BaseException:
            pass
    if stdout_sink is not None:
        stdout_sink.flush()
        os.fsync(stdout_sink.fileno())
    return b''.join(stdout_chunks), b''.join(stderr_chunks), status


def parse_json_object(payload: bytes, label: str) -> dict[str, Any]:
    try:
        value = json.loads(payload.decode('utf8'))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise CaptureError(f'{label} is not valid JSON.') from error
    if not isinstance(value, dict):
        raise CaptureError(f'{label} is not a JSON object.')
    return value


def validate_helper_envelope(
    payload: dict[str, Any],
    *,
    mode: str,
    expected_sha256: str,
    expected_status: str,
) -> None:
    expected = {
        'schemaVersion': 1,
        'id': REMOTE_HELPER_ID,
        'mode': mode,
        'status': expected_status,
        'helperSha256': expected_sha256,
        'sourceWorldRoot': REMOTE_WORLD_ROOT,
    }
    differences = [
        f'{key}={payload.get(key)!r} (expected {value!r})'
        for key, value in expected.items()
        if payload.get(key) != value
    ]
    if differences:
        raise CaptureError('Remote helper identity/contract mismatch: ' + '; '.join(differences))
    if not isinstance(payload.get('memberCount'), int) or payload['memberCount'] < 4:
        raise CaptureError('Remote helper reported an invalid required-member count.')


def preflight_remote_helper(client: Any, expected_sha256: str) -> dict[str, Any]:
    stdout, stderr, status = run_remote_command(client, REMOTE_HELPER_PREFLIGHT_COMMAND)
    diagnostic = stderr.decode('utf8', 'replace').strip()
    if status != 0:
        raise CaptureError(
            f'Remote helper preflight exited {status}: {diagnostic or "no diagnostic"}',
        )
    if diagnostic:
        raise CaptureError(f'Remote helper preflight emitted unexpected stderr: {diagnostic}')
    payload = parse_json_object(stdout, 'Remote helper preflight')
    validate_helper_envelope(
        payload,
        mode='preflight',
        expected_sha256=expected_sha256,
        expected_status='PASS',
    )
    return payload


def parse_stream_metadata(stderr: bytes) -> dict[str, Any]:
    try:
        text = stderr.decode('utf8')
    except UnicodeDecodeError as error:
        raise CaptureError('Remote helper stream stderr is not UTF-8 metadata.') from error
    lines = [line for line in text.splitlines() if line]
    metadata_lines = [line for line in lines if line.startswith(REMOTE_METADATA_PREFIX)]
    unexpected = [line for line in lines if not line.startswith(REMOTE_METADATA_PREFIX)]
    if len(metadata_lines) != 1 or unexpected:
        raise CaptureError(
            'Remote helper stream did not emit exactly one clean metadata envelope.',
        )
    return parse_json_object(
        metadata_lines[0][len(REMOTE_METADATA_PREFIX):].encode('utf8'),
        'Remote helper stream metadata',
    )


def stream_remote_archive(
    client: Any,
    archive_path: Path,
    expected_sha256: str,
    *,
    timeout_seconds: float = SSH_TOTAL_TIMEOUT_SECONDS,
) -> tuple[int, dict[str, Any]]:
    with archive_path.open('xb') as handle:
        _stdout, stderr, status = run_remote_command(
            client,
            REMOTE_HELPER_STREAM_COMMAND,
            stdout_sink=handle,
            timeout_seconds=timeout_seconds,
        )
    archive_bytes = archive_path.stat().st_size
    diagnostic = stderr.decode('utf8', 'replace').strip()
    if status != 0:
        raise CaptureError(
            f'Remote helper stream exited {status}: {diagnostic or "no diagnostic"}',
        )
    if archive_bytes <= 0:
        raise CaptureError('Remote helper returned an empty archive.')
    metadata = parse_stream_metadata(stderr)
    validate_helper_envelope(
        metadata,
        mode='stream',
        expected_sha256=expected_sha256,
        expected_status='CAPTURED',
    )
    metadata['captureProtocol'] = validate_capture_protocol(metadata.get('captureProtocol'))
    capture_id = metadata.get('captureId')
    if not isinstance(capture_id, str) or not capture_id.strip() or len(capture_id) > 256:
        raise CaptureError('Remote helper captureId is absent or invalid.')
    if metadata.get('initialSaveState') != metadata['captureProtocol']['initialSaveState']:
        raise CaptureError('Remote helper initial save-state metadata is inconsistent.')
    if metadata.get('restorationAction') != metadata['captureProtocol']['restorationAction']:
        raise CaptureError('Remote helper restoration-action metadata is inconsistent.')
    return archive_bytes, metadata


def safe_extract_required_archive(archive_path: Path, staging_root: Path) -> None:
    seen: set[str] = set()
    required_directory_counts = {name: 0 for name in REQUIRED_DIRECTORIES}
    level_seen = False
    with tarfile.open(archive_path, 'r:*') as archive:
        members = archive.getmembers()
        for member in members:
            name = member.name.removeprefix('./')
            if name in REQUIRED_DIRECTORIES and member.isdir():
                continue
            allowed = name == 'level.dat' or REQUIRED_MEMBER_RE.fullmatch(name) is not None
            if not allowed or not member.isfile() or member.issym() or member.islnk():
                raise CaptureError(f'Remote archive contains a non-allowlisted member: {member.name!r}')
            if name in seen:
                raise CaptureError(f'Remote archive contains a duplicate member: {name!r}')
            if member.size <= 0:
                raise CaptureError(f'Remote archive contains an empty required member: {name!r}')
            seen.add(name)
            if name == 'level.dat':
                level_seen = True
            else:
                required_directory_counts[name.split('/', 1)[0]] += 1

        if not level_seen or any(count == 0 for count in required_directory_counts.values()):
            raise CaptureError(
                'Remote archive lacks level.dat or a nonempty region/entities/poi MCA set.',
            )

        for name in REQUIRED_DIRECTORIES:
            (staging_root / name).mkdir(mode=0o755)
        for member in members:
            name = member.name.removeprefix('./')
            if name in REQUIRED_DIRECTORIES and member.isdir():
                continue
            target = staging_root / Path(name)
            target.parent.mkdir(parents=True, exist_ok=True)
            source = archive.extractfile(member)
            if source is None:
                raise CaptureError(f'Unable to extract required member: {name!r}')
            with source, target.open('xb') as output:
                for chunk in iter(lambda: source.read(1024 * 1024), b''):
                    output.write(chunk)
                output.flush()
                os.fsync(output.fileno())


def collect_required_members(world_root: Path) -> list[dict[str, Any]]:
    members: list[dict[str, Any]] = []
    for directory in REQUIRED_DIRECTORIES:
        directory_path = world_root / directory
        if not directory_path.is_dir() or directory_path.is_symlink():
            raise CaptureError(f'Missing regular required directory: {directory}/')
        names = sorted(directory_path.iterdir(), key=lambda item: item.name)
        if not names:
            raise CaptureError(f'Required directory is empty: {directory}/')
        for filename in names:
            relative = f'{directory}/{filename.name}'
            file_stat = filename.lstat()
            if (
                not stat.S_ISREG(file_stat.st_mode)
                or filename.is_symlink()
                or not filename.name.endswith('.mca')
                or file_stat.st_size <= 0
            ):
                raise CaptureError(f'Invalid required member: {relative}')
            size, member_sha256 = sha256_stable_file(filename)
            members.append({'path': relative, 'bytes': size, 'sha256': member_sha256})
    level_dat = world_root / 'level.dat'
    try:
        level_stat = level_dat.lstat()
    except FileNotFoundError as error:
        raise CaptureError('level.dat is absent.') from error
    if not stat.S_ISREG(level_stat.st_mode) or level_dat.is_symlink() or level_stat.st_size <= 0:
        raise CaptureError('level.dat is absent, empty, non-regular, or a symlink.')
    level_size, level_sha256 = sha256_stable_file(level_dat)
    members.append({'path': 'level.dat', 'bytes': level_size, 'sha256': level_sha256})
    return sorted(members, key=lambda member: member['path'])


def build_manifest(
    *,
    world_identity: str,
    source_authority: str,
    helper_metadata: dict[str, Any],
    members: list[dict[str, Any]],
) -> dict[str, Any]:
    protocol = helper_metadata['captureProtocol']
    return {
        'schemaVersion': 1,
        'id': 'combined-zones-complete-save-capture',
        'captureId': helper_metadata['captureId'],
        'worldIdentity': world_identity,
        'sourceAuthority': source_authority,
        'captureTool': (
            f'{SCRIPT_ID}@schema-v2 + {REMOTE_HELPER_PATH}@'
            f'{helper_metadata["helperSha256"]}'
        ),
        'capturedAtUtc': protocol['copyCompletedAtUtc'],
        'immutableCopy': True,
        'captureProtocol': protocol,
        'captureAuthority': {
            'remoteHelperId': helper_metadata['id'],
            'remoteHelperPath': REMOTE_HELPER_PATH,
            'remoteHelperSha256': helper_metadata['helperSha256'],
            'sourceWorldRoot': helper_metadata['sourceWorldRoot'],
            'initialSaveState': helper_metadata['initialSaveState'],
            'restorationAction': helper_metadata['restorationAction'],
        },
        'requiredMembers': members,
    }


def fsync_directory(directory: Path) -> None:
    descriptor = os.open(directory, os.O_RDONLY | getattr(os, 'O_DIRECTORY', 0))
    try:
        os.fsync(descriptor)
    finally:
        os.close(descriptor)


def fsync_file(filename: Path) -> None:
    descriptor = os.open(filename, os.O_RDONLY)
    try:
        os.fsync(descriptor)
    finally:
        os.close(descriptor)


def seal_world_root(staging_root: Path) -> None:
    for directory in REQUIRED_DIRECTORIES:
        directory_path = staging_root / directory
        for filename in directory_path.iterdir():
            filename.chmod(0o444)
            fsync_file(filename)
        directory_path.chmod(0o555)
        fsync_directory(directory_path)
    (staging_root / 'level.dat').chmod(0o444)
    fsync_file(staging_root / 'level.dat')
    (staging_root / MANIFEST_NAME).chmod(0o444)
    fsync_file(staging_root / MANIFEST_NAME)
    staging_root.chmod(0o555)
    fsync_directory(staging_root)


def load_mc_admin() -> Any:
    script_path = Path(__file__).resolve().with_name('mc_admin.py')
    spec = importlib.util.spec_from_file_location('combined_zones_mc_admin', script_path)
    if spec is None or spec.loader is None:
        raise CaptureError(f'Unable to load {script_path}.')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def capture_saved_world(
    *,
    destination: Path,
    connect_fn: Callable[[], Any],
    world_identity: str,
    source_authority: str,
    capture_uuid: str | None = None,
    stream_timeout_seconds: float = SSH_TOTAL_TIMEOUT_SECONDS,
) -> dict[str, Any]:
    world_identity = validate_identity('world_identity', world_identity)
    source_authority = validate_identity('source_authority', source_authority)
    destination = destination.resolve()
    if destination.exists():
        raise CaptureError(f'Destination already exists and will not be overwritten: {destination}')
    expected_helper_sha256 = expected_remote_helper_sha256()
    capture_uuid = capture_uuid or uuid.uuid4().hex
    if not re.fullmatch(r'[A-Za-z0-9._-]+', capture_uuid):
        raise CaptureError('Internal capture UUID contains unsafe path characters.')

    client = None
    preflight: dict[str, Any]
    try:
        client = connect_fn()
        preflight = preflight_remote_helper(client, expected_helper_sha256)
        destination.parent.mkdir(parents=True, exist_ok=True)
        staging_root = destination.parent / f'.{destination.name}.capture-incomplete-{capture_uuid}'
        if staging_root.exists():
            raise CaptureError(f'Staging destination already exists: {staging_root}')
        staging_root.mkdir(mode=0o700)
        archive_path = staging_root / '.complete-save.tar'
        archive_bytes, helper_metadata = stream_remote_archive(
            client,
            archive_path,
            expected_helper_sha256,
            timeout_seconds=stream_timeout_seconds,
        )
    finally:
        if client is not None:
            client.close()

    safe_extract_required_archive(archive_path, staging_root)
    members = collect_required_members(staging_root)
    if len(members) != helper_metadata['memberCount']:
        raise CaptureError(
            'Extracted required-member count differs from the remote helper attestation.',
        )
    manifest = build_manifest(
        world_identity=world_identity,
        source_authority=source_authority,
        helper_metadata=helper_metadata,
        members=members,
    )
    manifest_path = staging_root / MANIFEST_NAME
    with manifest_path.open('x', encoding='utf8') as handle:
        json.dump(manifest, handle, indent=2)
        handle.write('\n')
        handle.flush()
        os.fsync(handle.fileno())
    archive_path.unlink()
    fsync_directory(staging_root)
    seal_world_root(staging_root)
    staging_root.rename(destination)
    fsync_directory(destination.parent)
    return {
        'status': 'CAPTURED_COMPLETE_SAVE_PENDING_READ_ONLY_INTAKE_AUDIT',
        'destination': str(destination),
        'captureId': manifest['captureId'],
        'remoteHelperSha256': expected_helper_sha256,
        'preflightInventoryShapeSha256': preflight['inventoryShapeSha256'],
        'archiveBytes': archive_bytes,
        'requiredMemberCount': len(members),
        'requiredBytes': sum(member['bytes'] for member in members),
        'manifest': str(destination / MANIFEST_NAME),
        'sealedReadOnly': True,
        'worldEditAuthorized': False,
        'operationCellCount': 0,
    }


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__, allow_abbrev=False)
    parser.add_argument('--execute', action='store_true', help='Acknowledge the live save-state capture.')
    parser.add_argument('--dest', required=True, help='Fresh local world-root destination.')
    parser.add_argument('--world-identity', default='packetcraft-paper-overworld')
    parser.add_argument(
        '--source-authority',
        default=(
            'packetcraft-paper.service via fixed root-owned '
            'packetcraft-complete-save-capture-helper'
        ),
    )
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    if not args.execute:
        raise CaptureError(
            'Live capture not authorized by the command. Review the tool and rerun with --execute.',
        )
    admin = load_mc_admin()
    result = capture_saved_world(
        destination=Path(args.dest),
        connect_fn=admin.connect,
        world_identity=args.world_identity,
        source_authority=args.source_authority,
    )
    print(json.dumps(result, indent=2))
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main(sys.argv[1:]))
    except CaptureError as error:
        print(f'CAPTURE_HOLD: {error}', file=sys.stderr)
        sys.exit(1)
