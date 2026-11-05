import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { instruction } from './adoption-behavior-trials.mjs';
import { execute, manifest, sha } from './frontend-adoption-trials.mjs';
import { buildResponsePrompt } from './skill-efficiency-trials.mjs';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const fixture = join(repository, 'tests/fixtures/prototype-platform');
export const source = 'skills/engineering/qs-design-prototype/SKILL.md';
export const referenceNames = ['UI.md', 'LOGIC.md', 'WEB.md', 'MACOS.md'];
const json = (path, value) => writeFile(path, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });

export function promptFor(scenario, rootText, resources = {}, previousRequests = []) {
  return buildResponsePrompt({
    instruction: rootText,
    scenario: { input: scenario.request, sharedContext: scenario.context, referenceNames },
    resources,
    previousRequests,
  });
}

export function parseResponse(text) {
  const value = JSON.parse(text.trim().replace(/^```(?:json)?\s*\n/, '').replace(/\n```$/, ''));
  if (typeof value.response !== 'string' || !Array.isArray(value.requestedActions) || !Array.isArray(value.requestedReferences)
    || value.requestedReferences.some((name) => !referenceNames.includes(name))
    || new Set(value.requestedReferences).size !== value.requestedReferences.length
    || value.requestedReferences.length && value.response
    || !value.requestedReferences.length && !value.response.trim()) throw new Error('Invalid response/reference envelope');
  return value;
}

export async function sources() {
  const scenario = { source, skill: 'qs-design-prototype' };
  return Promise.all([source, ...referenceNames.map((name) => `skills/engineering/qs-design-prototype/${name}`)]
    .map((path) => instruction(scenario, path)));
}

async function runCase(scenario, frozen, output, executable) {
  const directory = join(output, scenario.id);
  await mkdir(directory);
  const cwd = await mkdtemp(join(tmpdir(), 'qs-prototype-response-'));
  const resources = {}, requestedReferences = [], rounds = [];
  let result = null, failure = null;
  console.log(JSON.stringify({ id: scenario.id, state: 'started' }));
  try {
    for (let round = 1; round <= 3; round++) {
      const roundDirectory = join(directory, `round-${round}`);
      await mkdir(roundDirectory);
      const telemetry = await execute({
        executable, cwd, directory: roundDirectory,
        prompt: promptFor(scenario, frozen[0].text, resources, requestedReferences),
        scenario: { mode: 'prompt-only', budget: { timeoutMs: 120000, maximumImageCalls: 0 } },
      });
      rounds.push(telemetry);
      if (telemetry.exitCode !== 0 || !telemetry.completedTurn || !telemetry.responsePresent || telemetry.timedOut
        || telemetry.stopReason || telemetry.malformedLines || !telemetry.processObservation.complete
        || telemetry.observedOwnedResidualProcesses.length || telemetry.toolCount) throw new Error('Incomplete response-only capture; inspect retained telemetry');
      const envelope = parseResponse(await readFile(join(roundDirectory, 'response.md'), 'utf8'));
      if (!envelope.requestedReferences.length) { result = envelope; break; }
      for (const name of envelope.requestedReferences) {
        if (Object.hasOwn(resources, name)) throw new Error(`Repeated reference request: ${name}`);
        resources[name] = frozen.find((item) => item.path.endsWith(`/${name}`)).text;
        requestedReferences.push(name);
      }
    }
    if (!result) throw new Error('Reference-round bound exhausted');
    if ((await readdir(cwd)).length) throw new Error('Response-only workspace mutated');
    await writeFile(join(directory, 'response.md'), result.response, { flag: 'wx' });
  } catch (error) {
    failure = error.message;
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
  const record = { id: scenario.id, mode: 'response-only instruction trial; no prototype executed',
    requestedReferences, requestedActions: result?.requestedActions ?? null, rounds: rounds.length,
    responseSHA256: result ? sha(result.response) : null, failure, review: 'Pending independent semantic review' };
  await json(join(directory, 'result.json'), record);
  console.log(JSON.stringify({ id: scenario.id, state: 'recorded', failure }));
  return record;
}

export async function run(output, executable = 'codex') {
  const directory = resolve(output);
  if (!directory.startsWith(fixture + '/') || !/^run-\d+$/.test(directory.slice(fixture.length + 1))) throw new Error('Use a new run-N directory directly inside the prototype fixture');
  const scenariosText = await readFile(join(fixture, 'scenarios.json'), 'utf8');
  const scenarios = JSON.parse(scenariosText);
  const frozen = await sources();
  await mkdir(directory); // Each attempt is retained; never replace a prior run.
  await json(join(directory, 'sources.json'), frozen);
  await writeFile(join(directory, 'scenarios.json'), scenariosText, { flag: 'wx' });
  await json(join(directory, 'binding.json'), {
    kind: 'prototype-platform-instruction-trials', startedAt: new Date().toISOString(),
    cli: execFileSync(executable, ['--version'], { encoding: 'utf8' }).trim(), overrides: [],
    sourceBindings: frozen.map(({ text, ...binding }) => binding), scenariosSHA256: sha(scenariosText),
    runnerSHA256: sha(await readFile(fileURLToPath(import.meta.url))),
    supervisorSHA256: sha(await readFile(join(repository, 'scripts/frontend-adoption-trials.mjs'))),
    attemptsPerCase: 1, retries: 0, maximumRounds: 3, concurrency: 2,
    limits: 'Fresh ephemeral contexts, demanded frozen references, synthetic observations. Runtime model is unverified unless emitted. These are plans/verdicts, not native Mac or browser execution evidence. No efficiency or universal compliance claim.',
  });
  const results = new Array(scenarios.length);
  let next = 0;
  await Promise.all([0, 1].map(async () => {
    while (next < scenarios.length) {
      const index = next++;
      results[index] = await runCase(scenarios[index], frozen, directory, executable);
    }
  }));
  const current = await sources();
  const sourceDrift = current.some((item, index) => item.derivedSHA256 !== frozen[index].derivedSHA256 || item.sourceSHA256 !== frozen[index].sourceSHA256);
  const summary = { results, sourceDrift, executionFailures: results.filter((item) => item.failure).length,
    review: 'Independent semantic review required', prototypeExecution: false };
  await json(join(directory, 'summary.json'), summary);
  await json(join(directory, 'manifest.json'), await manifest(directory));
  return summary;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const result = await run(process.argv[2]);
    console.log(JSON.stringify({ recorded: result.results.length, executionFailures: result.executionFailures, sourceDrift: result.sourceDrift }));
    if (result.executionFailures || result.sourceDrift) process.exitCode = 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
