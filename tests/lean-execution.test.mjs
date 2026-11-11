import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, cp, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { fixtureRoot, verifyPlan, verifyCandidateSources, assertPhaseBinding, responsePrompt } from '../scripts/lean-execution-trials.mjs';
import { PUBLIC_COMMANDS, TARGET_SKILL_COLLECTIONS, codexPublicSkillLiteral, claudePublicSkillLiteral, piPublicSkillLiteral } from '../scripts/skill-collection-registry.mjs';
import { captureMigrationPath } from '../scripts/migration-filesystem.mjs';
import { adoptionSourceContentSha256, verifyAdoptionAcceptance } from '../scripts/adoption-acceptance.mjs';
import { derivePackageAcceptanceObligations } from '../scripts/managed-skill-input.mjs';
import { captureManagedSkillPayload } from '../scripts/managed-skill-migration.mjs';

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

test('LEX-12 records scoped reviews without adopting sources or upgrading historical acceptance', async () => {
  const root = new URL('../', import.meta.url).pathname;
  const json = async path => JSON.parse(await readFile(join(root, path)));
  const sha = bytes => createHash('sha256').update(bytes).digest('hex');
  const record = await json('tests/fixtures/lean-execution-adoption/lex12-acceptance.json');
  const provenance = await json('config/skill-provenance.json');
  const audit = await json('docs/validation/upstream-adoption-acceptance.json');
  assert.equal(record.revision, 'b59827e28a2451b5d4bea65363e085c70a4fce95');
  assert.equal(record.sourceReviews.length, 19);
  for (const [path, digest] of Object.entries(record.evidenceSHA256)) assert.equal(sha(await readFile(join(root, path))), digest, path);
  for (const assessment of record.sourceReviews) {
    const current = provenance.target.capabilities.find(c => c.id === assessment.id);
    assert.equal(current.decision.status, 'reviewed');
    assert.equal(current.decision.revision, record.revision);
    assert.equal(assessment.adoptionStatus, 'pending');
    assert.equal(sha(JSON.stringify(current.decision.previous)), assessment.previousDecisionSHA256);
    assert.equal(sha(await readFile(join(root, assessment.path))), assessment.sourceSHA256);
    assert.equal(sha(await readFile(join(root, assessment.reviewedPath))), assessment.reviewedSHA256);
    assert.match(current.decision.note, /Source adoption and full package acceptance remain pending/);
  }
  for (const [id, digest] of Object.entries(record.untouchedDecisions)) assert.equal(sha(JSON.stringify(provenance.target.capabilities.find(c => c.id === id).decision)), digest, id);
  assert.equal(sha(JSON.stringify({ sources: audit.sources, packages: audit.packages, criteria: audit.criteria })), record.historicalAcceptanceSHA256);
  assert.deepEqual(record.closureAcceptance, provenance.target.closures.map(c => ({ owner: c.owner, status: c.adoptionStatus, adoptedRevision: c.adoptedRevision })));
  for (const closure of record.closureAcceptance) { assert.equal(closure.status, 'unknown'); assert.equal(closure.adoptedRevision, null); }
  const observed = record.observedHistoricalAudit;
  assert.deepEqual(observed.mismatchedPaths, Object.entries(observed.sourceInputs).filter(([, s]) => s.contentSha256 !== s.expectedSHA256).map(([path]) => path));
  assert.equal(observed.mismatchedPaths.length, 34);
  for (const [path, expected] of Object.entries(observed.sourceInputs)) {
    const current = await captureMigrationPath(join(root, path));
    assert.equal(current.kind, expected.kind, path);
    assert.equal(adoptionSourceContentSha256(current), (record.qualificationOverlay[path] ?? expected).contentSha256, path);
  }
  assert.equal(record.remaining.efficiency, 'inconclusive; unchanged evaluation-disposition.json');
});

test('all six packages keep exact catalog obligations and reject stale receipts for all three hosts', async () => {
  const root = new URL('../', import.meta.url).pathname;
  const record = JSON.parse(await readFile(join(fixtureRoot, 'lex12-acceptance.json')));
  const migrations = JSON.parse(await readFile(join(root, 'config/skill-migrations.json')));
  assert.deepEqual(Object.keys(record.packages), TARGET_SKILL_COLLECTIONS.map(c => c.id));
  for (const collection of TARGET_SKILL_COLLECTIONS) {
    const qualified = record.packages[collection.id];
    const obligations = derivePackageAcceptanceObligations(collection.id, migrations);
    assert.deepEqual(qualified.obligations, obligations, collection.id);
    assert.equal(qualified.status, 'pending');
    for (const agent of ['codex', 'claude-code', 'pi']) {
      const failure = qualified.hostResults[agent];
      assert.equal(failure.status, 'pending');
      const packagePath = agent === 'codex' ? collection.codexPackageRoot : agent === 'claude-code' ? collection.claudePackageRoot : collection.piPackageRoot;
      const payload = await captureManagedSkillPayload(join(root, packagePath));
      await assert.rejects(verifyAdoptionAcceptance({ repositoryRoot: root, auditPath: 'docs/validation/upstream-adoption-acceptance.json', packageId: collection.id, agent, ...obligations, revision: record.revision, version: record.version, payloadDigest: payload.payloadDigest, contentSha256: payload.snapshot.contentSha256 }), error => error.message === failure.observedRejection, `${collection.id}/${agent}`);
    }
  }
});

