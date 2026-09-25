import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { assertSkillProvenance, getProvenanceInventory, readSkillProvenance, renderSkillProvenanceMarkdown, validateSkillProvenance } from '../scripts/skill-provenance.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const baseline = readSkillProvenance(root);
const record = (document, id) => document.capabilities.find((entry) => entry.id === id);
const mutate = (change) => { const document = structuredClone(baseline); change(document); return validateSkillProvenance(document, { root }); };
const rejects = (change, pattern) => { const result = mutate(change); assert.equal(result.valid, false); assert.match(result.errors.join('\n'), pattern); };

test('current catalogs, private owners and all managed contributors have complete provenance', () => {
  assert.equal(baseline.capabilities.length, getProvenanceInventory(root).length);
  assert.deepEqual(validateSkillProvenance(baseline, { root }), { valid: true, errors: [] });
  assert.equal(assertSkillProvenance(baseline, { root }), baseline);
  assert.ok(baseline.capabilities.some((entry) => entry.sources.length > 1), 'multiple origins must be represented, including PS techniques merged into QS');
});

test('missing private capability and lost secondary owner fail coverage', () => {
  rejects((doc) => { doc.capabilities = doc.capabilities.filter((entry) => entry.id !== 'ps-internal:decision-trail'); }, /coverage: missing ps:private:decision-trail/);
  rejects((doc) => { record(doc, 'ps-internal:decision-trail').owners.pop(); }, /owner coverage differs/);
});

test('missing canonical owner, unknown current identity and duplicate IDs fail', () => {
  rejects((doc) => { delete doc.capabilities[0].canonical.owner; }, /canonical owner\/path required/);
  rejects((doc) => { doc.capabilities[0].currentName = 'qs-invented'; }, /not in current catalog/);
  rejects((doc) => { doc.capabilities.push(structuredClone(doc.capabilities[0])); }, /duplicate stable id/);
});

test('planned owners neither need an existing path nor activate a command', () => {
  const document = structuredClone(baseline);
  record(document, 'contributor:hyperframes').plannedOwners = ['qs-future-render'];
  assert.equal(validateSkillProvenance(document).valid, true);
  assert.equal(getProvenanceInventory().some((entry) => entry.currentName === 'qs-future-render'), false);
});

test('mutable, absent and ambiguous revisions are rejected', () => {
  rejects((doc) => { delete doc.capabilities[0].sources[0].reviewedRevision; }, /immutable reviewed revision required/);
  rejects((doc) => { doc.capabilities[0].sources[0].baselineRevision = 'main'; }, /immutable baseline revision required/);
  rejects((doc) => { const source = doc.capabilities[0].sources[0]; source.adoption = { status: 'adapted', revision: null, note: 'Copied some guidance' }; }, /immutable adopted revision required/);
});

test('unknown or not-adopted status is explicit and never invents a revision', () => {
  for (const status of ['unknown', 'not-adopted']) {
    const document = structuredClone(baseline);
    document.capabilities[0].sources[0].adoption = { status, revision: null, note: 'No exact adoption evidence for this source.' };
    assert.equal(validateSkillProvenance(document).valid, true);
    document.capabilities[0].sources[0].adoption.revision = document.capabilities[0].sources[0].reviewedRevision;
    assert.equal(validateSkillProvenance(document).valid, false);
  }
});

test('byte identity needs actual manifest authority, not just a plausible digest', () => {
  rejects((doc) => { record(doc, 'contributor:unlazy').sources[0].digest = null; }, /byte identity requires/);
  rejects((doc) => { record(doc, 'contributor:unlazy').sources[0].digest.value = 'a'.repeat(64); }, /does not match authoritative manifest/);
  rejects((doc) => { record(doc, 'contributor:unlazy').sources[0].adoption.revision = 'b'.repeat(40); }, /does not match authoritative manifest/);
  rejects((doc) => { record(doc, 'contributor:unlazy').sources[0].digest.authority.resource = 'find-skills'; }, /matching managed contributor|does not match authoritative manifest/);
});

test('a source digest cannot prove an adapted repository file is byte-identical', () => {
  rejects((doc) => { doc.capabilities[0].sources.push(structuredClone(record(doc, 'contributor:unlazy').sources[0])); }, /byte identity is only established for the matching managed contributor/);
});

test('derived content digest is independently verified against current file bytes', () => {
  const document = structuredClone(baseline);
  const entry = record(document, 'qs:qs-help');
  entry.derivedDigest = { algorithm: 'sha256', kind: 'file', value: createHash('sha256').update(readFileSync(root + entry.canonical.path)).digest('hex') };
  assert.equal(validateSkillProvenance(document).valid, true);
  entry.derivedDigest.value = 'c'.repeat(64);
  assert.match(validateSkillProvenance(document).errors.join('\n'), /derived digest does not match current canonical bytes/);
});

