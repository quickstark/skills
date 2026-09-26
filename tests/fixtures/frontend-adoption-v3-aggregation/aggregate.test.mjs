import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, cp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { NativeTranscript } from '../../../scripts/frontend-native-capture.mjs';
import { verifyAndSummarize, treeBinding, reviewHashes } from './aggregate.mjs';
const sha = value => createHash('sha256').update(value).digest('hex');
const read = async path => JSON.parse(await readFile(path, 'utf8'));
const put = async (path, value) => { await mkdir(resolve(path, '..'), { recursive: true }); await writeFile(path, typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value, null, 2) + '\n'); };
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==', 'base64');
const controls = { model: 'synthetic-model', model_reasoning_effort: 'high', sandbox_mode: 'workspace-write', approval_policy: 'on-request', approvals_reviewer: 'user' };
let complete;
async function build() {
  const root = await mkdtemp(join(tmpdir(), 'qs-synthetic-aggregation-')), fixtureRoot = join(root, 'frozen'), runRoot = join(root, 'run'), reviews = join(root, 'reviews');
  const rubric = await read(new URL('../frontend-adoption-v3/rubric.json', import.meta.url));
  const cases = Array.from({ length: 11 }, (_, i) => ({ id: `F${String(i + 1).padStart(2, '0')}`, mode: i === 8 ? 'image-only' : i === 0 ? 'implementation' : 'prompt-only', input: 'SYNTHETIC CONTROL ONLY', originalSource: 'fixture-guidance', localRoot: 'fixture-guidance', references: [], requiredChecks: ['authority', 'outcome'], authority: { writeProductFiles: false, generateImages: i === 8, publish: false }, budget: { maximumImageCalls: i === 8 ? 2 : 0, requiredImages: i === 8 ? 2 : 0 } }));
  const schedule = cases.flatMap(c => [1, 2, 3].flatMap(repetition => ['v31', 'v84'].map(variant => ({ trialId: `${c.id}-r${repetition}-${variant}`, scenarioId: c.id, repetition, variant }))));
  await put(join(fixtureRoot, 'rubric.json'), rubric); await put(join(fixtureRoot, 'scenarios.json'), cases); await put(join(fixtureRoot, 'schedule.json'), schedule); await put(join(fixtureRoot, 'operator-mapping.json'), { v31: 'synthetic-baseline', v84: 'synthetic-candidate' });
  await put(join(fixtureRoot, 'sources/body.md'), 'Synthetic bound guidance 日本語.\n');
  await put(join(fixtureRoot, 'sources/index.json'), { 'fixture-guidance': { path: 'sources/body.md', sha256: sha(await readFile(join(fixtureRoot, 'sources/body.md'))) } });
  const plan = { schemaVersion: 3, experiment: 'frontend-native-events-v3', comparison: { trials: 66, repetitions: 3 }, host: { configured: controls }, fileHashes: Object.fromEntries(Object.entries(await treeBinding(fixtureRoot)).map(([p, b]) => [p, b.sha256])), dependencies: { 'scripts/frontend-native-capture.mjs': sha(await readFile(new URL('../../../scripts/frontend-native-capture.mjs', import.meta.url))) } };
  await put(join(fixtureRoot, 'plan.json'), plan); const planSHA256 = sha(await readFile(join(fixtureRoot, 'plan.json')));
  const reviewFiles = [], results = [];
  for (const row of schedule) {
    const scenario = cases.find(c => c.id === row.scenarioId), capture = join(runRoot, row.trialId), reviewId = 'review-' + sha(planSHA256 + row.trialId).slice(0, 16), bundle = join(runRoot, 'reviewer-bundles', reviewId);
    const cwd = join(root, 'synthetic-workspace', row.trialId), guidance = 'Synthetic bound guidance 日本語.\n';
    const thread = { thread: { id: 'thread-fixture' }, model: controls.model, reasoningEffort: controls.model_reasoning_effort, approvalPolicy: controls.approval_policy, approvalsReviewer: controls.approvals_reviewer, sandbox: { type: 'workspaceWrite' }, cwd };
    const messages = [ { id: 1, result: thread }, { method: 'turn/started', params: { threadId: 'thread-fixture', turn: { id: 'turn-fixture', status: 'inProgress', items: [] } } },
      { method: 'item/completed', params: { threadId: 'thread-fixture', item: { type: 'commandExecution', id: 'guidance', command: `cat -- '${cwd}/trial-guidance.md'`, aggregatedOutput: guidance, exitCode: 0 } } } ];
    for (let i = 0; i < scenario.budget.requiredImages; i++) messages.push({ method: 'item/completed', params: { threadId: 'thread-fixture', item: { type: 'imageGeneration', id: `image-${i}`, savedPath: `/synthetic/tool/image-${i}.png`, status: 'completed' } } });
    const total = { inputTokens: row.variant === 'v31' ? 110 : 105, outputTokens: 20, cachedInputTokens: 10, totalTokens: row.variant === 'v31' ? 130 : 125, reasoningOutputTokens: 0 };
    messages.push({ method: 'thread/tokenUsage/updated', params: { threadId: 'thread-fixture', tokenUsage: { total, last: {} } } }, { method: 'item/completed', params: { threadId: 'thread-fixture', item: { type: 'agentMessage', id: 'answer', text: 'Synthetic response.' } } }, { method: 'turn/completed', params: { threadId: 'thread-fixture', turn: { id: 'turn-fixture', status: 'completed', items: [] } } });
    const events = [], errors = []; const transcript = new NativeTranscript({ emit: x => events.push(x), fail: x => errors.push(x), scenario: { ...scenario, mode: 'guidance-read-only' } }); transcript.threadId = thread.thread.id; messages.forEach(x => transcript.accept(x)); assert.deepEqual(errors, []);
    const protocol = [{ direction: 'sent', message: { id: 1, method: 'thread/start', params: { cwd, ephemeral: true } } }, ...messages.map(message => ({ direction: 'received', message }))];
    await put(join(capture, 'events.jsonl'), events.map(x => JSON.stringify(x)).join('\n') + '\n'); await put(join(capture, 'raw-protocol.jsonl'), protocol.map(x => JSON.stringify(x)).join('\n') + '\n'); await put(join(capture, 'raw-stdout.jsonl'), messages.map(x => JSON.stringify(x)).join('\n') + '\n'); await put(join(capture, 'stderr.txt'), '');
    for (const side of ['before', 'after']) { await put(join(capture, side, 'trial-guidance.md'), guidance); await put(join(capture, side, 'README.md'), 'Synthetic input unchanged.'); }
    const guard = { guidanceReadObserved: true, guidanceUnchanged: true, violation: null, violations: [], observerErrors: [] };
    const telemetry = { exitCode: 0, completedTurn: true, responsePresent: true, nativeStreamComplete: true, timedOut: false, stopReason: null, malformedLines: 0, protocolErrors: [], serverRequests: [], observedOwnedResidualProcesses: [], processObservation: { complete: true }, configuredControls: controls, effectiveControls: controls, observedModel: controls.model, unclassifiedToolItems: ['guidance'], savedImages: [], observedNamedImageCalls: scenario.budget.requiredImages, nativeUsage: { total, last: {} }, usage: [{ input_tokens: total.inputTokens, output_tokens: total.outputTokens, cached_input_tokens: total.cachedInputTokens }], runtimeFiles: {} };
    for (const file of ['events.jsonl', 'raw-protocol.jsonl', 'raw-stdout.jsonl', 'stderr.txt']) telemetry.runtimeFiles[file] = sha(await readFile(join(capture, file)));
    await put(join(capture, 'telemetry.json'), telemetry); await put(join(capture, 'guidance-guard.json'), guard); await put(join(capture, 'binding.json'), { row, cwd, planSHA256, guidance: { path: join(cwd, 'trial-guidance.md'), sha256: sha(guidance), instructions: [{ key: 'fixture-guidance', sha256: sha(guidance) }] }, configuredHost: plan.host });
    await put(join(capture, 'summary.json'), { row, reviewId, failed: false, productOrGuidanceChanged: false, browserStatus: scenario.mode === 'implementation' ? 'observed' : 'not-applicable' });
    for (const target of ['input-project', 'actual-artifacts']) await put(join(bundle, target, 'README.md'), 'Synthetic input unchanged.');
    await put(join(bundle, 'events.jsonl'), events.map(x => JSON.stringify(x)).join('\n') + '\n'); await put(join(bundle, 'redactions.json'), { rawEventsSHA256: telemetry.runtimeFiles['events.jsonl'], redactions: [] });
    await put(join(bundle, 'response.md'), 'Synthetic response.'); await put(join(bundle, 'IMAGES.md'), 'Synthetic raster transport only.');
    const inputManifest = await treeBinding(join(bundle, 'input-project')), actualArtifactManifest = await treeBinding(join(bundle, 'actual-artifacts'));
    await put(join(bundle, 'context.json'), { reviewId, task: Object.fromEntries(Object.entries(scenario).filter(([key]) => !['originalSource', 'localRoot', 'references'].includes(key))), rubric, execution: telemetry, inputManifest, actualArtifactManifest, browserStatus: scenario.mode === 'implementation' ? 'observed' : 'not-applicable' });
    if (scenario.mode === 'implementation') {
      await put(join(bundle, 'browser/wide.png'), png); await put(join(bundle, 'browser/narrow.png'), png); await put(join(bundle, 'browser/observations.json'), { fixtureOnly: true });
      const after = await treeBinding(join(capture, 'after'));
      await put(join(bundle, 'browser/transport-evidence.json'), { unchanged: true, reportComplete: true, failure: null, sourceBefore: after, sourceAfter: after, copyBefore: after, copyAfter: after });
    }
    const retained = [];
    for (let i = 0; i < scenario.budget.requiredImages; i++) { const target = `tool-images/image-${i}.png`, value = Buffer.concat([png, Buffer.from(String(i))]); await put(join(bundle, target), value); const source = `/synthetic/tool/image-${i}.png`, archived = `generated-images/${i}.png`; await put(join(capture, archived), value); telemetry.savedImages.push({ itemId: `image-${i}`, savedPath: source, archived, sha256: sha(value), bytes: value.length }); retained.push({ target, source, sha256: sha(value), bytes: value.length, eventLine: events.findIndex(e => e.item?.id === `image-${i}`) + 1 }); }
    await put(join(capture, 'telemetry.json'), telemetry);
    await put(join(bundle, 'tool-images.json'), { retained, unresolved: [] });
    const tools = events.map((e, index) => ({ e, index })).filter(({ e }) => e.type === 'item.completed' && e.item.type !== 'agent_message');
    const fileBindings = await treeBinding(bundle), review = { schemaVersion: 1, trialId: reviewId, scenarioId: scenario.id, reviewer: 'synthetic-independent-reviewer', bundlePath: bundle, fileBindings, bundleManifestSha256: reviewHashes([fileBindings])[0], rubricSha256: sha(await readFile(join(fixtureRoot, 'rubric.json'))), screenshotsOpened: [...retained.map(x => join(bundle, x.target)), ...(scenario.mode === 'implementation' ? ['browser/wide.png', 'browser/narrow.png'].map(x => join(bundle, x)) : [])], checks: scenario.requiredChecks.map(id => ({ id, result: 'pass', rationale: 'Synthetic fixture evidence.' })), dimensions: Object.fromEntries(rubric.dimensions.map(d => [d, row.variant === 'v31' ? 3 : 4])), dimensionRationales: Object.fromEntries(rubric.dimensions.map(d => [d, 'Synthetic grading for validation only.'])), nativeToolAuthorityReview: { allUnclassifiedIdsResolved: true, classifiedItems: tools.map(({ e, index }) => ({ id: e.item.id, type: e.item.type, eventLine: index + 1, itemSha256: reviewHashes([e.item])[0], classification: 'Synthetic fixture operation.', imageGeneration: e.item.type === 'imageGeneration', publication: false })), imageGenerationCalls: scenario.budget.requiredImages }, overall: 'pass', rationale: 'Synthetic fixture only.' };
    const reviewFile = join(reviews, `${reviewId}.json`); await put(reviewFile, review); reviewFiles.push(reviewFile); results.push({ trialId: row.trialId, reviewId, failed: false });
  }
  await put(join(runRoot, 'attempt-schedule.json'), schedule); await put(join(runRoot, 'run-summary.json'), { requested: 66, recorded: 66, interrupted: false, failures: [], results });
  return { root, fixtureRoot, runRoot, reviewFiles, operatorMappingPath: join(fixtureRoot, 'operator-mapping.json'), finalAggregationAuthorized: true, expectedPlanSHA256: planSHA256, reviewerIdentities: ['synthetic-independent-reviewer'], schedule };
}

