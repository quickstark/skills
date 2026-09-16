import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { PUBLIC_COMMANDS, COLLECTION_REGISTRY, validateSkillCollectionRegistryModel } from '../scripts/skill-collection-registry.mjs';
import { renderSkillOutputContract, renderDocumentationOutputContract } from '../scripts/sync-skill-output-contracts.mjs';
import { PUBLIC_PROGRESS_CONTRACT, HELPER_PROGRESS_CONTRACT } from '../scripts/progress-reporting-contract.mjs';

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
  const generation = await read('generation-percentage');
  const source = await readFile(new URL('../skills/engineering/qs-deploy-prompt/SKILL.md', import.meta.url));
  assert.equal(generation.kind, 'recorded-agent-responses');
  assert.equal(generation.sourceSHA256, sha(source), 'Rerun generation trials after changing tested instructions');
  assert.deepEqual(generation.scenarios.map(s => s.id), ['G1','G2','G3','G4','G5','G6']);
  assert.deepEqual(generation.scenarios.map(({id,input}) => ({id,input})), (await read('generation')).scenarios.map(({id,input}) => ({id,input})), 'Historical readiness scenarios must remain covered');
  for (const scenario of generation.scenarios) {
    assert.ok(scenario.input && scenario.response);
    assert.deepEqual(scenario.requestedActions, [], 'Generating the prompt must not execute it');
  }
  const execution = await read('execution-percentage');
  const rendered = renderGoalWorkflowPrompt(await read('execution-input'));
  assert.equal(execution.kind, 'recorded-agent-responses');
  assert.equal(execution.prompt, rendered, 'Rerun execution trials after changing the rendered contract');
  assert.equal(execution.promptSha256, sha(rendered));
  assert.equal(execution.publicContractSHA256, sha(PUBLIC_PROGRESS_CONTRACT), 'Rerun standalone trial after changing public instructions');
  assert.equal(execution.helperContractSHA256, sha(HELPER_PROGRESS_CONTRACT), 'Rerun helper trial after changing helper instructions');
  assert.deepEqual(execution.scenarios.map(s => s.id), [
    ...Array.from({length:9}, (_,i) => `E${i+1}`),
    ...Array.from({length:10}, (_,i) => `P${i+1}`),
  ]);
  assert.deepEqual(execution.scenarios.slice(0, 9).map(({id,input}) => ({id,input})), (await read('execution')).scenarios.map(({id,input}) => ({id,input})), 'Historical authority and release scenarios must remain covered');
  for (const scenario of execution.scenarios) {
    assert.ok(scenario.input && scenario.response);
    assert.ok(Array.isArray(scenario.requestedActions));
  }
  // Integrity only: assertions cannot establish that prose follows instructions.
  // The parent agent reviewed the actual responses; see docs/validation/progress-deploy.md.
});

test('recorded generation keeps reporting rules inside its sole executable prompt and blocks missing inputs', async () => {
  const record = JSON.parse(await readFile(new URL('./fixtures/progress-deploy-agent-trials/generation-percentage.json', import.meta.url), 'utf8'));
  for (const scenario of record.scenarios) {
    const prompts = [...scenario.response.matchAll(/```text\n([\s\S]*?)\n```/g)].map(match => match[1]);
    if (['G1', 'G2', 'G5'].includes(scenario.id)) {
      assert.equal(prompts.length, 1, scenario.id);
      const prompt = prompts[0];
      assert.match(prompt, /^Establish or resume/i, scenario.id);
      for (const rule of [/Stage estimate:/i, /Overall estimate:/i, /weight/i, /95%/, /100%/, /resum/i, /sixty|60/, /health/i, /reopen/i]) assert.match(prompt, rule, scenario.id);
      assert.match(scenario.response, /Prompt generated; execution has not started\./);
    } else {
      assert.match(scenario.response, /Status: Input required/, scenario.id);
      assert.equal(prompts.length, 0, scenario.id);
    }
  }
});

test('recorded percentage trials retain weighted progress through waiting, skips, reopening and resumption', async () => {
  const record = JSON.parse(await readFile(new URL('./fixtures/progress-deploy-agent-trials/execution-percentage.json', import.meta.url), 'utf8'));
  const byId = Object.fromEntries(record.scenarios.map(s => [s.id, s]));
  const percentage = (id, label) => {
    const match = byId[id].response.match(new RegExp(`${label} estimate:\\s*~?(\\d+)%`, 'i'));
    assert.ok(match, `${id}: ${label} estimate required`);
    return Number(match[1]);
  };
  // These are independently computed fixture outcomes, not implementation math.
  // Model compliance beyond these numbers is reviewed separately in the evidence doc.
  for (const [id, expected] of Object.entries({P1:30,P2:30,P3:30,P4:85,P5:30,P6:60,P8:60,P9:85})) {
    assert.equal(percentage(id, 'Overall'), expected, id);
  }
  assert.equal(percentage('P1', 'Stage'), 50);
  assert.equal(percentage('P2', 'Stage'), 50);
  assert.ok(percentage('P7', 'Stage') <= 95);
  assert.ok(percentage('P7', 'Overall') <= 95);
  assert.match(byId.P3.response, /reopen|invalid|decreas|lower/i);
  assert.doesNotMatch(byId.P10.response, /Stage estimate:|Overall estimate:|Skills used:|Status:/);
});
