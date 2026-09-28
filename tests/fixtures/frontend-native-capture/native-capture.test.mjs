import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { executeNative, probeNativeReadiness, readNativeControls } from '../../../scripts/frontend-native-capture.mjs';

const executable = resolve('tests/fixtures/frontend-native-capture/fake-server.mjs');
await chmod(executable, 0o755);
const controls = readNativeControls();
const json = async p => JSON.parse(await readFile(p, 'utf8'));
async function fixture(kind, extra = {}) {
  const root = await mkdtemp(join(tmpdir(), 'qs-native-capture-test-'));
  const cwd = join(root, 'workspace'), directory = join(root, 'capture'); await mkdir(cwd); await mkdir(directory);
  await writeFile(join(cwd, 'fixture-case.json'), JSON.stringify({ kind, controls, ...extra }));
  const options = { executable, cwd, directory, prompt: 'Frozen fixture prompt.', scenario: { mode: 'implementation', budget: { timeoutMs: 3500, maximumImageCalls: 1 } } };
  return { root, cwd, directory, options };
}
const requests = async f => (await readFile(join(f.cwd, 'fixture-requests.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);

test('native images, views, deltas, usage and reference input are captured without setting overrides', async () => {
  const f = await fixture('full'); f.options.referenceImage = join(f.cwd, 'reference.png');
  const t = await executeNative(f.options);
  assert.equal(t.stopReason, null); assert.equal(t.exitCode, 0); assert.equal(t.completedTurn, true); assert.equal(t.nativeStreamComplete, true);
  assert.equal(t.observedNamedImageCalls, 1); assert.equal(t.toolCount, 3);
  assert.equal(t.toolItems.find(x => x.type === 'command_execution').aggregated_output, 'first 日本語\n');
  assert.equal(t.toolItems.find(x => x.type === 'image_view').path, join(f.cwd, 'actual.png'));
  assert.equal(t.savedImages.length, 1); assert.ok(t.savedImages[0].sha256);
  assert.equal(t.usage[0].input_tokens, 111); assert.equal(t.observedModel, controls.model);
  assert.equal(t.processObservation.maximumInFlight, 1); assert.deepEqual(t.observedOwnedResidualProcesses, []);
  const r = await requests(f), start = r.find(x => x.method === 'thread/start').params, turn = r.find(x => x.method === 'turn/start').params;
  assert.deepEqual(start, { cwd: f.cwd, ephemeral: true });
  assert.deepEqual(turn, { threadId: 'thread-1', input: [{ type: 'localImage', path: f.options.referenceImage }, { type: 'text', text: f.options.prompt, text_elements: [] }], cwd: f.cwd });
  assert.equal(r.find(x => x.method === 'initialize').params.capabilities.optOutNotificationMethods.length, 0);
  const raw = (await readFile(join(f.directory, 'raw-protocol.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
  assert.ok(raw.some(x => x.message.params?.item?.savedPath === join(f.cwd, 'actual.png')));
});

for (const [kind, pattern] of [
  ['unknown', /Unknown native item/], ['unknown-item-notification', /Unclassified native item/],
  ['malformed', /Malformed native JSON/], ['missing-terminal', /Missing native terminal/],
  ['approval', /server request left unresolved/], ['wrong-thread', /Unexpected thread/],
  ['open-item', /incomplete items/], ['failed-turn', /ended failed/]
]) test(`retains and fails ${kind}`, async () => {
  const f = await fixture(kind), t = await executeNative(f.options);
  assert.match(t.stopReason, pattern); assert.equal(t.nativeStreamComplete, false);
  if (kind === 'malformed') { assert.equal(t.malformedLines, 1); assert.match(await readFile(join(f.directory, 'raw-stdout.jsonl'), 'utf8'), /invalid JSON/); }
  if (kind === 'approval') { assert.equal(t.serverRequests[0].id, 'approval-7'); assert.equal((await requests(f)).some(x => x.id === 'approval-7'), false); }
});

test('unknown dynamic semantics survive without certifying absence of image operations', async () => {
  const f = await fixture('dynamic'), t = await executeNative(f.options);
  assert.equal(t.toolItems[0].type, 'dynamic_tool_call'); assert.deepEqual(t.toolItems[0].arguments, { a: 1 });
  assert.deepEqual(t.unclassifiedToolItems, ['dynamic-1']); assert.match(t.imageCallClassification, /never certify zero/);
});

for (const kind of ['image-budget', 'prompt-tool']) test(`authority observation stops ${kind}`, async () => {
  const f = await fixture(kind); if (kind === 'image-budget') f.options.scenario.budget.maximumImageCalls = 0; else f.options.scenario.mode = 'prompt-only';
  const t = await executeNative(f.options); assert.match(t.stopReason, kind === 'image-budget' ? /image calls exceed/ : /response-only/); assert.equal(t.nativeStreamComplete, false);
});

test('bounded timeout kills an uncooperative exact child', async () => {
  const f = await fixture('timeout'); f.options.scenario.budget.timeoutMs = 250;
  const t = await executeNative(f.options); assert.equal(t.timedOut, true); assert.match(t.stopReason, /timeout/); assert.ok(t.elapsedMs < 4000); assert.deepEqual(t.observedOwnedResidualProcesses, []);
});

test('observed detached descendant is cleaned after parent exits', async () => {
  const f = await fixture('descendant'), t = await executeNative(f.options);
  const pid = Number(await readFile(join(f.cwd, 'descendant-pid.txt'), 'utf8'));
  assert.ok(t.processCleanup.some(x => x.pid === pid)); assert.deepEqual(t.observedOwnedResidualProcesses, []);
  try { const stat = await readFile(`/proc/${pid}/stat`, 'utf8'); assert.equal(stat.slice(stat.lastIndexOf(')') + 2).split(' ')[0], 'Z'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
});

test('terminal full items reconcile an earlier unfinished view', async () => {
  const f = await fixture('reconcile'), t = await executeNative(f.options); assert.equal(t.nativeStreamComplete, true); assert.equal(t.toolItems[0].type, 'image_view');
});

for (const [field, value] of [['model', 'wrong-model'], ['reasoningEffort', 'wrong-effort'], ['approvalPolicy', 'never'], ['sandbox', { type: 'dangerFullAccess' }], ['approvalsReviewer', 'wrong-reviewer']]) test(`effective ${field} mismatch blocks turn`, async () => {
  const f = await fixture('control-mismatch', { field, value }), t = await executeNative(f.options);
  assert.ok(t.stopReason); assert.equal((await requests(f)).some(x => x.method === 'turn/start'), false); assert.equal(t.completedTurn, false);
});

test('readiness mode never sends a model turn', async () => {
  const f = await fixture('full'), t = await probeNativeReadiness(f.options);
  assert.equal(t.stopReason, null); assert.equal(t.readinessOnly, true); assert.equal(t.initialized, true); assert.equal(t.completedTurn, false);
  assert.equal((await requests(f)).some(x => x.method === 'turn/start'), false);
});

test('existing capture evidence is never overwritten', async () => {
  const f = await fixture('full'); await writeFile(join(f.directory, 'events.jsonl'), 'old evidence');
  await assert.rejects(executeNative(f.options), /EEXIST/); assert.equal(await readFile(join(f.directory, 'events.jsonl'), 'utf8'), 'old evidence');
});

test('frozen native reviewer drift fails before process creation', async () => {
  const f = await fixture('full'); f.options.expectedControls = { ...controls, approvals_reviewer: 'wrong-reviewer' };
  await assert.rejects(executeNative(f.options), /changed since freeze: approvals_reviewer/);
  await assert.rejects(readFile(join(f.directory, 'process.json')), /ENOENT/);
});

test('native userMessage is retained but does not count as a tool', async () => {
  const f = await fixture('response', { userMessage: true }); f.options.scenario.mode = 'prompt-only';
  const t = await executeNative(f.options); assert.equal(t.stopReason, null); assert.equal(t.toolCount, 0);
  assert.match(await readFile(join(f.directory, 'events.jsonl'), 'utf8'), /userMessage/);
});

test('read-only guidance remains byte-exact in normalized and raw streams', async () => {
  const f = await fixture('response', { guidanceReadPath: 'TASK-GUIDANCE.md' }); const body = 'Frozen guidance 日本語\n';
  await writeFile(join(f.cwd, 'TASK-GUIDANCE.md'), body); f.options.scenario.mode = 'guidance-read-only';
  const t = await executeNative(f.options); assert.equal(t.stopReason, null); assert.equal(t.toolItems[0].aggregated_output, body);
  const raw = (await readFile(join(f.directory, 'raw-protocol.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
  assert.ok(raw.some(x => x.message.params?.item?.aggregatedOutput === body));
});