test('repository-authored records are allowed without invented upstream origin', () => {
  const authored = record(baseline, 'qs:qs-deploy-prompt');
  assert.equal(authored.disposition, 'repository-authored');
  assert.deepEqual(authored.sources, []);
  rejects((doc) => { record(doc, 'qs:qs-deploy-prompt').sources.push(structuredClone(doc.capabilities[0].sources[0])); }, /repository-authored disposition must have no invented upstream sources/);
});

test('writer original and successor identities remain separate', () => {
  const writer = record(baseline, 'qs:qs-skill-write');
  assert.ok(writer.legacyIdentities.includes('writing-great-skills'));
  const original = writer.sources.find((source) => source.originalName === 'writing-great-skills');
  assert.equal(original.successors[0].name, 'writing-for-agents');
  assert.ok(writer.sources.some((source) => source.originalName === 'writing-for-agents' && source.adoption.status === 'adapted'));
});

test('original PS72 inventory and every historical disposition survive independently', () => {
  const snapshot = baseline.historicalSnapshots.find((entry) => entry.id === 'pstack-0.14.1');
  assert.equal(snapshot.candidateCount, 72);
  assert.equal(snapshot.dispositions.length, 72);
  rejects((doc) => { doc.historicalSnapshots[0].dispositions.pop(); }, /incomplete historical disposition coverage/);
  rejects((doc) => { doc.historicalSnapshots[0].sha256 = 'd'.repeat(64); }, /snapshot digest mismatch/);
  rejects((doc) => { doc.historicalSnapshots[0].dispositions[0].target = 'invented-owner'; }, /historical disposition digest mismatch/);
  rejects((doc) => { doc.historicalSnapshots = []; }, /historicalSnapshots/);
});

test('unsafe paths, dormant promotion and missing evidence are rejected', () => {
  rejects((doc) => { doc.capabilities[0].canonical.path = '../outside'; }, /unsafe repository path/);
  rejects((doc) => { doc.capabilities[0].canonical.path = 'skills/deprecated/example/SKILL.md'; }, /dormant content cannot be promoted/);
  rejects((doc) => { doc.capabilities[0].sources[0].licensePaths = ['../LICENSE']; }, /unsafe upstream license path/);
  rejects((doc) => { doc.capabilities[0].validationEvidence = ['docs/missing-evidence.md']; }, /missing file/);
});

test('directories cannot stand in for canonical files, evidence or historical snapshots', () => {
  rejects((doc) => { doc.capabilities[0].canonical.path = 'skills'; }, /expected regular file skills/);
  rejects((doc) => { doc.capabilities[0].validationEvidence = ['docs']; }, /expected regular file docs/);
  rejects((doc) => { doc.historicalSnapshots[0].path = 'tests'; }, /expected regular file tests/);
});

test('malformed records return diagnostic failures rather than throwing TypeError', () => {
  for (const change of [
    (doc) => { doc.capabilities[0].owners = {}; },
    (doc) => { doc.capabilities[0].sources = [null]; },
    (doc) => { doc.capabilities[0].canonical = null; },
    (doc) => { doc.historicalSnapshots[0].dispositions[0] = null; },
    (doc) => { delete doc.historicalSnapshots[0].dispositions; },
    (doc) => { doc.capabilities[0].sources[0].successors = [null]; },
  ]) assert.equal(mutate(change).valid, false);
  assert.equal(validateSkillProvenance(null).valid, false);
});

test('rendering is deterministic, read-only and exposes revision distinctions', () => {
  const before = JSON.stringify(baseline);
  const rendered = renderSkillProvenanceMarkdown(baseline);
  const reordered = structuredClone(baseline);
  reordered.capabilities.reverse();
  for (const entry of reordered.capabilities) entry.sources.reverse();
  assert.equal(renderSkillProvenanceMarkdown(reordered), rendered);
  assert.equal(JSON.stringify(baseline), before);
  assert.match(rendered, /Reviewed \| Adopted/);
  assert.match(rendered, /unknown \(no revision claimed\)/);
  assert.match(rendered, /writing-great-skills/);
  assert.match(rendered, /writing-for-agents/);
  assert.match(rendered, /Indirect credit: \[Dex Horthy \/ Humanlayer show-me\]/);
  assert.match(rendered, /not a derived-content digest/);
  assert.match(rendered, /72 candidate dispositions/);
});
