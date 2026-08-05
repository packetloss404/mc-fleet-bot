#!/usr/bin/python3 -I
"""Root-owned Packetcraft helper for one frozen Combined Zones save capture.

Install this exact file as
``/usr/local/sbin/packetcraft-combined-zones-capture-helper`` and permit the
capture account to run only that executable with exactly ``--preflight`` or
``--stream``.  The helper has no configurable paths and never invokes a shell.

``--preflight`` verifies the fixed source, RCON authentication, archive inputs,
and helper identity without changing the server save state. ``--stream`` owns
the complete save-state lease and writes only a POSIX tar archive to stdout.
Its final, hash-bound metadata is written as one prefixed JSON line to stderr.
"""

from __future__ import annotations

import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import select
import socket
import stat
import struct
import subprocess
import sys
import time
from datetime import datetime, timezone
from typing import Any, Callable
import uuid


HELPER_ID = 'packetcraft-complete-save-capture-helper'
HELPER_SCHEMA_VERSION = 1
SERVER_ROOT = Path('/opt/packetcraft/paper-server')
WORLD_ROOT = SERVER_ROOT / 'world'
SERVER_PROPERTIES = SERVER_ROOT / 'server.properties'
TAR_PATH = Path('/usr/bin/tar')
LOCK_PATH = Path('/run/lock/packetcraft-complete-save-capture.lock')
REQUIRED_DIRECTORIES = ('region', 'entities', 'poi')
MCA_RE = re.compile(r'^r\.-?\d+\.-?\d+\.mca$')
METADATA_PREFIX = 'CZCAPTURE_METADATA '
ERROR_PREFIX = 'CZCAPTURE_ERROR '
RCON_CONNECT_TIMEOUT_SECONDS = 10.0
RCON_IO_TIMEOUT_SECONDS = 15.0
ARCHIVE_TIMEOUT_SECONDS = 300.0
DEADMAN_TIMEOUT_SECONDS = 420.0
LEASE_READY_TIMEOUT_SECONDS = 45.0
RESTORE_CONFIRM_TIMEOUT_SECONDS = 45.0
RESTORE_RETRY_COUNT = 3
RESTORE_RETRY_DELAY_SECONDS = 2.0
MAX_PIPE_MESSAGE_BYTES = 1024 * 1024


class HelperError(RuntimeError):
    """A fail-closed helper error that never attests a capture."""


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')


def helper_sha256() -> str:
    return hashlib.sha256(Path(__file__).read_bytes()).hexdigest()


def validate_installed_helper() -> None:
    filename = Path(__file__)
    file_stat = filename.lstat()
    if filename.is_symlink() or not filename.is_file():
        raise HelperError('The installed root helper must be a regular non-symlink file.')
    if file_stat.st_uid != 0:
        raise HelperError('The installed root helper must be owned by root.')
    if file_stat.st_mode & (stat.S_IWGRP | stat.S_IWOTH):
        raise HelperError('The installed root helper must not be group- or other-writable.')


def parse_server_properties(filename: Path = SERVER_PROPERTIES) -> dict[str, str]:
    file_stat = filename.lstat()
    if filename.is_symlink() or not filename.is_file() or file_stat.st_size <= 0:
        raise HelperError('Fixed server.properties is absent, empty, non-regular, or a symlink.')
    properties: dict[str, str] = {}
    try:
        lines = filename.read_text(encoding='utf8').splitlines()
    except OSError as error:
        raise HelperError(f'Unable to read fixed server.properties: {error}') from error
    for raw_line in lines:
        line = raw_line.strip()
        if not line or line.startswith(('#', '!')):
            continue
        separator_indexes = [index for marker in ('=', ':') if (index := line.find(marker)) >= 0]
        if not separator_indexes:
            continue
        separator = min(separator_indexes)
        properties[line[:separator].strip()] = line[separator + 1:].strip()
    return properties


def rcon_settings(properties: dict[str, str]) -> tuple[str, int, str]:
    if properties.get('enable-rcon', '').lower() != 'true':
        raise HelperError('RCON is not enabled in the fixed server.properties.')
    password = properties.get('rcon.password', '')
    if not password:
        raise HelperError('rcon.password is absent or empty.')
    raw_port = properties.get('rcon.port', '25575')
    try:
        port = int(raw_port)
    except ValueError as error:
        raise HelperError('rcon.port is not an integer.') from error
    if not 1 <= port <= 65535:
        raise HelperError('rcon.port is outside 1..65535.')
    return '127.0.0.1', port, password


