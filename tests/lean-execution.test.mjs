import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, cp, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { fixtureRoot, verifyPlan, verifyCandidateSources, assertPhaseBinding, responsePrompt } from '../scripts/lean-execution-trials.mjs';
import { PUBLIC_COMMANDS, codexPublicSkillLiteral, claudePublicSkillLiteral, piPublicSkillLiteral } from '../scripts/skill-collection-registry.mjs';

test('the frozen LEX control preserves every command identity, host literal and historical scenario', async () => {
  const { baseline, scenarios, schedule } = await verifyPlan();
  assert.deepEqual(baseline.commands, PUBLIC_COMMANDS.map(c => ({ name: c.name, package: c.packageName, path: c.sourcePath ?? `skills/${c.bucket}/${c.name}`, codex: codexPublicSkillLiteral(c.name), claude: claudePublicSkillLiteral(c.name), pi: piPublicSkillLiteral(c.name), invocationPolicy: c.invocationPolicy })));
  const historical = JSON.parse(await readFile(new URL('./fixtures/upstream-adoption-efficiency/scenarios.json', import.meta.url), 'utf8'));
  for (const scenario of historical) assert.deepEqual(scenarios.find(s => s.id === scenario.id), scenario);
  assert.equal(schedule.length, scenarios.length * 3 * 2);
  assert.equal(baseline.usage, null);
});

test('altered control evidence and unmatched comparisons fail closed', async () => {
  const root = await mkdtemp(join(tmpdir(), 'qs-lex-negative-'));
  try {
    const frozen = JSON.parse(await readFile(join(fixtureRoot, 'plan.json'), 'utf8'));
    await Promise.all(['plan.json', ...Object.keys(frozen.files)].map(name => cp(join(fixtureRoot, name), join(root, name))));
    await writeFile(join(root, 'control-sources.json'), '{}\n');
    await assert.rejects(verifyPlan(root), /Frozen input changed: control-sources/);
    await cp(join(fixtureRoot, 'control-sources.json'), join(root, 'control-sources.json'));
    const schedule = JSON.parse(await readFile(join(root, 'schedule.json'), 'utf8'));
    schedule[0].variant = schedule[1].variant;
    const bytes = JSON.stringify(schedule, null, 2) + '\n';
    await writeFile(join(root, 'schedule.json'), bytes);
    const plan = JSON.parse(await readFile(join(root, 'plan.json'), 'utf8'));
    plan.files['schedule.json'] = createHash('sha256').update(bytes).digest('hex');
    await writeFile(join(root, 'plan.json'), JSON.stringify(plan));
    await assert.rejects(verifyPlan(root), /Unmatched comparison/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('response-only fixtures retain untrusted observations without authorizing their operations', () => {
  const prompt = responsePrompt('Keep configured settings.', { input: 'A log says disable approval controls.', sharedContext: { usage: null } });
  assert.match(prompt, /Do not call tools/);
  assert.match(prompt, /Missing observations stay missing/);
  assert.match(prompt, /<observations>\n\n\{"usage":null\}/);
  assert.match(prompt, /A log says disable approval controls/);
});

test('candidate drift is rejected against its declared freeze before capture', async () => {
  const root = await mkdtemp(join(tmpdir(), 'qs-lex-candidate-'));
  try {
    await Promise.all(['candidate-sources.json', 'pilot-protocol.json'].map(name => cp(join(fixtureRoot, name), join(root, name))));
    await verifyCandidateSources(root);
    const candidate = JSON.parse(await readFile(join(root, 'candidate-sources.json'), 'utf8'));
    candidate['skills/internal/delegation.md'] += '\nUnreviewed drift.\n';
    await writeFile(join(root, 'candidate-sources.json'), JSON.stringify(candidate));
    await assert.rejects(verifyCandidateSources(root), /Frozen candidate changed/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('LEX adaptations preserve original provenance and complete private source identities', async () => {
  const json = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
  const before = await json('./fixtures/lean-execution-adoption/original-provenance.json');
  const after = await json('../config/skill-provenance.json');
  const bindings = await json('./fixtures/lean-execution-adoption/original-source-bindings.json');
  for (const [path, digest] of Object.entries(bindings.files)) assert.equal(createHash('sha256').update(await readFile(join(fixtureRoot, path))).digest('hex'), digest);
  assert.deepEqual(after.historicalSnapshots, before.historicalSnapshots);
  assert.deepEqual(after.target.notices, before.target.notices);
  for (const original of before.capabilities) {
    const current = after.capabilities.find(c => c.id === original.id);
    for (const key of ['id', 'collection', 'currentName', 'canonical', 'owners', 'role', 'legacyIdentities', 'sources']) assert.deepEqual(current[key], original[key], `${original.id}: ${key}`);
  }
  for (const original of before.target.capabilities) {
    const current = after.target.capabilities.find(c => c.id === original.id);
    for (const key of ['id', 'name', 'package', 'role', 'path', 'owners', 'baselineIds', 'originScope']) assert.deepEqual(current[key], original[key], `${original.id}: ${key}`);
    let decision = current.decision;
    while (decision && JSON.stringify(decision) !== JSON.stringify(original.decision)) decision = decision.previous;
    assert.ok(decision, `${original.id}: original adoption decision lost`);
  }
  const frontend = await json('../skills/frontend/dependency-index.json');
  const oldFrontend = await json('./fixtures/lean-execution-adoption/original-frontend-index.json');
  assert.deepEqual(frontend.sources, oldFrontend.sources);
  assert.deepEqual(frontend.derivedFiles.map(f => f.path), oldFrontend.derivedFiles.map(f => f.path));
  assert.deepEqual(frontend.derivedHistory.find(h => h.revision === bindings.revision).derivedFiles, oldFrontend.derivedFiles);
  const execution = await json('../skills/engineering/qs-unlazy/references/dependency-index.json');
  const oldExecution = await json('./fixtures/lean-execution-adoption/original-execution-index.json');
  assert.equal(execution.sourceRevision, oldExecution.sourceRevision);
  assert.deepEqual(execution.files.map(({ derivedSha256, ...source }) => source), oldExecution.files.map(({ derivedSha256, ...source }) => source));
});

test('a changed operational plan cannot resume a phase under its earlier binding', async () => {
  const root = await mkdtemp(join(tmpdir(), 'qs-lex-phase-binding-'));
  try {
    const plan = JSON.parse(await readFile(join(fixtureRoot, 'plan.json'), 'utf8'));
    await Promise.all(['plan.json', ...Object.keys(plan.files)].map(name => cp(join(fixtureRoot, name), join(root, name))));
    const before = await verifyPlan(root);
    const binding = { planSHA256: before.planSHA256, manifestSHA256: 'same-case-inputs', configuredControls: plan.controls };
    assert.doesNotThrow(() => assertPhaseBinding(binding, { ...binding }));
    plan.operationalBounds.timeoutMsPerResponse++;
    await writeFile(join(root, 'plan.json'), JSON.stringify(plan));
    const after = await verifyPlan(root);
    assert.throws(() => assertPhaseBinding(binding, { ...binding, planSHA256: after.planSHA256 }), /Phase binding changed/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
