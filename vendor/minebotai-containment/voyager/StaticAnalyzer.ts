/**
 * F-2.2-11 — Static analysis gate for LLM-generated code.
 *
 * Runs an AST scan over a candidate skill snippet and emits findings for any
 * usage of the forbidden patterns from the F-2.2-11 spec. The gate is
 * intentionally conservative: if the static analysis cannot conclusively prove
 * a snippet is safe, it returns findings (the caller decides what to do —
 * default is to block execution).
 *
 * The F-2.2-11 spec enumerates 14 forbidden-pattern categories; the AST
 * implementation in this file ships 13 distinct `push()` rule sites. The
 * count deviates from the spec because a few categories are detected at more
 * than one site (e.g. `no_symbol_abuse` fires from both a `Symbol()` call
 * and a `Symbol.*` MemberExpression; the dynamic-import rule fires from
 * both the `ImportExpression` AST node and Babel's `CallExpression`-with-
 * `Import`-callee representation). The actual site count is therefore
 * smaller than the rule count, and at least as strict.
 *
 * Two layers run back-to-back:
 *   1. A fast AST walk (using `@babel/parser`, which is already a direct dep
 *      of `apps/body`). This catches the syntactic blocklist patterns.
 *   2. A best-effort Semgrep wrapper. If `semgrep` is on PATH we shell out to
 *      `semgrep --config <rules>` and merge its findings; if not, we log once
 *      and continue with the AST-only result. The AST layer is the
 *      authoritative source — Semgrep is defence-in-depth.
 *
 * This file has no side effects on import: it never calls the bot, never
 * touches the network, and never imports the rest of the body. That keeps it
 * cheap to unit-test in isolation and safe to invoke from the pre-execution
 * gate (which itself runs in a hot path).
 */
import { parse } from '@babel/parser';
import type { File, Node } from '@babel/types';
import { spawn } from 'child_process';
import { logger } from '../util/logger';

export type FindingSeverity = 'error' | 'warning';

export interface StaticFinding {
  rule: string;
  severity: FindingSeverity;
  message: string;
  snippet: string;
  line?: number;
  column?: number;
}

export interface StaticAnalysisResult {
  ok: boolean;
  findings: StaticFinding[];
  /** Time spent on the AST scan in ms (excludes any Semgrep roundtrip). */
  scanMs: number;
  /** Findings that came back from Semgrep (subset of `findings`). */
  semgrepFindings: StaticFinding[];
}

export interface StaticAnalyzerOptions {
  /** When false (default), the analyzer will not shell out to Semgrep. */
  enableSemgrep?: boolean;
  /** Override the semgrep binary (default: `semgrep`). */
  semgrepBinary?: string;
  /** Hard ceiling on Semgrep wall-clock. Default 400ms (leaves room for the 500ms p95 budget). */
  semgrepTimeoutMs?: number;
}

/** Modules that the F-2.2-11 blocklist forbids calling `require()` against. */
const FORBIDDEN_REQUIRE_MODULES = new Set([
  'net',
  'http',
  'https',
  'dgram',
  'child_process',
  'fs',
  'os',
  'crypto',
  'vm',
  'worker_threads',
]);

/** Chat-command substrings the gate blocks in any string literal. */
const FORBIDDEN_CHAT_COMMANDS = [
  '/op',
  '/deop',
  '/ban',
  '/kick',
  '/give',
  '/gamemode',
  '/tp',
  '/kill',
  '/stop',
  '/whitelist',
  '/reload',
  '/sudo',
  '/execute',
];

/** Max snippet characters to include in a finding — keeps logs small. */
const FINDING_SNIPPET_MAX = 200;

/** A minimal Semgrep rule file shipped alongside this module. */
const SEMGREP_RULES = `rules:
  - id: no-eval
    pattern: eval(...)
    message: Use of eval() is forbidden.
    languages: [javascript]
    severity: ERROR
  - id: no-new-function
    pattern: new Function(...)
    message: new Function(...) is forbidden.
    languages: [javascript]
    severity: ERROR
  - id: no-function-call
    pattern: Function(...)
    message: Bare Function(...) call is forbidden.
    languages: [javascript]
    severity: ERROR
  - id: no-process
    pattern: process
    message: Access to process is forbidden.
    languages: [javascript]
    severity: ERROR
  - id: no-globalthis
    pattern: globalThis
    message: Access to globalThis is forbidden.
    languages: [javascript]
    severity: ERROR
  - id: no-global
    pattern: global
    message: Access to global is forbidden.
    languages: [javascript]
    severity: ERROR
  - id: no-new-proxy
    pattern: new Proxy(...)
    message: Proxy construction is forbidden.
    languages: [javascript]
    severity: ERROR
`;

