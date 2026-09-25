import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { verifyAdoptionAcceptance } from '../scripts/adoption-acceptance.mjs';
import { captureMigrationPath } from '../scripts/migration-filesystem.mjs';

const sha = (text) => createHash('sha256').update(text).digest('hex');
async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'qs-acceptance-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'source')); await writeFile(path.join(root, 'source/skill.md'), 'fixture instruction');
  await writeFile(path.join(root, 'trial.json'), '{"fixture":"synthetic test evidence only"}');
  const source = await captureMigrationPath(path.join(root, 'source'));
  const document = { schemaVersion: 1, kind: 'reviewed-adoption-acceptance',
    sources: { source: { kind: source.kind, contentSha256: source.contentSha256 } },
    evidence: { trial: { path: 'trial.json', sha256: sha(await readFile(path.join(root, 'trial.json'))) } },
    criteria: { 'AC-10': { status: 'passed', note: 'Synthetic fixture; not production adoption.', evidence: ['trial'] } },
    packages: { 'qs-frontend': { capabilityIds: ['contributor:fixture'], sourcePaths: ['source'], criteria: ['AC-10'],
      checks: { codex: { behavior: { status: 'passed', evidence: ['trial'] } } } } } };
  const save = () => writeFile(path.join(root, 'audit.json'), JSON.stringify(document));
  await save();
  return { root, document, save, options: { repositoryRoot: root, auditPath: 'audit.json', packageId: 'qs-frontend', agent: 'codex',
    capabilityIds: ['contributor:fixture'], sourcePaths: ['source'], requiredCriteria: ['AC-10'], requiredChecks: ['behavior'],
    revision: 'a'.repeat(40), version: '4.0.0', payloadDigest: { kind: 'portable-directory-sha256', value: 'b'.repeat(64) }, contentSha256: 'c'.repeat(64) } };
}

test('recorded acceptance derives release receipt read-only, preserving original evidence snapshots', async (t) => {
  const { root, options } = await fixture(t), before = await captureMigrationPath(root);
  const { receipt, evidenceSnapshots } = await verifyAdoptionAcceptance(options);
  assert.equal(receipt.revision, options.revision); assert.deepEqual(receipt.checks, { behavior: 'passed' });
  assert.equal(evidenceSnapshots.length, 3); assert.equal(receipt.references.length, 2);
  assert.equal((await captureMigrationPath(root)).contentSha256, before.contentSha256);
});

test('changed instruction, added hidden source and changed raw evidence invalidate acceptance', async (t) => {
  for (const change of ['instruction', 'new-hidden', 'evidence']) {
    const { root, options } = await fixture(t);
    const file = change === 'instruction' ? 'source/skill.md' : change === 'new-hidden' ? 'source/.extra' : 'trial.json';
    await writeFile(path.join(root, file), 'changed');
    await assert.rejects(verifyAdoptionAcceptance(options), /Acceptance (source|evidence) changed/);
  }
});

test('missing host, capability, criterion or evidence cannot certify a package', async (t) => {
  for (const field of ['host', 'capability', 'criterion', 'evidence']) {
    const { document, save, options } = await fixture(t);
    if (field === 'host') delete document.packages['qs-frontend'].checks.codex;
    if (field === 'capability') document.packages['qs-frontend'].capabilityIds = [];
    if (field === 'criterion') delete document.criteria['AC-10'];
    if (field === 'evidence') delete document.evidence.trial;
    await save(); await assert.rejects(verifyAdoptionAcceptance(options), /obligations|acceptance|criterion|evidence/i);
  }
});

test('retained baseline is limited to the explicit compression experiment exception', async (t) => {
  const { document, save, options } = await fixture(t);
  document.criteria['AC-10'].status = 'retained-baseline'; await save();
  await assert.rejects(verifyAdoptionAcceptance(options), /Unresolved acceptance criterion/);
  document.criteria['AC-09'] = document.criteria['AC-10']; delete document.criteria['AC-10'];
  document.packages['qs-frontend'].criteria = ['AC-09']; await save();
  assert.equal((await verifyAdoptionAcceptance({ ...options, requiredCriteria: ['AC-09'] })).receipt.packageId, 'qs-frontend');
});

test('failed host checks, missing source bindings and escaping/symlink evidence fail', async (t) => {
  for (const change of ['failed', 'binding', 'escape', 'symlink']) {
    const { root, document, save, options } = await fixture(t);
    if (change === 'failed') document.packages['qs-frontend'].checks.codex.behavior.status = 'failed';
    if (change === 'binding') delete document.sources.source;
    if (change === 'escape') document.evidence.trial.path = '../trial.json';
    if (change === 'symlink') { await writeFile(path.join(root, 'actual.json'), await readFile(path.join(root, 'trial.json'))); await rm(path.join(root, 'trial.json')); await symlink('actual.json', path.join(root, 'trial.json')); }
    await save(); await assert.rejects(verifyAdoptionAcceptance(options), /Unresolved|binding|relative|evidence changed/);
  }
});
