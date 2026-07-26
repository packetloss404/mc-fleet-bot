/**
 * F-2.2-10 — Sandboxed executor for LLM-generated code.
 *
 * The executor owns a dedicated `worker_threads` `Worker` in which an
 * `isolated-vm` V8 isolate lives. There are two blast-radius layers:
 *
 *   1. The V8 `Isolate` (handled by `isolated-vm` inside the worker). The
 *      snippet runs in its own heap with no access to the host's module
 *      graph. The `Isolate` is also `memoryLimit`-capped, so a
 *      `while (true) arr.push(new Uint8Array(2*1024*1024))` loop cannot
 *      exhaust the host's RAM.
 *   2. The `worker_threads` wrapper. The whole V8 isolate lives in a
 *      Node worker thread, so an OOM or catastrophic V8 failure in the
 *      isolate can be SIGKILL'd via `worker.terminate()` without taking
 *      down the parent body process. We can also run a fresh worker per
 *      execute() if the spec moves to "throw away the worker on every
 *      catastrophic" — the seam is here.
 *
 * The 8 broker methods the snippet sees (`bot_chat`, `bot_move_to`, ...)
 * are installed inside the worker as `ivm.Callback`s. The callbacks are
 * synchronous-from-isolated-vm's-POV, but they delegate to the host by
 * posting a `broker-call` message to the parent and blocking on a
 * `SharedArrayBuffer` word using `Atomics.wait`. `Atomics.wait` is the
 * trick that makes this work: it lets a worker thread block on an async
 * host response while the V8 isolate stays single-threaded and
 * deterministic.
 */
import { Worker } from 'worker_threads';
import path from 'path';
import { logger } from '../util/logger';

/**
 * The 8 broker functions exposed to the untrusted snippet. Each is async so
 * the host can do real I/O (mineflayer writes, etc.) without blocking the
 * worker thread.
 *
 * `bot_chat` is the ONLY path for sending chat; the host length-caps and
 * command-validates it here so the snippet cannot bypass the static gate by
 * calling `/op` at runtime.
 */
export interface IsolatedBroker {
  bot_chat(text: string): Promise<void>;
  bot_move_to(x: number, y: number, z: number): Promise<boolean>;
  bot_inventory_read(): Promise<Array<{ name: string; count: number; slot: number }>>;
  bot_inventory_drop(slot: number): Promise<void>;
  bot_block_break(x: number, y: number, z: number): Promise<{ name: string; count: number } | null>;
  bot_craft(recipe_id: string): Promise<{ name: string; count: number }>;
  bot_observe(): Promise<{
    position: { x: number; y: number; z: number };
    time: { timeOfDay: number; day: number };
    inventory: Array<{ name: string; count: number; slot: number }>;
    nearbyPlayers: Array<{ name: string; position: { x: number; y: number; z: number } | null }>;
  }>;
  sleep(ms: number): Promise<void>;
}

export interface IsolatedExecutorOptions {
  /** V8-isolate memory limit in MB. Default 128 (the spec's hard limit). */
  memoryLimitMb?: number;
  /** Compile timeout in ms. Default 5000. */
  compileTimeoutMs?: number;
  /** Wall-clock run timeout in ms. Default 5*60*1000. */
  runTimeoutMs?: number;
  /** Path to the sandbox worker entry point. */
  workerPath?: string;
  /** Hook for catastrophic V8 errors. Defaults to logging. */
  onCatastrophicError?: (message: string) => void;
  /**
   * Per-broker-call wait timeout, in ms. The worker thread blocks on the
   * host's response; if the host takes longer than this the call is
   * considered failed and the worker thread is killed. Default 30s — long
   * enough for slow mineflayer writes, short enough that a stuck broker
   * surfaces quickly.
   */
  brokerCallTimeoutMs?: number;
}

export interface ExecuteInput {
  /** Concatenated skill definitions. Injected as-is. */
  allSkillCode: string;
  /** The skill entrypoint function. */
  functionCode: string;
  /** The driver code that calls the skill. */
  execCode: string;
  /** Identifier for logs. */
  taskId?: string;
}

