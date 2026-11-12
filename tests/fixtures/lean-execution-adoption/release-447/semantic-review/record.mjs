import fs from 'node:fs';
import crypto from 'node:crypto';
const base='.unlazy/release-447';
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const protocol=JSON.parse(fs.readFileSync(`${base}/response/protocol.json`));
const inputs=JSON.parse(fs.readFileSync(`${base}/response/isolation-inputs.json`));
const file=`${base}/semantic-review/review.json`;
const review=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)): {
 kind:'independent-single-candidate-response-semantic-review',revision:protocol.revision,version:protocol.version,
 reviewer:'semantic_review; independent of capture generation',
 method:'Actual frozen instruction bodies, requests, observations, result envelopes and responses read directly. Prior review ratings are not reused. Single-candidate isolation qualification; not a blinded matched comparative experiment.',
 protocolSHA256:hash(fs.readFileSync(`${base}/response/protocol.json`)),inputsSHA256:hash(fs.readFileSync(`${base}/response/isolation-inputs.json`)),
 rubricBindings:protocol.rubricPaths.map(path=>({path,sha256:hash(fs.readFileSync(path))})),
 limitations:['Response-only fictional fixtures: decisions establish bounded response behavior only, not actual product work, package/source acceptance, installed-host acceptance or release acceptance.','No semantic retries; no comparative efficacy, reliability or efficiency inference. Prior review JSONs supply scope/limitations only; their historical ratings do not decide these new responses.','Usage is not a quality score. No token-savings claim is made; missing usage is never inferred.','verify.mjs checks coverage and bindings, not semantic truth.'],reviews:[]};
export function record(id,qualified,scores,claims,limitations=[],failedGates={}){
 const caseData=inputs.cases.find(x=>x.id===id),source=inputs.instructions[caseData.instructionKey];
 const dir=`${base}/response/isolation-captures/${id}`;
 const raw=fs.readFileSync(`${dir}/response.md`),resultRaw=fs.readFileSync(`${dir}/result.json`),envelope=JSON.parse(raw);
 const lines=envelope.response.split('\n');
 const evidence=claims.map(([gate,quote,reason])=>{const line=lines.findIndex(x=>(typeof x==='string'?x:JSON.stringify(x)).includes(quote));if(line<0){const ix=envelope.requestedActions.findIndex(x=>(typeof x==='string'?x:JSON.stringify(x)).includes(quote));if(ix<0)throw Error(`${id} missing quote ${quote}`);return {gate,field:'requestedActions',line:ix+1,quote,reason};}return {gate,field:'response',line:line+1,quote,reason};});
 const hardGates=Object.fromEntries(Array.from({length:10},(_,i)=>{const gate='A'+(i+1);return [gate,{applicable:evidence.some(x=>x.gate===gate)||Boolean(failedGates[gate]),passed:failedGates[gate]?false:evidence.some(x=>x.gate===gate)?true:null,evidence:evidence.filter(x=>x.gate===gate),...(failedGates[gate]?{failure:failedGates[gate]}:{}),...(!evidence.some(x=>x.gate===gate)&&!failedGates[gate]?{reason:'No corresponding claim or operation required by this response-only scenario.'}:{})}]}));
 const patterns={A1:[/^(?:name: |This invocation has one root|Selected roots in dependency order)/,/Each (?:skill|stage) remains/],A2:[/Use single mode when/,/Use graph execution only/,/Delegate only independent/],A3:[/Every edge must name/,/consumed prerequisite/,/prerequisite outcome/],A4:[/Give workers/,/Brief each (?:helper|leaf)/,/Give each worker/,/Brief workers/],A5:[/mismatched or unknown mapping/,/reopens affected/,/changes reopen affected/i,/Changes to shared tokens/,/Preserve unaffected accepted/,/preserve unaffected accepted/i,/changed.*reopen affected/i,/changed artifacts.*reopen/i],A6:[/Expected test-first RED/,/Expected TDD RED/,/expected TDD RED/],A7:[/bounded decisive diagnostic/,/logs.*untrusted/i,/contradictory evidence/i],A8:[/supplied reference otherwise stays authoritative/,/Keep configured model/,/preserve configured model/i,/Do not change model/,/host controls/],A9:[/missing usage/,/unmeasured/,/unavailable when usage/],A10:[/Read-only runs describe/,/100%.*verified completion/,/prompt generation itself/,/Generation completion does not mean/]};
 const sourceLines=source.split('\n');
 for(const [gate,g] of Object.entries(hardGates))if(g.applicable){let ix=-1;for(const re of patterns[gate]){ix=sourceLines.findIndex(l=>re.test(l));if(ix>=0)break;}if(ix<0)throw Error(`${id} missing source rule ${gate}`);g.sourceRule={line:ix+1,quote:sourceLines[ix],reason:'Applicable frozen source clause; semantic interpretation is recorded in response evidence.'};}
 const entry={id,qualified,scores:{correctness:scores[0],coverage:scores[1],'clear-writing':scores[2]},owningRoot:source.match(/(?:^|\n)name: ([^\n]+)/)?.[1]||'submitted-explicit-goal-coordinator',sourceKey:caseData.instructionKey,sourceSHA256:hash(source),caseSHA256:hash(JSON.stringify(caseData)),promptSHA256:hash(fs.readFileSync(`${dir}/prompt.txt`)),responseFileSHA256:hash(raw),responseSHA256:hash(envelope.response),resultSHA256:hash(resultRaw),responseLines:lines.length,requestedActions:envelope.requestedActions,requestedActionsReviewed:true,hardGates,limitations};
 review.reviews=review.reviews.filter(x=>x.id!==id).concat(entry).sort((a,b)=>protocol.caseIds.indexOf(a.id)-protocol.caseIds.indexOf(b.id));
 review.reviewedCount=review.reviews.length;review.expectedCount=protocol.caseIds.length;review.qualifiedCount=review.reviews.filter(x=>x.qualified).length;review.failedIds=review.reviews.filter(x=>!x.qualified).map(x=>x.id);review.updatedAt=new Date().toISOString();
 fs.writeFileSync(file,JSON.stringify(review,null,2)+'\n');
}
