import fs from 'node:fs';
import crypto from 'node:crypto';
const b='.unlazy/release-447',read=p=>fs.readFileSync(p),h=x=>crypto.createHash('sha256').update(x).digest('hex'),json=p=>JSON.parse(read(p)),fail=m=>{throw Error(m)};
const r=json(`${b}/semantic-review/amendment-review.json`),inputs=json(`${b}/response/isolation-inputs.json`),original=json(r.originalReview.path),p=json(`${b}/response/e4-amendment-preregistration/E4-AM1-payload.json`),protocol=json(`${b}/response/e4-amendment-protocol.json`),dir=`${b}/response/e4-amendment-captures/E4-AM1`,env=json(`${dir}/response.md`),result=json(`${dir}/result.json`);
for(const x of r.bindings)if(h(read(x.path))!==x.sha256)fail(`Changed binding ${x.path}`);
if(h(read(r.originalReview.path))!==r.originalReview.sha256||original.reviewedCount!==40||original.qualifiedCount!==39||original.reviews.find(x=>x.id==='E4').qualified!==false)fail('Original forty verdict changed');
const old=inputs.cases.find(x=>x.id==='E4'),e3=inputs.cases.find(x=>x.id==='E3');
if(p.instructions!==inputs.instructions[old.instructionKey]||p.user_request!==old.input||p.observations.P1!==old.sharedContext.P1||p.observations.E3!==e3.input||Object.keys(p.observations).sort().join()!=='E3,P1')fail('Amendment exceeds exact predecessor addition');
if(r.sourceSHA256!==h(p.instructions)||r.requestSHA256!==h(p.user_request)||r.originalP1SHA256!==h(p.observations.P1)||r.addedE3SHA256!==h(p.observations.E3))fail('Payload hashes');
if(h(read(`${dir}/prompt.txt`))!==protocol.promptSHA256||r.responseSHA256!==h(env.response)||JSON.stringify(env)!==JSON.stringify(result.envelope))fail('Prompt/response envelope mismatch');
const lines=env.response.split('\n'),source=p.instructions.split('\n');
for(const [name,g] of Object.entries(r.hardGates)){
 if(g.applicable&&typeof g.passed!=='boolean')fail(`Missing decision ${name}`);
 if(g.applicable&&(!g.evidence||!lines[g.evidence.line-1]?.includes(g.evidence.quote)))fail(`Evidence binding ${name}`);
 if(g.sourceRule&&!source[g.sourceRule.line-1]?.includes(g.sourceRule.quote))fail(`Source binding ${name}`);
 if(!g.applicable&&(g.passed!==null||!g.reason))fail(`Unexplained N/A ${name}`);
}
if(typeof r.qualified!=='boolean'||Object.values(r.scores).some(x=>!Number.isInteger(x)||x<0||x>2))fail('Decision/scores');
if(r.qualified!==(Object.values(r.hardGates).every(x=>!x.applicable||x.passed)&&Object.values(r.scores).every(x=>x>=1)))fail('Recorded qualification inconsistent');
fs.writeSync(1,'AMENDMENT_SEMANTIC_BINDINGS_OK E4-AM1 qualified=true; original E4 remains unqualified; bindings only\n');
