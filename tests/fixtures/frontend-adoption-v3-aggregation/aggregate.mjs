import { createHash } from 'node:crypto';
import { readFile, readdir, lstat, realpath } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve, join, relative, isAbsolute } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { NativeTranscript, validateNativeControls } from '../../../scripts/frontend-native-capture.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = (value, message) => { if (!value) throw new Error(message); };
const order = value => Array.isArray(value) ? value.map(order) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, order(value[key])])) : value;
const same = (a, b) => JSON.stringify(order(a)) === JSON.stringify(order(b));
const sorted = values => [...values].sort();
const unique = values => new Set(values).size === values.length;
const integer = value => Number.isSafeInteger(value) && value >= 0;
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const nonTools = new Set(['userMessage', 'agent_message', 'reasoning', 'plan', 'contextCompaction', 'enteredReviewMode', 'exitedReviewMode']);
const unclassifiedTypes = new Set(['dynamic_tool_call', 'mcp_tool_call', 'command_execution', 'collab_tool_call', 'function_call_output']);
const namedImage = item => item.type === 'imageGeneration' || /image.?gen/i.test(`${item.tool ?? ''} ${item.name ?? ''} ${item.namespace ?? ''}`);
const median = values => { const xs = sorted(values).map(Number).sort((a, b) => a - b); return xs.length ? (xs[Math.floor((xs.length - 1) / 2)] + xs[Math.floor(xs.length / 2)]) / 2 : null; };
const mean = values => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;