async function miniature(rowIndex = 0) {
  const root = await mkdtemp(join(tmpdir(), 'qs-synthetic-aggregation-negative-')), runRoot = join(root, 'run'), row = complete.schedule[rowIndex], original = await read(complete.reviewFiles[rowIndex]), reviewPath = join(root, 'review.json');
  await cp(join(complete.runRoot, row.trialId), join(runRoot, row.trialId), { recursive: true });
  const bundle = join(runRoot, 'reviewer-bundles', original.trialId); await cp(original.bundlePath, bundle, { recursive: true });
  // Relocation changes only this explicit synthetic review path, never real evidence.
  original.bundlePath = bundle; original.screenshotsOpened = original.screenshotsOpened.map(path => join(bundle, ...path.split('/').slice(-2))); 
  await put(reviewPath, original); await cp(join(complete.runRoot, 'attempt-schedule.json'), join(runRoot, 'attempt-schedule.json'));
  await put(join(runRoot, 'run-summary.json'), { requested: 66, recorded: 1, interrupted: true, failures: [], results: [] });
  return { ...complete, root, runRoot, reviewFiles: [reviewPath], reviewPath, row, capture: join(runRoot, row.trialId), bundle };
}
async function changeReview(f, fn) { const review = await read(f.reviewPath); fn(review); await put(f.reviewPath, review); }
async function rebindReview(f) { const r = await read(f.reviewPath); r.fileBindings = await treeBinding(f.bundle); r.bundleManifestSha256 = reviewHashes([r.fileBindings])[0]; await put(f.reviewPath, r); }
const hasIssue = (report, pattern) => assert.ok(report.issues.some(x => pattern.test(x.message)), JSON.stringify(report.issues.slice(0, 4)));

