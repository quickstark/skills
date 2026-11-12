import {readFile,writeFile,readdir,lstat} from 'node:fs/promises';
import {join,dirname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=dirname(fileURLToPath(import.meta.url)),sha=x=>createHash('sha256').update(x).digest('hex');
const files=[],nonregular=[];
const walk=async dir=>{for(const e of await readdir(dir,{withFileTypes:true})){const path=join(dir,e.name),name=relative(root,path);if(e.isDirectory())await walk(path);else if(e.isFile()&&name!=='promotion-files.json'){const b=await readFile(path);files.push({path:name,sha256:sha(b),bytes:b.length});}else nonregular.push({path:name,type:e.isSymbolicLink()?'symlink':'other'});}};
await walk(root);
if(nonregular.length)throw Error('Nonregular evidence encountered; inspect before promotion');
const patterns={openaiToken:/\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{24,}\b/g,githubToken:/\bgh[pousr]_[A-Za-z0-9]{25,}\b/g,githubFineGrained:/\bgithub_pat_[A-Za-z0-9_]{30,}\b/g,awsAccessKey:/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,privateKey:/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g};
const hits=[];
for(const f of files){const text=await readFile(join(root,f.path),'utf8');for(const [kind,p]of Object.entries(patterns)){const count=[...text.matchAll(p)].length;if(count)hits.push({path:f.path,kind,count});}}
if(hits.length)throw Error('Credential-pattern matches found; counts only: '+JSON.stringify(hits));
const manifest={kind:'parent-owned-durable-evidence-promotion-inventory',originalRoot:'.unlazy/release-447/response',proposedDurableRoot:'tests/fixtures/lean-execution-adoption/release-447',files:files.sort((a,b)=>a.path.localeCompare(b.path)),nonregular,credentialPatternScan:{matchedFiles:0,patterns:Object.keys(patterns),limits:'A finite pattern scan plus capture shape inspection; no guarantee about arbitrary secret formats. Only native controls, public source and synthetic fixture observations were intentionally captured; no secret/configuration credential read was requested.'},archiveExclusions:[{path:'promotion-files.json',reason:'This inventory cannot hash itself; parent should bind its SHA separately.'}],portability:{originalVerifier:'verify.mjs uses original .unlazy-relative repository/import locations; preserve bytes and derive portable verifier separately with relocation mapping',absolutePaths:'Captured cwd/process/native control paths are factual observations, not replay assumptions',duplicateFrozenInputs:'Local mirrors of existing frozen plan inputs are byte-identical; parent may deduplicate only with explicit relocation bindings to unchanged existing source files.',ownership:'Parent owns copying, relocation mapping, independent semantic acceptance and final promotion. This inventory grants none of those results.'}};
await writeFile(join(root,'promotion-files.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({regularFiles:files.length,credentialPatternMatches:0,symlinks:0}));
