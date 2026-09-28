import test from 'node:test';
import assert from 'node:assert/strict';
import { savePreferences, AuthenticationError, HttpError, PayloadError } from '../src/preferences.mjs';
const invoke = response => savePreferences({ transport: async () => response, credential: 'test-placeholder', patch: { digest: true } });
test('JSON success returns server preferences', async () => {
  assert.deepEqual(await invoke(new Response('{"digest":true}', { status: 200 })), { digest: true });
});
test('401 asks the caller to sign in', async () => {
  await assert.rejects(invoke(new Response(null, { status: 401 })), AuthenticationError);
});

test('turning off the digest preserves the request and accepts 204 without parsing', async () => {
  const response = new Response(null, { status: 204 });
  let jsonCalls = 0;
  response.json = async () => {
    jsonCalls++;
    throw new SyntaxError('No JSON body');
  };
  let result;
  try {
    result = await savePreferences({
      credential: 'test-placeholder',
      patch: { digest: false },
      transport: async (url, options) => {
        assert.equal(url, '/preferences');
        assert.equal(options.method, 'PATCH');
        assert.equal(options.body, '{"digest":false}');
        assert.ok(options.headers.Authorization === 'Bearer test-placeholder',
          'Authorization forwarding mismatch; values <REDACTED>');
        return response;
      }
    });
  } finally {
    assert.equal(jsonCalls, 0, '204 must not invoke the JSON parser');
    assert.equal(response.bodyUsed, false);
  }
  assert.equal(result, null);
});

for (const value of [false, 0, '', null, { digest: false }, [false, 0]]) {
  test(`successful JSON preserves ${JSON.stringify(value)}`, async () => {
    assert.deepEqual(await invoke(new Response(JSON.stringify(value), { status: 200 })), value);
  });
}

test('other successful statuses return the parsed value unchanged', async () => {
  const value = { digest: false };
  let jsonCalls = 0;
  assert.strictEqual(await invoke({
    status: 201,
    ok: true,
    json: async () => { jsonCalls++; return value; }
  }), value);
  assert.equal(jsonCalls, 1);
});

for (const status of [401, 403, 400, 404, 429, 500, 302]) {
  test(`HTTP ${status} is classified without parsing its body`, async () => {
    let jsonCalls = 0;
    await assert.rejects(invoke({
      status,
      ok: false,
      json: async () => { jsonCalls++; throw new SyntaxError('Invalid JSON'); }
    }), error => {
      if (status === 401 || status === 403) {
        assert.ok(error instanceof AuthenticationError);
        assert.equal(error.message, 'Sign-in required');
      } else {
        assert.ok(error instanceof HttpError);
        assert.equal(error.status, status);
      }
      return true;
    });
    assert.equal(jsonCalls, 0);
  });
}

for (const body of ['{invalid', '']) {
  test(`invalid successful JSON (${body ? 'malformed' : 'empty'}) is a payload failure`, async () => {
    await assert.rejects(invoke(new Response(body, { status: 200 })), error => {
      assert.ok(error instanceof PayloadError);
      assert.ok(error.cause instanceof SyntaxError);
      return true;
    });
  });
}

test('payload failure retains the exact parser cause', async () => {
  const cause = new SyntaxError('Invalid JSON');
  await assert.rejects(invoke({
    status: 200, ok: true, json: async () => { throw cause; }
  }), error => {
    assert.ok(error instanceof PayloadError);
    assert.strictEqual(error.cause, cause);
    return true;
  });
});

test('transport rejection propagates unchanged', async () => {
  const cause = new TypeError('Transport unavailable');
  await assert.rejects(savePreferences({
    transport: async () => { throw cause; },
    credential: 'test-placeholder', patch: { digest: false }
  }), error => error === cause);
});
