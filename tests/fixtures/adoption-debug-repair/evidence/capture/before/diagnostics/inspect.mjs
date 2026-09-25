// Whitelist diagnostic fields. Never print raw trace objects or credential fields.
import { readFile } from 'node:fs/promises';
const rows = JSON.parse(await readFile(new URL('./auth-traces.json', import.meta.url)));
for (const row of rows) console.log(JSON.stringify({
  attempt: row.attempt, intervention: row.intervention,
  request: { method: row.request.method, path: '/preferences', headers: { Authorization: '<REDACTED>', Cookie: '<REDACTED>' }, signedUrl: '<REDACTED>' },
  response: { status: row.response.status, bodyBytes: Buffer.byteLength(row.response.body), serverAuthAccepted: row.response.serverAuthAccepted },
  userVisible: row.userVisible
}));
