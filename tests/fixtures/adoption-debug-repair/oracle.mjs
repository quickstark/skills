// Held outside the task workspace; invokes the public API with independent stubs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const { savePreferences, AuthenticationError, HttpError, PayloadError } = await import(pathToFileURL(resolve(process.env.DEBUG_REPAIR_PROJECT, 'src/preferences.mjs')));
const invoke = response => savePreferences({ transport: async () => response, credential: 'independent-placeholder', patch: { digest: false } });
test('204 original failure and body never consumed', async () => {
  let consumed = 0;
  const value = await invoke({ status: 204, ok: true, json: async () => { consumed++; throw new SyntaxError('empty'); } });
  assert.equal(value, null); assert.equal(consumed, 0);
});
test('JSON values and request semantics remain exact', async () => {
  for (const value of [{ digest: false }, null, false, 0, '', ['weekly']]) {
    let calls = 0;
    const actual = await savePreferences({ credential: 'independent-placeholder', patch: { digest: false }, transport: async (url, options) => {
      calls++; assert.equal(url, '/preferences'); assert.equal(options.method, 'PATCH');
      assert.deepEqual(options.headers, { Authorization: 'Bearer independent-placeholder' });
      assert.equal(options.body, '{"digest":false}');
      return { status: 200, ok: true, json: async () => value };
    } });
    assert.deepEqual(actual, value); assert.equal(calls, 1);
  }
});
test('401 and 403 remain authentication failures without parsing', async () => {
  for (const status of [401, 403]) await assert.rejects(invoke({ status, ok: false, json: () => assert.fail('auth body must not be parsed') }), AuthenticationError);
});
test('other HTTP failures retain status without parsing', async () => {
  for (const status of [400, 404, 429, 500]) await assert.rejects(invoke({ status, ok: false, json: () => assert.fail('error body must not be parsed') }), e => e instanceof HttpError && e.status === status);
});
test('malformed successful payload retains the parser cause', async () => {
  const parserError = new SyntaxError('invalid JSON');
  await assert.rejects(invoke({ status: 200, ok: true, json: async () => { throw parserError; } }), e => e instanceof PayloadError && e.cause === parserError);
});
test('transport rejection propagates unchanged', async () => {
  const networkError = new TypeError('socket disconnected');
  await assert.rejects(savePreferences({ credential: 'independent-placeholder', patch: {}, transport: async () => { throw networkError; } }), e => e === networkError);
});
