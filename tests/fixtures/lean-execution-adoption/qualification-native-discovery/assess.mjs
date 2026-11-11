import fs from 'node:fs';
import path from 'node:path';
import {TARGET_SKILL_COLLECTIONS} from '/github/skills/scripts/skill-collection-registry.mjs';
import {inspectNativePayload} from '/github/skills/scripts/migration-native-packages.mjs';
const out=path.dirname(new URL(import.meta.url).pathname);
const staticPayloads=[];
for(const c of TARGET_SKILL_COLLECTIONS){
 for(const [host,key] of [['codex','codexPackageRoot'],['claude-code','claudePackageRoot'],['pi','piPackageRoot']]){
  const source='/github/skills/'+c[key];
  try{
   const payload=await inspectNativePayload(host,source);
   staticPayloads.push({host,collection:c.id,source,classification:'static payload inspection; not native host discovery',matches:JSON.stringify([...c.publicCommands].sort())===JSON.stringify(payload.publicNames),payload});
  }catch(e){staticPayloads.push({host,collection:c.id,source,error:e.message});}
 }
}
fs.writeFileSync(path.join(out,'static-payloads.json'),JSON.stringify(staticPayloads,null,2)+'\n');
const claude=JSON.parse(fs.readFileSync(path.join(out,'claude-native-source.json'),'utf8'));
const responses=claude.stdout.flatMap(line=>{try{return [JSON.parse(line)];}catch{return []}});
const commands=responses.find(x=>x.type==='control_response').response.response.commands;
const expected=TARGET_SKILL_COLLECTIONS.flatMap(c=>c.publicCommands.map(n=>({name:c.id+':'+n,alias:n,collection:c.id})));
const observed=commands.filter(c=>expected.some(e=>e.name===c.name));
const report={commit:'41716d7b52278faecd446539a8aa1814aeb0dd47',modelRequests:0,claude:{nativeVersion:'2.1.317',classification:'native CLI session initialization enumeration with transient --plugin-dir source loading',expectedCount:expected.length,observedCount:observed.length,allNamesAndAliasesMatch:expected.every(e=>commands.some(c=>c.name===e.name && c.aliases?.includes(e.alias))),unexpectedQs:commands.filter(c=>c.name.startsWith('qs-')&&!expected.some(e=>e.name===c.name)),byCollection:TARGET_SKILL_COLLECTIONS.map(c=>({collection:c.id,count:observed.filter(s=>s.name.startsWith(c.id+':')).length})),closureQualification:'Full source package roots loaded; static inspectNativePayload separately inventories closure. Initialization enumeration does not prove runtime loading of each private dependency.'},staticPayloads:{count:staticPayloads.length,allNamesMatch:staticPayloads.every(x=>x.matches===true)},pi:{nativeCli:'blocked EROFS trust.json.lock before get_commands',sdkLoader:'39 exact source roots; zero diagnostics; does not prove CLI literals'},codex:{nativeCli:'blocked EROFS before initialize',schema:'SkillsListParams accepts cwds and forceReload only; no explicit source/plugin load argument identified'}};
fs.writeFileSync(path.join(out,'assessment.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