test('authorization refuses before opening nonexistent mapping or any run evidence', async () => {
  const result = await verifyAndSummarize({ fixtureRoot: '/nonexistent', runRoot: '/nonexistent', operatorMappingPath: '/nonexistent' }); assert.equal(result.status, 'incomplete/unverified'); assert.match(result.issues[0].message, /not authorized/); assert.equal(result.bindings, undefined);
});
test('synthetic exact 66 binds all rows, native tokens, real raster bytes and original independent grades', async () => {
  complete = await build(); const report = await verifyAndSummarize(complete);
  assert.deepEqual(report.issues, []); assert.equal(report.status, 'evidence-complete-review-required'); assert.equal(report.records.length, 66); assert.equal(report.originalReviews.length, 66); assert.equal(report.comparison.paired.length, 33);
  assert.equal(report.comparison.perVariant.v31.meanApplicableGrade, 3); assert.equal(report.comparison.perVariant.v84.meanApplicableGrade, 4); assert.equal(report.comparison.perVariant.v31.sumObservedInputTokens, 3630); assert.equal(report.comparison.perVariant.v84.medianObservedInputTokens, 105); assert.equal(report.comparison.perVariant.v31.sumObservedCachedInputTokens, 330);
  assert.equal(report.records.filter(x => x.row.scenarioId === 'F09')[0].observed.retainedRasterFiles.length, 2); assert.match(report.adoption, /Not decided/); assert.match(report.records[0].observed.warning, /bytes are not tokens/);
});

