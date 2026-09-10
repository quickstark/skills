import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { PUBLIC_COMMANDS, COLLECTION_REGISTRY, validateSkillCollectionRegistryModel } from '../scripts/skill-collection-registry.mjs';
import { renderSkillOutputContract, renderDocumentationOutputContract } from '../scripts/sync-skill-output-contracts.mjs';

const command = PUBLIC_COMMANDS.find(({name}) => name === 'qs-deploy-prompt');
test('deployment generator is the eighth explicit specialist with its own output contract', () => {
  assert.equal(command.outputKind, 'goal-workflow-prompt');
  assert.equal(command.collectionId, 'qs-specialists');
  assert.equal(command.invocationPolicy, 'explicit');
  assert.equal(command.lifecycle.position, 200);
  assert.equal(command.continuation.maximumPrompts, 1);
  assert.deepEqual(command.continuation.normal, []);
  assert.deepEqual(command.continuation.failure.map(({name}) => name), ['qs-plan-clarify','qs-flow-handoff']);
  const output = renderSkillOutputContract(command);
  assert.match(output, /exactly one fenced `text` block containing the execution prompt/);
  assert.match(output, /beginning with the instruction to establish or resume the scoped goal before mutations/);
  assert.match(output, /Prompt generated; execution has not started/);
  assert.match(output, /do not emit an executable deployment prompt/);
  assert.doesNotMatch(output, /This release command is terminal/);
  assert.match(renderDocumentationOutputContract(command), /does not start a goal or deploy/);
});
test('registry refuses output-kind widening, omission and unknown values', () => {
  for (const alter of [
    (m) => {delete m.publicCommands.find(c => c.name === command.name).outputKind;},
    (m) => {m.publicCommands.find(c => c.name === 'qs-help').outputKind = 'goal-workflow-prompt';},
    (m) => {m.publicCommands.find(c => c.name === command.name).outputKind = 'execute-now';},
  ]) {
    const model = structuredClone(COLLECTION_REGISTRY); alter(model);
    assert.throws(() => validateSkillCollectionRegistryModel(model), /output kind/);
  }
  assert.equal(validateSkillCollectionRegistryModel(COLLECTION_REGISTRY),true);
});
test('canonical generator includes executable-prompt boundaries rather than side effects', async () => {
  const source = await readFile(new URL('../skills/engineering/qs-deploy-prompt/SKILL.md', import.meta.url),'utf8');
  for (const required of [/Do not create or update a goal/, /standing authorization/, /Missing material scope/, /one fenced text execution prompt/, /Never replace an unrelated goal/, /sixty seconds/, /selected target, and health/, /same artifact|artifact or revision/, /separate recovery root must already be authorized/, /rollback procedure/]) assert.match(source, required);
  // This checks source instructions only; actual model responses are recorded separately.
});

test('recorded model responses are bound to the current skill and rendered execution prompt', async () => {
  const { createHash } = await import('node:crypto');
  const { renderGoalWorkflowPrompt } = await import('../scripts/goal-workflow.mjs');
  const read = async (name) => JSON.parse(await readFile(new URL(`./fixtures/progress-deploy-agent-trials/${name}.json`, import.meta.url), 'utf8'));
  const sha = (value) => createHash('sha256').update(value).digest('hex');
  const generation = await read('generation');
  const source = await readFile(new URL('../skills/engineering/qs-deploy-prompt/SKILL.md', import.meta.url));
  assert.equal(generation.kind, 'recorded-agent-responses');
  assert.equal(generation.sourceSHA256, sha(source), 'Rerun generation trials after changing tested instructions');
  assert.deepEqual(generation.scenarios.map(s => s.id), ['G1','G2','G3','G4','G5','G6']);
  for (const scenario of generation.scenarios) {
    assert.ok(scenario.input && scenario.response);
    assert.deepEqual(scenario.requestedActions, [], 'Generating the prompt must not execute it');
  }
  const execution = await read('execution');
  const rendered = renderGoalWorkflowPrompt(await read('execution-input'));
  assert.equal(execution.kind, 'recorded-agent-responses');
  assert.equal(execution.prompt, rendered, 'Rerun execution trials after changing the rendered contract');
  assert.equal(execution.promptSha256, sha(rendered));
  assert.deepEqual(execution.scenarios.map(s => s.id), Array.from({length:9}, (_,i) => `E${i+1}`));
  for (const scenario of execution.scenarios) {
    assert.ok(scenario.input && scenario.response);
    assert.ok(Array.isArray(scenario.requestedActions));
  }
  // Integrity only: assertions cannot establish that prose follows instructions.
  // The parent agent reviewed the actual responses; see docs/validation/progress-deploy.md.
});
