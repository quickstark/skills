import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import test from 'node:test';
import { PUBLIC_COMMANDS, SKILL_COLLECTIONS } from '../scripts/skill-collection-registry.mjs';
import { V3_SKILL_DISPOSITIONS_BY_NAME } from '../scripts/qs-skill-catalog.mjs';

test('repository cleanup is one explicit specialist with no publication continuation', () => {
  const command = PUBLIC_COMMANDS.find(item => item.name === 'qs-repo-cleanup');
  assert.ok(command);
  assert.equal(command.collectionId, 'qs-specialists');
  assert.equal(command.invocationPolicy, 'explicit');
  assert.equal(command.codexLiteral, '$qs-specialists:qs-repo-cleanup');
  assert.equal(command.resultContext.specProgress, true);
  assert.equal(command.lifecycle.position, 210);
  assert.equal(command.continuation.automaticPublicSkillHops, false);
  for (const route of [...command.continuation.normal, ...command.continuation.failure]) {
    assert.ok(['qs-review-code', 'qs-plan-clarify', 'qs-code-debug', 'qs-flow-handoff'].includes(route.name));
  }
  assert.equal(V3_SKILL_DISPOSITIONS_BY_NAME['qs-repo-cleanup'], undefined);
  assert.equal(PUBLIC_COMMANDS.filter(item => item.collectionId === 'qs-skills').length, 12);
  assert.equal(PUBLIC_COMMANDS.filter(item => item.collectionId === 'qs-specialists').length, 9);
  assert.equal(PUBLIC_COMMANDS.length, 39);
});

const evidenceRoot = new URL('./fixtures/repo-cleanup/evidence/current/', import.meta.url);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const jsonFile = url => JSON.parse(readFileSync(url, 'utf8'));
const responseText = base => {
  const capture = jsonFile(new URL('response.json', base));
  assert.equal(capture.encoding, 'utf-8');
  assert.equal(digest(Buffer.from(capture.text, 'utf8')), capture.sha256);
  return capture.text;
};
const changed = state => [...new Set([...Object.keys(state.before), ...Object.keys(state.after)])]
  .filter(path => JSON.stringify(state.before[path]) !== JSON.stringify(state.after[path])).sort();

test('fresh model evidence binds the current instructions and actual preserved filesystem state', () => {
  const review = jsonFile(new URL('review.json', evidenceRoot));
  const source = readFileSync(new URL('../skills/engineering/qs-repo-cleanup/SKILL.md', import.meta.url));
  assert.equal(review.sourceSHA256, digest(source));
  const cases = jsonFile(new URL('./fixtures/repo-cleanup/scenarios.json', import.meta.url));
  assert.deepEqual(review.cases.map(c => c.id).sort(), cases.map(c => c.id).sort());
  for (const c of cases) {
    const base = new URL(`${c.id}/`, evidenceRoot);
    const state = jsonFile(new URL('state.json', base));
    const telemetry = jsonFile(new URL('telemetry.json', base));
    const verdict = review.cases.find(item => item.id === c.id);
    const capture = jsonFile(new URL('capture.json', base));
    const bindingURL = new URL(capture.binding, evidenceRoot);
    const binding = jsonFile(bindingURL);
    assert.equal(binding.sourceSHA256, review.sourceSHA256);
    assert.equal(binding.sourceSHA256, digest(readFileSync(new URL('SKILL.md', bindingURL))));
    assert.equal(binding.runnerSHA256, digest(readFileSync(new URL('runner.mjs', bindingURL))));
    const frozenScenarios = readFileSync(new URL('scenarios.json', bindingURL));
    assert.equal(binding.scenariosSHA256, digest(frozenScenarios));
    assert.deepEqual(JSON.parse(frozenScenarios).find(item => item.id === c.id), c);
    assert.equal(state.fixtureSHA256, digest(JSON.stringify(c)), c.id);
    assert.equal(state.sourceSHA256, review.sourceSHA256, c.id);
    assert.equal(state.transportPassed, true, c.id);
    assert.equal(telemetry.completedTurn, true, c.id);
    assert.equal(telemetry.timedOut, false, c.id);
    assert.equal(telemetry.stopReason, null, c.id);
    assert.deepEqual(telemetry.observedOwnedResidualProcesses, [], c.id);
    assert.equal(telemetry.processObservation.complete, true, c.id);
    assert.equal(telemetry.promptSHA256, digest(readFileSync(new URL('prompt.txt', base))));
    assert.equal(telemetry.runtimeFiles.events, digest(readFileSync(new URL('events.jsonl', base))));
    assert.equal(verdict.responseSHA256, digest(responseText(base)));
    assert.equal(verdict.stateSHA256, digest(readFileSync(new URL('state.json', base))));
    const afterFiles = jsonFile(new URL('after-files.json', base));
    assert.deepEqual(Object.keys(afterFiles).sort(), Object.keys(state.after).sort());
    for (const [path, content] of Object.entries(afterFiles)) {
      if (state.after[path].link) assert.deepEqual(content, { link: state.after[path].link });
      else assert.equal(digest(content), state.after[path].sha256, `${c.id}: ${path}`);
    }
    assert.equal(verdict.passed, true, `${c.id}: ${verdict.reason}`);
    assert.ok(verdict.reason.length > 30, c.id);
    assert.deepEqual(state.outsideAfter, state.outsideBefore, c.id);
    assert.doesNotMatch(responseText(base), /synthetic-private-marker/);
    assert.doesNotMatch(readFileSync(new URL('events.jsonl', base), 'utf8'), /synthetic-private-marker/);
    if (c.mode === 'response-only') {
      assert.equal(telemetry.toolCount, 0, c.id);
      assert.deepEqual(state.after, state.before, c.id);
    }
  }
  const covered = new Set(review.cases.flatMap(c => c.acceptance));
  for (let n = 1; n <= 17; n++) assert.ok(covered.has(`AC${String(n).padStart(2, '0')}`));
});

