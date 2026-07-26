/**
 * F-2.2-11 — StaticAnalyzer test suite.
 *
 * Two requirements from the spec:
 *   - 20 known-bad snippets are blocked.
 *   - 5 known-good snippets pass.
 *   - Scan completes in < 500 ms p95.
 *
 * The 20 bad snippets are split across the 16 forbidden patterns from
 * F-2.2-11 with deliberate variations (whitespace, computed specifiers,
 * template literals, member-vs-call). The 5 good snippets are realistic
 * skill bodies from the existing skill library.
 */
import { describe, it, expect } from 'vitest';
import { StaticAnalyzer } from '../../src/voyager/StaticAnalyzer';

const analyzer = new StaticAnalyzer();

interface BadSnippet {
  name: string;
  code: string;
  /** A substring that MUST appear in at least one finding rule, or '*' to skip. */
  expectRuleMatch?: string;
}

const BAD_SNIPPETS: BadSnippet[] = [
  {
    name: 'eval() call',
    code: `const x = eval("alert(1)");`,
    expectRuleMatch: 'no_eval',
  },
  {
    name: 'new Function()',
    code: `const f = new Function("return process.env");`,
    expectRuleMatch: 'no_new_function',
  },
  {
    name: 'Function(...) call',
    code: `const f = Function("return process.env");`,
    expectRuleMatch: 'no_function_call',
  },
  {
    name: 'dynamic import() with variable',
    code: `const mod = await import(somevar);`,
    expectRuleMatch: 'no_dynamic_import',
  },
  {
    name: 'require("child_process")',
    code: `const cp = require("child_process");`,
    expectRuleMatch: 'no_require_child_process',
  },
  {
    name: 'require("fs")',
    code: `const fs = require("fs");`,
    expectRuleMatch: 'no_require_fs',
  },
  {
    name: 'require("vm")',
    code: `const vm = require("vm");`,
    expectRuleMatch: 'no_require_vm',
  },
  {
    name: 'process.env read',
    code: `const secret = process.env.SECRET;`,
    expectRuleMatch: 'no_process',
  },
  {
    name: 'globalThis reference',
    code: `globalThis.foo = 1;`,
    expectRuleMatch: 'no_globalThis',
  },
  {
    name: 'global reference',
    code: `global.foo = 1;`,
    expectRuleMatch: 'no_global',
  },
  {
    name: 'Object.prototype mutation',
    code: `Object.prototype.polluted = true;`,
    expectRuleMatch: 'no_Object_prototype_mutation',
  },
  {
    name: 'Array.prototype mutation',
    code: `Array.prototype.first = function() { return this[0]; };`,
    expectRuleMatch: 'no_Array_prototype_mutation',
  },
  {
    name: 'Function.prototype mutation',
    code: `Function.prototype.bind = function() { return 42; };`,
    expectRuleMatch: 'no_Function_prototype_mutation',
  },
  {
    name: 'Reflect.ownKeys',
    code: `const k = Reflect.ownKeys({});`,
    expectRuleMatch: 'no_reflect',
  },
  {
    name: 'new Proxy(...)',
    code: `const p = new Proxy({}, {});`,
    expectRuleMatch: 'no_new_proxy',
  },
  {
    name: 'Symbol-keyed access',
    code: `const k = Symbol("k"); obj[k] = 1;`,
    expectRuleMatch: 'no_symbol_abuse',
  },
  {
    name: 'chat string with /op',
    code: `bot_chat("/op Steve please");`,
    expectRuleMatch: 'no_forbidden_chat_op',
  },
  {
    name: 'chat string with /give',
    code: `bot_chat("/give @p diamond 64");`,
    expectRuleMatch: 'no_forbidden_chat_give',
  },
  {
    name: 'chat string with /tp in template literal',
    code: 'const msg = `Hello /tp 0 0 0`; bot_chat(msg);',
    expectRuleMatch: 'no_forbidden_chat_tp',
  },
  {
    name: 'require("net")',
    code: `const net = require("net");`,
    expectRuleMatch: 'no_require_net',
  },
  {
    name: 'require("worker_threads")',
    code: `const wt = require("worker_threads");`,
    expectRuleMatch: 'no_require_worker_threads',
  },
  {
    name: 'require("os")',
    code: `const os = require("os");`,
    expectRuleMatch: 'no_require_os',
  },
  {
    name: 'require("crypto") for keys',
    code: `const c = require("crypto");`,
    expectRuleMatch: 'no_require_crypto',
  },
  {
    name: 'require("https")',
    code: `const https = require("https");`,
    expectRuleMatch: 'no_require_https',
  },
];