test('partial run never receives completion even when every available review passes', async () => { const f = await miniature(); const report = await verifyAndSummarize(f); assert.equal(report.status, 'incomplete/unverified'); assert.equal(report.records.length, 1); hasIssue(report, /Run incomplete/); });

for (const [name, mutate, pattern] of [
  ['missing check', r => r.checks.pop(), /required checks/],
  ['duplicate check', r => r.checks.push(r.checks[0]), /required checks/],
  ['failed check', r => { r.checks[0].result = 'fail'; r.overall = 'fail'; }, /Required check not verified/],
  ['below-floor grade', r => { r.dimensions['brief-and-content-fidelity'] = 2; }, /Below frozen quality floor/],
  ['unresolved tool', r => { r.nativeToolAuthorityReview.classifiedItems = []; }, /classify every native tool/],
  ['stale item digest', r => { r.nativeToolAuthorityReview.classifiedItems[0].itemSha256 = '0'.repeat(64); }, /Stale tool classification/],
  ['null is not frozen not-applicable syntax', r => { r.dimensions['visual-hierarchy-and-readability'] = null; }, /Invalid original grade/],
  ['changed rubric digest', r => { r.rubricSha256 = '0'.repeat(64); }, /rubric hash/],
  ['unapproved reviewer', r => { r.reviewer = 'author'; }, /independence/],
  ['inconsistent reviewed image calls', r => { r.nativeToolAuthorityReview.imageGenerationCalls = 1; }, /image calls inconsistent/]
]) test(`rejects ${name} while preserving original review bytes`, async () => { const f = await miniature(); await changeReview(f, mutate); const before = await readFile(f.reviewPath); const report = await verifyAndSummarize(f); assert.equal(report.status, 'incomplete/unverified'); hasIssue(report, pattern); assert.deepEqual(await readFile(f.reviewPath), before); assert.deepEqual(report.originalReviews[0].review, JSON.parse(before)); });

