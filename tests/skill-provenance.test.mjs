import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, mkdtempSync, mkdirSync, cpSync, writeFileSync, unlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
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

test('baseline identities and all original113 sources survive target mapping unchanged', () => {
  assert.equal(baseline.capabilities.length, 71);
  assert.equal(baseline.capabilities.filter(entry => entry.role === 'private').length, 20);
  assert.equal(baseline.capabilities.reduce((sum, entry) => sum + entry.sources.length, 0), 113);
  assert.equal(createHash('sha256').update(JSON.stringify(baseline.capabilities)).digest('hex'), '8cabb127d00e5f0c3c4233bad9586335dd2d982d2eb8980f134e2ff3c4316da0');
  assert.equal(baseline.target.capabilities.filter(entry => entry.role === 'public').length, 38);
  assert.equal(baseline.target.capabilities.filter(entry => entry.role === 'private').length, 51);
  const help = baseline.target.capabilities.find(entry => entry.name === 'qs-help');
  assert.deepEqual(help.baselineIds, ['contributor:find-skills', 'ps:ps-help', 'qs:qs-help']);
  const frontend = baseline.target.capabilities.find(entry => entry.name === 'qs-design-frontend');
  assert.equal(frontend.baselineIds.length, 4);
  assert.equal(baseline.target.capabilities.every(entry => entry.decision.status === 'pending'), true);
});

test('target catalog omissions, duplicates and owner loss are rejected', () => {
  rejects(doc => { delete doc.target; }, /target: mappings required/);
  rejects(doc => { doc.target.capabilities.pop(); }, /target coverage: missing/);
  rejects(doc => { doc.target.capabilities.push(structuredClone(doc.target.capabilities[0])); }, /duplicate target identity/);
  rejects(doc => { doc.target.capabilities[0].owners = []; }, /owners: expected nonempty/);
  rejects(doc => { doc.target.capabilities[0].owners = ['qs-invented']; }, /target owner coverage differs/);
  rejects(doc => { doc.target.capabilities[0].baselineIds.pop(); }, /baseline origin coverage differs/);
  rejects(doc => { doc.target.capabilities[0].baselineIds.push('nonexistent:origin'); }, /unknown baseline stable ID/);
});

test('pending, unknown, reviewed, retained and adopted decisions remain distinct', () => {
  for (const status of ['pending', 'unknown']) {
    const doc = structuredClone(baseline); doc.target.capabilities[0].decision.status = status;
    assert.equal(validateSkillProvenance(doc, { checkFiles: false }).valid, true);
    doc.target.capabilities[0].decision.revision = 'a'.repeat(40);
    assert.match(validateSkillProvenance(doc, { checkFiles: false }).errors.join('\n'), /decision revision/);
  }
  for (const status of ['reviewed', 'retained-baseline', 'adopted']) {
    rejects(doc => { doc.target.capabilities[0].decision.status = status; }, /decision evidence|decision revision/);
    const doc = structuredClone(baseline);
    doc.target.capabilities[0].decision = { status, revision: 'a'.repeat(40), evidence: ['docs/specs/quickstark-upstream-adoption.md'], note: 'Schema-only synthetic decision; not persisted or an acceptance decision.' };
    assert.equal(validateSkillProvenance(doc, { checkFiles: false }).valid, true);
    assert.deepEqual(doc.capabilities, baseline.capabilities, 'decision never rewrites baseline source adoption');
  }
});

test('target and closure digests reject stale bytes independently of upstream pins', () => {
  rejects(doc => { doc.target.capabilities[0].derivedDigest.value = 'e'.repeat(64); }, /target derived digest mismatch/);
  rejects(doc => { doc.target.closures[0].sha256 = 'e'.repeat(64); }, /closure digest mismatch/);
  rejects(doc => { doc.target.closures[0].reviewedRevision = 'e'.repeat(40); }, /reviewed closure pin/);
  rejects(doc => { doc.target.closures[0].adoptedRevision = doc.target.closures[0].reviewedRevision; }, /not an adopted revision/);
  rejects(doc => { doc.target.closures = []; }, /missing closure/);
  rejects(doc => { doc.target.closures.push(structuredClone(doc.target.closures[0])); }, /duplicate closure owner/);
  rejects(doc => { doc.target.closures[0].owner = 'qs-invented'; }, /ownerless closure/);
});

test('malformed target records return diagnostics', () => {
  for (const change of [
    doc => { doc.target.capabilities = [null]; },
    doc => { doc.target.capabilities[0].decision = null; },
    doc => { doc.target.capabilities[0].derivedDigest = null; },
    doc => { doc.target.capabilities[0].owners = {}; },
    doc => { doc.target.closures = [null]; },
  ]) assert.equal(mutate(change).valid, false);
});

