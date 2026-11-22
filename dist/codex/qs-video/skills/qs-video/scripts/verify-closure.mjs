#!/usr/bin/env node
import { readFileSync, readdirSync, lstatSync, existsSync } from 'node:fs';
import { resolve, relative, dirname, isAbsolute, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const digest=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
function walk(path) {
  return readdirSync(path).flatMap(name=>{
    const entry=resolve(path,name), stat=lstatSync(entry);
    if(stat.isSymbolicLink()) throw new Error(`Symbolic link in private closure: ${entry}`);
    return stat.isDirectory()?walk(entry):[entry];
  });
}
export function verifyClosure(root=resolve(dirname(fileURLToPath(import.meta.url)),'..')) {
  root=resolve(root);
  const index=JSON.parse(readFileSync(resolve(root,'references/dependency-index.json'),'utf8'));
  if(index.schemaVersion!==1 || !/^[a-f0-9]{40}$/.test(index.sourceRevision)) throw new Error('Invalid provenance index');
  const destinations=new Set(), sources=new Set();
  const contained=path=>{
    if(typeof path!=='string' || isAbsolute(path) || path.split('/').includes('..')) throw new Error(`Unsafe resource path: ${path}`);
    const full=resolve(root,path);
    if(!full.startsWith(root+sep)) throw new Error(`Escaping resource path: ${path}`);
    for(let part=dirname(full);part!==root;part=dirname(part)) {
      if(existsSync(part) && lstatSync(part).isSymbolicLink()) throw new Error(`Symbolic link in resource ancestors: ${path}`);
    }
    return full;
  };
  for(const record of index.files) {
    if(sources.has(record.sourcePath) || !/^[a-f0-9]{64}$/.test(record.sourceSha256)) throw new Error(`Invalid source record: ${record.sourcePath}`);
    sources.add(record.sourcePath);
    if(record.destinationPath===null) {
      if(record.disposition!=='omit-public-invocation-metadata' || !record.sourcePath.endsWith('/agents/openai.yaml')) throw new Error('Unexpected omitted source resource');
      continue;
    }
    const full=contained(record.destinationPath);
    if(destinations.has(full)) throw new Error(`Duplicate resource: ${record.destinationPath}`);
    destinations.add(full);
    if(!existsSync(full) || !lstatSync(full).isFile() || lstatSync(full).isSymbolicLink()) throw new Error(`Missing or nonregular resource: ${record.destinationPath}`);
    if(digest(full)!==record.derivedSha256) throw new Error(`Derived hash mismatch: ${record.destinationPath}`);
  }
  for(const record of index.localFiles ?? []) {
    const full=contained(record.path);
    if(!existsSync(full) || !lstatSync(full).isFile() || lstatSync(full).isSymbolicLink()) throw new Error(`Missing local helper/resource: ${record.path}`);
    if(digest(full)!==record.sha256) throw new Error(`Local helper hash mismatch: ${record.path}`);
  }
  const actual=walk(resolve(root,'modules'));
  for(const file of actual) {
    if(!destinations.has(file)) throw new Error(`Unindexed private resource: ${relative(root,file)}`);
    if(file.endsWith('/SKILL.md') || file.endsWith('/agents/openai.yaml')) throw new Error('Private module contains public invocation metadata');
  }
  const moduleNames=new Set();
  for(const module of index.modules) {
    if(moduleNames.has(module.id) || !/^[a-z0-9-]+$/.test(module.id) || !/^[a-f0-9]{40}$/.test(module.upstreamTreeHash)) throw new Error('Invalid module identity');
    moduleNames.add(module.id);
    if(module.entry!==`modules/${module.id}/instructions.md` || !destinations.has(contained(module.entry))) throw new Error(`Missing module entry: ${module.id}`);
  }
  const imports=[];
  for(const file of actual.filter(x=>/\.(?:mjs|cjs|js|ts)$/.test(x))) {
    const text=readFileSync(file,'utf8');
    for(const match of text.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\(\s*|new URL\(\s*)["'](\.[^"']+)["']/g)) {
      const candidate=resolve(dirname(file),match[1]);
      if(!candidate.startsWith(root+sep) || ![candidate,candidate+'.js',candidate+'.mjs',candidate+'.ts',candidate+'.tsx'].some(existsSync)) throw new Error(`Unresolved relative import: ${relative(root,file)} -> ${match[1]}`);
      imports.push([relative(root,file),match[1]]);
    }
  }
  for(const file of actual.filter(x=>x.endsWith('.md'))) {
    for(const match of readFileSync(file,'utf8').matchAll(/\]\(([^)]+)\)/g)) {
      const link=match[1].split('#')[0];
      if(!link || /:/.test(link) || /[<>{}]/.test(link)) continue;
      const target=resolve(dirname(file),link);
      if(!target.startsWith(root+sep) || !existsSync(target)) throw new Error(`Broken private resource link: ${relative(root,file)} -> ${link}`);
    }
  }
  for(const required of ['LICENSE','NOTICE','SKILL.md','agents/openai.yaml','references/adaptation-policy.md','scripts/runtime.mjs','scripts/scaffold.mjs']) {
    if(!existsSync(contained(required))) throw new Error(`Missing root resource: ${required}`);
  }
  return {ok:true,modules:moduleNames.size,sourceFiles:sources.size,privateFiles:actual.length,relativeImports:imports.length,sourceRevision:index.sourceRevision};
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {console.log(JSON.stringify(verifyClosure(process.argv[2])));} catch(error) {console.error(error.message);process.exitCode=1;}
}
