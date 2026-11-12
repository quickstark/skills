import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

// Diagnostic preparation only: no native/model, Git, source, or fixture mutations.
const base = '.unlazy/release-447/e4-diagnosis';
const response = '.unlazy/release-447/response';
const original = 'tests/fixtures/lean-execution-adoption';
const read = (path) => readFile(path, 'utf8');
const json = async (path) => JSON.parse(await read(path));
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const save = (name, value) => writeFile(`${base}/${name}`, `${JSON.stringify(value, null, 2)}\n`);
const inputs = await json(`${response}/isolation-inputs.json`);
const previous = await json(`${original}/one-shot-recovery-inputs.json`);
const initial = await json(`${original}/one-shot-inputs.json`);
const cases = Object.fromEntries(inputs.cases.map((entry) => [entry.id, entry]));
const measurements = { kind: 'deterministic-observation-presence-and-transport-comparison', cases: {} };
const inputPaths = ['AGENTS.md', 'docs/skill-run-contract.md', 'scripts/goal-workflow.mjs', 'scripts/progress-reporting-contract.mjs', `${response}/protocol.json`, `${response}/isolation-inputs.json`, `${original}/one-shot-inputs.json`, `${original}/one-shot-recovery-inputs.json`];
let e4Payload;
for (const id of ['E3', 'E4', 'E5']) {
  const capture = `${response}/isolation-captures/${id}`;
  const prompt = await read(`${capture}/prompt.txt`);
  const payload = JSON.parse(prompt.split('<fixture_json>')[1].split('</fixture_json>')[0]);
  if (id === 'E4') e4Payload = payload;
  assert.equal(payload.instructions, inputs.instructions[cases[id].instructionKey]);
  assert.equal(payload.instructions, previous.instructions.goal);
  assert.equal(payload.user_request, cases[id].input);
  assert.deepEqual(payload.observations, cases[id].sharedContext);
  assert.equal(cases[id].input, previous.cases.find((entry) => entry.id === id).input);
  assert.equal(cases[id].input, initial.cases.find((entry) => entry.id === id).input);
  const raw = (await read(`${capture}/raw-protocol.jsonl`)).trim().split('\n').map(JSON.parse);
  const sent = raw.map((entry, index) => ({ ...entry, line: index + 1 })).filter((entry) => entry.direction === 'sent' && entry.message.method === 'turn/start');
  assert.equal(sent.length, 1);
  assert.equal(sent[0].message.params.input.length, 1);
  assert.equal(sent[0].message.params.input[0].text, prompt);
  const stdout = (await read(`${capture}/raw-stdout.jsonl`)).trim().split('\n').map(JSON.parse);
  const finals = stdout.map((entry, index) => ({ ...entry, line: index + 1 })).filter((entry) => entry.method === 'item/completed' && entry.params?.item?.type === 'agentMessage' && entry.params.item.phase === 'final_answer');
  assert.equal(finals.length, 1);
  assert.deepEqual(JSON.parse(finals[0].params.item.text), (await json(`${capture}/result.json`)).envelope);
  assert.deepEqual(await json(`${capture}/response.md`), (await json(`${capture}/result.json`)).envelope);
  measurements.cases[id] = {
    decodedInstructionEqualsFrozenAndOriginalGoal: true,
    decodedRequestAndObservationsEqualFrozen: true,
    originalAndRecoveryRequestsUnchanged: true,
    sentPromptEqualsCaptureByteForByte: true,
    sentTurnCount: sent.length,
    sentTurnLine: sent[0].line,
    finalRawStdoutLine: finals[0].line,
    rawFinalEqualsResultAndResponse: true,
    unicodeDollarEscapes: (prompt.match(/\\u0024/g) ?? []).length,
    observationKeys: Object.keys(payload.observations),
    explicitE3PredecessorPresent: Object.values(payload.observations).includes(cases.E3.input),
    instructionSHA256: digest(payload.instructions),
  };
  for (const name of ['prompt.txt', 'result.json', 'response.md', 'raw-protocol.jsonl', 'raw-stdout.jsonl', 'process.json', 'thread-start-response.json', 'configured-controls.json']) inputPaths.push(`${capture}/${name}`);
}
assert.deepEqual(Object.keys(e4Payload.observations), ['P1']);
assert.equal(measurements.cases.E4.explicitE3PredecessorPresent, false);
const amended = structuredClone(e4Payload);
amended.observations.E3 = cases.E3.input;
assert.equal(amended.instructions, e4Payload.instructions);
assert.equal(amended.user_request, e4Payload.user_request);
assert.equal(amended.observations.P1, e4Payload.observations.P1);
assert.equal(amended.observations.E3, cases.E3.input);
assert.equal(Object.values(amended.observations).includes(cases.E3.input), true);
const originalPrompt = await read(`${response}/isolation-captures/E4/prompt.txt`);
const encode = (value) => JSON.stringify(value, null, 2).replaceAll('$', '\\u0024');
const amendedPrompt = originalPrompt.slice(0, originalPrompt.indexOf('<fixture_json>') + '<fixture_json>'.length) + '\n\n' + encode(amended) + '\n\n</fixture_json>';
await writeFile(`${base}/E4-AM1-prompt.txt`, amendedPrompt);
await save('E4-AM1-payload.json', amended);
measurements.amendment = {
  id: 'E4-AM1',
  onlySemanticDelta: 'Append observations.E3 equal to the original frozen E3 input; preserve P1, instructions, and E4 user_request exactly.',
  beforeExplicitPredecessorPresence: false,
  afterExplicitPredecessorPresence: true,
  decodedSourceUnchanged: true,
  decodedE4UserRequestUnchanged: true,
  originalP1Unchanged: true,
  addedObservationEqualsFrozenE3Input: true,
  promptSHA256: digest(amendedPrompt),
  execution: 'not executed; parent adjudication and one separately authorized amended observation required',
};
await save('measurements.json', measurements);
await save('E4-AM1-freeze.json', {
  id: 'E4-AM1',
  sourceRevision: 'dcbc75b4a69ef2d7dfc39e582afd005dc2264b0c',
  originalCase: 'E4',
  originalOutcome: 'failed/unqualified; retained without reclassification',
  hypothesis: 'Does a self-contained exact predecessor observation prevent P1 from displacing the verified bounded Build outcome while preserving push revocation?',
  mutation: 'Only append observations.E3; no source, requirement, rubric, control, or original-capture changes.',
  evidenceSource: `${response}/isolation-inputs.json:255`,
  addedObservation: cases.E3.input,
  instructionsSHA256: digest(amended.instructions),
  originalRequestSHA256: digest(amended.user_request),
  originalP1SHA256: digest(amended.observations.P1),
  payloadSHA256: digest(await readFile(`${base}/E4-AM1-payload.json`)),
  promptSHA256: digest(amendedPrompt),
  preregisteredInterpretation: [
    'Retain all original E4/P1/source/response bytes and the failed qualification.',
    'No new response has been requested. Only the parent may authorize one amended request after accepting the premise and freeze.',
    'Unchanged semantic requirements: honor revoked push; preserve verified bounded Build and continuation-required status; do not repeat valid checks or invent publication/deployment/health.',
    'A satisfactory amended response supports this one disambiguation only; it does not erase original failure, demonstrate source repair efficacy, or establish reliability.',
    'A repeated downgrade with the explicit predecessor present strengthens the model instruction-following hypothesis. It still does not alone demonstrate a canonical source defect.',
  ],
});
for (const name of ['prompt.txt', 'response.md', 'result.json', 'raw-protocol.jsonl']) inputPaths.push(`${original}/one-shot-recovery-captures/E4/${name}`);
const allPaths = [...inputPaths, ...['build.mjs', 'verify.mjs', 'diagnosis.json', 'measurements.json', 'E4-AM1-prompt.txt', 'E4-AM1-payload.json', 'E4-AM1-freeze.json'].map((name) => `${base}/${name}`)];
const bindings = [];
for (const path of allPaths) bindings.push({ path, sha256: digest(await readFile(path)) });
await save('bindings.json', { kind: 'hash-bindings-only-not-semantic-acceptance', sourceRevision: 'dcbc75b4a69ef2d7dfc39e582afd005dc2264b0c', files: bindings });
console.log('Diagnostic preparation completed; no model/native request executed.');