def recv_exact(connection: socket.socket, length: int) -> bytes:
    chunks: list[bytes] = []
    remaining = length
    while remaining:
        try:
            chunk = connection.recv(remaining)
        except socket.timeout as error:
            raise HelperError('RCON response timed out.') from error
        if not chunk:
            raise HelperError('RCON connection closed before a complete response.')
        chunks.append(chunk)
        remaining -= len(chunk)
    return b''.join(chunks)


class RconClient:
    """Minimal bounded Minecraft RCON client for the three fixed save commands."""

    def __init__(
        self,
        host: str,
        port: int,
        password: str,
        *,
        connect_timeout: float = RCON_CONNECT_TIMEOUT_SECONDS,
        io_timeout: float = RCON_IO_TIMEOUT_SECONDS,
    ) -> None:
        try:
            self.connection = socket.create_connection((host, port), timeout=connect_timeout)
        except OSError as error:
            raise HelperError(f'Unable to connect to local RCON endpoint: {error}') from error
        self.connection.settimeout(io_timeout)
        self.request_id = 0x435A0000
        self._send_packet(self.request_id, 3, password)
        response_id, response_type, _body = self._read_packet()
        if response_id == -1:
            self.close()
            raise HelperError('RCON authentication failed.')
        if response_id != self.request_id or response_type != 2:
            self.close()
            raise HelperError('RCON authentication returned an unexpected response envelope.')

    def _send_packet(self, request_id: int, packet_type: int, body: str) -> None:
        payload = struct.pack('<ii', request_id, packet_type) + body.encode('utf8') + b'\x00\x00'
        packet = struct.pack('<i', len(payload)) + payload
        try:
            self.connection.sendall(packet)
        except (OSError, socket.timeout) as error:
            raise HelperError(f'RCON send failed: {error}') from error

    def _read_packet(self) -> tuple[int, int, str]:
        raw_length = recv_exact(self.connection, 4)
        length = struct.unpack('<i', raw_length)[0]
        if length < 10 or length > 4 * 1024 * 1024:
            raise HelperError(f'RCON returned an invalid packet length: {length}.')
        payload = recv_exact(self.connection, length)
        if payload[-2:] != b'\x00\x00':
            raise HelperError('RCON response lacks the required terminator.')
        request_id, packet_type = struct.unpack('<ii', payload[:8])
        return request_id, packet_type, payload[8:-2].decode('utf8', 'replace')

    def command(self, command: str) -> str:
        self.request_id += 1
        self._send_packet(self.request_id, 2, command)
        response_id, response_type, body = self._read_packet()
        if response_id != self.request_id or response_type != 0:
            raise HelperError(f'RCON {command!r} returned an unexpected response envelope.')
        return body

    def close(self) -> None:
        try:
            self.connection.close()
        except OSError:
            pass

    def __enter__(self) -> 'RconClient':
        return self

    def __exit__(self, _exc_type: Any, _exc: Any, _traceback: Any) -> None:
        self.close()


def normalize_reply(reply: str) -> str:
    without_formatting = re.sub(r'\xa7.', '', reply)
    return ' '.join(without_formatting.strip().lower().split())


def classify_save_off_reply(reply: str) -> str:
    normalized = normalize_reply(reply)
    if 'saving' not in normalized:
        raise HelperError(f'save-off returned an unrecognized reply: {reply!r}')
    if 'already' in normalized and ('off' in normalized or 'disabled' in normalized):
        return 'ALREADY_DISABLED'
    newly_disabled = (
        ('now disabled' in normalized)
        or ('now turned off' in normalized)
        or ('has been disabled' in normalized)
        or ('has been turned off' in normalized)
    )
    if newly_disabled:
        return 'DISABLED_BY_HELPER'
    raise HelperError(f'save-off returned an unrecognized reply: {reply!r}')


def validate_flush_reply(reply: str) -> str:
    normalized = normalize_reply(reply)
    completed_markers = ('saved the game', 'saved the world', 'save complete', 'save completed')
    if not any(marker in normalized for marker in completed_markers):
        raise HelperError(f'save-all flush did not report completion: {reply!r}')
    return reply.strip()


