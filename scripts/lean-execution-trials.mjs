import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, mkdtemp, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { executeNative, readNativeControls } from './frontend-native-capture.mjs';
import { checkMobileReport, mobileReportPolicy } from './lean-mobile-report.mjs';

const repository = resolve(fileURLToPath(new URL('..', import.meta.url)));
export const fixtureRoot = join(repository, 'tests/fixtures/lean-execution-adoption');
const sha = value => createHash('sha256').update(value).digest('hex');
const readJson = async path => JSON.parse(await readFile(path, 'utf8'));
const writeJson = (path, value) => writeFile(path, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const owners = { build: 'skills/engineering/qs-code-build/SKILL.md', spec: 'skills/engineering/qs-plan-spec/SKILL.md', debug: 'skills/engineering/qs-code-debug/SKILL.md', delegation: 'skills/internal/delegation.md' };

export async function verifyPlan(root = fixtureRoot) {
  const planBytes = await readFile(join(root, 'plan.json'));
  const plan = JSON.parse(planBytes);
  for (const [name, expected] of Object.entries(plan.files)) {
    if (sha(await readFile(join(root, name))) !== expected) throw new Error(`Frozen input changed: ${name}`);
  }
  const baseline = await readJson(join(root, 'baseline.json'));
  const sources = await readJson(join(root, 'control-sources.json'));
  for (const [path, record] of Object.entries(baseline.sources)) {
    if (sha(sources[path]) !== record.sha256) throw new Error(`Control source changed: ${path}`);
  }
  const scenarios = await readJson(join(root, 'scenarios.json'));
  const schedule = await readJson(join(root, 'schedule.json'));
  const ids = new Set(scenarios.map(s => s.id));
  if (ids.size !== scenarios.length || scenarios.length !== plan.scenarioCount) throw new Error('Invalid scenario inventory');
  if (schedule.length !== scenarios.length * plan.repetitions * 2 || schedule.length !== plan.runLimit) throw new Error('Incomplete comparison schedule');
  for (const id of ids) for (let repetition = 1; repetition <= plan.repetitions; repetition++) {
    const pair = schedule.filter(row => row.scenario === id && row.repetition === repetition);
    if (pair.length !== 2 || new Set(pair.map(row => row.variant)).size !== 2 || pair.some(row => !['a', 'b'].includes(row.variant))) throw new Error(`Unmatched comparison: ${id}/${repetition}`);
  }
  return { plan, planSHA256: sha(planBytes), baseline, sources, scenarios, schedule };
}

export function assertPhaseBinding(previous, current) {
  if (JSON.stringify(previous) !== JSON.stringify(current)) throw new Error('Phase binding changed; preserve existing captures');
}

export async function phaseReportBinding(kind) {
  if (kind === undefined) return {};
  if (kind !== 'mobile-root-and-route') throw new Error('Unknown phase report qualification');
  return { reportQualification: { kind, checkerSHA256: sha(await readFile(new URL('./lean-mobile-report.mjs', import.meta.url))), policy: mobileReportPolicy() } };
}

export function responsePrompt(instructions, scenario) {
  const envelope = [
    'This is a closed response-only fixture, not an instruction to perform real operations. Use only the frozen skill instructions and supplied observations. Do not call tools, inspect files, edit, create goals, install, publish or contact services. Missing observations stay missing. Describe proposed actions without claiming they happened.',
    'Return only JSON with response (the exact Markdown for the owning root or helper) and requestedActions (immediate proposed actions in this fictional fixture, excluding commands merely quoted in a generated prompt).',
  ];
  if (scenario.transportEncoding !== undefined) {
    if (scenario.transportEncoding !== 'json-unicode-dollar') throw new Error('Unknown fixture transport encoding');
    // Codex scans raw text for $skill mentions even inside documentation. Keep
    // fixture literals as reversible JSON data so they cannot select installed roots.
    const payload = JSON.stringify({ instructions, observations: scenario.sharedContext ?? {}, user_request: scenario.input }, null, 2).replace(/\$/g, '\\u0024');
    return [...envelope, 'Decode the following JSON string values, including Unicode escapes, to recover the frozen instructions, observations and user request. Use those decoded values for this response-only fixture.', '<fixture_json>', payload, '</fixture_json>'].join('\n\n');
  }
  return [
    ...envelope,
    '<instructions>', instructions, '</instructions>', '<observations>', JSON.stringify(scenario.sharedContext ?? {}), '</observations>', '<user_request>', scenario.input, '</user_request>',
  ].join('\n\n');
}

function instructionsFor(sources, scenario) {
  const path = owners[scenario.instructionKey];
  if (!path || typeof sources[path] !== 'string') throw new Error(`Unsupported pilot instruction: ${scenario.instructionKey}`);
  const delegation = sources['docs/skill-run-contract.md'].split('## Delegation')[1].split('\n## ')[0];
  const bodies = [sources[path], '## Shared delegation rules', delegation];
  if (scenario.instructionKey === 'build' || scenario.instructionKey === 'spec') bodies.push(sources['skills/internal/delegation.md']);
  if (scenario.instructionKey === 'spec') bodies.push(sources['skills/internal/ticket-decomposition.md']);
  return bodies.join('\n\n');
}

export async function verifyCandidateSources(root = fixtureRoot) {
  const sources = await readJson(join(root, 'candidate-sources.json'));
  const protocol = await readJson(join(root, 'pilot-protocol.json'));
  if (sha(JSON.stringify(sources)) !== protocol.candidateSHA256) throw new Error('Frozen candidate changed; preserve existing evidence');
  return sources;
}

export async function capturePilot({ variant, root = fixtureRoot } = {}) {
  if (!['a', 'b'].includes(variant)) throw new Error('Select a or b explicitly');
  const { plan, sources, scenarios, schedule } = await verifyPlan(root);
  if (JSON.stringify(readNativeControls()) !== JSON.stringify(plan.controls)) throw new Error('Configured controls changed; do not override them');
  const sourceBodies = variant === 'a' ? sources : await verifyCandidateSources(root);
  const batch = join(root, variant === 'a' ? 'control-pilot' : 'candidate-pilot');
  await mkdir(batch, { recursive: true });
  const binding = { runnerSHA256: sha(await readFile(fileURLToPath(import.meta.url))), planSHA256: sha(await readFile(join(root, 'plan.json'))), sourcesSHA256: sha(JSON.stringify(sourceBodies)), configuredControls: plan.controls };
  const prior = await readdir(batch);
  if (prior.includes('binding.json')) {
    if (JSON.stringify(await readJson(join(batch, 'binding.json'))) !== JSON.stringify(binding)) throw new Error('Capture binding changed; preserve prior evidence');
  } else await writeJson(join(batch, 'binding.json'), binding);
  for (const row of schedule.filter(row => row.variant === variant && plan.pilotScenarios.includes(row.scenario))) {
    const run = `${row.scenario}-${row.repetition}`;
    if ((await readdir(batch)).includes(run)) {
      const previous = await readJson(join(batch, run, 'result.json')).catch(() => null);
      if (previous?.acceptedCapture) continue;
      throw new Error(`Prior incomplete or failed capture ${run}; retain evidence and resolve infrastructure before continuing`);
    }
    const directory = join(batch, run);
    await mkdir(directory);
    const cwd = await mkdtemp(join(tmpdir(), 'qs-lex-fixture-'));
    const scenario = scenarios.find(s => s.id === row.scenario);
    const prompt = responsePrompt(instructionsFor(sourceBodies, scenario), scenario);
    const telemetry = await executeNative({ prompt, cwd, directory, executable: 'codex', expectedControls: plan.controls, scenario: { ...scenario, budget: { timeoutMs: plan.operationalBounds.timeoutMsPerResponse, maximumImageCalls: 0 } } });
    let envelope = null;
    try { envelope = JSON.parse(await readFile(join(directory, 'response.md'), 'utf8')); } catch { /* Keep invalid raw responses; never rewrite them. */ }
    const acceptedCapture = telemetry.completedTurn && telemetry.nativeStreamComplete && telemetry.processObservation.complete && !telemetry.toolCount && !telemetry.serverRequests.length && typeof envelope?.response === 'string' && Boolean(envelope.response.trim()) && Array.isArray(envelope?.requestedActions);
    const result = { ...row, kind: 'capture-integrity-not-behavior-acceptance', acceptedCapture: Boolean(acceptedCapture), envelope, telemetryPath: 'telemetry.json', promptSHA256: sha(prompt), sourceSHA256: sha(instructionsFor(sourceBodies, scenario)), semanticReview: 'pending independent blinded review', usage: telemetry.completedTurn ? telemetry.usage : null };
    await writeJson(join(directory, 'result.json'), result);
    console.log(JSON.stringify({ run, variant, acceptedCapture: result.acceptedCapture, completedTurn: telemetry.completedTurn, reason: telemetry.stopReason, usage: result.usage }));
    if (!acceptedCapture) throw new Error(`Capture failed at ${run}; raw evidence retained`);
  }
}

// Later tickets use append-only phase manifests. These single-variant behavior
// captures do not replace the frozen, interleaved efficiency comparison.
export async function capturePhase({ id, root = fixtureRoot } = {}) {
  if (!/^[a-z][a-z0-9-]*$/.test(id ?? '')) throw new Error('Invalid phase id');
  const { plan, planSHA256 } = await verifyPlan(root);
  const manifestPath = join(root, `${id}-inputs.json`);
  const bytes = await readFile(manifestPath);
  const manifest = JSON.parse(bytes);
  if (!Array.isArray(manifest.cases) || !manifest.cases.length || !manifest.instructions) throw new Error('Incomplete phase manifest');
  const reportBinding = await phaseReportBinding(manifest.reportQualification);
  if (new Set(manifest.cases.map(c => c.id)).size !== manifest.cases.length) throw new Error('Duplicate phase case');
  if (manifest.cases.some(c => !/^[A-Za-z0-9_-]+$/.test(c.id) || typeof c.input !== 'string')) throw new Error('Unsafe phase case identity or missing input');
  if (manifest.cases.some(c => c.transportEncoding !== undefined && c.transportEncoding !== 'json-unicode-dollar')) throw new Error('Unknown fixture transport encoding');
  if (JSON.stringify(readNativeControls()) !== JSON.stringify(plan.controls)) throw new Error('Configured controls changed');
  const batch = join(root, `${id}-captures`);
  await mkdir(batch, { recursive: true });
  const binding = { kind: 'single-variant-behavior-not-efficiency-comparison', planSHA256, manifestSHA256: sha(bytes), runnerSHA256: sha(await readFile(fileURLToPath(import.meta.url))), configuredControls: plan.controls, ...reportBinding };
  if ((await readdir(batch)).includes('binding.json')) {
    assertPhaseBinding(await readJson(join(batch, 'binding.json')), binding);
  } else await writeJson(join(batch, 'binding.json'), binding);
  for (const scenario of manifest.cases) {
    const directory = join(batch, scenario.id);
    if ((await readdir(batch)).includes(scenario.id)) {
      const previous = await readJson(join(directory, 'result.json')).catch(() => null);
      if (previous?.acceptedCapture) continue;
      throw new Error(`Prior failed or incomplete phase capture: ${scenario.id}`);
    }
    const instruction = manifest.instructions[scenario.instructionKey];
    if (typeof instruction !== 'string') throw new Error(`Missing phase instructions: ${scenario.instructionKey}`);
    await mkdir(directory);
    const cwd = await mkdtemp(join(tmpdir(), 'qs-lex-phase-'));
    const prompt = responsePrompt(instruction, scenario);
    const telemetry = await executeNative({ prompt, cwd, directory, executable: 'codex', expectedControls: plan.controls, scenario: { ...scenario, budget: { timeoutMs: plan.operationalBounds.timeoutMsPerResponse, maximumImageCalls: 0 } } });
    let envelope = null;
    try { envelope = JSON.parse(await readFile(join(directory, 'response.md'), 'utf8')); } catch { /* Preserve failed outputs exactly. */ }
    const acceptedCapture = telemetry.completedTurn && telemetry.nativeStreamComplete && telemetry.processObservation.complete && !telemetry.toolCount && !telemetry.serverRequests.length && typeof envelope?.response === 'string' && Boolean(envelope.response.trim()) && Array.isArray(envelope?.requestedActions);
    const reportQualification = manifest.reportQualification && typeof envelope?.response === 'string' ? checkMobileReport(envelope.response) : null;
    await writeJson(join(directory, 'result.json'), { kind: 'capture-integrity-not-behavior-acceptance', id: scenario.id, acceptedCapture: Boolean(acceptedCapture), envelope, promptSHA256: sha(prompt), instructionSHA256: sha(instruction), usage: telemetry.completedTurn ? telemetry.usage : null, semanticReview: 'pending independent review', ...(reportQualification ? { reportQualification } : {}) });
    console.log(JSON.stringify({ phase: id, case: scenario.id, acceptedCapture: Boolean(acceptedCapture), ...(reportQualification ? { reportRootRoutePassed: reportQualification.passed } : {}), reason: telemetry.stopReason }));
    if (!acceptedCapture) throw new Error(`Phase capture failed: ${scenario.id}; evidence retained`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [command, variant] = process.argv.slice(2);
  if (command === 'verify') console.log(JSON.stringify({ verified: true, scenarioCount: (await verifyPlan()).scenarios.length }));
  else if (command === 'pilot') await capturePilot({ variant });
  else if (command === 'phase') await capturePhase({ id: variant });
  else throw new Error('Use verify, pilot a|b, or phase <id>');
}
