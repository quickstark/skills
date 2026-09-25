import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { captureMigrationPath, revalidateMigrationPath } from './migration-filesystem.mjs';

const check = (condition, message) => { if (!condition) throw new Error(message); };
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const digest = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const unique = (value) => Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === 'string' && item.length > 0) && new Set(value).size === value.length;
const equal = (a, b) => unique(a) && unique(b) && [...a].sort().join('\0') === [...b].sort().join('\0');

/** Verify a recorded acceptance decision, not re-score model output or infer a
 * pass from tests/source size. The caller supplies catalog-derived obligations.
 * Real release revision/payload checks remain the migration assembler's job.
 * Source/evidence snapshots allow revalidation immediately before side effects.
 */
export async function verifyAdoptionAcceptance({ repositoryRoot, auditPath,
  packageId, agent, capabilityIds, sourcePaths, requiredCriteria, requiredChecks,
  revision, version, payloadDigest, contentSha256 }) {
  check(path.isAbsolute(repositoryRoot) && ['codex', 'pi', 'claude-code'].includes(agent), 'Exact repository and supported host required.');
  check(/^[a-f0-9]{40}$/.test(revision) && /^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(version)
    && digest(contentSha256) && payloadDigest?.kind === 'portable-directory-sha256' && digest(payloadDigest.value), 'Observed release identity and payload digests required.');
  for (const list of [capabilityIds, sourcePaths, requiredCriteria, requiredChecks]) check(unique(list), 'Nonempty unique catalog obligations required.');
  check(requiredCriteria.every((id) => /^AC-(?:0[1-9]|1\d|2[0-4])$/.test(id)), 'Unknown acceptance criterion.');
  const locate = (relative) => {
    check(typeof relative === 'string' && relative.length > 0 && !path.isAbsolute(relative)
      && !relative.includes('\\') && !relative.split('/').some((part) => ['', '.', '..'].includes(part)), 'Evidence path must be repository-relative.');
    return path.join(repositoryRoot, relative);
  };
  const snapshots = [], references = [];
  const auditSnapshot = await captureMigrationPath(locate(auditPath));
  check(auditSnapshot.kind === 'file' && auditSnapshot.bytes <= 2 * 1024 * 1024, 'Acceptance audit must be a bounded regular file.');
  const auditBytes = await readFile(auditSnapshot.path);
  await revalidateMigrationPath(auditSnapshot); snapshots.push(auditSnapshot);
  const audit = JSON.parse(auditBytes);
  check(audit.schemaVersion === 1 && audit.kind === 'reviewed-adoption-acceptance', 'Unsupported acceptance audit.');
  const pkg = audit.packages?.[packageId];
  check(pkg && equal(pkg.capabilityIds, capabilityIds) && equal(pkg.sourcePaths, sourcePaths)
    && equal(pkg.criteria, requiredCriteria), 'Acceptance obligations differ from selected catalog.');
  const hostChecks = pkg.checks?.[agent];
  check(hostChecks && equal(Object.keys(hostChecks), requiredChecks), 'Required host acceptance checks are missing or changed.');
  const usedEvidence = new Set();
  const useEvidence = (ids) => {
    check(unique(ids), 'Every acceptance decision requires supporting evidence.');
    for (const id of ids) { check(audit.evidence?.[id], 'Acceptance evidence reference is missing.'); usedEvidence.add(id); }
  };
  for (const id of requiredCriteria) {
    const criterion = audit.criteria?.[id];
    check(criterion && typeof criterion.note === 'string' && criterion.note.trim(), `Missing criterion decision: ${id}.`);
    check(criterion.status === 'passed' || ['AC-08', 'AC-09'].includes(id) && criterion.status === 'retained-baseline', `Unresolved acceptance criterion: ${id}.`);
    useEvidence(criterion.evidence);
  }
  for (const name of requiredChecks) {
    check(hostChecks[name]?.status === 'passed', `Unresolved host check: ${name}.`);
    useEvidence(hostChecks[name].evidence);
  }
  for (const relative of sourcePaths) {
    const expected = audit.sources?.[relative];
    check(expected && ['file', 'directory'].includes(expected.kind) && digest(expected.contentSha256), 'Source binding is missing.');
    const snapshot = await captureMigrationPath(locate(relative));
    check(snapshot.kind === expected.kind && snapshot.contentSha256 === expected.contentSha256, `Acceptance source changed: ${relative}.`);
    snapshots.push(snapshot);
  }
  references.push({ path: auditSnapshot.path, sha256: sha(auditBytes) });
  for (const id of usedEvidence) {
    const reference = audit.evidence[id]; check(digest(reference.sha256), 'Evidence digest missing.');
    const snapshot = await captureMigrationPath(locate(reference.path));
    check(snapshot.kind === 'file' && snapshot.entries[0].sha256 === reference.sha256, `Acceptance evidence changed: ${id}.`);
    snapshots.push(snapshot); references.push({ path: snapshot.path, sha256: reference.sha256 });
  }
  for (const snapshot of snapshots) await revalidateMigrationPath(snapshot);
  return { receipt: { schemaVersion: 1, agent, packageId, version, revision,
    payloadDigest, contentSha256, verifiedCapabilities: [...capabilityIds],
    checks: Object.fromEntries(requiredChecks.map((name) => [name, 'passed'])), references }, evidenceSnapshots: snapshots };
}