def validate_save_on_reply(reply: str) -> str:
    normalized = normalize_reply(reply)
    if 'saving' not in normalized:
        raise HelperError(f'save-on returned an unrecognized reply: {reply!r}')
    enabled = (
        ('now enabled' in normalized)
        or ('now turned on' in normalized)
        or ('has been enabled' in normalized)
        or ('has been turned on' in normalized)
        or ('already' in normalized and ('on' in normalized or 'enabled' in normalized))
    )
    if not enabled:
        raise HelperError(f'save-on returned an unrecognized reply: {reply!r}')
    return reply.strip()


def inspect_fixed_world(world_root: Path = WORLD_ROOT) -> dict[str, Any]:
    root_stat = world_root.lstat()
    if not world_root.is_dir() or world_root.is_symlink():
        raise HelperError(f'Fixed world root is not a regular directory: {world_root}')
    members: list[dict[str, Any]] = []
    for directory_name in REQUIRED_DIRECTORIES:
        directory = world_root / directory_name
        if not directory.is_dir() or directory.is_symlink():
            raise HelperError(f'Missing regular fixed source directory: {directory}')
        candidates = sorted(directory.iterdir(), key=lambda item: item.name)
        if not candidates:
            raise HelperError(f'Fixed source directory is empty: {directory}')
        for filename in candidates:
            file_stat = filename.lstat()
            if (
                filename.is_symlink()
                or not filename.is_file()
                or not MCA_RE.fullmatch(filename.name)
                or file_stat.st_size <= 0
            ):
                raise HelperError(f'Unexpected fixed source member: {filename}')
            members.append({
                'path': f'{directory_name}/{filename.name}',
                'bytes': file_stat.st_size,
            })
    level_dat = world_root / 'level.dat'
    level_stat = level_dat.lstat()
    if level_dat.is_symlink() or not level_dat.is_file() or level_stat.st_size <= 0:
        raise HelperError('Fixed source level.dat is absent, empty, non-regular, or a symlink.')
    members.append({'path': 'level.dat', 'bytes': level_stat.st_size})
    members.sort(key=lambda item: item['path'])
    identity_payload = json.dumps(members, sort_keys=True, separators=(',', ':')).encode('utf8')
    return {
        'rootDevice': root_stat.st_dev,
        'rootInode': root_stat.st_ino,
        'members': members,
        'memberCount': len(members),
        'totalBytes': sum(member['bytes'] for member in members),
        'inventoryShapeSha256': hashlib.sha256(identity_payload).hexdigest(),
    }


def build_tar_command(inventory: dict[str, Any], world_root: Path = WORLD_ROOT) -> list[str]:
    paths = [member['path'] for member in inventory['members']]
    return [
        str(TAR_PATH),
        '--format=posix',
        '--sort=name',
        '--numeric-owner',
        '--directory',
        str(world_root),
        '--create',
        '--file',
        '-',
        *paths,
    ]


def run_fixed_archive(
    inventory: dict[str, Any],
    *,
    output: Any = None,
    timeout_seconds: float = ARCHIVE_TIMEOUT_SECONDS,
) -> None:
    output = output if output is not None else sys.stdout.buffer
    try:
        result = subprocess.run(
            build_tar_command(inventory),
            stdin=subprocess.DEVNULL,
            stdout=output,
            stderr=subprocess.PIPE,
            timeout=timeout_seconds,
            check=False,
        )
    except subprocess.TimeoutExpired as error:
        raise HelperError(
            f'Fixed archive command exceeded {timeout_seconds:.0f} seconds.',
        ) from error
    if result.returncode != 0:
        diagnostic = result.stderr.decode('utf8', 'replace').strip()
        raise HelperError(
            f'Fixed archive command exited {result.returncode}: {diagnostic or "no diagnostic"}',
        )
    output.flush()


def make_rcon_factory() -> Callable[[], RconClient]:
    settings = rcon_settings(parse_server_properties())
    return lambda: RconClient(*settings)


def restore_save_on(
    rcon_factory: Callable[[], Any],
    *,
    sleep_fn: Callable[[float], None] = time.sleep,
) -> tuple[str, str]:
    errors: list[str] = []
    for attempt in range(RESTORE_RETRY_COUNT):
        try:
            with rcon_factory() as rcon:
                reply = validate_save_on_reply(rcon.command('save-on'))
            return reply, utc_now()
        except BaseException as error:
            errors.append(str(error))
            if attempt + 1 < RESTORE_RETRY_COUNT:
                sleep_fn(RESTORE_RETRY_DELAY_SECONDS)
    raise HelperError('save-on restoration failed after bounded retries: ' + '; '.join(errors))


