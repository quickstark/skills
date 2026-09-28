import test from 'node:test';
import assert from 'node:assert/strict';
import { NativeTranscript } from '../../../scripts/frontend-native-capture.mjs';

function make(mode = 'implementation') {
  const events = [], failures = [];
  const transcript = new NativeTranscript({ emit: event => events.push(event), fail: reason => failures.push(reason), scenario: { mode, budget: { maximumImageCalls: 1 } } });
  const emitItem = item => transcript.accept({ method: 'item/completed', params: { item } });
  return { transcript, events, failures, emitItem };
}

test('function-call output retains native name/namespace/output and positive image evidence', () => {
  const x = make();
  const item = { type: 'functionCallOutput', id: 'fn-1', name: 'imagegen', namespace: 'functions', output: [{ type: 'input_image', image_url: 'data:image/png;base64,fixture' }] };
  x.emitItem(item); x.emitItem(item);
  assert.deepEqual(x.failures, []); assert.equal(x.transcript.tools.size, 1); assert.equal(x.transcript.imageCalls(), 1);
  assert.deepEqual(x.events[0].item.output, item.output); assert.equal(x.events[0].item.native_type, 'functionCallOutput');
  assert.equal(x.events[0].item.type, 'function_call_output');
});

test('ordinary functions.exec output is retained as tool evidence, not unknown or non-tool', () => {
  const x = make(); x.emitItem({ type: 'functionCallOutput', id: 'exec-1', name: 'exec', namespace: 'functions', output: 'actual output' });
  assert.deepEqual(x.failures, []); assert.equal(x.transcript.tools.get('exec-1').output, 'actual output'); assert.equal(x.transcript.imageCalls(), 0);
});

test('function-call output cannot silently pass prompt-only authority', () => {
  const x = make('prompt-only'); x.emitItem({ type: 'functionCallOutput', id: 'exec-1', name: 'exec', namespace: 'functions', output: 'result' });
  assert.match(x.failures[0], /response-only/);
});

for (const type of ['contextCompaction', 'enteredReviewMode', 'exitedReviewMode']) test(`${type} metadata is preserved without inventing a tool call`, () => {
  const x = make('prompt-only'); const item = { type, id: `metadata-${type}`, review: 'fixture selected review' }; x.emitItem(item);
  assert.deepEqual(x.failures, []); assert.equal(x.transcript.tools.size, 0); assert.equal(x.events[0].native.item, item);
});

for (const type of ['hookPrompt', 'subAgentActivity']) test(`${type} unsupported authority fails with raw item retained`, () => {
  const x = make(); const item = { type, id: `unsupported-${type}`, ...(type === 'hookPrompt'
    ? { fragments: [{ hookRunId: 'hook-1', text: 'fixture content' }] }
    : { agentPath: '/root/helper', agentThreadId: 'helper-1', kind: 'started' }) }; x.emitItem(item);
  assert.match(x.failures[0], /Unsupported native item/); assert.equal(x.events[0].native.item, item); assert.equal(x.transcript.tools.size, 1);
});