// Reviewers use Python sorted compact JSON with ensure_ascii=True. Use that exact
// serializer, including its Unicode/float treatment; never guess another digest.
export function reviewHashes(values) {
  const result = spawnSync('python3', ['-c', 'import sys,json,hashlib; print(json.dumps([hashlib.sha256(json.dumps(v,sort_keys=True,separators=(",",":" )).encode("utf-8")).hexdigest() for v in json.load(sys.stdin)]))'], { input: JSON.stringify(values), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  fail(result.status === 0, 'Review canonical serializer unavailable'); return JSON.parse(result.stdout);
}
async function regularRoot(path) { path = resolve(path); fail((await lstat(path)).isDirectory() && await realpath(path) === path, `Regular non-link directory required: ${path}`); return path; }
function child(root, path) { fail(nonempty(path) && !isAbsolute(path) && !path.split(/[\\/]/).includes('..'), 'Unsafe evidence path'); const result = resolve(root, path); fail(result.startsWith(root + '/'), 'Evidence path escapes its root'); return result; }
async function bytes(path) { const stat = await lstat(path); fail(stat.isFile() && !stat.isSymbolicLink() && stat.size <= 128 * 1024 * 1024 && await realpath(path) === path, `Bounded regular file required: ${path}`); const value = await readFile(path); fail(value.length === stat.size, 'File size changed while reading'); return value; }
async function readJson(path) { return JSON.parse((await bytes(path)).toString('utf8')); }
async function fileBinding(path) { const value = await bytes(path); return { sha256: sha(value), bytes: value.length }; }
export async function treeBinding(root) { root = await regularRoot(root); const result = {}; let size = 0, count = 0;
  async function visit(dir) { for (const name of (await readdir(dir)).sort()) { const path = join(dir, name), stat = await lstat(path); fail(!stat.isSymbolicLink(), 'Symlink in evidence tree'); if (stat.isDirectory()) await visit(path); else { fail(++count <= 20000, 'Evidence inventory exceeds bound'); const binding = await fileBinding(path); fail((size += binding.bytes) <= 1024 * 1024 * 1024, 'Evidence tree exceeds byte bound'); result[relative(root, path)] = binding; } } }
  await visit(root); return result;
}
const jsonLines = value => value.toString('utf8').split('\n').filter(x => x.trim()).map(JSON.parse);
function exactKeys(actual, expected, message) { fail(Array.isArray(actual) && unique(actual) && same(sorted(actual), sorted(expected)), message); }
function healthy(t) { return t.exitCode === 0 && t.completedTurn === true && t.responsePresent === true && t.nativeStreamComplete === true && t.timedOut === false && !t.stopReason && t.malformedLines === 0 && Array.isArray(t.protocolErrors) && t.protocolErrors.length === 0 && Array.isArray(t.serverRequests) && t.serverRequests.length === 0 && Array.isArray(t.observedOwnedResidualProcesses) && t.observedOwnedResidualProcesses.length === 0 && t.processObservation?.complete === true; }
function raster(value) {
  fail(value.length <= 32 * 1024 * 1024, 'Raster exceeds image evidence bound');
  const probe = spawnSync('python3', ['-c', 'import sys,io,json,warnings; from PIL import Image; warnings.simplefilter("error"); Image.MAX_IMAGE_PIXELS=40000000; b=sys.stdin.buffer.read(); im=Image.open(io.BytesIO(b)); assert im.format in ("PNG","JPEG","WEBP"); im.verify(); im=Image.open(io.BytesIO(b)); im.load(); print(json.dumps({"format":im.format,"width":im.width,"height":im.height}))'], { input: value, encoding: 'utf8', maxBuffer: 1024 * 1024, timeout: 15000 });
  fail(probe.status === 0, 'Actual raster decoding failed or Pillow unavailable'); return JSON.parse(probe.stdout);
}

async function verifyRow({ row, scenario, plan, planSHA256, rubric, rubricSHA256, runRoot, reviewRecord, reviewerIdentities, sources }) {
  const directory = child(runRoot, row.trialId), captureBindings = await treeBinding(directory);
  const binding = await readJson(join(directory, 'binding.json')), summary = await readJson(join(directory, 'summary.json')), telemetry = await readJson(join(directory, 'telemetry.json'));
  const reviewId = 'review-' + sha(planSHA256 + row.trialId).slice(0, 16);
  fail(same(binding.row, row) && same(summary.row, row) && binding.planSHA256 === planSHA256 && summary.reviewId === reviewId, 'Capture row/plan/opaque identity mismatch');
  fail(summary.failed === false && healthy(telemetry), 'Capture failed or native stream incomplete');
  fail(same(binding.configuredHost, plan.host) && same(telemetry.configuredControls, plan.host.configured), 'Capture host differs from frozen host');
  fail(telemetry.observedModel === plan.host.configured.model && same(telemetry.effectiveControls, plan.host.configured), 'Observed native controls mismatch');
  for (const [name, expected] of Object.entries(telemetry.runtimeFiles ?? {})) fail(captureBindings[name]?.sha256 === expected, `Raw native binding mismatch: ${name}`);
  for (const name of ['events.jsonl', 'raw-protocol.jsonl', 'raw-stdout.jsonl', 'stderr.txt']) fail(telemetry.runtimeFiles?.[name] === captureBindings[name]?.sha256, `Missing raw native binding: ${name}`);
  const guidance = await bytes(join(directory, 'before/trial-guidance.md'));
  fail(sha(guidance) === binding.guidance.sha256 && sha(await bytes(join(directory, 'after/trial-guidance.md'))) === binding.guidance.sha256, 'Guidance source changed');
  const expectedSourceKeys = row.variant === 'v31' ? [scenario.originalSource] : [scenario.localRoot, ...scenario.references];
  exactKeys(binding.guidance.instructions?.map(x => x.key), expectedSourceKeys, 'Selected instruction bodies differ from frozen scenario');
  let sourceInstructionUtf8Bytes = 0;
  for (const instruction of binding.guidance.instructions) {
    const source = sources[instruction.key]; fail(source && instruction.sha256 === source.sha256 && guidance.includes(source.bytes), 'Loaded instruction body differs from frozen source'); sourceInstructionUtf8Bytes += source.bytes.length;
  }
  const guard = await readJson(join(directory, 'guidance-guard.json'));
  fail(guard.guidanceReadObserved === true && guard.guidanceUnchanged === true && !guard.violation && guard.violations?.length === 0 && guard.observerErrors?.length === 0, 'Required guidance read/authority guard not verified');
  if (!scenario.authority.writeProductFiles) fail(summary.productOrGuidanceChanged === false, 'Unauthorized product mutation');
  const events = jsonLines(await bytes(join(directory, 'events.jsonl'))), raw = jsonLines(await bytes(join(directory, 'raw-protocol.jsonl')));
  const native = raw.filter(x => x.direction === 'received').map(x => x.message);
  fail(same(jsonLines(await bytes(join(directory, 'raw-stdout.jsonl'))), native), 'Raw stdout differs from recorded native protocol');
  const sent = raw.filter(x => x.direction === 'sent').map(x => x.message);
  const starts = sent.filter(x => x.method === 'thread/start'); fail(starts.length === 1, 'Expected one native thread start');
  const thread = native.find(x => x.id === starts[0].id)?.result;
  fail(thread && same(validateNativeControls(plan.host.configured, thread, binding.cwd), telemetry.effectiveControls), 'Native effective controls not independently matched');
  const replayed = [], replayErrors = [];
  const replay = new NativeTranscript({ emit: event => replayed.push(event), fail: error => replayErrors.push(error), scenario: { ...scenario, mode: scenario.mode === 'prompt-only' ? 'guidance-read-only' : scenario.mode } });
  replay.threadId = thread.thread.id;
  for (const message of native) { fail(!(message.id !== undefined && message.method), 'Unresolved native server request'); if (message.method) replay.accept(message); }
  fail(replayErrors.length === 0 && replay.terminal?.status === 'completed' && replay.open.size === 0 && same(replayed, events), 'Native replay is incomplete, unknown, or differs from normalized capture');
  const terminal = native.filter(x => x.method === 'turn/completed');
  fail(terminal.length === 1 && terminal[0].params?.turn?.status === 'completed', 'Native terminal is missing, duplicated or failed');
  const nativeItems = native.filter(x => x.method === 'item/completed').map(x => x.params);
  const nativeItemHashes = new Set(reviewHashes(nativeItems));
  const completed = events.map((event, index) => ({ event, eventLine: index + 1 })).filter(x => x.event.type === 'item.completed');
  fail(unique(completed.map(x => x.event.item?.id)), 'Duplicate completed native item identity');
  const tools = completed.filter(x => !nonTools.has(x.event.item?.type));
  for (const { event } of completed) fail(nativeItemHashes.has(reviewHashes([event.native])[0]) || terminal[0].params.turn.items?.some(item => same(item, event.native?.item)), 'Normalized item lacks matching native evidence');
  const namedImageIds = tools.filter(x => namedImage(x.event.item)).map(x => x.event.item.id);
  fail(telemetry.observedNamedImageCalls === namedImageIds.length, 'Named image count disagrees with native items');
  exactKeys(telemetry.unclassifiedToolItems, tools.filter(x => unclassifiedTypes.has(x.event.item.type)).map(x => x.event.item.id), 'Unclassified native IDs disagree');
  const usage = native.filter(x => x.method === 'thread/tokenUsage/updated').at(-1)?.params?.tokenUsage;
  fail(usage && same(telemetry.nativeUsage, usage), 'Missing or inconsistent native usage');
  const total = usage.total;
  for (const key of ['inputTokens', 'outputTokens', 'cachedInputTokens', 'totalTokens']) fail(integer(total?.[key]), `Invalid native usage ${key}`);
  fail(total.cachedInputTokens <= total.inputTokens, 'Cached input exceeds total input');
  fail(telemetry.usage?.length === 1 && telemetry.usage[0].input_tokens === total.inputTokens && telemetry.usage[0].output_tokens === total.outputTokens && telemetry.usage[0].cached_input_tokens === total.cachedInputTokens, 'Normalized usage differs from native totals');

  fail(reviewRecord, 'Missing independent opaque review');
  const { review, path: reviewPath, file: reviewFile } = reviewRecord;
  fail(review.schemaVersion === 1 && review.trialId === reviewId && review.scenarioId === scenario.id && reviewerIdentities.includes(review.reviewer), 'Review identity/independence not authorized');
  fail(review.rubricSha256 === rubricSHA256, 'Review rubric hash mismatch');
  const bundle = child(runRoot, `reviewer-bundles/${reviewId}`);
  fail(resolve(review.bundlePath) === bundle, 'Review points at another bundle');
  const bundleBindings = await treeBinding(bundle);
  fail(same(bundleBindings, review.fileBindings), 'Stale/partial review file hash or size inventory');
  fail(review.bundleManifestSha256 === reviewHashes([bundleBindings])[0], 'Review aggregate manifest digest mismatch');
  const context = await readJson(join(bundle, 'context.json'));
  const { originalSource, localRoot, references, ...task } = scenario;
  fail(context.reviewId === reviewId && same(context.task, task) && same(context.rubric, rubric), 'Reviewer context/task/rubric mismatch');
  fail(context.execution.nativeStreamComplete === true && same(context.execution.unclassifiedToolItems, telemetry.unclassifiedToolItems), 'Reviewer execution evidence differs');
  for (const key of ['effectiveControls', 'usage', 'exitCode', 'timedOut', 'stopReason', 'completedTurn', 'protocolErrors', 'serverRequests', 'observedOwnedResidualProcesses']) fail(same(context.execution[key], telemetry[key]), `Reviewer native observation mismatch: ${key}`);
  fail((await readJson(join(bundle, 'redactions.json'))).rawEventsSHA256 === captureBindings['events.jsonl'].sha256, 'Redacted stream is not bound to raw stream');
  for (const [side, target, expected] of [['before', 'input-project', context.inputManifest], ['after', 'actual-artifacts', context.actualArtifactManifest]]) {
    const source = await treeBinding(join(directory, side)); delete source['trial-guidance.md'];
    fail(same(await treeBinding(join(bundle, target)), source) && same(expected, source), `Reviewer ${target} differs from captured files`);
  }
  if (scenario.mode === 'implementation') fail(summary.browserStatus === 'observed' && context.browserStatus === 'observed' && bundleBindings['browser/wide.png'] && bundleBindings['browser/narrow.png'] && bundleBindings['browser/observations.json'] && bundleBindings['browser/transport-evidence.json'], 'Implementation browser observations incomplete');
  const qualityIssues = [];
  if (scenario.mode === 'implementation') {
    const transport = await readJson(join(bundle, 'browser/transport-evidence.json'));
    const after = await treeBinding(join(directory, 'after'));
    fail(transport.unchanged === true && transport.reportComplete === true && !transport.failure && same(transport.sourceBefore, after) && same(transport.sourceAfter, after) && same(transport.copyBefore, after) && same(transport.copyAfter, after), 'HTTP observation source/copy evidence differs');
    for (const path of ['browser/wide.png', 'browser/narrow.png']) raster(await bytes(join(bundle, path)));
  }
  exactKeys(review.checks?.map(x => x.id), scenario.requiredChecks, 'Missing, extra or duplicate required checks');
  for (const check of review.checks) { fail(['pass', 'fail', 'unverified'].includes(check.result) && nonempty(check.rationale), `Invalid required check: ${check.id}`); if (check.result !== 'pass') qualityIssues.push(`Required check not verified: ${check.id}`); }
  exactKeys(Object.keys(review.dimensions ?? {}), rubric.dimensions, 'Dimension set differs from frozen rubric');
  for (const dimension of rubric.dimensions) {
    const value = review.dimensions[dimension];
    fail(nonempty(review.dimensionRationales?.[dimension]), `Missing dimension rationale: ${dimension}`);
    fail(value === 'not-applicable' || Number.isInteger(value) && value >= 0 && value <= 4, 'Invalid original grade');
    if (value !== 'not-applicable' && value < rubric.floor) qualityIssues.push(`Below frozen quality floor: ${dimension}`);
  }
  if (!Object.values(review.dimensions).some(value => typeof value === 'number')) qualityIssues.push('No applicable graded dimensions');
  fail(['pass', 'fail', 'unverified'].includes(review.overall) && nonempty(review.rationale), 'Invalid independent overall review');
  if (review.overall !== 'pass') qualityIssues.push('Independent overall review does not pass');
  const authority = review.nativeToolAuthorityReview;
  fail(authority?.allUnclassifiedIdsResolved === true && Array.isArray(authority.classifiedItems), 'Native authority is unresolved');
  // Bind each review classification to the exact normalized item and physical line
  // in its reviewed (guidance-redacted) bundle. Raw-native identity is checked above.
  const reviewedEvents = jsonLines(await bytes(join(bundle, 'events.jsonl')));
  exactKeys(authority.classifiedItems.map(x => x.id), tools.map(x => x.event.item.id), 'Review must classify every native tool exactly once');
  for (const item of authority.classifiedItems) {
    const observed = tools.find(x => x.event.item.id === item.id), reviewed = reviewedEvents[item.eventLine - 1];
    fail(item.eventLine === observed.eventLine && reviewed?.type === 'item.completed' && reviewed.item.id === item.id && reviewed.item.type === item.type && item.itemSha256 === reviewHashes([reviewed.item])[0], 'Stale tool classification hash/line/type');
    fail(nonempty(item.classification) && typeof item.imageGeneration === 'boolean' && item.publication === false, 'Unresolved or forbidden native tool semantics');
    if (namedImage(observed.event.item)) fail(item.imageGeneration === true, 'Named image tool denied by classification');
  }
  const reviewedImageIds = authority.classifiedItems.filter(x => x.imageGeneration).map(x => x.id);
  fail(authority.imageGenerationCalls === reviewedImageIds.length && reviewedImageIds.length <= scenario.budget.maximumImageCalls, 'Reviewed image calls inconsistent or exceed budget');
  if (!scenario.authority.generateImages) fail(reviewedImageIds.length === 0, 'Image generation unauthorized');
  const imageEvidence = await readJson(join(bundle, 'tool-images.json'));
  fail(Array.isArray(imageEvidence.retained) && imageEvidence.unresolved?.length === 0, 'Unresolved generated image outputs');
  const retained = new Map();
  for (const image of imageEvidence.retained) {
    const value = await bytes(child(bundle, image.target)), event = events[image.eventLine - 1];
    fail(raster(value) && image.sha256 === sha(value) && image.bytes === value.length && event?.type === 'item.completed' && namedImage(event.item), 'Actual generated raster/source event mismatch');
    const containsSource = value => typeof value === 'string' ? value.includes(image.source) : Array.isArray(value) ? value.some(containsSource) : value && typeof value === 'object' ? Object.values(value).some(containsSource) : false;
    fail(nonempty(image.source) && [event.item.result, event.item.output, event.item.image_path, event.item.image_url, event.item.savedPath].some(containsSource), 'Retained image source is not named by its native tool output');
    if (event.item.savedPath) {
      const archived = telemetry.savedImages?.find(x => x.itemId === event.item.id && x.savedPath === image.source);
      fail(archived && !archived.error && archived.sha256 === image.sha256 && archived.bytes === image.bytes && sha(await bytes(child(directory, archived.archived))) === image.sha256, 'Primary native image archive differs from reviewer image');
    }
    fail(reviewedImageIds.includes(event.item.id), 'Retained raster lacks reviewed image-call identity'); retained.set(image.target, image);
  }
  fail(retained.size >= scenario.budget.requiredImages, 'Required actual generated images missing');
  fail(Array.isArray(review.screenshotsOpened), 'Actual image viewing evidence missing');
  for (const path of retained.keys()) fail(review.screenshotsOpened.some(viewed => viewed === path || resolve(viewed) === join(bundle, path)), 'Required generated image not independently opened');
  if (scenario.mode === 'implementation') for (const path of ['browser/wide.png', 'browser/narrow.png']) fail(review.screenshotsOpened.some(viewed => viewed === path || resolve(viewed) === join(bundle, path)), 'Required viewport image not independently opened');
  fail(same(captureBindings, await treeBinding(directory)) && same(bundleBindings, await treeBinding(bundle)) && same(reviewFile, await fileBinding(reviewPath)), 'Evidence changed during verification');
  return { row, reviewId, reviewPath, reviewFile, captureBindings, bundleBindings, originalReview: review, qualityIssues, dimensions: review.dimensions,
    observed: { nativeTokens: total, namedImageIds, reviewedImageIds, retainedRasterFiles: [...retained.keys()], guidanceUtf8Bytes: guidance.length, sourceInstructionUtf8Bytes, instructionSourceSHA256s: binding.guidance.instructions?.map(x => x.sha256) ?? [], warning: 'Guidance bytes are not tokens. Native totals include host overhead; no skill-only, causal, latency or cost claim.' } };
}

export async function verifyAndSummarize({ fixtureRoot, runRoot, reviewFiles, operatorMappingPath, finalAggregationAuthorized = false, reviewerIdentities = [], expectedPlanSHA256 }) {
  const report = { schemaVersion: 1, status: 'incomplete/unverified', adoption: 'Not decided; independent acceptance remains required.', issues: [], records: [], originalReviews: [], comparison: null };
  // This boundary prevents accidental early unblinding, including opening mapping.
  if (finalAggregationAuthorized !== true) { report.issues.push({ scope: 'authorization', message: 'Final aggregation not authorized; mapping and run evidence were not opened.' }); return report; }
  const issue = (scope, error) => report.issues.push({ scope, message: error.message });
  try {
    fixtureRoot = await regularRoot(fixtureRoot); runRoot = await regularRoot(runRoot);
    fail(Array.isArray(reviewFiles) && unique(reviewFiles.map(path => resolve(path))), 'Duplicate review file input'); fail(reviewerIdentities.length > 0 && reviewerIdentities.every(nonempty), 'Independent reviewer identity allowlist required');
    const planBytes = await bytes(join(fixtureRoot, 'plan.json')), plan = JSON.parse(planBytes), planSHA256 = sha(planBytes);
    fail(typeof expectedPlanSHA256 === 'string' && /^[a-f0-9]{64}$/.test(expectedPlanSHA256) && planSHA256 === expectedPlanSHA256, 'Missing or mismatched trusted frozen plan digest');
    fail(plan.schemaVersion === 3 && plan.experiment === 'frontend-native-events-v3' && plan.comparison.trials === 66 && plan.comparison.repetitions === 3, 'Expected exact frozen native66 experiment');
    const fixtureBindings = await treeBinding(fixtureRoot); delete fixtureBindings['plan.json'];
    exactKeys(Object.keys(fixtureBindings), Object.keys(plan.fileHashes), 'Frozen input inventory changed');
    for (const [path, expected] of Object.entries(plan.fileHashes)) fail(fixtureBindings[path].sha256 === expected, `Frozen input hash changed: ${path}`);
    fail(sha(await bytes(fileURLToPath(new URL('../../../scripts/frontend-native-capture.mjs', import.meta.url)))) === plan.dependencies?.['scripts/frontend-native-capture.mjs'], 'Native replay implementation differs from frozen adapter');
    fail(resolve(operatorMappingPath) === join(fixtureRoot, 'operator-mapping.json'), 'Only exact frozen operator mapping is permitted');
    const mapping = await readJson(operatorMappingPath), schedule = await readJson(join(fixtureRoot, 'schedule.json')), cases = await readJson(join(fixtureRoot, 'scenarios.json')), rubric = await readJson(join(fixtureRoot, 'rubric.json'));
    const rubricSHA256 = fixtureBindings['rubric.json'].sha256;
    const sources = await readJson(join(fixtureRoot, 'sources/index.json'));
    for (const source of Object.values(sources)) { source.bytes = await bytes(child(fixtureRoot, source.path)); fail(sha(source.bytes) === source.sha256, 'Frozen source index digest differs'); }
    fail(cases.length === 11 && unique(cases.map(x => x.id)) && schedule.length === 66 && unique(schedule.map(x => x.trialId)), 'Expected eleven cases and 66 unique exact rows');
    exactKeys(Object.keys(mapping), ['v31', 'v84'], 'Unexpected frozen variant mapping'); fail(Object.values(mapping).every(nonempty) && unique(Object.values(mapping)), 'Mapping labels must be distinct');
    for (const scenario of cases) for (const repetition of [1, 2, 3]) exactKeys(schedule.filter(x => x.scenarioId === scenario.id && x.repetition === repetition).map(x => x.variant), ['v31', 'v84'], 'Matched schedule incomplete/duplicated');
    fail(rubric.floor === 3 && rubric.dimensions.length === 5, 'Unexpected frozen rubric contract');
    report.bindings = { plan: { sha256: planSHA256, bytes: planBytes.length }, frozenInputs: fixtureBindings, mappingLabels: mapping };
    const reviews = new Map();
    for (const path of reviewFiles) { try { const review = await readJson(path); fail(!reviews.has(review.trialId), 'Duplicate opaque review identity'); const record = { review, path: resolve(path), file: await fileBinding(path) }; reviews.set(review.trialId, record); report.originalReviews.push(record); } catch (e) { issue('review input', e); } }
    const expectedIds = schedule.map(row => 'review-' + sha(planSHA256 + row.trialId).slice(0, 16));
    for (const name of await readdir(runRoot)) if (/^F[0-9]+-r[0-9]+-v[0-9]+$/.test(name) && !schedule.some(row => row.trialId === name)) issue(name, new Error('Unexpected capture outside frozen schedule'));
    for (const name of await readdir(join(runRoot, 'reviewer-bundles')).catch(error => error.code === 'ENOENT' ? [] : Promise.reject(error))) if (name.startsWith('review-') && !expectedIds.includes(name)) issue(name, new Error('Unexpected opaque bundle outside frozen schedule'));
    for (const id of reviews.keys()) if (!expectedIds.includes(id)) issue(id, new Error('Unknown/stale review identity'));
    try { const runSummary = await readJson(join(runRoot, 'run-summary.json')); fail(runSummary.requested === 66 && runSummary.recorded === 66 && runSummary.interrupted === false && runSummary.failures?.length === 0, 'Run incomplete/interrupted/failed'); exactKeys(runSummary.results?.map(x => x.trialId), schedule.map(x => x.trialId), 'Run summary rows differ'); for (const result of runSummary.results) fail(result.failed === false && result.reviewId === expectedIds[schedule.findIndex(x => x.trialId === result.trialId)], 'Run result failed or opaque ID differs'); report.runSummary = await fileBinding(join(runRoot, 'run-summary.json')); } catch (e) { issue('run summary', e); }
    try { fail(same(await readJson(join(runRoot, 'attempt-schedule.json')), schedule), 'Attempt schedule differs from frozen schedule'); report.attemptSchedule = await fileBinding(join(runRoot, 'attempt-schedule.json')); } catch (e) { issue('attempt schedule', e); }
    for (const row of schedule) { try { report.records.push(await verifyRow({ row, scenario: cases.find(x => x.id === row.scenarioId), plan, planSHA256, rubric, rubricSHA256, runRoot, reviewRecord: reviews.get('review-' + sha(planSHA256 + row.trialId).slice(0, 16)), reviewerIdentities, sources })); } catch (e) { issue(row.trialId, e); } }
    for (const record of report.records) for (const message of record.qualityIssues) issue(record.row.trialId, new Error(message));
    for (const scenario of cases) for (const dimension of rubric.dimensions) { const values = report.records.filter(x => x.row.scenarioId === scenario.id).map(x => x.dimensions[dimension] === 'not-applicable'); if (values.some(Boolean) && !values.every(Boolean)) issue(scenario.id, new Error(`Inconsistent applicability: ${dimension}`)); }
    const perCase = cases.map(scenario => ({ scenarioId: scenario.id, variants: Object.fromEntries(['v31', 'v84'].map(variant => { const records = report.records.filter(x => x.row.scenarioId === scenario.id && x.row.variant === variant); return [variant, { label: mapping[variant], repetitions: records.map(x => x.row.repetition), originalDimensions: records.map(x => x.dimensions), meanApplicableGrade: mean(records.flatMap(x => Object.values(x.dimensions).filter(x => x !== 'not-applicable'))) }]; })) }));
    const perVariant = Object.fromEntries(['v31', 'v84'].map(variant => { const records = report.records.filter(x => x.row.variant === variant); return [variant, { label: mapping[variant], verifiedRows: records.length, meanApplicableGrade: mean(records.flatMap(x => Object.values(x.dimensions).filter(x => x !== 'not-applicable'))), medianObservedInputTokens: median(records.map(x => x.observed.nativeTokens.inputTokens)), medianObservedOutputTokens: median(records.map(x => x.observed.nativeTokens.outputTokens)), medianObservedCachedInputTokens: median(records.map(x => x.observed.nativeTokens.cachedInputTokens)), sumObservedNativeTotalTokens: records.reduce((sum, x) => sum + x.observed.nativeTokens.totalTokens, 0), medianObservedNativeTotalTokens: median(records.map(x => x.observed.nativeTokens.totalTokens)), observedNamedImageCalls: records.reduce((sum, x) => sum + x.observed.namedImageIds.length, 0), independentlyReviewedImageCalls: records.reduce((sum, x) => sum + x.observed.reviewedImageIds.length, 0), sumObservedInputTokens: records.reduce((sum, x) => sum + x.observed.nativeTokens.inputTokens, 0), sumObservedOutputTokens: records.reduce((sum, x) => sum + x.observed.nativeTokens.outputTokens, 0), sumObservedCachedInputTokens: records.reduce((sum, x) => sum + x.observed.nativeTokens.cachedInputTokens, 0), guidanceUtf8Bytes: records.map(x => x.observed.guidanceUtf8Bytes), sourceInstructionUtf8Bytes: records.map(x => x.observed.sourceInstructionUtf8Bytes) }]; }));
    const paired = []; for (const scenario of cases) for (const repetition of [1, 2, 3]) { const pair = report.records.filter(x => x.row.scenarioId === scenario.id && x.row.repetition === repetition); if (pair.length === 2) paired.push({ scenarioId: scenario.id, repetition, originalGrades: Object.fromEntries(pair.map(x => [x.row.variant, x.dimensions])), v84MinusV31: mean(Object.values(pair.find(x => x.row.variant === 'v84').dimensions).filter(x => x !== 'not-applicable')) - mean(Object.values(pair.find(x => x.row.variant === 'v31').dimensions).filter(x => x !== 'not-applicable')) }); }
    report.comparison = { perCase, perVariant, paired, originalAggregateRule: rubric.aggregateRule, aggregateDefinition: 'Mean of all applicable dimension observations, retaining every original grade. Matched applicability and equal repetitions are required; no margin, expanded samples or pooling.', interpretation: 'Opaque variant deltas are descriptive. Parent must identify baseline/candidate from final frozen labels and apply the original aggregate rule. This utility never awards adoption or efficiency.' };
    report.status = report.records.length === 66 && report.issues.length === 0 ? 'evidence-complete-review-required' : 'incomplete/unverified';
  } catch (e) { issue('experiment', e); }
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [authorization, configPath] = process.argv.slice(2);
  if (authorization !== '--final-aggregation-authorized' || !configPath) { console.error('Usage: node aggregate.mjs --final-aggregation-authorized /absolute/read-only-inputs.json'); process.exitCode = 2; }
  else { const config = await readJson(resolve(configPath)); const report = await verifyAndSummarize({ ...config, finalAggregationAuthorized: true }); console.log(JSON.stringify(report, null, 2)); process.exitCode = report.status === 'evidence-complete-review-required' ? 0 : 1; }
}
