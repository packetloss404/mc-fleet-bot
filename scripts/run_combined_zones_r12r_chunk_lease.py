#!/usr/bin/env python3
"""Acquire/release the exact temporary chunk lease for the R12R shuttle.

Dry-run is the default. Acquisition records the entire pre-existing force-load
set and adds only the two missing shuttle chunks. Release is hash-bound to that
lease, removes only additions owned by it, and verifies exact restoration.
"""

import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rcon_runner  # noqa: E402
import run_guarded_tagged_minecart_transaction as entity_kernel  # noqa: E402


TRANSACTION_ID = 'combined-zones-r12r-b09-bounded-active-shuttle'
REQUIRED = {(128, -47), (129, -47)}


def lease_hash(value):
    payload = dict(value)
    payload.pop('leasePayloadSha256', None)
    return entity_kernel.sha256_bytes(entity_kernel.canonical(payload))


def serialize(chunks):
    return [{'x': x, 'z': z} for x, z in sorted(chunks)]


def deserialize(entries):
    return {(int(entry['x']), int(entry['z'])) for entry in entries}


def query(rcon):
    return rcon_runner.parse_force_load_chunks(rcon.cmd('forceload query'))


class ChunkLease:
    def __init__(self, rcon_factory, clock=entity_kernel.utc_now):
        self.rcon_factory = rcon_factory
        self.clock = clock

    def plan(self, mode='acquire', lease=None):
        report = {
            'schemaVersion': 1,
            'transactionId': TRANSACTION_ID,
            'generatedAtUtc': self.clock(),
            'mode': f'DRY_RUN_{mode.upper()}',
            'status': 'PLAN_VALIDATED_NO_RCON_CONNECTION',
            'requiredChunks': serialize(REQUIRED),
            'leaseSourcePayloadSha256': lease.get('leasePayloadSha256') if lease else None,
            'safetyBoundary': {
                'rconConnected': False,
                'worldMutationPerformed': False,
                'removeAllAllowed': False,
                'onlyLeaseOwnedAdditionsMayBeRemoved': True,
            },
        }
        report['reportPayloadSha256'] = entity_kernel.payload_hash(report)
        return report

    def acquire(self):
        rcon = self.rcon_factory()
        commands = []
        before = None
        added = set()
        try:
            before = query(rcon)
            additions = REQUIRED - before
            for x, z in sorted(additions):
                command = f'forceload add {x * 16} {z * 16}'
                added.add((x, z))
                reply = rcon.cmd(command)
                commands.append({'command': command, 'reply': reply})
            after = query(rcon)
            if after != before | REQUIRED:
                raise RuntimeError('force-load set after acquisition is not exact predecessor union required')
            for x, z in sorted(REQUIRED):
                reply = rcon.cmd(f'forceload query {x * 16} {z * 16}')
                commands.append({'command': f'forceload query {x * 16} {z * 16}', 'reply': reply})
                if 'not marked' in reply.lower() or 'not force loaded' in reply.lower():
                    raise RuntimeError(f'required chunk {(x, z)} is not force loaded')
            report = {
                'schemaVersion': 1,
                'transactionId': TRANSACTION_ID,
                'generatedAtUtc': self.clock(),
                'mode': 'EXECUTE_ACQUIRE',
                'status': 'LEASE_ACQUIRED_EXACT_SET_VERIFIED',
                'preExistingChunks': serialize(before),
                'requiredChunks': serialize(REQUIRED),
                'ownedAdditions': serialize(additions),
                'acquiredChunks': serialize(after),
                'commands': commands,
                'safetyBoundary': {'removeAllUsed': False},
            }
            report['leasePayloadSha256'] = lease_hash(report)
            return report
        except Exception as error:
            cleanup_errors = []
            for x, z in sorted(added):
                try:
                    rcon.cmd(f'forceload remove {x * 16} {z * 16}')
                except Exception as cleanup_error:
                    cleanup_errors.append(str(cleanup_error))
            try:
                final = query(rcon)
                if before is not None and final != before:
                    cleanup_errors.append(
                        f'final set {serialize(final)} does not equal predecessor {serialize(before)}'
                    )
            except Exception as cleanup_error:
                cleanup_errors.append(str(cleanup_error))
            if cleanup_errors:
                raise RuntimeError(
                    f'lease acquire failed ({error}); partial-add compensation failed: {cleanup_errors}'
                ) from error
            raise
        finally:
            rcon.close()

    def release(self, lease):
        if lease.get('status') != 'LEASE_ACQUIRED_EXACT_SET_VERIFIED':
            raise ValueError('release source is not an acquired lease')
        if lease.get('leasePayloadSha256') != lease_hash(lease):
            raise ValueError('lease payload hash drifted')
        before = deserialize(lease['preExistingChunks'])
        additions = deserialize(lease['ownedAdditions'])
        if additions - REQUIRED or before & additions:
            raise ValueError('lease additions are not an exact disjoint subset of required chunks')
        rcon = self.rcon_factory()
        commands = []
        try:
            current = query(rcon)
            if not additions <= current or not before <= current:
                raise RuntimeError('force-load state lost lease or predecessor chunks before release')
            cleanup_errors = []
            for x, z in sorted(additions):
                command = f'forceload remove {x * 16} {z * 16}'
                try:
                    reply = rcon.cmd(command)
                    commands.append({'command': command, 'reply': reply})
                except Exception as error:
                    cleanup_errors.append({'command': command, 'error': str(error)})
            final = query(rcon)
            status = ('LEASE_RELEASED_PREEXISTING_SET_EXACTLY_RESTORED'
                      if final == before and not cleanup_errors
                      else 'LEASE_RELEASE_FAILED_SET_DRIFT')
            report = {
                'schemaVersion': 1,
                'transactionId': TRANSACTION_ID,
                'generatedAtUtc': self.clock(),
                'mode': 'EXECUTE_RELEASE',
                'status': status,
                'leaseSourcePayloadSha256': lease['leasePayloadSha256'],
                'preExistingChunks': serialize(before),
                'ownedAdditionsRemoved': serialize(additions),
                'finalChunks': serialize(final),
                'commands': commands,
                'cleanupErrors': cleanup_errors,
                'safetyBoundary': {'removeAllUsed': False},
            }
            report['reportPayloadSha256'] = entity_kernel.payload_hash(report)
            return report
        finally:
            rcon.close()


