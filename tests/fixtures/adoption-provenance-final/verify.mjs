import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { readSkillProvenance, validateSkillProvenance } from '../../../scripts/skill-provenance.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const fixture = join(root, 'tests/fixtures/adoption-provenance-final');
const read = name => JSON.parse(readFileSync(join(fixture, name), 'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sorted = value => Array.isArray(value) ? value.map(sorted)
  : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, sorted(value[key])])) : value;
const provenance = readSkillProvenance(root);
const binding = read('historical-binding.json');
const historical = Object.fromEntries(binding.fields.map(field => [field, provenance[field]]));
assert.equal(hash(JSON.stringify(sorted(historical))), binding.sha256, 'historical source/adoption records changed');
assert.equal(provenance.capabilities.length, 71);
const decisions = read('decisions.json');
assert.equal(decisions.reportingCompression, 'retained-baseline');
assert.equal(decisions.records.length, 89);
assert.equal(new Set(decisions.records.map(entry => entry.id)).size, 89);
for (const entry of decisions.records) {
  const actual = provenance.target.capabilities.find(value => value.id === entry.id);
  assert.ok(actual, entry.id);
  assert.equal(actual.path, entry.path);
  assert.equal(actual.package, entry.package);
  assert.equal(actual.decision.status, entry.status);
  assert.equal(actual.decision.revision, entry.implementationRevision);
  assert.deepEqual(actual.decision.evidence, entry.evidence);
}
for (const entry of read('evidence-bindings.json').entries) {
  const bytes = readFileSync(join(root, entry.path));
  assert.equal(bytes.length, entry.bytes, entry.path);
  assert.equal(hash(bytes), entry.sha256, entry.path);
}
for (const closure of provenance.target.closures) {
  assert.equal(closure.adoptionStatus, 'adapted');
  assert.equal(closure.adoptedRevision, closure.reviewedRevision);
}
const validation = validateSkillProvenance(provenance, { root });
assert.equal(validation.valid, true, validation.errors.join('\n'));
console.log('PROVENANCE-DECISIONS-VERIFIED: 71 historical identities preserved; 89 target decisions and exact source/evidence/closure bindings valid. No publication or host-acceptance claim.');