test('changed artifact bytes or even declared size without byte change invalidates review binding', async () => {
  for (const mode of ['bytes', 'size']) { const f = await miniature(); if (mode === 'bytes') await put(join(f.bundle, 'actual-artifacts/README.md'), 'tampered actual output'); else await changeReview(f, r => { r.fileBindings['actual-artifacts/README.md'].bytes++; }); const report = await verifyAndSummarize(f); hasIssue(report, /Stale\/partial review/); }
});
test('missing F09 raster and unopened actual image cannot be passed by positive grades', async () => {
  const index = complete.schedule.findIndex(x => x.scenarioId === 'F09');
  const f = await miniature(index); await changeReview(f, r => { r.screenshotsOpened = []; }); hasIssue(await verifyAndSummarize(f), /not independently opened/);
  const g = await miniature(index); const image = (await read(join(g.bundle, 'tool-images.json'))).retained[0]; await rm(join(g.bundle, image.target)); await rebindReview(g); hasIssue(await verifyAndSummarize(g), /ENOENT/);
});
test('duplicate reviews, stale opaque IDs and failed native completion remain unresolved', async () => {
  const f = await miniature(); const d = await verifyAndSummarize({ ...f, reviewFiles: [f.reviewPath, f.reviewPath] }); hasIssue(d, /Duplicate review/);
  await changeReview(f, r => { r.trialId = 'review-stale'; }); hasIssue(await verifyAndSummarize(f), /Unknown\/stale/);
  const g = await miniature(); const telemetry = await read(join(g.capture, 'telemetry.json')); telemetry.nativeStreamComplete = false; await put(join(g.capture, 'telemetry.json'), telemetry); hasIssue(await verifyAndSummarize(g), /native stream incomplete/);
});
test('raw native replay detects extra opaque tools even after telemetry hashes are recomputed', async () => {
  const f = await miniature(); const native = (await readFile(join(f.capture, 'raw-stdout.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse), extra = { method: 'item/completed', params: { threadId: 'thread-fixture', item: { id: 'hidden', type: 'futureOpaqueTool' } } }; native.splice(-1, 0, extra);
  await put(join(f.capture, 'raw-stdout.jsonl'), native.map(x => JSON.stringify(x)).join('\n') + '\n');
  const protocol = (await readFile(join(f.capture, 'raw-protocol.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse); protocol.splice(-1, 0, { direction: 'received', message: extra }); await put(join(f.capture, 'raw-protocol.jsonl'), protocol.map(x => JSON.stringify(x)).join('\n') + '\n');
  const t = await read(join(f.capture, 'telemetry.json')); for (const key of Object.keys(t.runtimeFiles)) t.runtimeFiles[key] = sha(await readFile(join(f.capture, key))); await put(join(f.capture, 'telemetry.json'), t);
  hasIssue(await verifyAndSummarize(f), /Native replay/);
});

test('applicability disagreements are unresolved and original not-applicable grade is retained', async () => {
  const f = await miniature(0), original = await read(complete.reviewFiles[1]), row = complete.schedule[1], bundle = join(f.runRoot, 'reviewer-bundles', original.trialId), oldBundle = original.bundlePath;
  await cp(join(complete.runRoot, row.trialId), join(f.runRoot, row.trialId), { recursive: true }); await cp(oldBundle, bundle, { recursive: true });
  original.bundlePath = bundle; original.screenshotsOpened = original.screenshotsOpened.map(path => path.replace(oldBundle, bundle)); original.dimensions['visual-hierarchy-and-readability'] = 'not-applicable'; original.dimensionRationales['visual-hierarchy-and-readability'] = 'Synthetic inconsistent applicability negative control.';
  const second = join(f.root, 'second.json'); await put(second, original); f.reviewFiles.push(second);
  const report = await verifyAndSummarize(f); hasIssue(report, /Inconsistent applicability/); assert.equal(report.records.length, 2); assert.equal(report.records[1].dimensions['visual-hierarchy-and-readability'], 'not-applicable');
});
test('HTTP copy mismatch and raster corruption fail despite rebound positive reviewer claims', async () => {
  const f = await miniature(); const transport = await read(join(f.bundle, 'browser/transport-evidence.json')); transport.copyAfter['README.md'].sha256 = '0'.repeat(64); await put(join(f.bundle, 'browser/transport-evidence.json'), transport); await rebindReview(f); hasIssue(await verifyAndSummarize(f), /HTTP observation/);
  const g = await miniature(complete.schedule.findIndex(x => x.scenarioId === 'F09')); const evidence = await read(join(g.bundle, 'tool-images.json')), image = evidence.retained[0], corrupt = png.subarray(0, 16); await put(join(g.bundle, image.target), corrupt); image.sha256 = sha(corrupt); image.bytes = corrupt.length; await put(join(g.bundle, 'tool-images.json'), evidence); await rebindReview(g); hasIssue(await verifyAndSummarize(g), /raster decoding/);
});

test('trusted plan anchor and unexpected extra capture cannot be ignored', async () => {
  const f = await miniature(); hasIssue(await verifyAndSummarize({ ...f, expectedPlanSHA256: '0'.repeat(64) }), /trusted frozen plan digest/);
  await mkdir(join(f.runRoot, 'F99-r1-v31')); hasIssue(await verifyAndSummarize(f), /Unexpected capture/);
});

test('exported raster must match the actual named native source and archived primary bytes', async () => {
  const f = await miniature(complete.schedule.findIndex(x => x.scenarioId === 'F09')); const evidence = await read(join(f.bundle, 'tool-images.json')); evidence.retained[0].source = '/synthetic/not-tool-output.png'; await put(join(f.bundle, 'tool-images.json'), evidence); await rebindReview(f); hasIssue(await verifyAndSummarize(f), /not named by its native tool/);
});