def parser():
    result = argparse.ArgumentParser(description=__doc__)
    result.add_argument('--mode', choices=('acquire', 'release'), default='acquire')
    result.add_argument('--lease')
    result.add_argument('--execute', action='store_true')
    result.add_argument('--report')
    result.add_argument('--generated-at')
    result.add_argument('--endpoint', choices=('loopback', 'production'), default='loopback')
    result.add_argument('--host')
    result.add_argument('--port', type=int)
    result.add_argument('--password')
    result.add_argument('--password-env', default='MC_RCON_PASSWORD')
    result.add_argument('--confirm-production')
    return result


def main(argv=None):
    args = parser().parse_args(argv)
    lease = json.load(open(args.lease, encoding='utf-8')) if args.lease else None
    clock = (lambda: args.generated_at) if args.generated_at else entity_kernel.utc_now
    if not args.execute:
        report = ChunkLease(lambda: None, clock).plan(args.mode, lease)
    else:
        if not args.report:
            raise ValueError('--execute requires --report')
        if args.endpoint == 'production' and args.confirm_production != TRANSACTION_ID:
            raise ValueError('--confirm-production must exactly equal transactionId')
        endpoint_args = argparse.Namespace(
            endpoint=args.endpoint, confirm_production=args.confirm_production,
            transaction_id=TRANSACTION_ID, host=args.host, port=args.port,
            password=args.password, password_env=args.password_env, timeout_seconds=10,
        )
        transaction = ChunkLease(entity_kernel.rcon_factory_from_args(endpoint_args), clock)
        report = transaction.acquire() if args.mode == 'acquire' else transaction.release(lease)
    if args.report:
        entity_kernel.durable_json(args.report, report, exclusive=True)
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report['status'] in (
        'PLAN_VALIDATED_NO_RCON_CONNECTION',
        'LEASE_ACQUIRED_EXACT_SET_VERIFIED',
        'LEASE_RELEASED_PREEXISTING_SET_EXACTLY_RESTORED',
    ) else 1


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except (ValueError, RuntimeError, OSError) as error:
        print(f'ERROR: {error}', file=sys.stderr)
        raise SystemExit(2)
