import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {TARGET_SKILL_COLLECTIONS} from '../../../scripts/skill-collection-registry.mjs';
import {derivePackageAcceptanceObligations} from '../../../scripts/managed-skill-input.mjs';
import {captureMigrationPath} from '../../../scripts/migration-filesystem.mjs';
import {adoptionSourceContentSha256} from '../../../scripts/adoption-acceptance.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url)),dir=path.dirname(fileURLToPath(import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=p=>fs.readFile(path.resolve(root,p));
const json=async p=>JSON.parse(await read(p));
const exec=promisify(execFile);
const git=async(...args)=>(await exec('git',args,{cwd:root,maxBuffer:20*1024*1024,encoding:'buffer'})).stdout;
const bytes=await fs.readFile(path.join(dir,'source-review.json'));
assert.equal(sha(bytes),'2e53b14e7fda60c0ad589d9b3fc80cf4966ad88ad2db9564c04dfc5fe6bea73f','Reviewed assessment changed');
const report=JSON.parse(bytes);
const anchor=async p=>git('show',`${report.revision}:${p}`);
const anchoredRead=p=>report.metadataBindingPolicy.immutableAnchors.includes(p)?anchor(p):read(p);
const audit=JSON.parse(await anchor('docs/validation/upstream-adoption-acceptance.json')),provenance=JSON.parse(await anchor('config/skill-provenance.json')),currentProvenance=await json('config/skill-provenance.json'),migrations=await json('config/skill-migrations.json'),lex=await json('tests/fixtures/lean-execution-adoption/lex12-acceptance.json'),notes=await json('.unlazy/release-447/source-review/assessment-notes.json');
assert.equal(report.revision,'dcbc75b4a69ef2d7dfc39e582afd005dc2264b0c');
assert.equal(report.kind,'independent-source-and-criterion-assessment-not-acceptance-receipt');
assert.equal(report.version,'4.4.7');
assert.equal((await json('package.json')).version,report.version);
assert.equal((await git('rev-parse',report.revision)).toString().trim(),report.revision);
for(const [p,h]of Object.entries(report.evidenceSHA256))assert.equal(sha(await anchoredRead(p)),h,`Evidence changed: ${p}`);
assert.equal(report.historicalEvidence.length,Object.keys(audit.evidence).length);
for(const r of report.historicalEvidence){assert.deepEqual({path:r.path,sha256:r.expectedSHA256},audit.evidence[r.id]);assert.equal(sha(await anchoredRead(r.path)),r.expectedSHA256,`Historical evidence changed: ${r.id}`);assert.equal(r.matches,true);}
for(const [p,binding]of Object.entries(report.sourceSnapshots)){const actual=p==='config/skill-provenance.json'?{kind:'file',entries:[{path:'',kind:'file',mode:0o644,bytes:(await anchor(p)).length,sha256:sha(await anchor(p))}]}:await captureMigrationPath(path.resolve(root,p));assert.equal(actual.kind,binding.kind,p);assert.equal(adoptionSourceContentSha256(actual),binding.contentSha256,`Source changed: ${p}`);assert.equal(binding.historicalBindingMatches,binding.contentSha256===audit.sources[p]?.contentSha256);}
assert.equal(Object.values(report.sourceSnapshots).filter(s=>!s.historicalBindingMatches).length,34);
assert.deepEqual(report.capabilities.map(c=>c.id),provenance.target.capabilities.map(c=>c.id));
for(const c of report.capabilities){const original=provenance.target.capabilities.find(p=>p.id===c.id);assert.equal(c.adoptionApplied,false);assert.equal(sha(await read(c.path)),c.sourceSHA256,c.id);assert.deepEqual(c.currentDecision,original.decision);assert.deepEqual(c.baselineIds,original.baselineIds);assert.equal(sha(JSON.stringify(original.decision)),c.currentDecisionSHA256);let current=currentProvenance.target.capabilities.find(p=>p.id===c.id)?.decision;while(current&&sha(JSON.stringify(current))!==c.currentDecisionSHA256)current=current.previous;assert.ok(current,`Historical decision lost: ${c.id}`);assert.equal(sha(await git('show',`${report.publishedBaseline}:${c.path}`)),c.baselineSHA256);assert.equal(c.unchangedFromPublishedBaseline,c.sourceSHA256===c.baselineSHA256);assert.equal(c.assessment,notes.sourceDecisions[c.name]??'Preserve unchanged historical source decision and its qualifications. This pass does not expand its behavioral/runtime/platform scope.');assert.ok(c.assessment.length>60);}
for(const reviewed of lex.sourceReviews){assert.equal(sha(await read(reviewed.path)),reviewed.sourceSHA256);assert.equal(sha(await read(reviewed.reviewedPath)),reviewed.reviewedSHA256);}
assert.deepEqual(report.criteria.map(c=>c.id),Array.from({length:24},(_,i)=>`AC-${String(i+1).padStart(2,'0')}`));
for(const c of report.criteria){assert.equal(c.decision,notes.criteria[c.id][0]);assert.equal(c.rationale,notes.criteria[c.id][1]);assert.equal(c.requiredBeforeCurrentAcceptance,notes.criteria[c.id][2]);assert.deepEqual(c.historicalEvidence,audit.criteria[c.id].evidence);assert.equal(c.historicalStatus,audit.criteria[c.id].status);assert.ok(c.rationale.length>60&&c.requiredBeforeCurrentAcceptance.length>40);}
assert.equal(report.criteria.find(c=>c.id==='AC-09').decision,'retained-baseline');
assert.deepEqual(report.packages.map(p=>p.id),TARGET_SKILL_COLLECTIONS.map(c=>c.id));
for(const p of report.packages){assert.deepEqual(p.obligations,derivePackageAcceptanceObligations(p.id,migrations));assert.deepEqual(p.hosts.map(h=>h.host),['codex','claude-code','pi']);for(const h of p.hosts){assert.equal(h.status,'pending-current-package-acceptance');assert.deepEqual(h.checks.map(c=>c.check),p.obligations.requiredChecks);}}
assert.equal(report.gapMatrix.length,report.packages.length*3);
for(const row of report.gapMatrix){const p=report.packages.find(p=>p.id===row.packageId);assert.ok(p);assert.equal(row.status,'pending');assert.deepEqual(row.criteria.map(c=>c.id),p.obligations.requiredCriteria);assert.deepEqual(row.requiredChecks,p.hosts.find(h=>h.host===row.host).checks);}
assert.deepEqual(report.changedCanonical.map(c=>c.path),(await git('diff','--name-only',report.publishedBaseline,report.revision,'--','skills','docs/skill-run-contract.md')).toString().trim().split('\n'));
for(const c of report.changedCanonical){assert.equal(sha(await read(c.path)),c.sourceSHA256);assert.equal(sha(await git('show',`${report.publishedBaseline}:${c.path}`)),c.baselineSHA256);assert.equal(c.scopedDecision,'accept-source-correctness-only-candidate');}
for(const c of report.closures){const original=provenance.target.closures.find(p=>p.owner===c.owner);assert.ok(original);assert.equal(c.adoptionApplied,false);assert.equal(c.currentAdoptionStatus,'unknown');assert.equal(c.adoptedRevision,null);assert.equal(sha(await read(c.path)),c.indexSHA256);const index=await json(c.path),base=path.dirname(path.dirname(c.path));const entries=c.owner==='qs-video'?[...index.files.filter(f=>f.destinationPath).map(f=>({path:path.join(base,f.destinationPath),expectedSHA256:f.derivedSha256})),...index.localFiles.map(f=>({path:path.join(base,f.path),expectedSHA256:f.sha256}))]:index.files.map(f=>({path:path.join(base,index.moduleRoot,f.destination),expectedSHA256:f.derivedSha256}));assert.equal(c.records,index.files.length);assert.equal(c.moduleCount,index.modules?.length??1);assert.deepEqual(c.entries.map(({path,expectedSHA256})=>({path,expectedSHA256})),entries);for(const e of c.entries){assert.equal(sha(await read(e.path)),e.expectedSHA256,e.path);assert.equal(e.actualSHA256,e.expectedSHA256);assert.equal(e.matches,true);assert.equal(e.unchangedFromPublishedBaseline,sha(await git('show',`${report.publishedBaseline}:${e.path}`))===e.actualSHA256);}}
assert.equal(report.passes.length,4);
assert.ok(report.passes.every(p=>p.result.length>60));
assert.equal(report.findings.length,0);
// Negative control: a digest mutation must fail the same equality used on every real binding.
let rejected=false;try{assert.equal(sha(await read(report.capabilities[0].path)),'0'.repeat(64));}catch{rejected=true;}assert.equal(rejected,true);
console.log('LEAF_BINDINGS_OK');
