import assert from 'node:assert/strict';
import { readFileSync, readdirSync, mkdtempSync, copyFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';
import { ADVANCED_PUBLIC_COMMANDS, ADVANCED_INTERNAL_CAPABILITIES } from '../scripts/advanced-skill-catalog.mjs';
import { PS_PUBLIC_COMMANDS, PS_INTERNAL_CAPABILITIES } from '../scripts/ps-skill-catalog.mjs';
import { freezeParityContract, evaluateParity } from '../skills/advanced/tools/visual-parity.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (relative) => readFileSync(path.join(root, relative), 'utf8');
const environment = { renderer: 'fixture-rgba-v1', scale: 1, fontDigest: 'a'.repeat(64), assetsDigest: 'b'.repeat(64) };
const capture = (state = 'idle') => ({ state, viewport: { width: 2, height: 1 }, pixels: Uint8Array.from([0, 0, 0, 255, 255, 255, 255, 255]) });
function fixture(tolerance = 0) {
  const baselineCaptures = [capture('idle'), capture('focused')];
  return { contract: freezeParityContract({ baselineCaptures, environment, tolerance }), baselineCaptures, currentCaptures: structuredClone(baselineCaptures), environment: { ...environment } };
}

test('twelve distinct advanced outcomes preserve historical metadata without PS Help alias', () => {
  assert.deepEqual(ADVANCED_PUBLIC_COMMANDS.map((entry) => entry.name), PS_PUBLIC_COMMANDS.filter((entry) => entry.name !== 'ps-help').map((entry) => entry.name.replace(/^ps-/, 'qs-')));
  assert.equal(ADVANCED_PUBLIC_COMMANDS.length, 12);
  assert.equal(ADVANCED_PUBLIC_COMMANDS.some((entry) => entry.name === 'qs-help'), false);
  for (const entry of ADVANCED_PUBLIC_COMMANDS) {
    assert.equal(entry.packageName, 'qs-advanced');
    assert.equal(entry.invocationPolicy, 'explicit');
    assert.equal(entry.provenance.legacyName.replace(/^ps-/, 'qs-'), entry.name);
    for (const route of [...entry.continuation.normal, ...entry.continuation.failure]) assert.ok(route.name.startsWith('qs-'));
  }
  assert.equal(PS_PUBLIC_COMMANDS[0].name, 'ps-help');
  assert.equal(PS_PUBLIC_COMMANDS.length, 13);
});

test('canonical frontmatter, display metadata and exact package prompts match catalog', () => {
  for (const entry of ADVANCED_PUBLIC_COMMANDS) {
    const body = read(`${entry.sourcePath}/SKILL.md`);
    const metadata = read(`${entry.sourcePath}/agents/openai.yaml`);
    assert.match(body, new RegExp(`^---\\nname: ${entry.name}\\n`));
    assert.match(body, /disable-model-invocation: true/);
    assert.match(metadata, /allow_implicit_invocation: false/);
    assert.ok(metadata.includes(`Use $qs-advanced:${entry.name} `));
    assert.match(metadata, /display_name: "QS /);
    assert.doesNotMatch(body, /\$ps-skills:|\/ps-|\bps-help\b/);
    assert.match(body, /## Completion report and next steps/);
    assert.match(body, /never authorize another public invocation/);
  }
});

test('all sixteen private capabilities have current local owners and no discoverable roots', () => {
  assert.deepEqual(ADVANCED_INTERNAL_CAPABILITIES.map((entry) => entry.name), PS_INTERNAL_CAPABILITIES.map((entry) => entry.name));
  const names = new Set(ADVANCED_PUBLIC_COMMANDS.map((entry) => entry.name));
  for (const capability of ADVANCED_INTERNAL_CAPABILITIES) {
    assert.ok(capability.owners.length > 0);
    assert.ok(capability.owners.every((name) => names.has(name)));
    assert.ok(read(capability.sourcePath).startsWith('# '));
    assert.doesNotMatch(read(capability.sourcePath), /`ps-/);
    assert.equal(path.basename(capability.sourcePath) === 'SKILL.md', false);
  }
  assert.equal(readdirSync(path.join(root, 'skills/advanced/internal')).length, 16);
  const notices = read('skills/advanced/THIRD_PARTY_NOTICES.md');
  assert.match(notices, /Copyright \(c\) 2026 Lauren Tan/);
  assert.match(notices, /Copyright \(c\) 2026 Matt Pocock/);
});

test('conditional root links resolve within the new independently owned private tree', () => {
  for (const entry of ADVANCED_PUBLIC_COMMANDS) {
    const body = read(`${entry.sourcePath}/SKILL.md`);
    const links = [...body.matchAll(/\]\((\.\.\/[^)]+)\)/g)].map((match) => match[1]);
    for (const link of links) {
      const target = path.resolve(root, entry.sourcePath, link);
      assert.ok(target.startsWith(path.join(root, 'skills/advanced') + path.sep));
      assert.ok(readFileSync(target).length > 0);
    }
    for (const name of entry.privateCapabilities) assert.ok(links.includes(`../../advanced/internal/${name}.md`));
  }
});

test('parity measures actual bytes for every declared state with independently known residuals', () => {
  const args = fixture(0.125);
  args.currentCaptures[0].pixels[0] = 1;
  const result = evaluateParity(args);
  assert.equal(result.status, 'complete');
  assert.deepEqual(result.measurements.map((measurement) => measurement.residual), [0, 0.125]);
  assert.equal(result.measurements.find((measurement) => measurement.id.startsWith('idle:')).differentBytes, 1);
  args.currentCaptures[0].pixels[1] = 2;
  const mismatch = evaluateParity(args);
  assert.equal(mismatch.status, 'continuation-required');
  assert.equal(mismatch.measurements.find((measurement) => measurement.id.startsWith('idle:')).residual, 0.25);
});

test('exact matching is complete and a known mismatch detects an insensitive-comparator regression', () => {
  const args = fixture();
  assert.equal(evaluateParity(args).status, 'complete');
  args.currentCaptures[1].pixels[3] = 0;
  assert.equal(evaluateParity(args).status, 'continuation-required');
  // This expectation must fail if the comparator is replaced by a constant zero.
  assert.equal(evaluateParity(args).measurements[0].residual, 0.125);
});

test('a constant-zero comparator mutation fails the independent known-mismatch oracle', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'qs-parity-insensitive-'));
  try {
    const source = read('skills/advanced/tools/visual-parity.mjs');
    const mutant = source.replace('residual: differentBytes / original.length', 'residual: 0');
    assert.notEqual(mutant, source);
    const modulePath = path.join(directory, 'insensitive.mjs'); writeFileSync(modulePath, mutant);
    const broken = await import(pathToFileURL(modulePath));
    const args = fixture(); args.currentCaptures[1].pixels[0] = 255;
    const acceptsKnownMismatch = (result) => result.status === 'continuation-required' && result.measurements[0].residual === 0.125;
    assert.equal(acceptsKnownMismatch(evaluateParity(args)), true);
    assert.equal(acceptsKnownMismatch(broken.evaluateParity(args)), false);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('immutable baseline, approved tolerance and frozen comparison settings reject tampering', () => {
  const baseline = fixture(); baseline.baselineCaptures[0].pixels[0] = 1;
  assert.match(evaluateParity(baseline).reason, /Immutable baseline/);
  assert.match(evaluateParity({ ...fixture(), tolerance: 1 }).reason, /tolerance changed/);
  assert.match(evaluateParity({ ...fixture(), comparison: { id: 'more-lenient', version: 1 } }).reason, /Comparison implementation/);
  const args = fixture(); assert.throws(() => { args.contract.tolerance = 1; }, TypeError);
});

test('state, viewport, renderer, fonts and assets are required comparison boundaries', () => {
  const missing = fixture(); missing.currentCaptures.pop();
  assert.match(evaluateParity(missing).reason, /coverage missing/);
  const duplicate = fixture(); duplicate.currentCaptures[1].state = 'idle';
  assert.match(evaluateParity(duplicate).reason, /Duplicate state/);
  const moved = fixture(); moved.currentCaptures[0].viewport = { width: 1, height: 2 };
  assert.match(evaluateParity(moved).reason, /coverage missing/);
  for (const [key, value] of [['renderer', 'other-engine'], ['scale', 2], ['fontDigest', 'c'.repeat(64)], ['assetsDigest', 'd'.repeat(64)]]) {
    const args = fixture(); args.environment[key] = value;
    assert.match(evaluateParity(args).reason, /Capture environment changed/);
  }
});

test('missing approval or transformed/incomplete pixel inputs cannot manufacture parity', () => {
  assert.throws(() => freezeParityContract({ baselineCaptures: [capture()], environment }), /approved finite tolerance/);
  const args = fixture(); args.currentCaptures[0].pixels = Uint8Array.from([0, 0, 0, 255]);
  assert.match(evaluateParity(args).reason, /complete RGBA bytes/);
});

test('the private parity helper runs in isolation with no repository or public skill imports', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'qs-parity-isolated-'));
  try {
    const modulePath = path.join(directory, 'visual-parity.mjs');
    copyFileSync(path.join(root, 'skills/advanced/tools/visual-parity.mjs'), modulePath);
    const isolated = await import(pathToFileURL(modulePath));
    const args = fixture();
    assert.equal(isolated.evaluateParity(args).status, 'complete');
    args.currentCaptures[1].pixels[4] = 0;
    assert.equal(isolated.evaluateParity(args).status, 'continuation-required');
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