export interface ExecuteOutput {
  success: boolean;
  output: string;
  error?: string;
  kind: 'ok' | 'runtime_error' | 'compile_timeout' | 'run_timeout' | 'interrupted' | 'catastrophic';
}

const COMPILE_TIMEOUT_DEFAULT = 5_000;
const RUN_TIMEOUT_DEFAULT = 5 * 60_000;
const MEMORY_LIMIT_DEFAULT = 128;
const BROKER_CALL_TIMEOUT_DEFAULT = 30_000;

const BROKER_METHOD_NAMES: ReadonlyArray<keyof IsolatedBroker> = [
  'bot_chat',
  'bot_move_to',
  'bot_inventory_read',
  'bot_inventory_drop',
  'bot_block_break',
  'bot_craft',
  'bot_observe',
  'sleep',
];

/**
 * Build the function body that runs in the isolate. The form mirrors the
 * legacy `vm` wrapping in `CodeExecutor` — skill definitions, then the
 * entry IIFE — so existing skill libraries are source-compatible.
 */
function buildWrapped(input: ExecuteInput): string {
  return `
(async () => {
${input.allSkillCode}

${input.functionCode}

${input.execCode}
})();
`;
}

export class IsolatedExecutor {
  private readonly opts: {
    memoryLimitMb: number;
    compileTimeoutMs: number;
    runTimeoutMs: number;
    workerPath: string;
    brokerCallTimeoutMs: number;
    onCatastrophicError: (message: string) => void;
  };
  private worker: Worker | null = null;
  private catastrophic = false;

  constructor(opts: IsolatedExecutorOptions = {}) {
    this.opts = {
      memoryLimitMb: opts.memoryLimitMb ?? MEMORY_LIMIT_DEFAULT,
      compileTimeoutMs: opts.compileTimeoutMs ?? COMPILE_TIMEOUT_DEFAULT,
      runTimeoutMs: opts.runTimeoutMs ?? RUN_TIMEOUT_DEFAULT,
      workerPath: opts.workerPath ?? path.join(__dirname, 'worker', 'sandboxWorker.js'),
      brokerCallTimeoutMs: opts.brokerCallTimeoutMs ?? BROKER_CALL_TIMEOUT_DEFAULT,
      onCatastrophicError:
        opts.onCatastrophicError ??
        ((msg: string) => {
          logger.error({ msg }, 'IsolatedExecutor: catastrophic V8 error reported by worker');
        }),
    };
  }

  /**
   * Run a snippet. Each call spawns a fresh worker thread (or reuses a
   * warm one if a previous run completed without corruption). The worker
   * creates the V8 isolate, installs the 8 broker callbacks, and runs the
   * code under the configured timeout.
   */
  async execute(broker: IsolatedBroker, input: ExecuteInput): Promise<ExecuteOutput> {
    if (this.catastrophic) {
      return {
        success: false,
        output: '',
        error: 'IsolatedExecutor has been quarantined after a catastrophic V8 error',
        kind: 'catastrophic',
      };
    }
    return this.runInWorker(broker, input);
  }

