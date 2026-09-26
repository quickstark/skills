import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, cp, rm, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { manifest, sha } from '../../../scripts/frontend-adoption-trials.mjs';
import { readNativeControls } from '../../../scripts/frontend-native-capture.mjs';
import * as runner from '../../../scripts/frontend-adoption-v3.mjs';

const repository = resolve(import.meta.dirname, '../../..');
const executable = join(repository, 'tests/fixtures/frontend-native-capture/fake-server.mjs');
const controls = readNativeControls();
const json = async path => JSON.parse(await readFile(path, 'utf8'));
const events = async directory => (await readFile(join(directory, 'events.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
const temp = label => mkdtemp(join(tmpdir(), `qs-v3-control-${label}-`));
async function copyFileAt(relative, to) { await mkdir(dirname(join(to, relative)), { recursive: true }); await cp(join(repository, relative), join(to, relative), { recursive: true }); }

// A real isolated repository makes dependency edits observable without touching the
// parent-owned runner, original experiment, canonical skills, or frozen HTTP helper.
async function isolatedRepository() {
  const root = await temp('repository');
  const fixed = ['scripts/frontend-adoption-v3.mjs', 'scripts/frontend-native-capture.mjs', 'scripts/frontend-adoption-trials.mjs',
    'tests/fixtures/frontend-adoption', 'tests/fixtures/frontend-adoption-v2/plan.json', 'tests/fixtures/frontend-adoption-v2/sources/index.json',
    'tests/fixtures/frontend-adoption-v2-infrastructure/preinit-20260926/relaunch-plan.json',
    'tests/fixtures/frontend-adoption-v2-infrastructure/closed-host-20260926/manifest.json',
    'tests/fixtures/frontend-native-capture/fake-server.mjs', 'tests/fixtures/frontend-native-capture/bindings.json',
    'tests/fixtures/frontend-native-capture/readiness/inherited-reviewer-success/thread-start-response.json'];
  for (const path of fixed) await copyFileAt(path, root);
  const http = 'tests/fixtures/frontend-adoption-v2-http';
  const observerPlan = await json(join(repository, http, 'plan.json'));
  for (const path of ['plan.json', ...Object.keys(observerPlan.files)]) await copyFileAt(join(http, path), root);
  const sources = await json(join(repository, 'tests/fixtures/frontend-adoption/sources/index.json'));
  for (const source of Object.values(sources)) if (source.canonicalPath) await copyFileAt(source.canonicalPath, root);
  const init = spawnSync('git', ['init', '--quiet', root], { encoding: 'utf8' }); assert.equal(init.status, 0, init.stderr);
  const commit = spawnSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '--allow-empty', '--quiet', '-m', 'isolated control anchor'], { cwd: root, encoding: 'utf8' }); assert.equal(commit.status, 0, commit.stderr);
  return { root, executable: join(root, 'tests/fixtures/frontend-native-capture/fake-server.mjs'), api: await import(pathToFileURL(join(root, 'scripts/frontend-adoption-v3.mjs'))), fixture: join(root, 'tests/fixtures/frontend-adoption-v3') };
}

async function nativeFixture(kind, { mode = 'prompt-only', ...extra } = {}) {
  const root = await temp(kind), cwd = join(root, 'workspace'), directory = join(root, 'capture'); await mkdir(cwd); await mkdir(directory);
  const body = '# Exact guidance\nUnique fixture guidance with 日本語.\n';
  const guidancePath = join(cwd, 'trial-guidance.md'); await writeFile(guidancePath, body);
  const guidance = { guidancePath, body, sha256: sha(body), instructions: [{ key: 'fixture-source', sha256: sha(body) }], readCommand: `cat -- '${guidancePath}'` };
  await writeFile(join(cwd, 'fixture-case.json'), JSON.stringify({ kind, controls, userMessage: true, guidanceReadPath: guidancePath, ...extra }));
  const scenario = { id: 'F10-control', mode, authority: { writeProductFiles: mode !== 'prompt-only' }, budget: { timeoutMs: 5000, maximumImageCalls: 1, requiredImages: 0 } };
  return { root, cwd, directory, guidance, scenario, options: { prompt: 'Fixture only; no model.', cwd, directory, guidance, scenario, executable, expectedControls: controls } };
}

let isolated;
test('fresh preparation keeps all 11 tasks, 66 paired rows, rubric, source bytes and private bodies unchanged', async () => {
  isolated = await isolatedRepository();
  const { api, fixture, root } = isolated;
  const sources = await api.prepare({ root: fixture });
  const cases = await json(join(fixture, 'scenarios.json')), schedule = await json(join(fixture, 'schedule.json'));
  assert.deepEqual(cases.map(x => x.id), ['F01', 'F02', 'F03', 'F04', 'F05', 'F06', 'F07', 'F08', 'F09', 'F10', 'F11']);
  assert.equal(schedule.length, 66);
  for (const scenario of cases) for (const repetition of [1, 2, 3]) assert.deepEqual(schedule.filter(x => x.scenarioId === scenario.id && x.repetition === repetition).map(x => x.variant).sort(), ['v31', 'v84']);
  for (const name of ['common-scope.json', 'scenarios.json', 'schedule.json', 'rubric.json', 'operator-mapping.json', 'browser-observe.mjs']) assert.deepEqual(await readFile(join(fixture, name)), await readFile(join(api.previousRoot, name)));
  assert.deepEqual(await manifest(join(fixture, 'assets')), await manifest(join(api.previousRoot, 'assets')));
  const prior = await json(join(api.previousRoot, 'sources/index.json'));
  const v2 = await json(join(root, 'tests/fixtures/frontend-adoption-v2/sources/index.json'));
  for (const [key, source] of Object.entries(sources)) {
    const original = source.canonicalPath ? join(root, source.canonicalPath) : join(api.previousRoot, source.path);
    assert.deepEqual(await readFile(join(fixture, source.path)), await readFile(original), key);
    if (!source.canonicalPath) assert.deepEqual(source, prior[key]);
    assert.equal(source.sha256, v2[key].sha256, `V2 body preserved: ${key}`);
  }
  for (const variant of ['v31', 'v84']) {
    const cwd = await temp('guidance'); const scenario = cases.find(x => x.id === 'F10');
    const guidance = await api.materializeGuidance({ root: fixture, sources, scenario, variant, cwd });
    const keys = variant === 'v31' ? [scenario.originalSource] : [scenario.localRoot, ...scenario.references];
    for (const key of keys) assert.ok(guidance.body.includes(await readFile(join(fixture, sources[key].path), 'utf8')));
    const prompt = api.buildPrompt({ scenario, common: await json(join(fixture, 'common-scope.json')), cwd, guidance });
    assert.ok(prompt.includes(guidance.readCommand)); assert.ok(!prompt.includes(guidance.body)); assert.match(prompt, /sole tool exception/);
  }
});

test('freeze requires explicit authority and detects real dependency, predecessor, input and canonical tampering', async () => {
  const { api, root, fixture, executable } = isolated;
  await assert.rejects(api.freeze({ root: fixture, executable }), /Parent readiness/);
  await assert.rejects(api.run({ root: fixture, output: join(root, 'forbidden'), executable }), /separately authorize/);
  await assert.rejects(access(join(root, 'forbidden')), { code: 'ENOENT' });
  const plan = await api.freeze({ root: fixture, executable, parentReady: true });
  assert.equal(plan.comparison.trials, 66); assert.equal(plan.comparison.concurrency, 2);
  assert.ok(plan.dependencies['scripts/frontend-native-capture.mjs']); assert.ok(plan.dependencies['tests/fixtures/frontend-adoption-v2-http/observer.mjs']);
  await api.verify(fixture);
  for (const [path, pattern] of [
    ['scripts/frontend-native-capture.mjs', /dependency changed/],
    ['tests/fixtures/frontend-native-capture/readiness/inherited-reviewer-success/thread-start-response.json', /dependency changed/],
    ['tests/fixtures/frontend-adoption-v2-infrastructure/closed-host-20260926/manifest.json', /Prior experiment binding changed/],
    ['tests/fixtures/frontend-adoption-v3/scenarios.json', /Frozen input changed/],
    ['skills/engineering/qs-design-frontend/SKILL.md', /Parent candidate changed/]
  ]) {
    const target = join(root, path), saved = await readFile(target);
    try { await writeFile(target, Buffer.concat([saved, Buffer.from('\nTamper control\n')])); await assert.rejects(api.verify(fixture), pattern, path); }
    finally { await writeFile(target, saved); }
    await api.verify(fixture);
  }
  await writeFile(join(fixture, 'unregistered.txt'), 'added');
  await assert.rejects(api.verify(fixture), /files added or removed/); await rm(join(fixture, 'unregistered.txt'));
  await assert.rejects(api.freeze({ root: fixture, executable, parentReady: true }), /immutable/);
  const priorExecutable = await readFile(executable);
  try {
    await writeFile(executable, Buffer.concat([priorExecutable, Buffer.from('\n// changed executable with identical --version\n')]));
    await assert.rejects(api.run({ root: fixture, output: join(root, 'changed-executable'), executable, parentApproved: true }), /Host differs/);
    await assert.rejects(access(join(root, 'changed-executable')), { code: 'ENOENT' });
  } finally { await writeFile(executable, priorExecutable); }
});

test('F10 native exact guidance read and ordinary userMessage succeed; alternate reads cannot masquerade as exact', async () => {
  const f = await nativeFixture('guidance'); const { telemetry, guard } = await runner.capture(f.options);
  assert.equal(telemetry.nativeStreamComplete, true); assert.equal(telemetry.completedTurn, true);
  assert.equal(guard.guidanceReadObserved, true); assert.equal(guard.guidanceUnchanged, true); assert.equal(guard.violation, null); assert.deepEqual(guard.violations, []);
  const capturedEvents = await events(f.directory);
  assert.ok(capturedEvents.some(e => e.item?.type === 'userMessage'));
  const metadata = ['contextCompaction', 'enteredReviewMode', 'exitedReviewMode'].map(type => ({ type: 'item.completed', item: { type, id: `metadata-${type}` } }));
  const metadataGuard = runner.inspectGuidanceEvents([...capturedEvents, ...metadata], f.guidance, { promptOnly: true });
  assert.equal(metadataGuard.guidanceReadObserved, true); assert.deepEqual(metadataGuard.violations, []);
  const opaqueGuard = runner.inspectGuidanceEvents([...capturedEvents, { type: 'item.completed', item: { type: 'functionCallOutput', id: 'function-output', output: 'Unclassified operation result' } }], f.guidance, { promptOnly: true });
  assert.ok(opaqueGuard.violations.some(x => x.id === 'function-output'));
  for (const command of [`cat -- '${f.guidance.guidancePath}' ; pwd`, `cat '${f.guidance.guidancePath}'`, `cat -- '${f.guidance.guidancePath}.other'`, `cat -- '${f.guidance.guidancePath}' > copy`]) assert.equal(runner.isGuidanceRead({ type: 'command_execution', command }, f.guidance.guidancePath), false);
  assert.equal(runner.isGuidanceRead({ type: 'command_execution', command: `/usr/bin/zsh -lc "cat -- '${f.guidance.guidancePath}'"` }, f.guidance.guidancePath), true);
});

for (const [kind, type] of [['prompt-tool', 'imageGeneration'], ['dynamic', 'dynamic_tool_call'], ['unknown', 'futureOpaqueTool']]) test(`F10 rejects observed native ${kind} even with a successful exact read`, async () => {
  const f = await nativeFixture(kind); const { telemetry, guard } = await runner.capture(f.options);
  assert.equal(guard.guidanceReadObserved, true); assert.ok(guard.violations.some(x => x.type === type));
  assert.ok((await events(f.directory)).some(e => e.item?.type === type));
  if (kind === 'unknown') assert.equal(telemetry.nativeStreamComplete, false);
  assert.deepEqual(telemetry.observedOwnedResidualProcesses, []);
});

test('reviewer exports retain native/delta evidence, actual raster bytes and raw integrity with attributable redaction', async () => {
  const f = await nativeFixture('full', { mode: 'implementation' });
  await cp(f.cwd, join(f.directory, 'before'), { recursive: true }); const before = await manifest(f.cwd);
  const { telemetry, guard } = await runner.capture(f.options);
  await cp(f.cwd, join(f.directory, 'after'), { recursive: true }); const after = await manifest(f.cwd);
  const rawBefore = await readFile(join(f.directory, 'events.jsonl')), protocolBefore = await readFile(join(f.directory, 'raw-protocol.jsonl'));
  const exported = join(f.root, 'reviewer');
  const result = await runner.reviewerBundle({ root: runner.previousRoot, directory: f.directory, exportRoot: exported, scenario: f.scenario, common: { immutable: 'facts' }, before, after, reviewId: 'opaque-control', telemetry, guard, browserStatus: 'not-applicable', guidance: f.guidance });
  assert.ok(result.redactions > 0); assert.ok(result.actualImages > 0);
  assert.deepEqual(await readFile(join(f.directory, 'events.jsonl')), rawBefore); assert.deepEqual(await readFile(join(f.directory, 'raw-protocol.jsonl')), protocolBefore);
  const reviewEvents = await events(exported);
  assert.ok(reviewEvents.some(e => e.type === 'command.output_delta' && e.delta === '日本語\n'));
  assert.ok(reviewEvents.some(e => e.native?.item?.savedPath === join(f.cwd, 'actual.png')));
  assert.equal(JSON.stringify(reviewEvents).includes(JSON.stringify(f.guidance.body).slice(1, -1)), false);
  const evidence = await json(join(exported, 'tool-images.json'));
  assert.equal(evidence.retained.length, 1); assert.deepEqual(evidence.unresolved, []);
  assert.deepEqual(await readFile(join(exported, evidence.retained[0].target)), await readFile(join(f.cwd, 'actual.png')));
  assert.match(await readFile(join(exported, 'IMAGES.md'), 'utf8'), /tool-images\/.+\.png/);
  const context = await json(join(exported, 'context.json')); assert.equal(context.execution.nativeStreamComplete, true); assert.equal(context.execution.effectiveControls.model, controls.model);
  const redactions = await json(join(exported, 'redactions.json')); assert.equal(redactions.rawEventsSHA256, sha(rawBefore)); assert.match(redactions.policy, /Partial or incidental/);
  for (const entry of redactions.redactions) { assert.equal(entry.guidanceSHA256, f.guidance.sha256); assert.deepEqual(entry.sourceSHA256s, [f.guidance.sha256]); assert.ok(entry.originalSHA256); }
  assert.equal(await readFile(join(exported, 'response.md'), 'utf8'), 'Actual fixture response.');
});

test('redaction does not alter agent responses or unrelated product output; partial chunk limits remain honest', () => {
  const guidance = { guidancePath: '/tmp/exact-guidance.md', body: 'UNIQUE FULL GUIDANCE BODY', sha256: sha('UNIQUE FULL GUIDANCE BODY'), instructions: [{ sha256: sha('source') }] };
  const input = [
    { type: 'item.completed', item: { type: 'command_execution', id: 'read', command: "cat -- '/tmp/exact-guidance.md'", aggregated_output: guidance.body }, native: { item: { id: 'read', aggregatedOutput: guidance.body } } },
    { type: 'command.output_delta', item_id: 'read', delta: guidance.body, native: { itemId: 'read', delta: guidance.body } },
    { type: 'command.output_delta', item_id: 'read', delta: 'UNIQUE FULL ' },
    { type: 'item.completed', item: { type: 'agent_message', id: 'answer', text: guidance.body } },
    { type: 'item.completed', item: { type: 'command_execution', id: 'product', command: 'cat product.txt', aggregated_output: guidance.body } }
  ];
  const saved = structuredClone(input); const { sanitized, redactions } = runner.redactEvents(input, guidance);
  assert.deepEqual(input, saved); assert.ok(redactions.length >= 4);
  assert.ok(!sanitized[0].item.aggregated_output.includes(guidance.body)); assert.ok(!sanitized[1].native.delta.includes(guidance.body));
  assert.deepEqual(sanitized.slice(2), input.slice(2));
});

test('paired failure waits for its active partner and never launches the next pair', async () => {
  const order = [], schedule = (await json(join(runner.previousRoot, 'schedule.json'))).slice(0, 4);
  const result = await runner.runPairs({ schedule, shouldStop: () => false, start: async row => { order.push(`start:${row.trialId}`); if (row === schedule[0]) throw new Error('bounded fixture failure'); await new Promise(done => setTimeout(done, 30)); order.push(`settled:${row.trialId}`); return 'retained'; } });
  assert.equal(result.length, 2); assert.equal(result[0].status, 'rejected'); assert.equal(result[1].value, 'retained'); assert.equal(order.length, 3);
});

test('parent interruption settles both actual native capture processes and does not launch another pair', async () => {
  const fixtures = [await nativeFixture('timeout'), await nativeFixture('timeout')];
  const schedule = (await json(join(runner.previousRoot, 'schedule.json'))).slice(0, 4); let started = 0;
  const pending = runner.runPairs({ schedule, start: async () => runner.capture(fixtures[started++].options) });
  try {
    const deadline = Date.now() + 4000;
    while (Date.now() < deadline) {
      if ((await Promise.all(fixtures.map(async f => { try { return (await readFile(join(f.cwd, 'fixture-requests.jsonl'), 'utf8')).includes('turn/start'); } catch { return false; } }))).every(Boolean)) break;
      await new Promise(done => setTimeout(done, 25));
    }
    assert.equal(started, 2);
    for (const f of fixtures) assert.ok((await readFile(join(f.cwd, 'fixture-requests.jsonl'), 'utf8')).includes('turn/start'));
  } finally { await runner.interruptCaptures(); }
  const result = await pending; assert.equal(result.length, 2); assert.equal(started, 2);
  for (const [index, row] of result.entries()) {
    assert.equal(row.status, 'fulfilled'); assert.equal(row.value.telemetry.nativeStreamComplete, false); assert.deepEqual(row.value.telemetry.observedOwnedResidualProcesses, []);
    const record = await json(join(fixtures[index].directory, 'process.json'));
    await assert.rejects(access(`/proc/${record.pid}`), { code: 'ENOENT' });
    assert.ok((await readFile(join(fixtures[index].directory, 'raw-protocol.jsonl'))).length > 0);
  }
});
