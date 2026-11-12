import fs from 'node:fs';
import crypto from 'node:crypto';
const base='.unlazy/release-447';
const h=x=>crypto.createHash('sha256').update(x).digest('hex');
const read=p=>fs.readFileSync(p);
const json=p=>JSON.parse(read(p));
const fail=m=>{throw Error(m)};
const p=json(`${base}/response/protocol.json`),i=json(`${base}/response/isolation-inputs.json`),r=json(`${base}/semantic-review/review.json`);
if(r.protocolSHA256!==h(read(`${base}/response/protocol.json`))||r.inputsSHA256!==h(read(`${base}/response/isolation-inputs.json`)))fail('Frozen protocol/input binding mismatch');
for(const b of r.rubricBindings)if(b.sha256!==h(read(b.path)))fail(`Rubric mismatch: ${b.path}`);
if(JSON.stringify(r.rubricBindings.map(x=>x.path))!==JSON.stringify(p.rubricPaths))fail('Rubric coverage mismatch');
if(r.revision!==p.revision||r.version!==p.version)fail('Revision/version mismatch');
if(new Set(r.reviews.map(x=>x.id)).size!==r.reviews.length)fail('Duplicate review');
for(const e of r.reviews){
 if(!p.caseIds.includes(e.id))fail(`Unexpected case ${e.id}`);
 const c=i.cases.find(x=>x.id===e.id),s=i.instructions[c.instructionKey],d=`${base}/response/isolation-captures/${e.id}`,raw=read(`${d}/response.md`),env=JSON.parse(raw),res=json(`${d}/result.json`);
 if(e.sourceKey!==c.instructionKey||e.sourceSHA256!==h(s)||e.caseSHA256!==h(JSON.stringify(c)))fail(`${e.id}: source/case binding`);
 if(e.responseFileSHA256!==h(raw)||e.responseSHA256!==h(env.response)||e.resultSHA256!==h(read(`${d}/result.json`)))fail(`${e.id}: response/result binding`);
 if(e.promptSHA256!==h(read(`${d}/prompt.txt`))||e.promptSHA256!==p.promptSHA256[e.id])fail(`${e.id}: prompt binding`);
 if(JSON.stringify(env)!==JSON.stringify(res.envelope))fail(`${e.id}: envelope/result mismatch`);
 const root=s.match(/(?:^|\n)name: ([^\n]+)/)?.[1]||'submitted-explicit-goal-coordinator';
 if(e.owningRoot!==root)fail(`${e.id}: owning root`);
 if(typeof e.qualified!=='boolean'||!Array.isArray(e.limitations))fail(`${e.id}: decision schema`);
 if(Object.keys(e.scores).sort().join()!=='clear-writing,correctness,coverage'||Object.values(e.scores).some(n=>!Number.isInteger(n)||n<0||n>2))fail(`${e.id}: scores`);
 const lines=env.response.split('\n');
 for(let n=1;n<=10;n++){
  const g=e.hardGates['A'+n];if(!g||typeof g.applicable!=='boolean'||!Array.isArray(g.evidence))fail(`${e.id}: A${n} schema`);
  if(g.applicable&&typeof g.passed!=='boolean')fail(`${e.id}: A${n} missing decision`);
  if(!g.applicable&&(g.passed!==null||!g.reason))fail(`${e.id}: A${n} unexplained N/A`);
  if(g.applicable&&(!g.sourceRule||s.split('\n')[g.sourceRule.line-1]!==g.sourceRule.quote))fail(`${e.id}: A${n} source rule binding`);
  if(g.applicable&&g.evidence.length===0&&!g.failure)fail(`${e.id}: A${n} missing evidence`);
  for(const x of g.evidence){const value=(x.field==='requestedActions'?env.requestedActions:lines)[x.line-1];if(!(typeof value==='string'?value:JSON.stringify(value))?.includes(x.quote)||!x.reason)fail(`${e.id}: A${n} quote binding`);}
 }
 const computed=Object.values(e.hardGates).every(g=>!g.applicable||g.passed)&&Object.values(e.scores).every(n=>n>=1);
 if(e.qualified!==computed)fail(`${e.id}: stated decision disagrees with recorded hard gates/quality floor`);
}
if(r.reviewedCount!==r.reviews.length||r.qualifiedCount!==r.reviews.filter(x=>x.qualified).length||JSON.stringify(r.failedIds)!==JSON.stringify(r.reviews.filter(x=>!x.qualified).map(x=>x.id)))fail('Summary disagrees with decisions');
const missing=p.caseIds.filter(id=>!r.reviews.some(x=>x.id===id));if(missing.length)fail(`Incomplete semantic coverage ${r.reviews.length}/${p.caseIds.length}; missing ${missing.join(',')}`);
fs.writeSync(1,`SEMANTIC_BINDINGS_OK reviewed=${r.reviews.length} qualified=${r.qualifiedCount} failed=${r.failedIds.join(',')||'none'}; bindings only, not semantic truth\n`);
