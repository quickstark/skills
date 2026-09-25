import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(resolve(root, path), 'utf8');
const body = async (path) => (await read(path)).split('## Completion report and next steps')[0];
const capturePath = resolve(root, 'skills/engineering/qs-code-debug/scripts/hitl-loop.template.sh');
const capture = (input) => spawnSync('bash', [capturePath], { input, encoding: 'utf8' });

test('reproduction capture returns diagnostic categories and has a valid Bash program', () => {
  assert.equal(spawnSync('bash', ['-n', capturePath]).status, 0);
  for (const [failed, category] of [['n', 'none'], ['y', 'authorization'], ['y', 'network']]) {
    const result = capture(`\n${failed}\n${category}\n`);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, new RegExp(`ERRORED=${failed}\\nERROR_KIND=${category}\\n$`));
  }
});

test('auth-bearing observations are rejected without disclosure at either capture field', () => {
  const observations = [
    'Authorization: Bearer synthetic-token-123',
    'Cookie: session=synthetic-session-456',
    'https://example.invalid/download?signature=synthetic-signature-789',
    'synthetic-unlabelled-secret-abc',
    'y\u001b[2Jsynthetic-terminal-control',
  ];
  for (const observation of observations) {
    for (const input of [`\n${observation}\n`, `\ny\n${observation}\n`]) {
      const result = capture(input);
      assert.notEqual(result.status, 0);
      const output = result.stdout + result.stderr;
      assert.match(output, /Observation rejected/);
      assert.ok(!output.includes(observation), 'rejected input must never be echoed');
      assert.doesNotMatch(output, /--- Captured ---/, 'no successful capture report after rejection');
    }
  }
});

test('an incomplete human reproduction cannot produce a successful captured report', () => {
  for (const input of ['', '\n', '\ny\n']) {
    const result = capture(input);
    assert.notEqual(result.status, 0);
    assert.doesNotMatch(result.stdout, /--- Captured ---/);
  }
});

test('new conditional references resolve inside their owning skill and are not public commands', async () => {
  const skills = [
    'engineering/qs-setup', 'engineering/qs-design-prototype',
    'engineering/qs-flow-triage', 'engineering/qs-review-code',
    'engineering/qs-code-debug', 'productivity/qs-learn-teach', 'productivity/qs-skill-write',
  ];
  for (const skill of skills) {
    const path = `skills/${skill}/SKILL.md`;
    const text = await body(path);
    const targets = [...text.matchAll(/\]\(([^)]+)\)/g)].map((match) => match[1]);
    assert.ok(targets.length > 0, `${skill} has no reachable conditional resources`);
    for (const target of targets) {
      const resolved = resolve(root, `skills/${skill}`, target);
      assert.ok(resolved.startsWith(`${resolve(root, `skills/${skill}`)}/`));
      const reference = await readFile(resolved, 'utf8');
      assert.doesNotMatch(reference, /^---\nname:/, `${resolved} must stay a private reference`);
    }
  }
});

test('retained helper text cannot reintroduce the known authority and routing contradictions', async () => {
  const help = await body('skills/engineering/qs-help/SKILL.md');
  const handoff = await body('skills/productivity/qs-flow-handoff/SKILL.md');
  const glossary = await read('skills/productivity/qs-skill-write/GLOSSARY.md');
  assert.doesNotMatch(`${help}\n${handoff}\n${glossary}`, /three (?:ranked copy-ready continuations|commands)|two (?:concise|useful) alternatives|description\*\* stripped/);
  for (const name of ['UI.md', 'LOGIC.md']) {
    const content = await read(`skills/engineering/qs-design-prototype/${name}`);
    assert.doesNotMatch(content, /Fold the winner into the real code|promote the winning variant to a real route|logic module shouldn't be|Don't add tests/);
  }
  const triage = await read('skills/engineering/qs-flow-triage/OUT-OF-SCOPE.md');
  assert.doesNotMatch(triage, /^- Delete the `.out-of-scope\/` file$/m);
});

// These are source-contract regressions, not substitutes for model behavior trials.
test('source contracts preserve migration ordering and independent oracles without blanket bans', async () => {
  const decomposition = await read('skills/internal/ticket-decomposition.md');
  assert.match(decomposition, /Every caller-migration batch depends on that expansion/);
  assert.match(decomposition, /only after every migration batch and a no-remaining-callers check pass/);
  assert.match(decomposition, /Every batch blocks one final integrate-and-verify outcome/);
  for (const path of ['skills/internal/tdd-loop.md', 'skills/engineering/qs-test-author/SKILL.md']) {
    const content = await read(path);
    assert.match(content, /independently/);
    assert.match(content, /known-bad control/);
    assert.match(content, /retain legitimate absence, configuration and structural contract tests/i);
  }
});