test('new response evidence keeps controls, frozen inputs and the mobile contract finding explicit', async () => {
  const root = new URL('../', import.meta.url).pathname;
  const json = async p => JSON.parse(await readFile(join(fixtureRoot, p)));
  const sha = b => createHash('sha256').update(b).digest('hex');
  const evidence = await json('lex12-noninstall-evidence.json');
  for (const [p, h] of Object.entries({ ...evidence.sourceSHA256, ...evidence.evidenceSHA256 })) assert.equal(sha(await readFile(join(root, p))), h, p);
  const protocol = await json('qualification-extra-protocol.json');
  const manifestBytes = await readFile(join(fixtureRoot, 'qualification-extra-inputs.json'));
  assert.equal(sha(manifestBytes), protocol.manifestSHA256);
  const manifest = JSON.parse(manifestBytes);
  const binding = await json('qualification-extra-captures/binding.json');
  assert.equal(binding.manifestSHA256, protocol.manifestSHA256);
  assert.deepEqual(binding.configuredControls, protocol.controls);
  assert.equal(protocol.tokenBudget, null);
  for (const [p, h] of Object.entries(manifest.sourceSHA256)) assert.equal(sha(await readFile(join(root, p))), h, p);
  for (const scenario of manifest.cases) {
    const base = `qualification-extra-captures/${scenario.id}`;
    const result = await json(`${base}/result.json`), telemetry = await json(`${base}/telemetry.json`);
    assert.equal(result.acceptedCapture, true, scenario.id);
    assert.equal(result.instructionSHA256, sha(manifest.instructions[scenario.instructionKey]));
    assert.deepEqual(result.envelope, JSON.parse(await readFile(join(fixtureRoot, base, 'response.md'))));
    assert.deepEqual(telemetry.effectiveControls, protocol.controls);
    assert.equal(telemetry.toolCount, 0); assert.deepEqual(telemetry.serverRequests, []);
    assert.equal(telemetry.processObservation.complete, true);
  }
  const review = await json('qualification-extra-review.json');
  assert.deepEqual(review.ratings.filter(r => r.qualified).map(r => r.id), evidence.behavior.qualified);
  assert.deepEqual(evidence.behavior.unqualified, ['B8']);
  assert.equal(review.ratings.find(r => r.id === 'B8').sourceContract, 'fail');
  const mobile = await json('qualification-extra-captures/B8/result.json');
  assert.match(mobile.envelope.response, /Skills used: \/qs-flow-handoff/);
  assert.match(mobile.envelope.response, /\$qs-skills:qs-plan-clarify/);
  assert.equal(evidence.behavior.finding.status, 'pending');
  assert.equal(evidence.retained.efficiencySHA256, sha(await readFile(join(fixtureRoot, 'evaluation-disposition.json'))));
  assert.ok(Object.values(evidence.packageAcceptance).every(p => p.status === 'pending'));
});

