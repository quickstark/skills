// Assemble already-reviewed decisions and bind exact current bytes. This never
// infers acceptance, runs product trials, installs packages, or grants authority.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TARGET_SKILL_COLLECTIONS } from '../../../scripts/skill-collection-registry.mjs';
import { derivePackageAcceptanceObligations } from '../../../scripts/managed-skill-input.mjs';
import { captureMigrationPath } from '../../../scripts/migration-filesystem.mjs';
import { captureManagedSkillPayload } from '../../../scripts/managed-skill-migration.mjs';
import { verifyAdoptionAcceptance, adoptionSourceContentSha256 } from '../../../scripts/adoption-acceptance.mjs';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const read = async p => JSON.parse(await readFile(path.join(root,p),'utf8'));
const decisions = await read('tests/fixtures/adoption-final-target/reviewed-decisions.json');
assert.equal(decisions.kind,'parent-reviewed-adoption-decisions');
const auditPath = 'docs/validation/upstream-adoption-acceptance.json';
const audit = {schemaVersion:2,sourceBinding:'git-content-and-executable-bits-sha256',kind:'reviewed-adoption-acceptance',scope:decisions.scope,criteria:{},packages:{},sources:{},evidence:{}};
const evidenceId = async relative => {
  assert(!path.isAbsolute(relative) && !relative.split('/').includes('..'));
  const id = relative;
  const snapshot = await captureMigrationPath(path.join(root,relative));
  assert.equal(snapshot.kind,'file');
  audit.evidence[id] = {path:relative,sha256:createHash('sha256').update(await readFile(snapshot.path)).digest('hex')};
  return id;
};
for (const [id,entry] of Object.entries(decisions.criteria)) {
  assert(entry.status==='passed'||['AC-08','AC-09'].includes(id)&&entry.status==='retained-baseline');
  audit.criteria[id]={...entry,evidence:await Promise.all(entry.evidence.map(evidenceId))};
}
assert.equal(Object.keys(audit.criteria).length,24);
const migrations=await read('config/skill-migrations.json');
for (const collection of TARGET_SKILL_COLLECTIONS) {
  const obligations=derivePackageAcceptanceObligations(collection.id,migrations);
  const pkg={capabilityIds:obligations.capabilityIds,sourcePaths:obligations.sourcePaths,criteria:obligations.requiredCriteria,checks:{}};
  for (const agent of ['codex','pi']) {
    pkg.checks[agent]={};
    for(const name of obligations.requiredChecks) {
      const check=decisions.packages[collection.id].checks[agent][name];
      assert.equal(check.status,'passed');
      pkg.checks[agent][name]={...check,evidence:await Promise.all(check.evidence.map(evidenceId))};
    }
  }
  audit.packages[collection.id]=pkg;
  for(const relative of obligations.sourcePaths) {
    const snapshot=await captureMigrationPath(path.join(root,relative));
    assert(['file','directory'].includes(snapshot.kind));
    audit.sources[relative]={kind:snapshot.kind,contentSha256:adoptionSourceContentSha256(snapshot)};
  }
}
await writeFile(path.join(root,auditPath),JSON.stringify(audit,null,2)+'\n');
const revision=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const version=(await read('package.json')).version;
for(const collection of TARGET_SKILL_COLLECTIONS) for(const agent of ['codex','pi']) {
  const obligations=derivePackageAcceptanceObligations(collection.id,migrations);
  const payload=await captureManagedSkillPayload(path.join(root,agent==='codex'?collection.codexPackageRoot:collection.piPackageRoot));
  await verifyAdoptionAcceptance({repositoryRoot:root,auditPath,packageId:collection.id,agent,...obligations,revision,version,payloadDigest:payload.payloadDigest,contentSha256:payload.snapshot.contentSha256});
}
console.log(JSON.stringify({status:'passed',criteria:24,packages:6,hostVerifications:12,sources:Object.keys(audit.sources).length,evidence:Object.keys(audit.evidence).length,version,scope:'Current-byte acceptance verification only; no tracked-clean production-input, publication or actual host rollout claim.'}));
