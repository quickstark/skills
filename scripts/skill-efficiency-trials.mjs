import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdir, mkdtemp, readdir, readlink, rm } from 'node:fs/promises';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixtureRoot = join(repository, 'tests/fixtures/upstream-adoption-efficiency');
const sha = (value) => createHash('sha256').update(value).digest('hex');
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const writeJson = async (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
let comparisonInterrupted = false;
const activeStops = new Set();
function processStart(pid) {
  try { return readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim() + ':' + readFileSync(`/proc/${pid}/stat`, 'utf8').split(') ')[1].split(' ')[19]; } catch { return null; }
}
function sameLiveProcess(record) { return record?.pid && record.start && processStart(record.pid) === record.start; }


export function buildResponsePrompt({ instruction, scenario, resources = {}, previousRequests = [] }) {
  return [
    'This is a closed, response-only fixture. Produce the response to the user request using only the supplied instructions and observations. Do not call real tools, run commands, create or update goals, write files, install packages, contact services or perform product actions. Supplied goal/process/repository facts describe the fixture, not this machine. Report proposed actions in the response without claiming to have executed them. Missing fixture observations stay missing.',
    'Return a JSON object with three keys: response (the exact user-facing Markdown), requestedActions (an array of immediate next operational actions for this fixture, excluding commands merely described inside a generated prompt; never actual tool calls), and requestedReferences (an array of needed relative private-reference names). If a required private reference is not supplied, request it and leave response empty; the controller may return its exact frozen content. Do not inspect the filesystem. A root result still obeys its specified format inside response; internal-helper results remain evidence for the parent.',
    '<skill_instructions>', instruction, '</skill_instructions>',
    '<shared_observations>', JSON.stringify(scenario.sharedContext ?? {}), '</shared_observations>',
    '<available_private_references>', JSON.stringify(scenario.referenceNames ?? []), '</available_private_references>',
    '<supplied_private_references>', JSON.stringify(resources), '</supplied_private_references>',
    '<prior_reference_requests>', JSON.stringify(previousRequests), '</prior_reference_requests>',
    '<user_request>', scenario.input, '</user_request>',
  ].join('\n\n');
}

export async function verifyFrozenTrialPlan(root = fixtureRoot) {
  const plan = await readJson(join(root, 'plan.json'));
  if (sha(await readFile(join(repository, 'scripts/skill-efficiency-trials.mjs'))) !== plan.runnerSHA256) throw new Error('Frozen trial runner changed.');
  const cases = await readJson(join(root, plan.scenariosFile));
  const names = cases.map(({ id }) => id);
  if (new Set(names).size !== names.length) throw new Error('Duplicate scenario identity.');
  const expectedHistorical = [...Array.from({ length: 6 }, (_, i) => `G${i + 1}`), ...Array.from({ length: 9 }, (_, i) => `E${i + 1}`), ...Array.from({ length: 10 }, (_, i) => `P${i + 1}`)];
  for (const id of expectedHistorical) if (!names.includes(id)) throw new Error(`Missing historical case ${id}.`);
  const historical = [];
  for (const source of plan.historicalSources) {
    const data = await readFile(join(repository, source.path));
    if (sha(data) !== source.sha256) throw new Error(`Historical source changed: ${source.path}.`);
    historical.push(...JSON.parse(data).scenarios);
  }
  for (const old of historical) {
    if (cases.find(({ id }) => id === old.id)?.input !== old.input) throw new Error(`Historical input changed: ${old.id}.`);
  }
  for (const [path, expected] of Object.entries(plan.fileHashes)) {
    if (sha(await readFile(join(root, path))) !== expected) throw new Error(`Frozen trial input changed: ${path}.`);
  }
  if (plan.comparison.repetitions !== 3 || plan.variants.length !== 2) throw new Error('Three matched repetitions and two variants are required.');
  const schedule = await readJson(join(root, plan.comparison.scheduleFile));
  const expectedRuns = cases.length * 3 * 2;
  if (schedule.length !== expectedRuns) throw new Error('Comparison schedule lacks complete matched coverage.');
  for (const scenario of cases) {
    for (let repetition = 1; repetition <= 3; repetition += 1) {
      const pair = schedule.filter((run) => run.scenarioId === scenario.id && run.repetition === repetition);
      if (pair.length !== 2 || new Set(pair.map(({ variant }) => variant)).size !== 2
        || pair.some(({ variant }) => !plan.variants.includes(variant))) throw new Error(`Unmatched schedule: ${scenario.id}/${repetition}.`);
    }
  }
  return { plan, cases, schedule };
}

async function runCliRound({ prompt, directory, round, timeoutMs, cwd, executable }) {
  const started = new Date();
  const startedMonotonic = performance.now();
  const args = ['exec', '--ephemeral', '--skip-git-repo-check', '--cd', cwd, '--json', '-'];
  const stdoutPath = join(directory, `round-${round}.events.jsonl`);
  const stderrPath = join(directory, `round-${round}.stderr.txt`);
  let stdout = '', stderr = '', pending = '', timedOut = false, toolEvent = null, killTimer;
  const events = [];
  writeFileSync(stdoutPath, '', { flag: 'wx' });
  writeFileSync(stderrPath, '', { flag: 'wx' });
  writeFileSync(join(directory, `round-${round}.prompt.txt`), prompt, { flag: 'wx' });
  const child = spawn(executable, args, { cwd, stdio: ['pipe', 'pipe', 'pipe'], detached: process.platform !== 'win32' });
  const childStart = processStart(child.pid);
  const stop = () => {
    if (child.exitCode !== null || child.signalCode !== null || !sameLiveProcess({ pid: child.pid, start: childStart })) return;
    try { process.kill(process.platform === 'win32' ? child.pid : -child.pid, 'SIGTERM'); } catch {}
    killTimer ??= setTimeout(() => { if (!sameLiveProcess({ pid: child.pid, start: childStart })) return; try { process.kill(process.platform === 'win32' ? child.pid : -child.pid, 'SIGKILL'); } catch {} }, 5000);
  };
  activeStops.add(stop);
  writeFileSync(join(directory, `round-${round}.process.json`), JSON.stringify({ pid: child.pid ?? null, start: childStart, cwd, args, startedAt: started.toISOString() }, null, 2) + '\n', { flag: 'wx' });
  const inspect = (line) => {
    try {
      const event = JSON.parse(line); events.push(event);
      const type = event.item?.type;
      if (type && !['agent_message', 'reasoning', 'plan'].includes(type)) { toolEvent ??= event; stop(); }
    } catch { /* Raw malformed output is retained and treated as missing response evidence. */ }
  };
  child.stdout.on('data', (data) => {
    const text = data.toString(); appendFileSync(stdoutPath, text); stdout += text; pending += text;
    let end;
    while ((end = pending.indexOf('\n')) >= 0) { inspect(pending.slice(0, end)); pending = pending.slice(end + 1); }
  });
  child.stderr.on('data', (data) => { const text = data.toString(); appendFileSync(stderrPath, text); stderr += text; });
  child.stdin.on('error', () => {});
  child.stdin.end(prompt);
  const timer = setTimeout(() => { timedOut = true; stop(); }, timeoutMs);
  const result = await new Promise((done) => {
    child.once('error', (error) => done({ exitCode: null, signal: null, spawnError: error.message }));
    child.once('close', (exitCode, signal) => done({ exitCode, signal }));
  });
  clearTimeout(timer); clearTimeout(killTimer); activeStops.delete(stop);
  if (pending.trim()) inspect(pending);

  const messages = events.filter((event) => event.type === 'item.completed' && event.item?.type === 'agent_message').map((event) => event.item.text);
  const usage = events.filter((event) => event.type === 'turn.completed').map((event) => event.usage ?? null);
  const telemetry = {
    ...result, timedOut, toolEvent, startedAt: started.toISOString(), elapsedMs: performance.now() - startedMonotonic, wallElapsedMs: Date.now() - started.getTime(),
    interrupted: comparisonInterrupted, modelOutputObserved: events.some((event) => ['agent_message', 'reasoning'].includes(event.item?.type)),
    promptSHA256: sha(prompt), promptUtf8Bytes: Buffer.byteLength(prompt),
    modelReportedByRuntime: events.find((event) => event.model)?.model ?? null,
    usage, referenceToolCalls: 0, imageToolCalls: 0,
    stdoutSHA256: sha(stdout), stderrSHA256: sha(stderr),
    args, messages,
  };
  await writeJson(join(directory, `round-${round}.telemetry.json`), telemetry);
  return telemetry;
}

/** Run one explicitly selected pilot; this does not implement a comparison/adoption command. */
export async function runPilot({ scenarioId, variant, executable = 'codex', root = fixtureRoot } = {}) {
  const { plan, cases } = await verifyFrozenTrialPlan(root);
  if (scenarioId !== plan.pilot.scenarioId || variant !== plan.pilot.variant) throw new Error('Only the predeclared bounded pilot is authorized by this runner.');
  if (process.platform !== 'linux') throw new Error('Pilot supervisor is validated only on Linux.');
  const priorPilots = await readdir(join(root, 'pilot')).catch((error) => { if (error.code === 'ENOENT') return []; throw error; });
  if (priorPilots.length >= plan.pilot.maximumRuns) throw new Error('Bounded pilot already attempted; retain its evidence and require a new explicit plan before rerunning.');
  const scenario = cases.find(({ id }) => id === scenarioId);
  const source = await readJson(join(root, `variants/${variant}/instructions.json`));
  const referenceBodies = await readJson(join(root, `variants/${variant}/references.json`));
  const instruction = source[scenario.instructionKey];
  if (!instruction) throw new Error('Scenario lacks frozen instructions.');
  const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${scenarioId}-${variant}`;
  const directory = join(root, 'pilot', runId);
  await mkdir(directory, { recursive: true });
  const cwd = await mkdtemp(join(tmpdir(), 'qs-response-fixture-'));
  const resources = {}, requests = [], rounds = [];
  let envelope = null, failure = null;
  const cliVersion = spawnSync(executable, ['--version'], { encoding: 'utf8' });
  for (let round = 1; round <= plan.pilot.maximumRounds; round += 1) {
    const prompt = buildResponsePrompt({ instruction, scenario, resources, previousRequests: requests });
    const telemetry = await runCliRound({ prompt, directory, round, timeoutMs: plan.pilot.timeoutMsPerRound, cwd, executable });
    rounds.push(telemetry);
    if (telemetry.exitCode !== 0 || telemetry.timedOut || telemetry.toolEvent) { failure = 'CLI failure, timeout or forbidden tool event; raw evidence retained.'; break; }
    try {
      const raw = telemetry.messages.at(-1)?.trim() ?? '';
      envelope = JSON.parse(raw.startsWith('```') ? raw.replace(/^```(?:json)?\s*\n/, '').replace(/\n```$/, '') : raw);
      if (typeof envelope.response !== 'string' || !Array.isArray(envelope.requestedActions) || !Array.isArray(envelope.requestedReferences)) throw new Error('Invalid response envelope.');
    } catch { failure = 'No valid response envelope; preserve failed response without rewriting.'; break; }
    if (!envelope.requestedReferences.length) break;
    if (envelope.response) { failure = 'Reference request also emitted a premature final response.'; break; }
    for (const name of envelope.requestedReferences) {
      if (!scenario.referenceNames.includes(name) || typeof referenceBodies[name] !== 'string' || Object.hasOwn(resources, name)) { failure = 'Unknown or repeated reference request.'; break; }
      resources[name] = referenceBodies[name]; requests.push(name);
    }
    if (failure) break;
    if (round === plan.pilot.maximumRounds) failure = 'Reference-round limit reached; no final response.';
  }
  const remainingFiles = await readdir(cwd);
  if (remainingFiles.length) failure = 'Unexpected file mutation in response-only fixture.';
  const summary = {
    kind: 'infrastructure-pilot-not-adoption-evidence', runId, scenarioId, variant,
    planSHA256: sha(await readFile(join(root, 'plan.json'))), scenarioInputSHA256: sha(scenario.input),
    sourceSHA256: sha(instruction), referenceRequests: requests, cwd, remainingFiles,
    configuredHost: plan.host, cliVersion: cliVersion.stdout.trim(), cliVersionStderr: cliVersion.stderr.trim(),
    rounds: rounds.length, tokenUsage: rounds.flatMap(({ usage }) => usage),
    elapsedMs: rounds.reduce((sum, round) => sum + round.elapsedMs, 0),
    failure, envelope,
    isolation: 'Empty temporary CWD; unchanged host sandbox/settings; prompt forbids tools and supervisor stops on observed tool events. This detects behavior, not a proof of pre-execution hard isolation.',
    evaluatorReview: 'pending independent review; pilot excluded from matched comparison',
  };
  await writeJson(join(directory, 'summary.json'), summary);
  return { directory: relative(repository, directory), failure, rounds: rounds.length, usage: summary.tokenUsage, referenceRequests: requests };
}

