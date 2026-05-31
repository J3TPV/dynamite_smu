// Tiny zero-dependency test harness. Tests run eagerly on import; the bundle
// entry (built by scripts/test.mjs) imports every *.test.ts and then calls
// summarize(), which prints a report and sets a non-zero exit code on failure.

// Minimal ambient declaration so these test files type-check under the app's
// tsconfig (which doesn't pull in @types/node). The runner executes them in Node.
declare const process: { exitCode?: number };

interface Result { name: string; ok: boolean; error?: string; }
const results: Result[] = [];

export function test(name: string, fn: () => void): void {
  try {
    fn();
    results.push({ name, ok: true });
  } catch (err) {
    results.push({ name, ok: false, error: err instanceof Error ? (err.stack || err.message) : String(err) });
  }
}

export function assert(cond: unknown, msg = 'expected truthy value'): void {
  if (!cond) throw new Error(msg);
}

export function eq<T>(actual: T, expected: T, msg?: string): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e && !Object.is(actual, expected)) {
    throw new Error(`${msg ? msg + ': ' : ''}expected ${e}, got ${a}`);
  }
}

export function summarize(): void {
  const failed = results.filter(r => !r.ok);
  for (const r of results) {
    console.log(`${r.ok ? '  ✓' : '  ✗'} ${r.name}`);
    if (!r.ok) console.error(`      ${r.error}`);
  }
  const passed = results.length - failed.length;
  console.log(`\n${passed}/${results.length} tests passed${failed.length ? `, ${failed.length} FAILED` : ''}.`);
  if (failed.length) process.exitCode = 1;
}