def run_save_state_lease(
    *,
    rcon_factory: Callable[[], Any],
    wait_for_parent: Callable[[float], str],
    emit: Callable[[dict[str, Any]], None],
    now_fn: Callable[[], str] = utc_now,
) -> None:
    changed_by_helper = False
    initial_state = 'UNKNOWN'
    ready_emitted = False
    primary_rcon: Any = None
    try:
        primary_rcon = rcon_factory()
        save_off_reply = primary_rcon.command('save-off')
        classification = classify_save_off_reply(save_off_reply)
        changed_by_helper = classification == 'DISABLED_BY_HELPER'
        initial_state = 'ENABLED' if changed_by_helper else 'DISABLED'
        save_off_confirmed = now_fn()
        flush_reply = validate_flush_reply(primary_rcon.command('save-all flush'))
        flush_completed = now_fn()
        emit({
            'type': 'READY',
            'initialSaveState': initial_state,
            'saveOffReply': save_off_reply.strip(),
            'flushReply': flush_reply,
            'saveOffConfirmedAtUtc': save_off_confirmed,
            'saveAllFlushCompletedAtUtc': flush_completed,
        })
        ready_emitted = True
        reason = wait_for_parent(DEADMAN_TIMEOUT_SECONDS)
        if reason not in {'RESTORE', 'PARENT_CLOSED', 'DEADMAN'}:
            reason = 'INVALID_PARENT_SIGNAL'
        if changed_by_helper:
            try:
                save_on_reply = validate_save_on_reply(primary_rcon.command('save-on'))
                restored_at = now_fn()
            except BaseException:
                save_on_reply, restored_at = restore_save_on(rcon_factory)
            restoration_action = 'SAVE_ON_CONFIRMED'
        else:
            save_on_reply = 'not issued; preexisting save-off preserved'
            restored_at = now_fn()
            restoration_action = 'PREEXISTING_SAVE_OFF_PRESERVED'
        emit({
            'type': 'RESTORED',
            'initialSaveState': initial_state,
            'restorationAction': restoration_action,
            'restorationReason': reason,
            'saveOnReply': save_on_reply,
            'saveOnRestoredAtUtc': restored_at,
        })
    except BaseException as error:
        restoration_error: str | None = None
        if changed_by_helper:
            try:
                _reply, restored_at = restore_save_on(rcon_factory)
            except BaseException as restore_error:
                restored_at = now_fn()
                restoration_error = str(restore_error)
        else:
            restored_at = now_fn()
        emit({
            'type': 'ERROR',
            'error': str(error),
            'readyEmitted': ready_emitted,
            'initialSaveState': initial_state,
            'restorationAttempted': changed_by_helper,
            'restorationError': restoration_error,
            'saveOnRestoredAtUtc': restored_at,
        })
    finally:
        if primary_rcon is not None:
            primary_rcon.close()


def write_pipe_message(fd: int, message: dict[str, Any]) -> None:
    payload = json.dumps(message, sort_keys=True, separators=(',', ':')).encode('utf8') + b'\n'
    if len(payload) > MAX_PIPE_MESSAGE_BYTES:
        raise HelperError('Internal lease message exceeds the fixed maximum.')
    offset = 0
    while offset < len(payload):
        written = os.write(fd, payload[offset:])
        if written <= 0:
            raise HelperError('Unable to write internal lease message.')
        offset += written


def read_pipe_message(fd: int, timeout_seconds: float) -> dict[str, Any]:
    deadline = time.monotonic() + timeout_seconds
    payload = bytearray()
    while True:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise HelperError('Timed out waiting for the independent save-state lease.')
        readable, _writable, _exceptional = select.select([fd], [], [], remaining)
        if not readable:
            raise HelperError('Timed out waiting for the independent save-state lease.')
        chunk = os.read(fd, 4096)
        if not chunk:
            raise HelperError('Independent save-state lease closed without confirmation.')
        payload.extend(chunk)
        if len(payload) > MAX_PIPE_MESSAGE_BYTES:
            raise HelperError('Internal lease message exceeds the fixed maximum.')
        newline = payload.find(b'\n')
        if newline >= 0:
            try:
                result = json.loads(payload[:newline].decode('utf8'))
            except (UnicodeDecodeError, json.JSONDecodeError) as error:
                raise HelperError('Independent save-state lease emitted invalid metadata.') from error
            if not isinstance(result, dict):
                raise HelperError('Independent save-state lease metadata is not an object.')
            return result


