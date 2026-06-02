// Dependency-light test runner. Bundles every tests/*.test.ts (plus the shared
// harness) into a single ESM file with esbuild — which is already present as a
// Vite dependency — then runs it with Node. No test framework to install.
//
//   npm test
//
// Each test file registers tests eagerly via the harness's test(); this entry
// imports them all and then calls summarize(), which prints a report and sets a
// non-zero exit code if anything failed.

import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testsDir = path.join(root, 'tests');
const outDir = path.join(root, '.test-build');
const outfile = path.join(outDir, 'tests.mjs');

const testFiles = readdirSync(testsDir)
  .filter(f => f.endsWith('.test.ts'))
  .sort()
  .map(f => path.join(testsDir, f));

if (testFiles.length === 0) {
  console.error('No tests/*.test.ts files found.');
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

// Synthetic entry: import every test file (tests run on import), then summarize.
const entry = [
  ...testFiles.map(f => `import ${JSON.stringify(f)};`),
  `import { summarize } from ${JSON.stringify(path.join(testsDir, '_harness.ts'))};`,
  'summarize();',
].join('\n');

await build({
  stdin: { contents: entry, resolveDir: root, sourcefile: 'tests-entry.ts', loader: 'ts' },
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  outfile,
  logLevel: 'warning',
  // Keep Node built-ins external; everything else (lib/*) gets bundled.
  external: ['node:*'],
});

const res = spawnSync(process.execPath, [outfile], { stdio: 'inherit' });
process.exit(res.status ?? 1);