  private async runInWorker(broker: IsolatedBroker, input: ExecuteInput): Promise<ExecuteOutput> {
    const wrapped = buildWrapped(input);
    const brokerMethods = BROKER_METHOD_NAMES.map((name) => name);
    const worker = new Worker(this.opts.workerPath, {
      workerData: {
        memoryLimitMb: this.opts.memoryLimitMb,
        compileTimeoutMs: this.opts.compileTimeoutMs,
        runTimeoutMs: this.opts.runTimeoutMs,
        brokerCallTimeoutMs: this.opts.brokerCallTimeoutMs,
        wrapped,
        brokerMethods,
      },
    });
    this.worker = worker;
    return new Promise<ExecuteOutput>((resolve) => {
      let settled = false;
      const finish = (out: ExecuteOutput) => {
        if (settled) return;
        settled = true;
        worker.removeAllListeners();
        worker.terminate().catch(() => undefined);
        if (this.worker === worker) this.worker = null;
        resolve(out);
      };

      const runTimer = setTimeout(() => {
        finish({
          success: false,
          output: '',
          error: `IsolatedExecutor: run exceeded ${this.opts.runTimeoutMs}ms budget`,
          kind: 'run_timeout',
        });
      }, this.opts.runTimeoutMs + 5_000);

      worker.on('message', (msg: any) => {
        if (settled) return;
        if (msg?.type === 'broker-call') {
          this.handleBrokerCall(broker, msg, worker, finish);
          return;
        }
        if (msg?.type === 'done') {
          clearTimeout(runTimer);
          finish({
            success: !!msg.success,
            output: typeof msg.output === 'string' ? msg.output : '',
            error: msg.error,
            kind: msg.kind ?? 'ok',
          });
          return;
        }
        if (msg?.type === 'catastrophic') {
          clearTimeout(runTimer);
          this.catastrophic = true;
          this.opts.onCatastrophicError(String(msg.message ?? 'unknown'));
          finish({
            success: false,
            output: '',
            error: `catastrophic V8 error: ${String(msg.message ?? 'unknown')}`,
            kind: 'catastrophic',
          });
          return;
        }
      });

      worker.on('error', (err: Error) => {
        clearTimeout(runTimer);
        finish({
          success: false,
          output: '',
          error: `sandbox worker crashed: ${err?.message ?? err}`,
          kind: 'catastrophic',
        });
      });

      worker.on('exit', (code: number) => {
        if (settled) return;
        clearTimeout(runTimer);
        finish({
          success: false,
          output: '',
          error: `sandbox worker exited unexpectedly with code ${code}`,
          kind: code === 1 ? 'catastrophic' : 'runtime_error',
        });
      });
    });
  }

  /**
   * Reply to a broker call from the worker. We invoke the host function,
   * JSON-encode the resolved value, write it into the worker-supplied
   * SharedArrayBuffer, and `Atomics.notify` to wake the worker's
   * `Atomics.wait`. This is the cross-thread wakeup path described in
   * `worker/sandboxWorker.ts`.
   */
  private handleBrokerCall(
    broker: IsolatedBroker,
    msg: any,
    worker: Worker,
    _finish: (out: ExecuteOutput) => void,
  ): void {
    const { callId, method, args, sab } = msg;
    if (!(sab instanceof SharedArrayBuffer)) {
      logger.warn({ callId, method }, 'IsolatedExecutor: broker-call missing SAB');
      return;
    }
    const view = new Int32Array(sab);
    const fn = (broker as any)[method];
    if (typeof fn !== 'function') {
      writeResultToSab(view, sab, 2, `unknown broker method "${method}"`);
      return;
    }
    Promise.resolve()
      .then(() => fn.apply(broker, args ?? []))
      .then(
        (result) => {
          try {
            const text = JSON.stringify(result ?? null);
            writeResultToSab(view, sab, 1, text);
          } catch (err: any) {
            writeResultToSab(
              view,
              sab,
              2,
              `broker result for ${method} is not JSON-serialisable: ${err?.message ?? err}`,
            );
          }
        },
        (err: any) => {
          const message = err instanceof Error ? err.message : String(err);
          writeResultToSab(view, sab, 2, message);
        },
      );
  }
}

/**
 * Write a (status, JSON-text) result into the result SAB and notify the
 * waiting worker thread. Status 1 = ok, 2 = err. The text is encoded as
 * UTF-8 starting at byte 8 of the SAB.
 */
function writeResultToSab(view: Int32Array, sab: SharedArrayBuffer, status: 1 | 2, text: string): void {
  const bytes = new TextEncoder().encode(text);
  if (bytes.length > sab.byteLength - 8) {
    // Truncate aggressively. The host broker should keep its results small.
    const truncated = bytes.subarray(0, sab.byteLength - 8);
    new Uint8Array(sab, 8, truncated.length).set(truncated);
    Atomics.store(view, 1, truncated.length);
  } else {
    new Uint8Array(sab, 8, bytes.length).set(bytes);
    Atomics.store(view, 1, bytes.length);
  }
  Atomics.store(view, 0, status);
  Atomics.notify(view, 0);
  // Suppress the unused parameter warning when `sab` is not directly read
  // (TypeScript doesn't know we use it through `view` for layout only).
  void sab;
}