function inspectHost() {
  const config = spawnSync('python3', ['-c', 'import json,pathlib,tomllib;d=tomllib.loads((pathlib.Path.home()/".codex/config.toml").read_text());print(json.dumps({k:d.get(k) for k in ["model","model_reasoning_effort","sandbox_mode","approval_policy"]}))'], { encoding: 'utf8' });
  if (config.status !== 0) throw new Error('Cannot verify unchanged non-secret host settings.');
  const settings = JSON.parse(config.stdout);
  const version = spawnSync('codex', ['--version'], { encoding: 'utf8' });
  if (version.status !== 0) throw new Error('Cannot read Codex CLI version.');
  return { ...settings, cli: version.stdout.trim() };
}

function checkHost(host, plan) {
  for (const [key, expected] of Object.entries({ model: plan.host.configuredModel, model_reasoning_effort: plan.host.configuredReasoningEffort, sandbox_mode: plan.host.configuredSandbox, approval_policy: plan.host.configuredApproval, cli: plan.host.cli })) {
    if (host[key] !== expected) throw new Error(`Host ${key} changed from frozen comparison settings; stop before further trials.`);
  }
}

async function existingJson(path) {
  try { return await readJson(path); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

function parseEnvelope(messages) {
  const raw = messages.at(-1)?.trim() ?? '';
  const envelope = JSON.parse(raw.startsWith('```') ? raw.replace(/^```(?:json)?\s*\n/, '').replace(/\n```$/, '') : raw);
  if (typeof envelope?.response !== 'string' || !Array.isArray(envelope.requestedActions) || !Array.isArray(envelope.requestedReferences)
    || envelope.requestedReferences.some((name) => typeof name !== 'string')) throw new Error('Invalid response envelope.');
  return envelope;
}

async function runComparisonAttempt({ plan, scenario, run, attempt, directory, instruction, referenceBodies, host }) {
  const cwd = await mkdtemp(join(tmpdir(), 'qs-matched-response-'));
  const started = { kind: 'matched-response-attempt', run, attempt, scenarioId: scenario.id, inputSHA256: sha(scenario.input), sourceSHA256: sha(instruction), runnerSHA256: plan.runnerSHA256, planSHA256: sha(await readFile(join(fixtureRoot, 'plan.json'))), host, cwd, startedAt: new Date().toISOString() };
  await mkdir(directory, { recursive: true });
  await writeJson(join(directory, 'started.json'), started);
  const resources = {}, requests = [], rounds = [];
  let failure = null, envelope = null, infrastructureFailure = false;
  for (let round = 1; round <= plan.comparisonExecution.maximumRounds; round += 1) {
    if (comparisonInterrupted) { failure = 'Comparison interrupted before next round.'; infrastructureFailure = true; break; }
    checkHost(inspectHost(), plan);
    const telemetry = await runCliRound({ prompt: buildResponsePrompt({ instruction, scenario, resources, previousRequests: requests }), directory, round, timeoutMs: plan.comparisonExecution.timeoutMsPerRound, cwd, executable: 'codex' });
    rounds.push(telemetry);
    if (telemetry.exitCode !== 0 || telemetry.timedOut || telemetry.interrupted || telemetry.toolEvent) {
      infrastructureFailure = !telemetry.toolEvent;
      failure = telemetry.toolEvent ? 'Forbidden actual tool event; stopped without semantic retry.' : 'CLI infrastructure failure/timeout/interruption; raw evidence retained.';
      break;
    }
    try { envelope = parseEnvelope(telemetry.messages); }
    catch { failure = 'Invalid or missing response envelope; raw model output retained without repair.'; break; }
    if (!envelope.requestedReferences.length) {
      if (!envelope.response.trim()) failure = 'Empty final response.';
      break;
    }
    if (envelope.response) { failure = 'Required reference request also emitted a premature final response.'; break; }
    for (const name of envelope.requestedReferences) {
      if (!scenario.referenceNames.includes(name) || typeof referenceBodies[name] !== 'string' || Object.hasOwn(resources, name)) { failure = 'Unknown or repeated private-reference request.'; break; }
      resources[name] = referenceBodies[name]; requests.push(name);
    }
    if (failure) break;
    if (round === plan.comparisonExecution.maximumRounds) failure = 'Bounded private-reference round limit reached without final response.';
  }
  const remainingFiles = await readdir(cwd);
  if (remainingFiles.length) { failure = 'Unexpected file mutation in response-only fixture.'; infrastructureFailure = false; }
  const summary = {
    ...started, completedAt: new Date().toISOString(), failure, infrastructureFailure,
    modelOutputObserved: rounds.some((round) => round.modelOutputObserved),
    referenceRequests: requests, referenceHashes: Object.fromEntries(Object.entries(resources).map(([name, body]) => [name, sha(body)])),
    tokenUsage: rounds.flatMap(({ usage }) => usage), elapsedMs: rounds.reduce((sum, round) => sum + round.elapsedMs, 0),
    roundCount: rounds.length, remainingFiles, envelope,
    runtimeModels: [...new Set(rounds.map(({ modelReportedByRuntime }) => modelReportedByRuntime).filter(Boolean))],
    actualToolEvents: rounds.map(({ toolEvent }) => toolEvent).filter(Boolean),
    semanticReview: 'ungraded; independent blinded reviewer required',
  };
  await writeJson(join(directory, 'summary.json'), summary);
  return summary;
}

async function recoverIncompleteAttempt(directory) {
  throw new Error(`Incomplete attempt requires explicit verified operator recovery; PID invisibility is not termination evidence: ${directory}`);
}

async function executeScheduledRun({ root, plan, cases, run }) {
  const caseById = new Map(cases.map((scenario) => [scenario.id, scenario]));
  const scenario = caseById.get(run.scenarioId);
  const runDirectory = join(root, 'comparison', 'runs', String(run.run).padStart(4, '0'));
  const completed = await existingJson(join(runDirectory, 'result.json'));
  if (completed) {
    if (JSON.stringify(completed.run) !== JSON.stringify(run) || completed.inputSHA256 !== sha(scenario.input)) throw new Error('Completed run identity conflicts with frozen schedule.');
    return { ...completed, resumed: true };
  }
  const host = inspectHost(); checkHost(host, plan);
  const instructionSet = await readJson(join(root, `variants/${run.variant}/instructions.json`));
  const instruction = instructionSet[scenario.instructionKey];
  const referenceBodies = await readJson(join(root, `variants/${run.variant}/references.json`));
  const attempts = [];
  await mkdir(runDirectory, { recursive: true });
  const oneAttemptRows = plan.comparisonExecution.incidentOneAttemptRuns ?? [];
  const maximumAttempts = oneAttemptRows.includes(run.run) ? 1 : 2;
  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    const directory = join(runDirectory, `attempt-${attempt}`);
    let summary = await existingJson(join(directory, 'summary.json'));
    if (!summary) {
      const started = await existingJson(join(directory, 'started.json'));
      summary = started ? await recoverIncompleteAttempt(directory) : await runComparisonAttempt({ plan, scenario, run, attempt, directory, instruction, referenceBodies, host });
    }
    attempts.push({ path: relative(root, directory), failure: summary.failure, infrastructureFailure: summary.infrastructureFailure, modelOutputObserved: summary.modelOutputObserved });
    if (comparisonInterrupted) throw new Error('Comparison interrupted; attempt retained for safe resumption.');
    const mayRetry = summary.failure && summary.infrastructureFailure && !summary.modelOutputObserved && attempt < maximumAttempts;
    if (mayRetry) continue;
    const result = { kind: 'ungraded-matched-run', run, inputSHA256: sha(scenario.input), sourceSHA256: sha(instruction), runnerSHA256: plan.runnerSHA256, selectedAttempt: attempt, attempts, failure: summary.failure, summaryPath: relative(root, join(directory, 'summary.json')), completedAt: new Date().toISOString() };
    await writeJson(join(runDirectory, 'result.json'), result);
    return result;
  }
  throw new Error('Unreachable retry state.');
}

async function exportBlindedReview({ root, plan, cases, variantFilter = null }) {
  const rubric = await readJson(join(root, 'reviewer-only.json'));
  const runRoot = join(root, 'comparison', 'runs');
  const directories = await readdir(runRoot).catch((error) => { if (error.code === 'ENOENT') return []; throw error; });
  const records = [], mapping = [];
  for (const directory of directories.sort()) {
    const result = await existingJson(join(runRoot, directory, 'result.json')); if (!result) continue;
    if (variantFilter && result.run.variant !== variantFilter) continue;
    const summary = await readJson(join(root, result.summaryPath));
    const scenario = cases.find(({ id }) => id === result.run.scenarioId);
    const blindId = sha(`qs-2026-09-25-review:${result.run.run}:${result.sourceSHA256}`).slice(0, 16);
    records.push({ blindId, scenarioId: scenario.id, input: scenario.input, sharedContext: scenario.sharedContext, response: summary.envelope?.response ?? null, requestedActions: summary.envelope?.requestedActions ?? null, requestedReferences: summary.referenceRequests, infrastructureFailure: result.failure, gradingStatus: 'ungraded' });
    mapping.push({ blindId, run: result.run, summaryPath: result.summaryPath });
  }
  records.sort((a, b) => a.blindId.localeCompare(b.blindId));
  const directory = join(root, 'comparison', 'review-bundles', `${variantFilter ? "baseline-" : ""}through-${String(records.length).padStart(4, '0')}`);
  if (await existingJson(join(directory, 'bundle.json'))) return { directory: relative(root, directory), count: records.length };
  await mkdir(directory, { recursive: true });
  await writeJson(join(directory, 'bundle.json'), { kind: 'blinded-ungraded-response-bundle', records, rubric, disclosure: 'No source paths, variant labels, role mapping, runtime usage or preferred outcome included. Rate each response against fixed input and rubric before unblinding.' });
  await writeJson(join(directory, 'operator-only-mapping.json'), mapping);
  return { directory: relative(root, directory), count: records.length };
}

function median(values) { const sorted = [...values].sort((a, b) => a - b); const half = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[half] : (sorted[half - 1] + sorted[half]) / 2; }

async function baselineVariance(root, cases, schedule) {
  const observations = [];
  for (const scenario of cases) {
    const totals = [];
    for (const run of schedule.filter((item) => item.scenarioId === scenario.id && item.variant === 'r17')) {
      const result = await existingJson(join(root, 'comparison', 'runs', String(run.run).padStart(4, '0'), 'result.json'));
      if (!result) continue;
      const summary = await readJson(join(root, result.summaryPath));
      if (result.failure || summary.tokenUsage.length === 0 || summary.tokenUsage.some((usage) => !Number.isFinite(usage?.input_tokens))) continue;
      totals.push(summary.tokenUsage.reduce((total, usage) => total + usage.input_tokens, 0));
    }
    const midpoint = totals.length === 3 ? median(totals) : null;
    observations.push({ scenarioId: scenario.id, totals, median: midpoint, spanRatio: midpoint > 0 ? (Math.max(...totals) - Math.min(...totals)) / midpoint : null });
  }
  return { basis: 'Unblinded operator computes only baseline input-token variability; no candidate semantic scores read.', observations, expand: observations.some(({ spanRatio }) => spanRatio !== null && spanRatio > 0.1), qualityVariance: 'pending independent baseline review; quality-triggered expansion remains possible' };
}

export async function acquireComparisonLock(lock, runnerSHA256) {
  // A missing PID may be outside this PID namespace. Never infer an abandoned
  // supervisor from /proc visibility or retire its lock automatically.
  try { await mkdir(lock); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    throw new Error('Comparison lock already exists; explicit verified operator recovery is required. No automatic lock retirement.');
  }
  await writeJson(join(lock, 'owner.json'), {
    pid: process.pid, start: processStart(process.pid),
    pidNamespace: await readlink('/proc/self/ns/pid').catch(() => null),
    runnerSHA256, createdAt: new Date().toISOString(),
  });
}

export async function runComparison({ root = fixtureRoot } = {}) {
  const { plan, cases, schedule } = await verifyFrozenTrialPlan(root);
  if (plan.comparisonExecution?.authorized !== true) throw new Error('Comparison execution must be authorized in the frozen amendment.');
  if (process.platform !== 'linux') throw new Error('Comparison process supervision supports Linux only.');
  checkHost(inspectHost(), plan);
  const directory = join(root, 'comparison'); await mkdir(directory, { recursive: true });
  const lock = join(directory, '.runner-lock');
  await acquireComparisonLock(lock, plan.runnerSHA256);
  const onSignal = () => { comparisonInterrupted = true; for (const stop of activeStops) stop(); };
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(signal, onSignal);
  try {
    for (const run of schedule) {
      if (comparisonInterrupted) throw new Error('Comparison interrupted before next scheduled run.');
      const result = await executeScheduledRun({ root, plan, cases, run });
      if (!result.resumed) console.log(JSON.stringify({ completed: run.run, scheduled: schedule.length, scenarioId: run.scenarioId, repetition: run.repetition, state: result.failure ? 'recorded-failure' : 'recorded-ungraded', at: result.completedAt }));
      if (run.run % 10 === 0) {
        await exportBlindedReview({ root, plan, cases, variantFilter: "r17" });
        await exportBlindedReview({ root, plan, cases });
      }
      const savedAttempt = await readJson(join(root, result.summaryPath));
      if (savedAttempt.actualToolEvents?.length) throw new Error('Actual tool event recorded; comparison stopped pending isolation review.');
    }
    let variance = await existingJson(join(directory, 'baseline-variance.json'));
    if (!variance) { variance = await baselineVariance(root, cases, schedule); await writeJson(join(directory, 'baseline-variance.json'), variance); }
    let expansion = await existingJson(join(directory, 'expansion-schedule.json'));
    if (!expansion && variance.expand) {
      expansion = [];
      for (let repetition = 4; repetition <= 5; repetition += 1) {
        for (const [index, scenario] of cases.entries()) {
          for (const variant of ((repetition + index) % 2 ? ['r17', 'r42'] : ['r42', 'r17'])) expansion.push({ run: schedule.length + expansion.length + 1, scenarioId: scenario.id, repetition, variant });
        }
      }
      await writeJson(join(directory, 'expansion-schedule.json'), expansion);
      console.log(JSON.stringify({ state: 'predeclared-token-variance-expansion', additionalRuns: expansion.length }));
    }
    for (const run of expansion ?? []) {
      if (comparisonInterrupted) throw new Error('Comparison interrupted before expansion run.');
      const result = await executeScheduledRun({ root, plan, cases, run });
      if (!result.resumed) console.log(JSON.stringify({ completed: run.run, scheduled: schedule.length + expansion.length, scenarioId: run.scenarioId, repetition: run.repetition, state: result.failure ? 'recorded-failure' : 'recorded-ungraded', at: result.completedAt }));
      if (run.run % 10 === 0) {
        await exportBlindedReview({ root, plan, cases, variantFilter: "r17" });
        await exportBlindedReview({ root, plan, cases });
      }
      const savedAttempt = await readJson(join(root, result.summaryPath));
      if (savedAttempt.actualToolEvents?.length) throw new Error('Actual tool event recorded; comparison stopped pending isolation review.');
    }
    const review = await exportBlindedReview({ root, plan, cases });
    const completion = { kind: 'comparison-capture-complete-not-adoption', totalRuns: schedule.length + (expansion?.length ?? 0), review, independentReview: 'pending', qualityVarianceExpansion: variance.qualityVariance, completedAt: new Date().toISOString() };
    if (!await existingJson(join(directory, 'capture-complete.json'))) await writeJson(join(directory, 'capture-complete.json'), completion);
    console.log(JSON.stringify(completion));
    return completion;
  } finally {
    for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.removeListener(signal, onSignal);
    if (!activeStops.size) await rm(lock, { recursive: true, force: true });
  }
}


/* CLI_DISPATCH */
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [command, scenarioId, variant] = process.argv.slice(2);
  if (command === 'verify') {
    const { cases, schedule } = await verifyFrozenTrialPlan();
    console.log(`Verified ${cases.length} frozen scenarios and ${schedule.length} scheduled matched runs.`);
  } else if (command === 'pilot') {
    console.log(JSON.stringify(await runPilot({ scenarioId, variant }), null, 2));
  } else if (command === 'compare') {
    await runComparison();
  } else if (command === 'export-baseline-review') {
    const { plan, cases } = await verifyFrozenTrialPlan();
    console.log(JSON.stringify(await exportBlindedReview({ root: fixtureRoot, plan, cases, variantFilter: 'r17' })));
  } else if (command === 'export-review') {
    const { plan, cases } = await verifyFrozenTrialPlan();
    console.log(JSON.stringify(await exportBlindedReview({ root: fixtureRoot, plan, cases })));
  } else throw new Error('Usage: node scripts/skill-efficiency-trials.mjs verify | pilot <scenario-id> <variant-id> | compare | export-review | export-baseline-review');
}