test('native source discovery distinguishes Claude loading, Codex metadata and Pi SDK from activation', async () => {
  const json = async p => JSON.parse(await readFile(join(fixtureRoot, 'qualification-native-discovery', p)));
  const source = await json('assessment.json');
  const marketplaceSuffix = '/codex/.agents/plugins/marketplace.json';
  assert.ok(source.codex.marketplacePath.endsWith(marketplaceSuffix));
  // Archived native observations keep their original checkout path when this repo moves.
  const root = source.codex.marketplacePath.slice(0, -marketplaceSuffix.length);
  const messages = file => file.stdout.flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } });
  const codex = await json('codex-native-source-corrected.json');
  const plugins = messages(codex).filter(m => m.result?.plugin).map(m => m.result.plugin);
  assert.equal(codex.modelRequests, 0); assert.equal(plugins.length, TARGET_SKILL_COLLECTIONS.length);
  for (const c of TARGET_SKILL_COLLECTIONS) {
    const plugin = plugins.find(p => p.summary.name === c.id);
    assert.equal(plugin.summary.source.path, join(root, c.codexPackageRoot));
    assert.equal(plugin.summary.localVersion, '4.4.7');
    assert.deepEqual(plugin.skills.map(s => s.name).sort(), c.publicCommands.map(n => codexPublicSkillLiteral(n).slice(1)).sort());
    for (const skill of plugin.skills) assert.ok(skill.path.startsWith(join(root, c.codexPackageRoot, 'skills') + '/'));
  }
  assert.equal(source.codex.skillsListSourcePathMatches, 0);
  const claude = await json('claude-debug.json');
  const commands = messages(claude).find(m => m.type === 'control_response').response.response.commands;
  const debug = await readFile(join(fixtureRoot, 'qualification-native-discovery/claude-native-loader.debug'), 'utf8');
  assert.equal(claude.modelRequests, 0);
  for (const c of TARGET_SKILL_COLLECTIONS) {
    assert.ok(debug.includes(`Plugin "${c.id}" from --plugin-dir overrides installed version`));
    for (const name of c.publicCommands) {
      assert.ok(debug.includes(`Loading from skillPath: ${join(root, c.claudePackageRoot, 'skills', name)}`), name);
      assert.ok(commands.some(command => command.name === `${c.id}:${name}` && command.aliases.includes(name)), name);
    }
  }
  assert.deepEqual(source.claude.nativeCommandNamesAddedVersusInstalledControl, []);
  const pi = await json('pi-native-loader.json');
  assert.equal(pi.modelRequests, 0);
  for (const c of TARGET_SKILL_COLLECTIONS) {
    const result = pi.results.find(r => r.collection === c.id).result;
    assert.deepEqual(result.skills.map(s => s.name).sort(), [...c.publicCommands].sort());
    assert.deepEqual(result.diagnostics, []);
  }
  assert.match(source.pi.classification, /SDK.*only/i);
  for (const pair of source.controlHashComparisons) assert.deepEqual(await json(pair.before), await json(pair.after));
  const exclusions = await json('archive-exclusions.json');
  assert.deepEqual(exclusions.map(e => e.path), ['latest']);
  await assert.rejects(readFile(join(fixtureRoot, 'qualification-native-discovery/latest')), { code: 'ENOENT' });
});

test('fresh bounded engine probes retain failed attempts and never become a fresh video render claim', async () => {
  const root = new URL('../', import.meta.url).pathname;
  const base = 'qualification-local-runtime';
  const json = async p => JSON.parse(await readFile(join(fixtureRoot, base, p)));
  const sha = b => createHash('sha256').update(b).digest('hex');
  const identity = await json('source-identities.json');
  for (const f of identity.sourceFiles) assert.equal(sha(await readFile(join(root, f.path))), f.sha256, f.path);
  assert.equal(identity.unlazyClosureEntriesVerified, 23);
  for (const f of identity.unlazyFiles) assert.equal(sha(await readFile(join(root, 'skills/engineering/qs-unlazy/modules/unlazy', f.path))), f.derivedSHA256, f.path);
  const results = await json('fresh-run/unlazy-results.json'), summary = await json('fresh-run/unlazy-summary.json');
  assert.deepEqual(results.map(r => r.status), [1, 0, 1, 0, 0, 1, 0, 1]);
  assert.ok(results.every(r => r.status === r.expected));
  assert.equal(summary.commands, 8); assert.equal(summary.allExpected, true);
  assert.equal(results.find(r => r.label === 'artifact-change-status-limit').status, 0);
  assert.equal(results.find(r => r.label === 'parent-reverify-detects-bad-artifact').status, 1);
  assert.match(results.find(r => r.label === 'abandonment').stdout, /HANDOFF REQUIRED/);
  const rows = await json('fresh-run/unlazy-project/rows.json');
  assert.equal(rows.reduce((n, row) => n + row.quantity * row.price, 0), 83);
  const gap = await json('video-preflight-gap.json');
  assert.equal(gap.status, 3); assert.equal(gap.fixtureUnchanged, true);
  assert.match(gap.stderr, /No automatic download or installation/);
  const retained = await json('retained-verification.json');
  assert.equal(retained.embeddedManifestEntriesVerified, 97);
  const evidence = JSON.parse(await readFile(join(fixtureRoot, 'lex12-noninstall-evidence.json')));
  assert.equal(evidence.runtime.video.freshRender, 'pending');
  assert.match(evidence.runtime.attemptHistory, /contaminated-store control failure/);
  assert.ok(evidence.retained.closures.every(c => c.status === 'unknown' && c.adoptedRevision === null));
});
