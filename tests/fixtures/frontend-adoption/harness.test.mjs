import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, readFile, writeFile, mkdir, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fixtureRoot, freeze, verify, validateSchedule, buildPrompt, reviewerBundle, manifest, execute } from '../../../scripts/frontend-adoption-trials.mjs';
import { observe } from './browser-observe.mjs';

const parse = async path => JSON.parse(await readFile(path, 'utf8'));
test('matched schedule rejects an omitted repetition and freezes all seven originals/four roots', async () => {
  const cases = await parse(join(fixtureRoot, 'scenarios.json')), schedule = await parse(join(fixtureRoot, 'schedule.json'));
  validateSchedule(cases, schedule);
  assert.throws(() => validateSchedule(cases, schedule.slice(1)), /66/);
  const duplicated = structuredClone(schedule); duplicated[1] = { ...duplicated[0], trialId: 'different-id' };
  assert.throws(() => validateSchedule(cases, duplicated), /Unmatched/);
  assert.equal(new Set(cases.map(c => c.originalSource)).size, 7);
  assert.equal(new Set(cases.map(c => c.localRoot)).size, 4);
});

test('every prompt binds all common scope facts and candidate references; reviewer gets the same facts', async () => {
  const sources = await parse(join(fixtureRoot, 'sources/index.json')), common = await parse(join(fixtureRoot, 'common-scope.json'));
  const cases = await parse(join(fixtureRoot, 'scenarios.json'));
  for (const scenario of cases) for (const variant of ['v31', 'v84']) {
    const input = await buildPrompt({ root: fixtureRoot, sources, common, scenario, variant, cwd: '/tmp/fixture' });
    const exactFacts = input.prompt.split('<all_common_scope_facts>\n\n')[1].split('\n\n</all_common_scope_facts>')[0];
    assert.deepEqual(JSON.parse(exactFacts), common);
    assert.equal(input.instructions.length, variant === 'v31' ? 1 : 1 + scenario.references.length);
    assert.ok(input.instructions.every(i => i.bytes > 0 && i.sha256 === sources[i.key].sha256));
  }
  const directory = await mkdtemp(join(tmpdir(), 'qs-frontend-review-test-'));
  for (const folder of ['before', 'after']) { await mkdir(join(directory, folder)); await writeFile(join(directory, folder, 'index.html'), '<button id="exact-input">Real artifact</button>'); }
  await writeFile(join(directory, 'response.md'), 'Actual response fixture'); await writeFile(join(directory, 'events.jsonl'), '{"type":"turn.completed"}\n');
  const before = await manifest(join(directory, 'before')), after = await manifest(join(directory, 'after'));
  const review = await reviewerBundle({ root: fixtureRoot, directory, scenario: cases[0], common, before, after, trialId: 'test-only', telemetry: { toolItems: [], exitCode: 0, completedTurn: true }, browserStatus: 'unavailable' });
  const context = await parse(join(review, 'context.json'));
  assert.deepEqual(context.commonScope, common);
  assert.equal(context.task.originalSource, undefined); assert.equal(context.task.localRoot, undefined);
  assert.equal(await readFile(join(review, 'input-project/index.html'), 'utf8'), '<button id="exact-input">Real artifact</button>');
  assert.equal(context.browserStatus, 'unavailable');
});

test('frozen source mutation is detected before any model execution', async () => {
  const root = await mkdtemp(join(tmpdir(), 'qs-frontend-freeze-test-'));
  await cp(fixtureRoot, root, { recursive: true, filter: path => !path.endsWith('/plan.json') && !path.endsWith('/pilot-attempt.json') });
  await freeze({ root }); await verify(root);
  await writeFile(join(root, 'sources/original-minimalist-ui.md'), 'deliberate missing original behavior');
  await assert.rejects(verify(root), /Frozen input changed/);
});

test('supervisor retains forbidden tool evidence and terminates observed owned descendants', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'qs-frontend-supervisor-control-'));
  const executable = join(directory, 'fake-cli.cjs');
  await writeFile(executable, '#!/usr/bin/env node\nconst {spawn}=require("node:child_process"); spawn(process.execPath,["-e","setInterval(()=>{},1000)"],{stdio:"ignore"}); setTimeout(()=>{console.log(JSON.stringify({type:"item.started",item:{id:"forbidden",type:"command_execution",command:"fixture-only"}}));},300);setInterval(()=>{},1000);\n');
  await chmod(executable, 0o755);
  const result = await execute({ prompt: 'Fixture only', cwd: directory, directory, executable, scenario: { mode: 'prompt-only', budget: { timeoutMs: 5000, maximumImageCalls: 0 } } });
  assert.equal(result.stopReason, 'Tool event observed in response-only task');
  assert.equal(result.toolCount, 1); assert.equal(result.completedTurn, false);
  assert.equal(result.observedOwnedResidualProcesses.length, 0);
  assert.match(await readFile(join(directory, 'events.jsonl'), 'utf8'), /fixture-only/);
});

test('real browser observations distinguish broken input from deliberate accessibility repair', { skip: !process.env.FRONTEND_BROWSER || !process.env.FRONTEND_PUPPETEER }, async () => {
  const root = await mkdtemp(join(tmpdir(), 'qs-frontend-browser-control-'));
  const project = join(root, 'project'); await cp(join(fixtureRoot, 'assets/project'), project, { recursive: true });
  const paths = { browserPath: process.env.FRONTEND_BROWSER, puppeteerPath: process.env.FRONTEND_PUPPETEER };
  const original = await observe({ project, output: join(root, 'broken'), ...paths });
  assert.ok(original.views.narrow.scrollWidth > 390);
  assert.equal(original.keyboardSubmission.reachedJoin, false);
  assert.equal(original.views.narrow.controls.find(c => c.id === 'member-email').labels.length, 0);
  assert.ok(original.reducedMotion.elements.some(e => e.id === 'member-count' && e.animationName !== 'none'));
  let html = await readFile(join(project, 'index.html'), 'utf8');
  html = html.replace('<input id="member-email"', '<label for="member-email">Email address</label><input id="member-email"').replace('<div id="join-button"', '<button type="submit" id="join-button"').replace('Continue with family membership</div>', 'Continue with family membership</button>');
  await writeFile(join(project, 'index.html'), html);
  await writeFile(join(project, 'style.css'), (await readFile(join(project, 'style.css'), 'utf8')) + '\nheader,footer,nav,.metrics{flex-wrap:wrap}main{min-width:0}#membership-panel{grid-template-columns:1fr}input{max-width:100%;box-sizing:border-box}:focus-visible{outline:3px solid #086b64}@media(prefers-reduced-motion:reduce){*{animation:none!important}}');
  const repaired = await observe({ project, output: join(root, 'repaired'), ...paths });
  assert.ok(repaired.views.narrow.scrollWidth <= 390);
  assert.equal(repaired.keyboardSubmission.reachedJoin, true);
  assert.deepEqual(repaired.keyboardSubmission.events, [{ name: 'join_started', plan: 'family' }]);
  assert.equal(repaired.keyboardSubmission.message, 'Ready to continue with Family membership.');
  assert.equal(repaired.views.narrow.controls.find(c => c.id === 'member-email').labels[0], 'Email address');
  assert.equal(repaired.reducedMotion.elements.find(e => e.id === 'member-count').animationName, 'none');
  assert.equal(repaired.invalidEmail.valid, false);
});