test('complete private closure rejects missing, duplicate, changed and unindexed resources', () => {
  const temporary = mkdtempSync(path.join(tmpdir(), 'qs-provenance-'));
  try {
    for (const relative of ['config/personal-skills.manifest.json', 'config/skill-migrations.json', 'skills/engineering/qs-unlazy', 'skills/video/qs-video']) {
      mkdirSync(path.dirname(path.join(temporary, relative)), { recursive: true });
      cpSync(path.join(root, relative), path.join(temporary, relative), { recursive: true });
    }
    const liveManifestPath = path.join(temporary, 'config/personal-skills.manifest.json');
    const liveManifest = JSON.parse(readFileSync(liveManifestPath));
    liveManifest.resources = []; writeFileSync(liveManifestPath, JSON.stringify(liveManifest));
    assert.equal(getProvenanceInventory(temporary).length, 71, 'retired live manifest must not erase baseline identities');
    assert.equal(validateSkillProvenance(baseline, { root: temporary, checkFiles: false }).valid, true, 'historical source digest authority survives live manifest retirement');
    const initialErrors = validateSkillProvenance(baseline, { root: temporary }).errors;
    assert.equal(initialErrors.filter(error => error.startsWith('qs-unlazy:') || error.startsWith('qs-video:')).length, 0, 'copied closure starts valid before controls');
    const indexPath = 'skills/engineering/qs-unlazy/references/dependency-index.json';
    const original = readFileSync(path.join(temporary, indexPath));
    const rewrite = change => {
      const doc = structuredClone(baseline), index = JSON.parse(original); change(index);
      const bytes = JSON.stringify(index); writeFileSync(path.join(temporary, indexPath), bytes);
      doc.target.closures.find(entry => entry.owner === 'qs-unlazy').sha256 = createHash('sha256').update(bytes).digest('hex');
      return validateSkillProvenance(doc, { root: temporary }).errors.join('\n');
    };
    assert.match(rewrite(index => { index.localFiles = {}; }), /localFiles must be an array/);
    assert.match(rewrite(index => { index.files = null; }), /closure files required/);
    assert.match(rewrite(index => { index.files.pop(); }), /unindexed or nonregular private resource/);
    assert.match(rewrite(index => { index.files.push(index.files[0]); }), /duplicate original source|duplicate\/unsafe destination/);
    assert.match(rewrite(index => { index.files[0].sourceSha256 = 'invalid'; }), /original source digest record/);
    assert.match(rewrite(index => { index.files[0].derivedSha256 = 'e'.repeat(64); }), /closure derived digest mismatch/);
    writeFileSync(path.join(temporary, indexPath), original);
    const entry = path.join(temporary, 'skills/engineering/qs-unlazy/modules/unlazy/instructions.md');
    writeFileSync(entry, 'changed private bytes');
    assert.match(validateSkillProvenance(baseline, { root: temporary }).errors.join('\n'), /closure derived digest mismatch instructions.md|closure derived digest mismatch modules\/unlazy\/instructions.md/);
    unlinkSync(entry);
    assert.match(validateSkillProvenance(baseline, { root: temporary }).errors.join('\n'), /missing file .*instructions.md/);
  } finally { rmSync(temporary, { recursive: true, force: true }); }
});

test('generated document includes target ownership and matches the checked-in file', () => {
  const rendered = renderSkillProvenanceMarkdown(baseline);
  assert.equal(rendered, readFileSync(path.join(root, 'docs/upstream/provenance.md'), 'utf8'));
  const reversed = structuredClone(baseline); reversed.target.capabilities.reverse(); reversed.target.closures.reverse();
  assert.equal(renderSkillProvenanceMarkdown(reversed), rendered);
  assert.match(rendered, /Owner-context/);
  assert.match(rendered, /pending \(no revision claimed\)/);
});

test('target notices and explicit closure adoption cannot disappear or be inferred', () => {
  rejects(doc => { doc.target.notices.pop(); }, /notice coverage differs/);
  rejects(doc => { doc.target.notices.push(structuredClone(doc.target.notices[0])); }, /notice coverage differs/);
  rejects(doc => { doc.target.notices[0].sha256 = 'b'.repeat(64); }, /notice digest mismatch/);
  rejects(doc => { const closure = doc.target.closures[0]; closure.adoptionStatus = 'adapted'; closure.adoptedRevision = closure.reviewedRevision; }, /adoption evidence|adopted owner decision/);
  const doc = structuredClone(baseline), closure = doc.target.closures[0];
  const evidence = ['docs/specs/quickstark-upstream-adoption.md'];
  closure.adoptionStatus = 'adapted'; closure.adoptedRevision = closure.reviewedRevision; closure.adoptionEvidence = evidence;
  doc.target.capabilities.find(entry => entry.role === 'public' && entry.name === closure.owner).decision = { status: 'adopted', revision: 'a'.repeat(40), evidence, note: 'Synthetic schema test only; never persisted as adoption.' };
  assert.equal(validateSkillProvenance(doc, { checkFiles: false }).valid, true);
  assert.deepEqual(doc.capabilities, baseline.capabilities);
});
