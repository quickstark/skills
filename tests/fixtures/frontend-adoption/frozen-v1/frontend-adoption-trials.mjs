import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdir, mkdtemp, readdir, lstat, cp } from 'node:fs/promises';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const fixtureRoot = join(repository, 'tests/fixtures/frontend-adoption');
const runnerPath = fileURLToPath(import.meta.url);
export const sha = data => createHash('sha256').update(data).digest('hex');
const readJson = async path => JSON.parse(await readFile(path, 'utf8'));
const json = async (path, value) => writeFile(path, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
let interrupted = false;
const activeStops = new Set();

export async function manifest(root) {
  const result = {};
  async function visit(directory) {
    for (const name of (await readdir(directory)).sort()) {
      const path = join(directory, name), stat = await lstat(path), key = relative(root, path);
      if (stat.isSymbolicLink()) throw new Error(`Symlink outside evidence contract: ${path}`);
      if (stat.isDirectory()) await visit(path);
      else if (stat.isFile()) result[key] = { sha256: sha(await readFile(path)), bytes: stat.size };
      else throw new Error(`Unsupported artifact: ${path}`);
    }
  }
  await visit(root); return result;
}

export function validateSchedule(cases, schedule) {
  if (cases.length !== 11 || new Set(cases.map(c => c.id)).size !== 11 || schedule.length !== 66 || new Set(schedule.map(r => r.trialId)).size !== 66) throw new Error('Expected eleven unique cases and 66 unique matched trials.');
  for (const c of cases) for (let r = 1; r <= 3; r++) {
    const pair = schedule.filter(t => t.scenarioId === c.id && t.repetition === r);
    if (pair.length !== 2 || pair.map(t => t.variant).sort().join() !== 'v31,v84') throw new Error(`Unmatched scenario ${c.id}/${r}`);
  }
}

function host(executable) {
  const version = spawnSync(executable, ['--version'], { encoding: 'utf8' });
  if (version.status !== 0) throw new Error('Configured Codex executable unavailable.');
  const safe = spawnSync('python3', ['-c', 'import os,json,tomllib,pathlib; p=pathlib.Path(os.environ.get("CODEX_HOME",str(pathlib.Path.home()/".codex")))/"config.toml"; d=tomllib.loads(p.read_text()) if p.exists() else {}; print(json.dumps({k:d.get(k) for k in ["model","model_reasoning_effort","sandbox_mode","approval_policy"]}))'], { encoding: 'utf8' });
  if (safe.status !== 0) throw new Error('Unable to read selected non-secret host configuration fields.');
  return { cliVersion: version.stdout.trim(), configured: JSON.parse(safe.stdout), platform: process.platform, node: process.version,
    overrides: [], observedModelPolicy: 'Use emitted runtime model if present; otherwise unverified. Configured defaults do not prove actual runtime model.' };
}

export async function verify(root = fixtureRoot) {
  const plan = await readJson(join(root, 'plan.json'));
  if (sha(await readFile(runnerPath)) !== plan.runnerSHA256) throw new Error('Frozen runner changed.');
  for (const [path, hash] of Object.entries(plan.fileHashes)) if (sha(await readFile(join(root, path))) !== hash) throw new Error(`Frozen input changed: ${path}`);
  const sources = await readJson(join(root, 'sources/index.json'));
  for (const source of Object.values(sources)) {
    if (sha(await readFile(join(root, source.path))) !== source.sha256) throw new Error(`Source snapshot changed: ${source.path}`);
    if (source.canonicalPath && sha(await readFile(join(repository, source.canonicalPath))) !== source.sha256) throw new Error(`Candidate drift since freeze: ${source.canonicalPath}`);
  }
  const cases = await readJson(join(root, 'scenarios.json')), schedule = await readJson(join(root, 'schedule.json'));
  validateSchedule(cases, schedule);
  return { plan, cases, schedule, sources, common: await readJson(join(root, 'common-scope.json')) };
}

export async function freeze({ root = fixtureRoot, executable = 'codex' } = {}) {
  const files = await manifest(root);
  if (files['plan.json']) throw new Error('Plan already frozen; do not silently replace evidence.');
  const cases = await readJson(join(root, 'scenarios.json')), schedule = await readJson(join(root, 'schedule.json'));
  validateSchedule(cases, schedule);
  if (!files['assets/reference.png']) throw new Error('Actual supplied reference image required before freeze.');
  const plan = { schemaVersion: 1, frozenAt: new Date().toISOString(), runnerSHA256: sha(await readFile(runnerPath)),
    fileHashes: Object.fromEntries(Object.entries(files).map(([path, item]) => [path, item.sha256])), host: host(executable),
    comparison: { repetitions: 3, trials: 66, order: 'schedule.json', retryPolicy: 'Never retry attempted trials; interrupted/incomplete rows stay incomplete.', reviewer: 'Independent reviewer; no author-run self-grading.', metrics: 'Whole-turn runtime tokens include host overhead; skill-only bytes are measured separately. Unknown telemetry remains null.' },
    pilot: { scenarioId: 'F10', variant: 'v84', maximumRuns: 1, purpose: 'Infrastructure only; excluded from comparison and quality adoption.' },
    isolation: 'Fresh temporary CWD, unchanged host settings, scoped prompt and post-observation event supervisor. Not a pre-execution security boundary. No detached handoff; parent launches and supervises full comparison.',
    capabilityLimits: ['Image tool availability and actual image file paths must be observed per trial; prompt responses cannot substitute for image output.', 'Browser observation requires explicit existing executable/module paths. Missing paths leave required rendered evidence unverified.', 'All selected private references are preloaded equally by scenario for candidate; no demand-loading or reference-efficiency claim.', 'Model identity and image-call classification are unverified when not exposed by events.', 'Independent rubric judgments are required; technical observations never self-certify visual quality.'] };
  await json(join(root, 'plan.json'), plan); await verify(root); return plan;
}

export async function buildPrompt({ root, sources, common, scenario, variant, cwd, browserPaths }) {
  const keys = variant === 'v31' ? [scenario.originalSource] : [scenario.localRoot, ...scenario.references];
  const instructions = [];
  for (const key of keys) {
    const source = sources[key]; if (!source) throw new Error(`Missing selected instruction ${key}`);
    const body = await readFile(join(root, source.path), 'utf8'); instructions.push({ key, sha256: sha(body), bytes: Buffer.byteLength(body), body });
  }
  const facts = JSON.stringify(common, null, 2);
  const prompt = [
    'Perform the following single bounded frontend task using the supplied instruction text as task guidance. This is not a request to invoke any public skill. The user request and explicit scope below take precedence over generic skill defaults. Do not create goals, publish, install dependencies, download assets, contact external services, or inspect secrets. Do not modify files outside the task workspace. Missing capabilities must be reported honestly; never fabricate calls, generated images, renders, or verification.',
    `Task workspace: ${cwd}. Product file edits: ${scenario.authority.writeProductFiles}. Image generation: ${scenario.authority.generateImages}. Image-generation call maximum: ${scenario.budget.maximumImageCalls}; required actual images: ${scenario.budget.requiredImages}. ${scenario.budget.refinementPolicy}`,
    scenario.mode === 'prompt-only' ? 'This is a response-only task. Do not call any tools or write files. All required facts and instructions are supplied.' : 'Read the supplied project files as needed. Tools may operate only within the stated task authority. Local static implementation can use index.html, styles.css, and app.js. Do not start persistent servers or leave background processes. If image generation is authorized and an existing tool is available, return its actual outputs and actual local artifact paths; do not create substitute SVG/HTML/screenshots and call them generated images.',
    browserPaths ? `Optional existing browser capability for local inspection: ${JSON.stringify(browserPaths)}. Do not install dependencies or make external requests. The harness will also collect independent browser observations after the task.` : 'The harness has no configured browser capability for this run. Do not claim browser verification unless you actually use an available tool and retain its evidence.',
    '<instruction_text>', ...instructions.map(i => i.body), '</instruction_text>',
    'Common facts are authoritative context, not a requirement to include every fact in every output. The specific requested output and scope control which facts apply.',
    '<all_common_scope_facts>', facts, '</all_common_scope_facts>',
    '<scenario_authority_and_required_outcomes>', JSON.stringify(scenario, null, 2), '</scenario_authority_and_required_outcomes>',
    '<user_request>', scenario.input, '</user_request>'
  ].join('\n\n');
  return { prompt, instructions: instructions.map(({ body, ...rest }) => rest), commonScopeSHA256: sha(facts) };
}

function processIdentity(pid) {
  try { return readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim() + ':' + readFileSync(`/proc/${pid}/stat`, 'utf8').split(') ')[1].split(' ')[19]; } catch { return null; }
}

async function processTable() {
  const rows = [];
  for (const name of await readdir('/proc')) {
    if (!/^\d+$/.test(name)) continue;
    try {
      const fields = (await readFile(`/proc/${name}/stat`, 'utf8')).split(') ')[1].split(' ');
      rows.push({ pid: Number(name), parent: Number(fields[1]), group: Number(fields[2]), state: fields[0], identity: processIdentity(name) });
    } catch { /* Process exited between directory and stat reads. */ }
  }
  return rows;
}

export async function execute({ prompt, cwd, directory, scenario, executable, referenceImage }) {
  const args = ['exec', '--ephemeral', '--skip-git-repo-check', '--cd', cwd, '--json'];
  if (referenceImage) args.push('--image', referenceImage);
  args.push('-');
  const start = performance.now(), events = [], tools = new Map();
  let pending = '', malformedLines = 0, timedOut = false, stopReason = null, killTimer;
  for (const file of ['events.jsonl', 'stderr.txt']) writeFileSync(join(directory, file), '', { flag: 'wx' });
  await writeFile(join(directory, 'prompt.txt'), prompt, { flag: 'wx' });
  const child = spawn(executable, args, { cwd, stdio: ['pipe', 'pipe', 'pipe'], detached: true });
  const identity = processIdentity(child.pid);
  const ownedProcesses = new Map();
  let sampling = Promise.resolve();
  const sample = () => {
    sampling = sampling.then(async () => {
      const rows = await processTable(), parents = new Set([child.pid]);
      let added = true;
      while (added) {
        added = false;
        for (const row of rows) if (row.pid !== child.pid && (row.group === child.pid || parents.has(row.parent)) && !parents.has(row.pid)) {
          parents.add(row.pid); added = true;
          if (row.identity) ownedProcesses.set(row.pid, row);
        }
      }
    });
  };
  sample();
  const sampleTimer = setInterval(sample, 100);
  const stop = () => {
    if (!identity || processIdentity(child.pid) !== identity) return;
    try { process.kill(-child.pid, 'SIGTERM'); } catch {}
    killTimer ??= setTimeout(() => { if (processIdentity(child.pid) === identity) { try { process.kill(-child.pid, 'SIGKILL'); } catch {} } }, 5000);
  };
  activeStops.add(stop);
  await json(join(directory, 'process.json'), { pid: child.pid ?? null, identity, args, cwd, startedAt: new Date().toISOString() });
  const inspect = line => {
    let event; try { event = JSON.parse(line); } catch { malformedLines++; return; }
    events.push(event);
    const item = event.item;
    if (!item?.type || ['agent_message', 'reasoning', 'plan'].includes(item.type)) return;
    tools.set(item.id ?? `unidentified-${events.length}`, item);
    if (scenario.mode === 'prompt-only') { stopReason = 'Tool event observed in response-only task'; stop(); }
    // Tool event inspection detects observed behavior, never claims to prevent a call already dispatched.
    const namedImage = [...tools.values()].filter(t => /image.?gen/i.test(`${t.type} ${t.tool ?? ''} ${t.name ?? ''}`));
    if (namedImage.length > scenario.budget.maximumImageCalls) { stopReason = 'Observed named image calls exceed budget'; stop(); }
  };
  child.stdout.on('data', data => { appendFileSync(join(directory, 'events.jsonl'), data); pending += data.toString(); let n; while ((n = pending.indexOf('\n')) >= 0) { inspect(pending.slice(0, n)); pending = pending.slice(n + 1); } });
  child.stderr.on('data', data => appendFileSync(join(directory, 'stderr.txt'), data));
  child.stdin.on('error', () => {}); child.stdin.end(prompt);
  const timer = setTimeout(() => { timedOut = true; stop(); }, scenario.budget.timeoutMs);
  const result = await new Promise(done => { child.once('error', e => done({ exitCode: null, spawnError: e.message })); child.once('close', (exitCode, signal) => done({ exitCode, signal })); });
  clearTimeout(timer); clearTimeout(killTimer); clearInterval(sampleTimer); sample(); await sampling;
  const cleanup = [];
  for (const row of ownedProcesses.values()) {
    if (processIdentity(row.pid) !== row.identity) continue;
    try { process.kill(row.pid, 'SIGTERM'); cleanup.push({ pid: row.pid, identity: row.identity, action: 'SIGTERM to observed owned descendant' }); } catch {}
  }
  if (cleanup.length) await new Promise(done => setTimeout(done, 300));
  for (const row of ownedProcesses.values()) if (processIdentity(row.pid) === row.identity) { try { process.kill(row.pid, 'SIGKILL'); } catch {} }
  const residual = (await processTable()).filter(row => row.state !== 'Z' && ownedProcesses.get(row.pid)?.identity === row.identity);
  activeStops.delete(stop);
  if (pending.trim()) inspect(pending);
  const response = events.filter(e => e.type === 'item.completed' && e.item?.type === 'agent_message').map(e => e.item.text).join('\n\n');
  await writeFile(join(directory, 'response.md'), response, { flag: 'wx' });
  const toolItems = [...tools.values()];
  const telemetry = { ...result, elapsedMs: performance.now() - start, timedOut, interrupted, stopReason, malformedLines,
    observedModel: events.find(e => e.model)?.model ?? null, usage: events.filter(e => e.type === 'turn.completed').map(e => e.usage ?? null),
    completedTurn: events.some(e => e.type === 'turn.completed'), responsePresent: Boolean(response.trim()), toolItems,
    processCleanup: cleanup, observedOwnedResidualProcesses: residual,
    toolCount: toolItems.length, observedNamedImageCalls: toolItems.filter(t => /image.?gen/i.test(`${t.type} ${t.tool ?? ''} ${t.name ?? ''}`)).length,
    imageCallClassification: toolItems.length ? 'Named matches are a lower bound; inspect raw events/commands for indirect or unidentified image calls.' : 'No tool items observed; contingent on complete event stream.',
    promptSHA256: sha(prompt), promptUtf8Bytes: Buffer.byteLength(prompt), args, runtimeFiles: { events: sha(await readFile(join(directory, 'events.jsonl'))), stderr: sha(await readFile(join(directory, 'stderr.txt'))) } };
  await json(join(directory, 'telemetry.json'), telemetry); return telemetry;
}

export async function reviewerBundle({ root, directory, scenario, common, before, after, trialId, telemetry, browserStatus }) {
  const review = join(directory, 'review'); await mkdir(review);
  await cp(join(directory, 'before'), join(review, 'input-project'), { recursive: true });
  await cp(join(directory, 'after'), join(review, 'actual-artifacts'), { recursive: true });
  for (const file of ['response.md', 'events.jsonl']) await cp(join(directory, file), join(review, file));
  if (browserStatus === 'observed') await cp(join(directory, 'browser'), join(review, 'browser'), { recursive: true });
  // All common facts and baseline source files go to reviewers; variant mapping and instruction bodies do not.
  const { originalSource, localRoot, references, ...task } = scenario;
  const payload = { trialId, task, commonScope: common, inputManifest: before, actualArtifactManifest: after,
    rawToolItems: telemetry.toolItems, execution: { exitCode: telemetry.exitCode, timedOut: telemetry.timedOut, stopReason: telemetry.stopReason, completedTurn: telemetry.completedTurn },
    browserStatus, rubric: await readJson(join(root, 'rubric.json')),
    reviewStatus: 'Pending independent reviewer. Do not infer image/render quality from prose or source matching. Source names may remain visible in raw responses; blinding is partial.' };
  await json(join(review, 'context.json'), payload); return review;
}

async function trial({ root, snapshot, run, directory, executable, browserPaths }) {
  const scenario = snapshot.cases.find(c => c.id === run.scenarioId);
  const cwd = await mkdtemp(join(tmpdir(), 'qs-frontend-trial-'));
  await cp(join(root, 'assets', scenario.projectFixture), cwd, { recursive: true });
  if (scenario.referenceImage) await cp(join(root, scenario.referenceImage), join(cwd, 'reference.png'));
  await cp(cwd, join(directory, 'before'), { recursive: true });
  const before = await manifest(cwd);
  const input = await buildPrompt({ root, sources: snapshot.sources, common: snapshot.common, scenario, variant: run.variant, cwd, browserPaths });
  await json(join(directory, 'binding.json'), { run, cwd, configuredHost: snapshot.plan.host, planSHA256: sha(await readFile(join(root, 'plan.json'))), instructions: input.instructions, loadedInstructionUtf8Bytes: input.instructions.reduce((n, i) => n + i.bytes, 0), commonScopeSHA256: input.commonScopeSHA256, referencePolicy: 'Scenario-relevant private references preloaded; no demand-loading efficiency claim.' });
  const telemetry = await execute({ ...input, cwd, directory, scenario, executable, referenceImage: scenario.referenceImage ? join(cwd, 'reference.png') : null });
  const after = await manifest(cwd); await cp(cwd, join(directory, 'after'), { recursive: true });
  let browserStatus = 'not-applicable', browserError = null;
  if (scenario.mode === 'implementation') {
    browserStatus = 'unavailable';
    if (browserPaths) {
      try { const { observe } = await import(pathToFileURL(join(root, 'browser-observe.mjs')).href); await observe({ project: cwd, output: join(directory, 'browser'), ...browserPaths }); browserStatus = 'observed'; }
      catch (e) { browserStatus = 'failed'; browserError = e.message; await writeFile(join(directory, 'browser-error.txt'), e.stack); }
    }
  }
  const failure = telemetry.exitCode !== 0 || !telemetry.completedTurn || !telemetry.responsePresent || telemetry.timedOut || telemetry.stopReason || telemetry.malformedLines || telemetry.observedOwnedResidualProcesses.length ? 'Runtime incomplete, disallowed event or owned process residual; see raw evidence.' : null;
  await reviewerBundle({ root, directory, scenario, common: snapshot.common, before, after, trialId: run.trialId, telemetry, browserStatus });
  const summary = { run, cwd, failure, before, after, filesChanged: JSON.stringify(before) !== JSON.stringify(after), browserStatus, browserError,
    requiredImageEvidence: scenario.budget.requiredImages ? 'Independent reviewer must locate actual image tool outputs/files and confirm count, platform and quality. Missing output is unverified, never pass.' : 'No generated images requested.',
    independentReview: 'pending', completeness: 'Execution evidence only; adoption requires all rubric and scenario checks.' };
  await json(join(directory, 'summary.json'), summary); return summary;
}

export async function run({ kind, root = fixtureRoot, output, executable = 'codex', browserPaths = null }) {
  if (process.platform !== 'linux') throw new Error('Supervisor validated only on Linux.');
  const snapshot = await verify(root);
  if (JSON.stringify(host(executable)) !== JSON.stringify(snapshot.plan.host)) throw new Error('Host settings/version changed since freeze.');
  if (!['pilot', 'compare'].includes(kind)) throw new Error('Choose pilot or compare.');
  if (!output || !resolve(output).startsWith('/tmp/')) throw new Error('Explicit isolated /tmp evidence output required.');
  output = resolve(output); await mkdir(output, { recursive: true });
  if (kind === 'pilot') await json(join(root, 'pilot-attempt.json'), { output, startedAt: new Date().toISOString(), scenarioId: snapshot.plan.pilot.scenarioId, variant: snapshot.plan.pilot.variant });
  // Exclusive persistent lock: interruption never causes automatic takeover or retry.
  await json(join(output, 'supervisor-lock.json'), { pid: process.pid, identity: processIdentity(process.pid), kind, startedAt: new Date().toISOString(), planSHA256: sha(await readFile(join(root, 'plan.json'))) });
  const selected = kind === 'pilot' ? [{ trialId: 'pilot-F10-v84', scenarioId: 'F10', repetition: null, variant: 'v84' }] : snapshot.schedule;
  const results = [];
  for (const selectedRun of selected) {
    if (interrupted) break;
    await verify(root);
    const directory = join(output, selectedRun.trialId); await mkdir(directory);
    console.log(JSON.stringify({ state: 'started', trialId: selectedRun.trialId, directory }));
    try {
      const result = await trial({ root, snapshot, run: selectedRun, directory, executable, browserPaths });
      results.push({ trialId: selectedRun.trialId, failure: result.failure, browserStatus: result.browserStatus });
      console.log(JSON.stringify({ state: 'recorded', ...results.at(-1) }));
      // Preserve failed trials and continue the frozen schedule; never retry or replace them.
    } catch (e) { await writeFile(join(directory, 'infrastructure-failure.txt'), e.stack); throw e; }
  }
  await json(join(output, 'run-summary.json'), { kind, requested: selected.length, recorded: results.length, interrupted, results, adoption: 'Not evaluated; independent review required. Pilot excluded from comparison.' });
  return { output, recorded: results.length, requested: selected.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { interrupted = true; for (const stop of activeStops) stop(); });
  const [command, output] = process.argv.slice(2);
  const executable = process.env.FRONTEND_CODEX ?? 'codex';
  const browserPaths = process.env.FRONTEND_BROWSER && process.env.FRONTEND_PUPPETEER ? { browserPath: process.env.FRONTEND_BROWSER, puppeteerPath: process.env.FRONTEND_PUPPETEER } : null;
  try {
    const result = command === 'freeze' ? await freeze({ executable }) : command === 'verify' ? (await verify()).plan : await run({ kind: command, output, executable, browserPaths });
    console.log(JSON.stringify(result, null, 2));
  } catch (e) { console.error(e.stack); process.exitCode = 1; }
}