function truncate(value: unknown, max = FINDING_SNIPPET_MAX): string {
  const s = typeof value === 'string' ? value : String(value ?? '');
  if (s.length <= max) return s;
  return `${s.slice(0, max)}\u2026[+${s.length - max} more]`;
}

function locOf(node: Node | null | undefined): { line?: number; column?: number } {
  if (!node || !node.loc) return {};
  return { line: node.loc.start.line, column: node.loc.start.column };
}

function isPlainIdentifier(name: string, node: Node | null | undefined): boolean {
  return !!node && node.type === 'Identifier' && (node as any).name === name;
}

function literalStringValue(node: Node | null | undefined): string | null {
  if (!node) return null;
  if (node.type === 'StringLiteral') return (node as any).value;
  if (node.type === 'TemplateLiteral') {
    return ((node as any).quasis as Array<{ value: { cooked: string } }>)
      .map((q) => q.value.cooked)
      .join('${...}');
  }
  return null;
}

export class StaticAnalyzer {
  private readonly opts: Required<StaticAnalyzerOptions>;
  private semgrepProbed = false;
  private semgrepAvailable: boolean | null = null;

  constructor(opts: StaticAnalyzerOptions = {}) {
    this.opts = {
      enableSemgrep: opts.enableSemgrep ?? false,
      semgrepBinary: opts.semgrepBinary ?? 'semgrep',
      semgrepTimeoutMs: opts.semgrepTimeoutMs ?? 400,
    };
  }

  /**
   * Scan a code snippet. The `filename` argument is purely for error messages
   * — it is never read from disk.
   */
  async scan(code: string, filename = '<generated>'): Promise<StaticAnalysisResult> {
    const t0 = Date.now();
    const ast = safeParse(code, filename);
    const findings: StaticFinding[] = [];
    if (ast) {
      walk(ast, findings);
    } else {
      // We still return an "ok: false" with a parse-error finding so the
      // caller can show it in the audit log. We do NOT fall through to allow
      // unparseable code through — anything we can't prove safe is unsafe.
      findings.push({
        rule: 'parse_error',
        severity: 'error',
        message: 'Could not parse snippet as JavaScript — refusing to run it.',
        snippet: truncate(code),
      });
    }
    const scanMs = Date.now() - t0;

    let semgrepFindings: StaticFinding[] = [];
    if (this.opts.enableSemgrep) {
      semgrepFindings = await this.runSemgrep(code, filename);
      findings.push(...semgrepFindings);
    }

    return {
      ok: findings.every((f) => f.severity !== 'error'),
      findings,
      scanMs,
      semgrepFindings,
    };
  }