test('live cleanup removed only the retired files and verified disposable cache', () => {
  const base = new URL('T02-clean/', evidenceRoot);
  const state = jsonFile(new URL('state.json', base));
  const after = jsonFile(new URL('after-files.json', base));
  const removed = ['src/retired.mjs', 'scripts/retired.mjs', 'assets/retired.svg', 'tests/retired.test.mjs', 'tests/retired.fixture', '.cache/generated.txt'];
  assert.deepEqual(changed(state), [...removed, 'README.md', '.gitignore'].sort());
  for (const path of removed) assert.equal(state.after[path], undefined, path);
  for (const path of ['.env', '.npmrc', 'local.db', 'certificate.crt', 'backup.bak', 'src/public.mjs', 'src/dynamic.mjs', 'src/dirty.mjs', 'user-note.txt', 'src/duplicate.mjs', 'dist/release.js', 'nested/retired.mjs', 'docs/adr/0001.md', 'docs/acceptance.md']) {
    assert.deepEqual(state.after[path], state.before[path], path);
  }
  assert.match(after['README.md'], /node tools\/verify\.mjs/);
  assert.match(after['README.md'], /docs\/current\.md/);
  const directory = mkdtempSync(join(tmpdir(), 'qs-ignore-acceptance-'));
  try {
    execFileSync('git', ['init', '--quiet', directory]);
    writeFileSync(join(directory, '.gitignore'), after['.gitignore']);
    mkdirSync(join(directory, '.cache/examples'), { recursive: true });
    for (const [path, ignored] of [['.cache/generated.txt', true], ['.cache/nested/generated.txt', true], ['.env.example', false], ['src/live.mjs', false], ['.cache/examples/keep.txt', false]]) {
      const result = spawnSync('git', ['check-ignore', '--no-index', '--quiet', path], { cwd: directory });
      assert.equal(result.status, ignored ? 0 : 1, path);
    }
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('dependency trials remove only unused direct entries and revert unrelated resolution churn', () => {
  const success = new URL('T03-dependency/', evidenceRoot);
  const state = jsonFile(new URL('state.json', success));
  const after = jsonFile(new URL('after-files.json', success));
  assert.deepEqual(changed(state), ['fixture-lock.json', 'package.json']);
  const fixture = jsonFile(new URL('./fixtures/repo-cleanup/scenarios.json', import.meta.url)).find(c => c.id === 'T03-dependency');
  const expected = JSON.parse(fixture.files['package.json']).dependencies;
  delete expected.unused;
  assert.deepEqual(JSON.parse(after['package.json']).dependencies, expected);
  assert.deepEqual(JSON.parse(after['fixture-lock.json']).dependencies, expected);
  const failure = jsonFile(new URL('T04-lock-churn/state.json', evidenceRoot));
  assert.deepEqual(failure.after, failure.before, 'unexpected upgrades must be reversed losslessly');
});

test('failed cleanup is recovered without hiding baseline failure; repeated clean is a no-op', () => {
  for (const id of ['T05-recovery', 'T07-noop']) {
    const state = jsonFile(new URL(`${id}/state.json`, evidenceRoot));
    assert.deepEqual(state.after, state.before, id);
  }
  const response = responseText(new URL('T05-recovery/', evidenceRoot));
  assert.match(response, /baseline/i);
  assert.match(response, /failed|input required|continuation required/i);
  assert.match(responseText(new URL('T07-noop/', evidenceRoot)), /no.op|no changes|unchanged/i);
});

test('a concurrent edit invalidates deletion while independent cache cleanup proceeds', () => {
  const base = new URL('T08-concurrent-guard/', evidenceRoot);
  const state = jsonFile(new URL('state.json', base));
  const after = jsonFile(new URL('after-files.json', base));
  assert.deepEqual(changed(state), ['.cache/disposable', 'candidate.txt']);
  assert.equal(after['candidate.txt'], 'USER_CONCURRENT_EDIT\n');
  assert.equal(state.after['.cache/disposable'], undefined);
  assert.match(readFileSync(new URL('events.jsonl', base), 'utf8'), /injected concurrent user edit/);
  assert.match(responseText(base), /concurrent/i);
});

test('influence pins and the rejected initial trial remain distinct from current acceptance', () => {
  const influences = jsonFile(new URL('./fixtures/repo-cleanup/influences.json', import.meta.url));
  assert.equal(influences.sources.length, 4);
  for (const source of influences.sources) {
    assert.match(source.reviewedRevision, /^[a-f0-9]{40}$/);
    assert.match(source.originalSHA256, /^[a-f0-9]{64}$/);
    assert.match(source.licenseEvidence.sha256, /^[a-f0-9]{64}$/);
    assert.equal(source.adoptedRevision, null);
    assert.match(source.disposition, /inspiration-only/);
  }
  const old = new URL('../rejected-initial/', evidenceRoot);
  const review = jsonFile(new URL('review.json', old));
  assert.equal(review.passed, false);
  assert.notEqual(review.sourceSHA256, jsonFile(new URL('review.json', evidenceRoot)).sourceSHA256);
  assert.equal(review.eventsSHA256, digest(readFileSync(new URL('T02-clean/events.jsonl', old))));
  assert.equal(review.promptSHA256, digest(readFileSync(new URL('T02-clean/prompt.txt', old))));
});

test('cleanup source, metadata and isolated package copies preserve the explicit boundary', () => {
  const source = readFileSync(new URL('../skills/engineering/qs-repo-cleanup/SKILL.md', import.meta.url), 'utf8');
  const metadata = readFileSync(new URL('../skills/engineering/qs-repo-cleanup/agents/openai.yaml', import.meta.url), 'utf8');
  assert.match(source, /^disable-model-invocation: true$/m);
  assert.match(metadata, /allow_implicit_invocation: false/);
  assert.match(metadata, /\$qs-specialists:qs-repo-cleanup/);
  for (const collection of SKILL_COLLECTIONS) {
    if (collection.id !== 'qs-specialists') continue;
    for (const root of [collection.claudePackageRoot, collection.piPackageRoot]) {
      assert.equal(readFileSync(new URL(`../${root}/skills/qs-repo-cleanup/SKILL.md`, import.meta.url), 'utf8'), source);
    }
    const codex = readFileSync(new URL(`../${collection.codexPackageRoot}/skills/qs-repo-cleanup/SKILL.md`, import.meta.url), 'utf8');
    assert.equal(codex, source.replace(/^disable-model-invocation: true\n/m, ''));
  }
});
