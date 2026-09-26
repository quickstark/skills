import { spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdir, mkdtemp, lstat, realpath, cp } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { manifest, sha, validateSchedule, createBoundedSampler, scopedProcessReader } from './frontend-adoption-trials.mjs';
import { executeNative as execute, readNativeControls } from './frontend-native-capture.mjs';
import { observeHttp, verifyPlan as verifyHttpPlan } from '../tests/fixtures/frontend-adoption-v2-http/observer.mjs';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const fixtureRoot = join(repository, 'tests/fixtures/frontend-adoption-v3');
export const previousRoot = join(repository, 'tests/fixtures/frontend-adoption');
const runnerPath = fileURLToPath(import.meta.url), helperPath = join(repository, 'scripts/frontend-adoption-trials.mjs');
const captureDependencies = ['scripts/frontend-native-capture.mjs', 'scripts/frontend-adoption-trials.mjs', 'tests/fixtures/frontend-native-capture/bindings.json', 'tests/fixtures/frontend-native-capture/readiness/inherited-reviewer-success/thread-start-response.json', 'tests/fixtures/frontend-adoption-v2-http/observer.mjs', 'tests/fixtures/frontend-adoption-v2-http/browser-observe-http.mjs', 'tests/fixtures/frontend-adoption-v2-http/plan.json'];
const predecessorBindings = ['tests/fixtures/frontend-adoption-v2/plan.json', 'tests/fixtures/frontend-adoption-v2-infrastructure/preinit-20260926/relaunch-plan.json', 'tests/fixtures/frontend-adoption-v2-infrastructure/closed-host-20260926/manifest.json'];
const bindFiles = async paths => Object.fromEntries(await Promise.all(paths.map(async path => [path, sha(await readFile(join(repository, path)))])));
const readJson = async file => JSON.parse(await readFile(file, 'utf8'));
const json = async (file, value) => writeFile(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const check = (condition, message) => { if (!condition) throw new Error(message); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const quote = value => `'${value.replaceAll("'", "'\\''")}'`;
const activeStops = new Set(); let interrupted = false;
const unchangedFiles = ['common-scope.json', 'scenarios.json', 'schedule.json', 'rubric.json', 'operator-mapping.json', 'browser-observe.mjs'];

export async function prepare({ root = fixtureRoot } = {}) {
  await mkdir(root, { recursive: true });
  for (const file of unchangedFiles) await cp(join(previousRoot, file), join(root, file), { errorOnExist: true, force: false });
  await cp(join(previousRoot, 'assets'), join(root, 'assets'), { recursive: true, errorOnExist: true, force: false });
  await mkdir(join(root, 'sources'));
  const original = await readJson(join(previousRoot, 'sources/index.json')); const sources = {};
  for (const [key, source] of Object.entries(original)) {
    const bytes = await readFile(source.canonicalPath ? join(repository, source.canonicalPath) : join(previousRoot, source.path));
    if (!source.canonicalPath) check(sha(bytes) === source.sha256, 'Original contributor snapshot changed.');
    await writeFile(join(root, source.path), bytes, { flag: 'wx' });
    sources[key] = { ...source, sha256: sha(bytes), ...(source.canonicalPath ? { priorExperimentSHA256: source.sha256 } : {}) };
  }
  await json(join(root, 'sources/index.json'), sources);
  return sources;
}

function host(executable) {
  const version = spawnSync(executable, ['--version'], { encoding: 'utf8' }); check(version.status === 0, 'Configured Codex executable unavailable.');
  const located = spawnSync('python3', ['-c', 'import os,shutil,sys; p=shutil.which(sys.argv[1]); assert p; print(os.path.realpath(p))', executable], { encoding: 'utf8' });
  check(located.status === 0, 'Cannot resolve executable identity.');
  const executablePath = located.stdout.trim();
  return { executablePath, executableSHA256: sha(readFileSync(executablePath)), cliVersion: version.stdout.trim(), configured: readNativeControls(), platform: process.platform, node: process.version, overrides: [], observedModelPolicy: 'Native effective controls validated before turn; runtime reroute notifications invalidate the capture.' };
}
async function closure(root) {
  const sources = await readJson(join(root, 'sources/index.json')); const cases = await readJson(join(root, 'scenarios.json'));
  for (const scenario of cases) {
    for (const key of [scenario.originalSource, scenario.localRoot, ...scenario.references]) check(sources[key], `Missing real selected guidance body: ${key}`);
    for (const key of [scenario.localRoot, ...scenario.references]) {
      const body = await readFile(join(root, sources[key].path), 'utf8');
      for (const link of body.matchAll(/\]\((?!https?:|#)([^)]+)\)/g)) {
        const target = resolve(dirname(join(repository, sources[key].canonicalPath)), link[1]);
        check(Object.values(sources).some(source => source.canonicalPath && join(repository, source.canonicalPath) === target), `Unmapped relative guidance reference: ${link[1]}`);
      }
    }
  }
  return { sources, cases };
}
export async function freeze({ root = fixtureRoot, executable = 'codex', parentReady = false } = {}) {
  check(parentReady === true, 'Parent readiness declaration required before freezing revised guidance.');
  const files = await manifest(root); check(!files['plan.json'], 'Frozen experiment is immutable; use a separately reviewed new experiment.');
  check(same(await manifest(join(root, 'assets')), await manifest(join(previousRoot, 'assets'))), 'Original input assets changed.');
  const priorSources = await readJson(join(previousRoot, 'sources/index.json'));
  const currentSources = await readJson(join(root, 'sources/index.json'));
  for (const [key, source] of Object.entries(priorSources)) if (!source.canonicalPath) check(currentSources[key]?.sha256 === source.sha256 && sha(await readFile(join(root, source.path))) === source.sha256, 'Original contributor source changed.');
  const v2Sources = await readJson(join(repository, 'tests/fixtures/frontend-adoption-v2/sources/index.json'));
  for (const [key, source] of Object.entries(currentSources)) check(source.sha256 === v2Sources[key]?.sha256, 'Native comparison must retain the previous candidate/contributor bytes: ' + key);
  const { cases } = await closure(root); const schedule = await readJson(join(root, 'schedule.json')); validateSchedule(cases, schedule);
  for (const file of unchangedFiles) check(sha(await readFile(join(root, file))) === sha(await readFile(join(previousRoot, file))), `Original matched input changed: ${file}`);
  const revision = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repository, encoding: 'utf8' }); check(revision.status === 0, 'Cannot record source revision.');
  await verifyHttpPlan();
  const plan = { schemaVersion: 3, dependencies: await bindFiles(captureDependencies), predecessors: await bindFiles(predecessorBindings), sourceRevision: revision.stdout.trim(), sourceIdentity: 'Per-file frozen hashes bind exact working bytes; sourceRevision is observed repository HEAD, not an assertion that every file is committed.', frozenAt: new Date().toISOString(), experiment: 'frontend-native-events-v3', runnerSHA256: sha(await readFile(runnerPath)), helperSHA256: sha(await readFile(helperPath)), host: host(executable),
    fileHashes: Object.fromEntries(Object.entries(files).map(([file, info]) => [file, info.sha256])), previous: { root: previousRoot, archive: await manifest(join(previousRoot, 'closed-comparison')), originalPlanSHA256: sha(await readFile(join(previousRoot, 'plan.json'))), samplingPlanSHA256: sha(await readFile(join(previousRoot, 'amended-sampling-plan.json'))) },
    comparison: { trials: 66, repetitions: 3, schedule: 'schedule.json', concurrency: 2, pairing: 'Adjacent schedule entries are one scenario/repetition pair; both settle before the next pair. Schedule order is preserved; actual process start times are retained.', retry: 'No retries or replacements; every attempted result is retained.', reviewer: 'Independent reviewer; no author self-grading.', interpretation: 'Fresh matched native-event comparison after exec omitted required image/tool events; no pooled results, causal attribution, latency or source-word-count efficiency claim.' },
    nativeProtocol: { kind: 'app-server stdio', settings: 'Inherit configured model, reasoning, workspace-write and on-request policy; validate effective values before the turn; no overrides.', priorDifference: 'The old exec client silently selected Never approvals. Native app-server uses the configured on-request policy. Both new variants share that policy; prior captures are not comparable or pooled.', approvalHandling: 'Inherit and bind the existing native approvals reviewer, including host auto_review. Record any client requests as unresolved failures; the adapter never grants them, retries or escalates. Existing host reviewer behavior is not overridden.', evidence: 'Retain complete raw native protocol and normalized item events, including image views, image generation, dynamic tools and unknown items; incomplete protocol fails capture.' },
    browserProtocol: { observer: 'tests/fixtures/frontend-adoption-v2-http/plan.json', transport: 'Uniform loopback HTTP for every implementation, with unchanged measurement block and network confinement; separate from prior file-URL captures.', reference: 'Observe original reference once with the same frozen observer; supplied PNG remains the visual authority.' },
    transport: { bothVariants: 'one verbatim guidance file, path and exact read command in user text', selectedPrivateBodies: 'Same scenario-relevant bodies as the original protocol, with current parent-revised candidate bytes.', references: 'Verbatim relative links are non-executable historical labels resolved only to embedded sections; no installed/public skill reads or filesystem traversal.', promptOnly: 'F10 permits only exact guidance cat reads. No product reads/execution/edits, image calls, or other tools. Same exception for both variants.', enforcement: 'Raw-event watcher and final state checks detect after-dispatch violations; they are not a new sandbox.' },
    blinding: 'Reviewer copies redact only attributable guidance tool-output bodies. Original raw bytes stay separate. Commands/responses/artifacts remain unchanged; incidental root names may reveal identity.' };
  await json(join(root, 'plan.json'), plan); await verify(root); return plan;
}
export async function verify(root = fixtureRoot) {
  const bytes = await readFile(join(root, 'plan.json')); const plan = JSON.parse(bytes);
  check(plan.schemaVersion === 3 && sha(await readFile(runnerPath)) === plan.runnerSHA256 && sha(await readFile(helperPath)) === plan.helperSHA256, 'Frozen runner/helper changed.');
  check(same(await bindFiles(captureDependencies), plan.dependencies), 'Frozen capture/observer dependency changed.');
  check(same(await bindFiles(predecessorBindings), plan.predecessors), 'Prior experiment binding changed.');
  await verifyHttpPlan();
  const currentFiles = await manifest(root); delete currentFiles['plan.json'];
  check(same(Object.keys(currentFiles), Object.keys(plan.fileHashes)), 'Frozen input files added or removed.');
  for (const [file, expected] of Object.entries(plan.fileHashes)) check(sha(await readFile(join(root, file))) === expected, `Frozen input changed: ${file}`);
  check(same(await manifest(join(previousRoot, 'closed-comparison')), plan.previous.archive), 'Prior raw comparison archive changed.');
  check(sha(await readFile(join(previousRoot, 'plan.json'))) === plan.previous.originalPlanSHA256 && sha(await readFile(join(previousRoot, 'amended-sampling-plan.json'))) === plan.previous.samplingPlanSHA256, 'Prior experiment plan changed.');
  const { sources, cases } = await closure(root);
  for (const source of Object.values(sources)) {
    check(sha(await readFile(join(root, source.path))) === source.sha256, 'Frozen guidance body changed.');
    if (source.canonicalPath) check(sha(await readFile(join(repository, source.canonicalPath))) === source.sha256, 'Parent candidate changed after freeze.');
  }
  const schedule = await readJson(join(root, 'schedule.json')); validateSchedule(cases, schedule);
  return { plan, planSHA256: sha(bytes), sources, cases, schedule, common: await readJson(join(root, 'common-scope.json')) };
}

export async function materializeGuidance({ root, sources, scenario, variant, cwd }) {
  check(['v31', 'v84'].includes(variant), 'Unknown comparison variant.');
  const keys = variant === 'v31' ? [scenario.originalSource] : [scenario.localRoot, ...scenario.references];
  const instructions = [];
  for (const key of keys) { const source = sources[key]; check(source, `Missing guidance: ${key}`); const body = await readFile(join(root, source.path), 'utf8'); check(sha(body) === source.sha256, 'Guidance changed.'); instructions.push({ key, body, sha256: source.sha256 }); }
  const referenceMap = Object.fromEntries(Object.entries(sources).filter(([, source]) => source.canonicalPath?.startsWith('skills/frontend/internal/')).map(([key, source]) => [source.canonicalPath, keys.includes(key) ? `Embedded section ${keys.indexOf(key) + 1}` : 'Not applicable to the selected scenario; do not load or search for it.']));
  const body = ['# Bound task guidance', 'The following source bodies are supplied verbatim as guidance, not invocations. Relative links are historical labels, NOT paths to open from this copied file. Resolve applicable private references only to the embedded sections below. Do not traverse parent directories, search installed skills, or read other public skill bodies. All scenario-required private guidance is included. The user task and explicit authority remain controlling.', JSON.stringify(referenceMap, null, 2), ...instructions.flatMap((item, index) => [`\n## Embedded section ${index + 1}\n`, item.body])].join('\n\n');
  const guidancePath = join(cwd, 'trial-guidance.md'); await writeFile(guidancePath, body, { flag: 'wx', mode: 0o444 });
  return { guidancePath, body, sha256: sha(body), instructions: instructions.map(({ body, ...binding }) => binding), referenceMap, readCommand: `cat -- ${quote(guidancePath)}` };
}
export function buildPrompt({ scenario, common, cwd, guidance, browserPaths = null }) {
  return [
    'Perform one bounded frontend task using the guidance file identified below. This is not an invocation of any public skill. The user task and scope take precedence. Do not create goals, publish, install packages, download assets, inspect secrets or contact external services except an existing image-generation tool explicitly authorized by this scenario and within its image-call budget. Product edits stay in the task workspace. Authorized image generation may return its primary files at tool-managed paths; no other outside-workspace edits/uploads are allowed. Never fabricate calls, images, renders, or verification.',
    `Task workspace: ${cwd}. Product edits: ${scenario.authority.writeProductFiles}. Image generation: ${scenario.authority.generateImages}. Image-call maximum: ${scenario.budget.maximumImageCalls}; required actual images: ${scenario.budget.requiredImages}. ${scenario.budget.refinementPolicy}`,
    `First read the exact guidance file ${guidance.guidancePath} using this single command: ${guidance.readCommand}. It contains every selected instruction body and required private reference. Leave it unchanged. Its relative links are labels for embedded sections, not permission to read other files or installed skills.`,
    scenario.mode === 'prompt-only' ? `This is a prompt-only response task. The sole tool exception is reading ${guidance.guidancePath} with the exact command above. Do not inspect product files, execute product code, edit files, generate images, or use any other tools. After reading guidance, return the requested prompt directly.` : 'Read product files as needed within the stated task authority. Do not start persistent servers or leave background processes. Return actual image-generation outputs and their actual paths when authorized; SVG/HTML/screenshot substitutes do not count as generated images.',
    browserPaths ? `Optional existing browser capability: ${JSON.stringify(browserPaths)}. Do not install or make external requests. The harness also collects independent browser observations.` : 'No harness browser is configured; report any missing browser evidence honestly.',
    'Common facts are authoritative context, not an instruction to include every fact. The requested output controls their applicability.', '<all_common_scope_facts>', JSON.stringify(common, null, 2), '</all_common_scope_facts>',
    '<scenario_authority_and_required_outcomes>', JSON.stringify(scenario, null, 2), '</scenario_authority_and_required_outcomes>', '<user_request>', scenario.input, '</user_request>'
  ].join('\n\n');
}
function shellWords(text) {
  const result = []; let word = '', quoting = null, active = false;
  for (let i = 0; i < text.length; i++) { const c = text[i]; if (c === '\\' && quoting !== "'") { if (++i >= text.length) return null; word += text[i]; active = true; }
    else if (quoting) { if (c === quoting) quoting = null; else word += c; }
    else if (c === "'" || c === '"') { quoting = c; active = true; }
    else if (/\s/.test(c)) { if (active) { result.push(word); word = ''; active = false; } }
    else { word += c; active = true; } }
  if (quoting) return null; if (active) result.push(word); return result;
}
export function isGuidanceRead(item, guidancePath) {
  if (item?.type !== 'command_execution' || typeof item.command !== 'string') return false;
  let words = shellWords(item.command); if (!words) return false;
  if (words.length === 3 && /(?:^|\/)(?:ba|z|da)?sh$/.test(words[0]) && ['-c', '-lc'].includes(words[1])) words = shellWords(words[2]);
  return same(words, ['cat', '--', guidancePath]);
}
const toolEvent = item => item?.type && !['agent_message', 'userMessage', 'reasoning', 'plan', 'contextCompaction', 'enteredReviewMode', 'exitedReviewMode'].includes(item.type);
export function inspectGuidanceEvents(events, guidance, { promptOnly }) {
  const violations = [], completed = new Set();
  for (const event of events) if (toolEvent(event.item)) {
    if (isGuidanceRead(event.item, guidance.guidancePath)) { if (event.type === 'item.completed' && event.item.exit_code === 0 && event.item.aggregated_output === guidance.body) completed.add(event.item.id); }
    else if (promptOnly) violations.push({ id: event.item.id ?? null, type: event.item.type, reason: 'Tool other than exact bound guidance read in prompt-only task.' });
  }
  return { guidanceReadObserved: completed.size > 0, completedReads: completed.size, violations };
}
async function eventsAt(directory) { const text = await readFile(join(directory, 'events.jsonl'), 'utf8').catch(e => e.code === 'ENOENT' ? '' : Promise.reject(e)); const events = []; for (const line of text.split('\n')) if (line.trim()) { try { events.push(JSON.parse(line)); } catch {} } return events; }
export async function capture({ prompt, cwd, directory, scenario, executable, guidance, referenceImage = null, expectedControls }) {
  let violation = null, killTimer = null;
  const reader = scopedProcessReader({ bootId: readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim() });
  const stop = async () => { let record; try { record = await readJson(join(directory, 'process.json')); } catch { return; } const actual = await reader.row(record.pid); if (actual?.identity !== record.identity) return;
    try { process.kill(-record.pid, 'SIGTERM'); } catch (e) { if (e.code !== 'ESRCH') throw e; }
    killTimer ??= setTimeout(async () => { const current = await reader.row(record.pid).catch(() => null); if (current?.identity === record.identity) { try { process.kill(-record.pid, 'SIGKILL'); } catch {} } }, 1000); };
  activeStops.add(stop);
  const watcher = createBoundedSampler({ intervalMs: 100, scan: async () => { const inspection = inspectGuidanceEvents(await eventsAt(directory), guidance, { promptOnly: scenario.mode === 'prompt-only' }); if (inspection.violations.length || interrupted) { violation ??= inspection.violations[0]?.reason ?? 'Parent interruption'; await stop(); } }, onError: () => { violation = 'Guidance event observation failed'; void stop().catch(() => { violation = 'Guidance observation and stop failed'; }); } });
  let telemetry;
  try { telemetry = await execute({ prompt, cwd, directory, executable, referenceImage, expectedControls, scenario: { ...scenario, mode: scenario.mode === 'prompt-only' ? 'guidance-read-only' : scenario.mode } }); }
  finally { await watcher.finish(); clearTimeout(killTimer); activeStops.delete(stop); }
  const inspection = inspectGuidanceEvents(await eventsAt(directory), guidance, { promptOnly: scenario.mode === 'prompt-only' });
  const current = await readFile(guidance.guidancePath).catch(() => Buffer.alloc(0));
  const guard = { ...inspection, violation, observerErrors: watcher.stats.errors, guidanceUnchanged: sha(current) === guidance.sha256, boundary: 'Detection after observed dispatch, not prevention.', originalMode: scenario.mode };
  await json(join(directory, 'guidance-guard.json'), guard); return { telemetry, guard };
}
export function redactEvents(events, guidance) {
  const redactions = []; const sanitized = structuredClone(events);
  const guidanceIds = new Set(events.filter(event => isGuidanceRead(event?.item, guidance.guidancePath)).map(event => event.item.id));
  const scrub = (value, path, eventLine) => {
    if (typeof value === 'string' && value.includes(guidance.body)) {
      const replacement = value.replaceAll(guidance.body, '[Bound guidance body withheld; other tool output retained.]');
      redactions.push({ eventLine, field: path, originalSHA256: sha(value), redactedSHA256: sha(replacement), guidanceSHA256: guidance.sha256, sourceSHA256s: guidance.instructions.map(item => item.sha256) });
      return replacement;
    }
    if (Array.isArray(value)) return value.map((child, index) => scrub(child, `${path}[${index}]`, eventLine));
    if (value && typeof value === 'object') for (const key of Object.keys(value)) value[key] = scrub(value[key], `${path}.${key}`, eventLine);
    return value;
  };
  // Native items also contain original camelCase fields and native payloads; scrub exact
  // supplied bodies in attributed command/delta fields. Partial output chunks remain an explicit
  // blinding limitation. Original native and normalized streams are retained untouched.
  sanitized.forEach((event, index) => {
    const command = event?.item?.type === 'command_execution' && guidanceIds.has(event.item.id);
    const delta = event?.type === 'command.output_delta' && guidanceIds.has(event.item_id);
    if (command || delta) sanitized[index] = scrub(event, 'event', index + 1);
  });
  return { sanitized, redactions };
}
export async function collectToolImages({ events, exportRoot }) {
  const candidates = new Map(), unresolved = [], retained = [];
  const visit = (value, eventLine) => {
    if (typeof value === 'string') {
      // Only actual named image-tool output fields are scanned, never prompts or agent claims.
      for (const match of value.matchAll(/(?:^|[\s"'(])((?:\/[^\s"'<>)]*)\.(?:png|jpe?g|webp))(?=$|[\s"')>])/gi)) candidates.set(match[1], eventLine);
    } else if (Array.isArray(value)) value.forEach(item => visit(item, eventLine));
    else if (value && typeof value === 'object') Object.values(value).forEach(item => visit(item, eventLine));
  };
  events.forEach((event, index) => {
    const item = event?.item;
    if (event?.type !== 'item.completed' || !item || !/image.?gen/i.test(`${item.type} ${item.tool ?? ''} ${item.name ?? ''}`)) return;
    for (const value of [item.result, item.output, item.image_path, item.image_url, item.savedPath]) visit(value, index + 1);
  });
  check(candidates.size <= 64, 'Named image-tool output exceeds 64 local image paths.');
  for (const [source, eventLine] of candidates) {
    try {
      const stat = await lstat(source); check(stat.isFile() && !stat.isSymbolicLink() && stat.size <= 32 * 1024 * 1024 && await realpath(source) === source, 'Image must be a bounded regular file without symlink traversal.');
      const bytes = await readFile(source);
      const extension = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'png' : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? 'jpg' : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP' ? 'webp' : null;
      check(extension, 'Reported tool output is not a recognized actual raster image.');
      const target = `tool-images/${sha(bytes)}.${extension}`; await mkdir(join(exportRoot, 'tool-images'), { recursive: true });
      if (!retained.some(item => item.target === target)) await writeFile(join(exportRoot, target), bytes, { flag: 'wx' });
      retained.push({ eventLine, source, target, sha256: sha(bytes), bytes: bytes.length });
    } catch (error) { unresolved.push({ eventLine, source, reason: error.message }); }
  }
  return { retained, unresolved, policy: 'Only bounded local raster files actually named by completed image-tool outputs are retained. Unknown/remote/inline formats need independent review; absence never proves no generated images. This does not establish quality or provenance beyond the raw tool result.' };
}
export async function reviewerBundle({ root, directory, exportRoot, scenario, common, before, after, reviewId, telemetry, guard, browserStatus, guidance }) {
  await mkdir(exportRoot, { recursive: true });
  for (const [source, target] of [['before', 'input-project'], ['after', 'actual-artifacts']]) await cp(join(directory, source), join(exportRoot, target), { recursive: true, filter: file => !file.endsWith('/trial-guidance.md') });
  await cp(join(directory, 'response.md'), join(exportRoot, 'response.md'));
  if (browserStatus === 'observed') {
    await cp(join(directory, 'browser'), join(exportRoot, 'browser'), { recursive: true });
    await cp(join(directory, 'http-observation/transport-evidence.json'), join(exportRoot, 'browser/transport-evidence.json'));
  }
  const raw = await readFile(join(directory, 'events.jsonl'));
  // Preserve every physical line, including malformed captures, at its original position.
  const lines = raw.toString('utf8').split('\n');
  const parsed = lines.map(line => { try { return JSON.parse(line); } catch { return null; } });
  const { sanitized, redactions } = redactEvents(parsed, guidance);
  await writeFile(join(exportRoot, 'events.jsonl'), sanitized.map((event, index) => redactions.some(item => item.eventLine === index + 1) ? JSON.stringify(event) : lines[index]).join('\n'), { flag: 'wx' });
  await json(join(exportRoot, 'redactions.json'), { rawEventsSHA256: sha(raw), redactions, policy: 'Only attributable guidance tool-output bodies are redacted; commands, responses, product outputs and actual image bytes stay unchanged. Partial or incidental identity leakage remains possible.' });
  const { originalSource, localRoot, references, ...task } = scenario;
  const product = value => Object.fromEntries(Object.entries(value).filter(([file]) => file !== 'trial-guidance.md'));
  await json(join(exportRoot, 'context.json'), { reviewId, task, commonScope: common, inputManifest: product(before), actualArtifactManifest: product(after), browserStatus, guidanceGuard: guard,
    execution: { exitCode: telemetry.exitCode, timedOut: telemetry.timedOut, stopReason: telemetry.stopReason, completedTurn: telemetry.completedTurn, processObservation: telemetry.processObservation, nativeStreamComplete: telemetry.nativeStreamComplete, effectiveControls: telemetry.effectiveControls, protocolErrors: telemetry.protocolErrors, serverRequests: telemetry.serverRequests, unclassifiedToolItems: telemetry.unclassifiedToolItems, imageCallClassification: telemetry.imageCallClassification, observedNamedImageCalls: telemetry.observedNamedImageCalls, usage: telemetry.usage, observedOwnedResidualProcesses: telemetry.observedOwnedResidualProcesses }, rubric: await readJson(join(root, 'rubric.json')), reviewStatus: 'Pending independent human/model review. Open actual images; source text, claims, and counts do not establish visual quality.' });
  const imageEvidence = await collectToolImages({ events: parsed, exportRoot });
  await json(join(exportRoot, 'tool-images.json'), imageEvidence);
  const pictures = Object.keys(await manifest(exportRoot)).filter(file => /\.(?:png|jpe?g|webp)$/i.test(file));
  await writeFile(join(exportRoot, 'IMAGES.md'), ['# Actual retained images', '', 'Open these actual files when reviewing. Missing generated tool outputs remain unverified; never grade an image prompt or substitute markup as an image.', '', ...pictures.map(file => `![${file}](${join(exportRoot, file)})`)].join('\n\n') + '\n', { flag: 'wx' });
  return { reviewId, exportRoot, redactions: redactions.length, actualImages: pictures.length };
}
export async function captureTrial({ root, snapshot, row, directory, exportRoot, executable, browserPaths }) {
  const scenario = snapshot.cases.find(item => item.id === row.scenarioId); const cwd = await mkdtemp(join(tmpdir(), 'qs-frontend-v3-task-'));
  await cp(join(root, 'assets', scenario.projectFixture), cwd, { recursive: true });
  if (scenario.referenceImage) await cp(join(root, scenario.referenceImage), join(cwd, 'reference.png'));
  const guidance = await materializeGuidance({ root, sources: snapshot.sources, scenario, variant: row.variant, cwd });
  const prompt = buildPrompt({ scenario, common: snapshot.common, cwd, guidance, browserPaths });
  await cp(cwd, join(directory, 'before'), { recursive: true }); const before = await manifest(cwd);
  await json(join(directory, 'binding.json'), { row, cwd, planSHA256: snapshot.planSHA256, guidance: { path: guidance.guidancePath, sha256: guidance.sha256, instructions: guidance.instructions }, configuredHost: snapshot.plan.host });
  const { telemetry, guard } = await capture({ prompt, cwd, directory, scenario, executable, guidance, expectedControls: snapshot.plan.host.configured, referenceImage: scenario.referenceImage ? join(cwd, 'reference.png') : null });
  const after = await manifest(cwd); await cp(cwd, join(directory, 'after'), { recursive: true });
  let browserStatus = 'not-applicable', browserError = null;
  if (scenario.mode === 'implementation') {
    try {
      await verifyHttpPlan();
      await observeHttp({ project: cwd, output: join(directory, 'http-observation') });
      await cp(join(directory, 'http-observation/browser'), join(directory, 'browser'), { recursive: true });
      browserStatus = 'observed';
    } catch (e) { browserStatus = 'failed'; browserError = e.message; }
  }
  const mutation = !same(before, after); const failure = !telemetry.nativeStreamComplete || telemetry.protocolErrors?.length || telemetry.serverRequests?.length || telemetry.exitCode !== 0 || !telemetry.completedTurn || !telemetry.responsePresent || telemetry.timedOut || telemetry.stopReason || telemetry.malformedLines || telemetry.observedOwnedResidualProcesses.length || !telemetry.processObservation.complete || guard.violation || guard.violations.length || !guard.guidanceReadObserved || !guard.guidanceUnchanged || guard.observerErrors.length || !scenario.authority.writeProductFiles && mutation;
  const reviewId = 'review-' + sha(snapshot.planSHA256 + row.trialId).slice(0, 16);
  const review = await reviewerBundle({ root, directory, exportRoot: join(exportRoot, reviewId), scenario, common: snapshot.common, before, after, reviewId, telemetry, guard, browserStatus, guidance });
  const result = { row, reviewId, cwd, failed: Boolean(failure), browserStatus, browserError, productOrGuidanceChanged: mutation, review, independentReview: 'pending', imageRequirement: scenario.budget.requiredImages ? 'Locate actual primary image tool outputs in raw evidence; missing/unverified outputs fail the required image evidence.' : 'No generated images required.' };
  await json(join(directory, 'summary.json'), result); return result;
}
export async function interruptCaptures() {
  interrupted = true;
  return Promise.allSettled([...activeStops].map(stop => stop()));
}
export async function runPairs({ schedule, start, shouldStop = () => interrupted }) {
  const settled = [];
  for (let index = 0; index < schedule.length; index += 2) {
    if (shouldStop()) break;
    const pair = schedule.slice(index, index + 2);
    check(pair.length === 2 && pair[0].scenarioId === pair[1].scenarioId && pair[0].repetition === pair[1].repetition && pair[0].variant !== pair[1].variant, 'Adjacent matched schedule pair required.');
    // allSettled always awaits both active captures, including infrastructure failures.
    const results = await Promise.allSettled(pair.map(start));
    settled.push(...results.map((result, offset) => ({ row: pair[offset], ...result })));
    if (results.some(result => result.status === 'rejected')) break;
  }
  return settled;
}
export async function run({ root = fixtureRoot, output, executable = 'codex', browserPaths = null, parentApproved = false } = {}) {
  check(parentApproved === true, 'Parent must separately authorize the full revised comparison.'); check(process.platform === 'linux', 'Capture supervisor is Linux-only.');
  const snapshot = await verify(root); check(same(host(executable), snapshot.plan.host), 'Host differs from frozen settings.');
  check(typeof output === 'string' && resolve(output).startsWith('/tmp/'), 'Fresh exact /tmp output required.'); output = resolve(output); await mkdir(output);
  await json(join(output, 'supervisor-lock.json'), { pid: process.pid, planSHA256: snapshot.planSHA256, startedAt: new Date().toISOString(), noTakeover: true });
  await json(join(output, 'attempt-schedule.json'), snapshot.schedule);
  await observeHttp({ project: join(root, 'assets'), output: join(output, 'reference-http'), reference: true });
  const results = [], failures = []; let settled = [];
  try {
    settled = await runPairs({ schedule: snapshot.schedule, start: async row => {
      await verify(root); const directory = join(output, row.trialId); await mkdir(directory);
      console.log(JSON.stringify({ state: 'started', trialId: row.trialId, directory }));
      const result = await captureTrial({ root, snapshot, row, directory, exportRoot: join(output, 'reviewer-bundles'), executable, browserPaths });
      console.log(JSON.stringify({ state: 'recorded', trialId: row.trialId, failed: result.failed, reviewId: result.reviewId })); return result;
    } });
  } catch (error) { failures.push({ trialId: null, message: error.message, stack: error.stack }); }
  for (const result of settled) if (result.status === 'fulfilled') results.push(result.value); else failures.push({ trialId: result.row.trialId, message: result.reason.message, stack: result.reason.stack });
  if (failures.length) await json(join(output, 'infrastructure-failures.json'), failures);
  await json(join(output, 'reviewer-map.json'), results.map(result => ({ trialId: result.row.trialId, reviewId: result.reviewId })));
  const summary = { requested: 66, recorded: results.length, interrupted, failures, results: results.map(result => ({ trialId: result.row.trialId, failed: result.failed, reviewId: result.reviewId })), adoption: 'Not graded. Native-event comparison is separate from all prior nonqualifying experiments.' };
  await json(join(output, 'run-summary.json'), summary); return summary;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { void interruptCaptures().then(results => { for (const result of results) if (result.status === 'rejected') console.error('Owned process interruption failed:', result.reason.message); }); });
  const [command, output, declaration] = process.argv.slice(2); const executable = process.env.FRONTEND_CODEX ?? 'codex';
  try { const result = command === 'prepare' ? await prepare() : command === 'freeze' ? await freeze({ executable, parentReady: declaration === '--parent-ready' || output === '--parent-ready' }) : command === 'verify' ? (await verify()).plan : command === 'compare' ? await run({ output, executable, parentApproved: declaration === '--parent-approved', browserPaths: process.env.FRONTEND_BROWSER && process.env.FRONTEND_PUPPETEER ? { browserPath: process.env.FRONTEND_BROWSER, puppeteerPath: process.env.FRONTEND_PUPPETEER } : null }) : (() => { throw new Error('Choose prepare, freeze, verify, compare.'); })(); console.log(JSON.stringify(result, null, 2)); if (result.failures?.length || result.interrupted || result.results?.some(item => item.failed) || result.recorded !== undefined && result.recorded !== 66) process.exitCode = 1; } catch (e) { console.error(e.stack); process.exitCode = 1; }
}
