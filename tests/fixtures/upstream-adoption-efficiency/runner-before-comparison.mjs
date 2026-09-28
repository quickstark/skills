import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdir, mkdtemp, readdir } from 'node:fs/promises';
import { dirname, join, resolve, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixtureRoot = join(repository, 'tests/fixtures/upstream-adoption-efficiency');
const sha = (value) => createHash('sha256').update(value).digest('hex');
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const writeJson = async (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });

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
  const args = ['exec', '--ephemeral', '--skip-git-repo-check', '--cd', cwd, '--json', '-'];
  const stdoutPath = join(directory, `round-${round}.events.jsonl`);
  const stderrPath = join(directory, `round-${round}.stderr.txt`);
  let stdout = '', stderr = '', pending = '', timedOut = false, toolEvent = null, killTimer;
  const events = [];
  const child = spawn(executable, args, { cwd, stdio: ['pipe', 'pipe', 'pipe'], detached: process.platform !== 'win32' });
  const stop = () => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    try { process.kill(process.platform === 'win32' ? child.pid : -child.pid, 'SIGTERM'); } catch {}
    killTimer ??= setTimeout(() => { try { process.kill(process.platform === 'win32' ? child.pid : -child.pid, 'SIGKILL'); } catch {} }, 5000);
  };
  const inspect = (line) => {
    try {
      const event = JSON.parse(line); events.push(event);
      const type = event.item?.type;
      if (type && !['agent_message', 'reasoning', 'plan'].includes(type)) { toolEvent ??= event; stop(); }
    } catch { /* Raw malformed output is retained and treated as missing response evidence. */ }
  };
  child.stdout.on('data', (data) => {
    const text = data.toString(); stdout += text; pending += text;
    let end;
    while ((end = pending.indexOf('\n')) >= 0) { inspect(pending.slice(0, end)); pending = pending.slice(end + 1); }
  });
  child.stderr.on('data', (data) => { stderr += data.toString(); });
  child.stdin.on('error', () => {});
  child.stdin.end(prompt);
  const timer = setTimeout(() => { timedOut = true; stop(); }, timeoutMs);
  const result = await new Promise((done) => {
    child.once('error', (error) => done({ exitCode: null, signal: null, spawnError: error.message }));
    child.once('close', (exitCode, signal) => done({ exitCode, signal }));
  });
  clearTimeout(timer); clearTimeout(killTimer);
  if (pending.trim()) inspect(pending);
  await writeFile(stdoutPath, stdout, { flag: 'wx' });
  await writeFile(stderrPath, stderr, { flag: 'wx' });
  await writeFile(join(directory, `round-${round}.prompt.txt`), prompt, { flag: 'wx' });
  const messages = events.filter((event) => event.type === 'item.completed' && event.item?.type === 'agent_message').map((event) => event.item.text);
  const usage = events.filter((event) => event.type === 'turn.completed').map((event) => event.usage ?? null);
  const telemetry = {
    ...result, timedOut, toolEvent, startedAt: started.toISOString(), elapsedMs: Date.now() - started.getTime(),
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

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [command, scenarioId, variant] = process.argv.slice(2);
  if (command === 'verify') {
    const { cases, schedule } = await verifyFrozenTrialPlan();
    console.log(`Verified ${cases.length} frozen scenarios and ${schedule.length} scheduled matched runs.`);
  } else if (command === 'pilot') {
    console.log(JSON.stringify(await runPilot({ scenarioId, variant }), null, 2));
  } else throw new Error('Usage: node scripts/skill-efficiency-trials.mjs verify | pilot <scenario-id> <variant-id>');
}
