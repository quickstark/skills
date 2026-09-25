import { savePreferences } from '../src/preferences.mjs';
import { readFile } from 'node:fs/promises';
const rows = JSON.parse(await readFile(new URL('./auth-traces.json', import.meta.url)));
const row = rows.at(-1);
try {
  const result = await savePreferences({
    credential: row.request.headers.Authorization.slice(7), patch: { digest: false },
    transport: async () => new Response(row.response.body || null, { status: row.response.status })
  });
  if (result !== null) throw new Error('Expected no-content success to return null');
  console.log('Original incident: saved successfully; returned null');
} catch (error) {
  console.log(JSON.stringify({ incident: 'preferences-save', errorType: error.name, causeType: error.cause?.name ?? null }));
  process.exitCode = 1;
}