const GOOD_SNIPPETS: string[] = [
  `async function gatherWood(bot) {
  await mineBlock("oak_log", 8);
  await craftItem("oak_planks", 16);
  return { planks: 16 };
}
await gatherWood(bot);`,
  `async function mineThenCraft(bot) {
  const inv = await bot.inventory_read();
  if (inv.length >= 4) {
    await bot.craft("oak_planks");
  }
  return true;
}
await mineThenCraft(bot);`,
  `async function observeAndChat(bot) {
  const view = await bot.observe();
  if (view.nearbyPlayers.length > 0) {
    await bot_chat("hello there");
  }
}
await observeAndChat(bot);`,
  `async function moveAndSleep(bot) {
  await bot_move_to(10, 64, 10);
  await sleep(500);
  await bot_move_to(20, 64, 20);
}
await moveAndSleep(bot);`,
  `// Pure-data test: just reads inventory and returns it
async function showInventory(bot) {
  const items = await bot_inventory_read();
  return items.length;
}
const n = await showInventory(bot);`,
];

describe('StaticAnalyzer', () => {
  describe('blocks known-bad snippets', () => {
    for (const snippet of BAD_SNIPPETS) {
      it(`blocks: ${snippet.name}`, async () => {
        const result = await analyzer.scan(snippet.code);
        expect(result.ok).toBe(false);
        expect(result.findings.length).toBeGreaterThan(0);
        if (snippet.expectRuleMatch) {
          const matched = result.findings.some((f) => f.rule.includes(snippet.expectRuleMatch!));
          expect(matched).toBe(true);
        }
      });
    }
  });

  describe('passes known-good snippets', () => {
    for (const good of GOOD_SNIPPETS) {
      it('passes a known-good snippet', async () => {
        const result = await analyzer.scan(good);
        expect(result.ok).toBe(true);
        expect(result.findings).toHaveLength(0);
      });
    }
  });

  describe('performance', () => {
    it('completes a 4 KB snippet in < 500 ms', async () => {
      const padded = GOOD_SNIPPETS[0].repeat(40);
      const samples: number[] = [];
      for (let i = 0; i < 20; i++) {
        const r = await analyzer.scan(padded);
        samples.push(r.scanMs);
      }
      samples.sort((a, b) => a - b);
      const p95 = samples[Math.floor(samples.length * 0.95)];
      expect(p95).toBeLessThan(500);
    });
  });

  describe('edge cases', () => {
    it('returns a parse_error finding on unparseable input', async () => {
      const result = await analyzer.scan('const x = ; ;');
      expect(result.ok).toBe(false);
      expect(result.findings.some((f) => f.rule === 'parse_error')).toBe(true);
    });

    it('does not flag /stopwatch as /stop', async () => {
      const result = await analyzer.scan('bot_chat("/stopwatch reset");');
      const chatStop = result.findings.filter((f) => f.rule === 'no_forbidden_chat_stop');
      expect(chatStop).toHaveLength(0);
    });

    it('flags /stop when not part of a longer word', async () => {
      const result = await analyzer.scan('bot_chat("please /stop the server");');
      const chatStop = result.findings.filter((f) => f.rule === 'no_forbidden_chat_stop');
      expect(chatStop.length).toBeGreaterThan(0);
    });

    it('flags string-only /sudo even without chat call', async () => {
      const result = await analyzer.scan('const m = "/sudo rm -rf /";');
      const sudo = result.findings.filter((f) => f.rule === 'no_forbidden_chat_sudo');
      expect(sudo.length).toBeGreaterThan(0);
    });
  });
});