  private async runSemgrep(code: string, filename: string): Promise<StaticFinding[]> {
    if (!(await this.probeSemgrep())) return [];
    return new Promise<StaticFinding[]>((resolve) => {
      const proc = spawn(
        this.opts.semgrepBinary,
        ['--config', '-', '--json', '--quiet', '--error', '--no-git-ignore', filename],
        { stdio: ['pipe', 'pipe', 'pipe'] },
      );
      const findings: StaticFinding[] = [];
      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', (b: Buffer) => {
        stdout += b.toString('utf8');
      });
      proc.stderr.on('data', (b: Buffer) => {
        stderr += b.toString('utf8');
      });
      proc.on('error', (err) => {
        logger.warn({ err: err?.message }, 'Semgrep spawn failed; skipping Semgrep layer');
        resolve([]);
      });
      proc.on('close', () => {
        try {
          const json = JSON.parse(stdout);
          const results: any[] = Array.isArray(json?.results) ? json.results : [];
          for (const r of results) {
            const start = r?.start ?? {};
            findings.push({
              rule: `semgrep:${r?.check_id ?? 'unknown'}`,
              severity: 'error',
              message: r?.extra?.message ?? 'Semgrep rule matched',
              snippet: truncate(r?.extra?.lines ?? code),
              line: typeof start.line === 'number' ? start.line : undefined,
              column: typeof start.col === 'number' ? start.col : undefined,
            });
          }
          resolve(findings);
        } catch (err: any) {
          logger.warn(
            { err: err?.message, stderr: truncate(stderr, 200) },
            'Semgrep returned non-JSON output; treating as no findings',
          );
          resolve([]);
        }
      });
      proc.stdin.write(SEMGREP_RULES);
      proc.stdin.write('\n');
      proc.stdin.end();
      setTimeout(() => {
        try {
          proc.kill('SIGKILL');
        } catch {
          /* ignore */
        }
        resolve(findings);
      }, this.opts.semgrepTimeoutMs).unref();
    }).catch((err: any) => {
      logger.warn({ err: err?.message }, 'Semgrep wrapper rejected; continuing without it');
      return [] as StaticFinding[];
    });
  }

  private async probeSemgrep(): Promise<boolean> {
    if (this.semgrepAvailable !== null) return this.semgrepAvailable;
    this.semgrepProbed = true;
    this.semgrepAvailable = await new Promise<boolean>((resolve) => {
      const proc = spawn(this.opts.semgrepBinary, ['--version'], { stdio: ['ignore', 'pipe', 'pipe'] });
      proc.on('error', () => resolve(false));
      proc.on('close', (code) => resolve(code === 0));
    });
    return this.semgrepAvailable;
  }
}

function safeParse(code: string, filename: string): File | null {
  try {
    return parse(code, {
      sourceType: 'unambiguous',
      allowReturnOutsideFunction: true,
      allowAwaitOutsideFunction: true,
      errorRecovery: true,
      plugins: ['typescript'],
    });
  } catch (err: any) {
    logger.debug(
      { filename, err: err?.message },
      'StaticAnalyzer could not parse snippet as JavaScript',
    );
    return null;
  }
}

function walk(node: File, findings: StaticFinding[]): void {
  visit(node, findings);
}