def wait_for_control(fd: int, timeout_seconds: float) -> str:
    readable, _writable, _exceptional = select.select([fd], [], [], timeout_seconds)
    if not readable:
        return 'DEADMAN'
    payload = os.read(fd, 64)
    if not payload:
        return 'PARENT_CLOSED'
    return 'RESTORE' if payload.strip() == b'RESTORE' else 'INVALID_PARENT_SIGNAL'


def start_independent_lease(rcon_factory: Callable[[], Any]) -> tuple[int, int, int]:
    control_read, control_write = os.pipe()
    status_read, status_write = os.pipe()
    child_pid = os.fork()
    if child_pid == 0:
        try:
            os.close(control_write)
            os.close(status_read)
            os.setsid()
            devnull = os.open('/dev/null', os.O_RDWR)
            for descriptor in (0, 1, 2):
                os.dup2(devnull, descriptor)
            if devnull > 2:
                os.close(devnull)
            run_save_state_lease(
                rcon_factory=rcon_factory,
                wait_for_parent=lambda timeout: wait_for_control(control_read, timeout),
                emit=lambda message: write_pipe_message(status_write, message),
            )
        except BaseException as error:
            try:
                write_pipe_message(status_write, {'type': 'ERROR', 'error': str(error)})
            except BaseException:
                pass
        finally:
            os.close(control_read)
            os.close(status_write)
            os._exit(0)
    os.close(control_read)
    os.close(status_write)
    return child_pid, control_write, status_read


def reap_child(child_pid: int, timeout_seconds: float = 10.0) -> None:
    deadline = time.monotonic() + timeout_seconds
    while time.monotonic() < deadline:
        completed, _status = os.waitpid(child_pid, os.WNOHANG)
        if completed == child_pid:
            return
        time.sleep(0.05)
    raise HelperError('Independent save-state lease did not exit after restoration.')


def acquire_lock() -> Any:
    LOCK_PATH.parent.mkdir(parents=True, exist_ok=True)
    flags = os.O_RDWR | os.O_CREAT | getattr(os, 'O_NOFOLLOW', 0)
    try:
        descriptor = os.open(LOCK_PATH, flags, 0o600)
    except OSError as error:
        raise HelperError(f'Unable to open the fixed capture lock safely: {error}') from error
    lock_stat = os.fstat(descriptor)
    if not stat.S_ISREG(lock_stat.st_mode) or lock_stat.st_uid != 0:
        os.close(descriptor)
        raise HelperError('The fixed capture lock is not a root-owned regular file.')
    handle = os.fdopen(descriptor, 'a+', encoding='utf8')
    try:
        fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError as error:
        handle.close()
        raise HelperError('Another complete-save helper invocation holds the capture lock.') from error
    return handle


def preflight_payload(rcon_factory: Callable[[], Any]) -> dict[str, Any]:
    if os.geteuid() != 0:
        raise HelperError('The fixed capture helper must run as root.')
    if not TAR_PATH.is_file() or TAR_PATH.is_symlink():
        raise HelperError(f'Fixed tar executable is absent or a symlink: {TAR_PATH}')
    inventory = inspect_fixed_world()
    with rcon_factory() as rcon:
        list_reply = rcon.command('list').strip()
    if not list_reply:
        raise HelperError('Authenticated RCON list preflight returned an empty reply.')
    return {
        'schemaVersion': HELPER_SCHEMA_VERSION,
        'id': HELPER_ID,
        'mode': 'preflight',
        'status': 'PASS',
        'helperSha256': helper_sha256(),
        'sourceWorldRoot': str(WORLD_ROOT),
        'serverProperties': str(SERVER_PROPERTIES),
        'memberCount': inventory['memberCount'],
        'totalBytes': inventory['totalBytes'],
        'inventoryShapeSha256': inventory['inventoryShapeSha256'],
    }


