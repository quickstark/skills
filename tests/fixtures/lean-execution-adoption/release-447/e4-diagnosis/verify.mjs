import { readFile } from 'node:fs/promises';
import { writeSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

// This oracle proves bound bytes only. Manual diagnosis is a separate gate.
const root = fileURLToPath(new URL('../../../', import.meta.url));
const bindingPath = process.argv[2] ?? fileURLToPath(new URL('./bindings.json', import.meta.url));
const binding = JSON.parse(await readFile(bindingPath, 'utf8'));
assert.equal(binding.kind, 'hash-bindings-only-not-semantic-acceptance');
assert.ok(Array.isArray(binding.files) && binding.files.length > 0);
const seen = new Set();
for (const entry of binding.files) {
  assert.equal(typeof entry.path, 'string');
  assert.ok(!seen.has(entry.path));
  seen.add(entry.path);
  const path = resolve(root, entry.path);
  const scoped = relative(root, path);
  assert.ok(scoped && !scoped.startsWith('..') && !scoped.startsWith('/'));
  const actual = createHash('sha256').update(await readFile(path)).digest('hex');
  assert.equal(actual, entry.sha256, `Binding mismatch: ${entry.path}`);
}
// Synchronous output survives this host's nested Node pipe shutdown behavior.
writeSync(1, 'E4_DIAGNOSIS_BINDINGS_OK\n');