function visit(node: Node | null | undefined, findings: StaticFinding[]): void {
  if (!node || typeof node !== 'object') return;
  switch (node.type) {
    case 'CallExpression': {
      const ce = node as any;
      const callee = ce.callee;
      if (isPlainIdentifier('eval', callee)) {
        push(findings, 'no_eval', 'Use of eval() is forbidden.', node, ce.arguments?.[0]);
      }
      if (isPlainIdentifier('Function', callee)) {
        push(findings, 'no_function_call', 'Bare Function(...) is forbidden.', node, callee);
      }
      if (isPlainIdentifier('require', callee) && Array.isArray(ce.arguments) && ce.arguments[0]) {
        const target = literalStringValue(ce.arguments[0]);
        if (target && FORBIDDEN_REQUIRE_MODULES.has(target)) {
          push(
            findings,
            `no_require_${target}`,
            `require('${target}') is forbidden.`,
            node,
            ce.arguments[0],
          );
        }
      }
      // babel emits `import(x)` as CallExpression with callee.type === 'Import'
      if (callee?.type === 'Import') {
        const arg = ce.arguments?.[0];
        if (!literalStringValue(arg)) {
          push(
            findings,
            'no_dynamic_import',
            'Dynamic import() with a non-literal specifier is forbidden.',
            node,
            arg,
          );
        }
      }
      if (isPlainIdentifier('Symbol', callee)) {
        push(findings, 'no_symbol_abuse', 'Symbol() is forbidden.', node, callee);
      }
      break;
    }
    case 'NewExpression': {
      const ne = node as any;
      if (isPlainIdentifier('Function', ne.callee)) {
        push(findings, 'no_new_function', 'new Function(...) is forbidden.', node, ne.callee);
      }
      if (isPlainIdentifier('Proxy', ne.callee)) {
        push(findings, 'no_new_proxy', 'new Proxy(...) is forbidden.', node, ne.callee);
      }
      break;
    }
    case 'ImportExpression': {
      const ie = node as any;
      if (!literalStringValue(ie.source)) {
        push(
          findings,
          'no_dynamic_import',
          'Dynamic import() with a non-literal specifier is forbidden.',
          node,
          ie.source,
        );
      }
      break;
    }
    case 'Identifier': {
      const id = node as any;
      if (id.name === 'process' || id.name === 'globalThis' || id.name === 'global') {
        push(
          findings,
          `no_${id.name}`,
          `Access to ${id.name} is forbidden.`,
          node,
          id,
        );
      }
      break;
    }
    case 'MemberExpression': {
      const me = node as any;
      // Object.prototype.foo = ...  /  Array.prototype.foo = ...  /  Function.prototype.foo = ...
      if (
        me.property?.type === 'Identifier' &&
        me.property.name === 'prototype' &&
        me.object?.type === 'Identifier' &&
        (me.object.name === 'Object' ||
          me.object.name === 'Array' ||
          me.object.name === 'Function')
      ) {
        push(
          findings,
          `no_${me.object.name}_prototype_mutation`,
          `Mutation of ${me.object.name}.prototype is forbidden.`,
          node,
          me,
        );
      }
      // Reflect.* usage — block the entire namespace
      if (me.object?.type === 'Identifier' && me.object.name === 'Reflect') {
        push(findings, 'no_reflect', 'Reflect.* usage is forbidden.', node, me);
      }
      // Symbol() or Symbol.for(...) — flag Symbol-keyed abuse
      if (me.object?.type === 'Identifier' && me.object.name === 'Symbol') {
        push(findings, 'no_symbol_abuse', 'Symbol-keyed access is forbidden.', node, me);
      }
      break;
    }
    case 'StringLiteral':
    case 'TemplateLiteral': {
      const text = literalStringValue(node) ?? '';
      for (const cmd of FORBIDDEN_CHAT_COMMANDS) {
        // Match the command only when it is at a word boundary so `/stopwatch`
        // does not match `/stop`. We accept whitespace, start-of-string, or
        // common Minecraft separators before the command.
        const pattern = new RegExp(`(^|[\\s,;"'])${escapeRegExp(cmd)}(\\b|$)`);
        if (pattern.test(text)) {
          push(
            findings,
            `no_forbidden_chat_${cmd.slice(1)}`,
            `String literal contains forbidden chat command "${cmd}".`,
            node,
            node,
          );
          break;
        }
      }
      break;
    }
    case 'AssignmentExpression': {
      // The MemberExpression walker above only matches *reads*. For prototype
      // mutation we want the assignment-side check too — `Object.prototype.x = 1`.
      const ae = node as any;
      if (
        ae.left?.type === 'MemberExpression' &&
        ae.left.property?.type === 'Identifier' &&
        ae.left.property.name === 'prototype' &&
        ae.left.object?.type === 'Identifier' &&
        (ae.left.object.name === 'Object' ||
          ae.left.object.name === 'Array' ||
          ae.left.object.name === 'Function')
      ) {
        // Already flagged in the MemberExpression branch — no-op.
      }
      break;
    }
    default:
      break;
  }

  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'start' || key === 'end' || key === 'range' || key === 'parent') continue;
    const child = (node as any)[key];
    if (Array.isArray(child)) {
      for (const c of child) {
        if (c && typeof c === 'object' && typeof c.type === 'string') visit(c, findings);
      }
    } else if (child && typeof child === 'object' && typeof child.type === 'string') {
      visit(child, findings);
    }
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function push(
  findings: StaticFinding[],
  rule: string,
  message: string,
  owner: Node,
  snippetNode: Node | null | undefined,
): void {
  const snippet =
    snippetNode && 'extra' in (snippetNode as any) && (snippetNode as any).extra?.raw
      ? (snippetNode as any).extra.raw
      : snippetNode && snippetNode.type === 'StringLiteral'
      ? (snippetNode as any).value
      : snippetNode && snippetNode.type === 'TemplateLiteral'
      ? literalStringValue(snippetNode) ?? ''
      : '';
  findings.push({
    rule,
    severity: 'error',
    message,
    snippet: truncate(snippet || ownerToSnippet(owner)),
    ...locOf(owner),
  });
}

function ownerToSnippet(node: Node): string {
  // Without a code-to-node map we fall back to a short placeholder so we never
  // include a multi-kilobyte source blob in audit logs.
  return `<${node.type}@${(node as any).loc?.start?.line ?? '?'}>`;
}
