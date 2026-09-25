import test from 'node:test';
import assert from 'node:assert/strict';
import { savePreferences, AuthenticationError } from '../src/preferences.mjs';
const invoke = response => savePreferences({ transport: async () => response, credential: 'test-placeholder', patch: { digest: true } });
test('JSON success returns server preferences', async () => {
  assert.deepEqual(await invoke(new Response('{"digest":true}', { status: 200 })), { digest: true });
});
test('401 asks the caller to sign in', async () => {
  await assert.rejects(invoke(new Response(null, { status: 401 })), AuthenticationError);
});