def stream_capture(rcon_factory: Callable[[], Any]) -> dict[str, Any]:
    if os.geteuid() != 0:
        raise HelperError('The fixed capture helper must run as root.')
    inventory = inspect_fixed_world()
    child_pid, control_write, status_read = start_independent_lease(rcon_factory)
    ready: dict[str, Any] | None = None
    restored: dict[str, Any] | None = None
    archive_error: BaseException | None = None
    copy_started: str | None = None
    copy_completed: str | None = None
    try:
        ready = read_pipe_message(status_read, LEASE_READY_TIMEOUT_SECONDS)
        if ready.get('type') != 'READY':
            raise HelperError(f'Save-state lease did not become ready: {ready}')
        frozen_inventory = inspect_fixed_world()
        copy_started = utc_now()
        run_fixed_archive(frozen_inventory)
        copy_completed = utc_now()
    except BaseException as error:
        archive_error = error
    finally:
        try:
            os.write(control_write, b'RESTORE\n')
        except OSError:
            pass
        os.close(control_write)
        try:
            try:
                restored = read_pipe_message(status_read, RESTORE_CONFIRM_TIMEOUT_SECONDS)
            except BaseException as restore_read_error:
                restored = {'type': 'ERROR', 'error': str(restore_read_error)}
        finally:
            os.close(status_read)
        try:
            reap_child(child_pid)
        except BaseException as reap_error:
            if restored is None or restored.get('type') == 'RESTORED':
                restored = {'type': 'ERROR', 'error': str(reap_error)}

    if restored is None or restored.get('type') != 'RESTORED':
        raise HelperError(f'Save-state restoration was not confirmed: {restored}')
    if restored.get('restorationReason') != 'RESTORE':
        raise HelperError(f'Independent deadman restored save state unexpectedly: {restored}')
    if archive_error is not None:
        raise HelperError(f'Capture archive failed after save-state restoration: {archive_error}')
    if ready is None or copy_started is None or copy_completed is None:
        raise HelperError('Capture metadata is incomplete after archive success.')
    return {
        'schemaVersion': HELPER_SCHEMA_VERSION,
        'id': HELPER_ID,
        'mode': 'stream',
        'status': 'CAPTURED',
        'captureId': f'combined-zones-{uuid.uuid4().hex}',
        'helperSha256': helper_sha256(),
        'sourceWorldRoot': str(WORLD_ROOT),
        'memberCount': frozen_inventory['memberCount'],
        'totalBytesBeforeFreeze': inventory['totalBytes'],
        'frozenInventoryShapeSha256': frozen_inventory['inventoryShapeSha256'],
        'initialSaveState': ready['initialSaveState'],
        'restorationAction': restored['restorationAction'],
        'captureProtocol': {
            'saveOffConfirmedAtUtc': ready['saveOffConfirmedAtUtc'],
            'saveAllFlushCompletedAtUtc': ready['saveAllFlushCompletedAtUtc'],
            'copyStartedAtUtc': copy_started,
            'copyCompletedAtUtc': copy_completed,
            'saveOnRestoredAtUtc': restored['saveOnRestoredAtUtc'],
            'initialSaveState': ready['initialSaveState'],
            'restorationAction': restored['restorationAction'],
        },
    }


def parse_mode(argv: list[str]) -> str:
    parser = argparse.ArgumentParser(description=__doc__, allow_abbrev=False)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--preflight', action='store_true')
    group.add_argument('--stream', action='store_true')
    args = parser.parse_args(argv)
    return 'preflight' if args.preflight else 'stream'


def main(argv: list[str]) -> int:
    mode = parse_mode(argv)
    validate_installed_helper()
    with acquire_lock():
        rcon_factory = make_rcon_factory()
        if mode == 'preflight':
            print(json.dumps(preflight_payload(rcon_factory), sort_keys=True, separators=(',', ':')))
        else:
            metadata = stream_capture(rcon_factory)
            print(
                METADATA_PREFIX + json.dumps(metadata, sort_keys=True, separators=(',', ':')),
                file=sys.stderr,
                flush=True,
            )
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main(sys.argv[1:]))
    except HelperError as error:
        print(
            ERROR_PREFIX + json.dumps({'status': 'HOLD', 'error': str(error)}, sort_keys=True),
            file=sys.stderr,
            flush=True,
        )
        sys.exit(1)
