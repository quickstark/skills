import fs from 'node:fs';
import {loadSkillsFromDir} from '/home/djn12313/.npm-global/lib/node_modules/@earendil-works/pi-coding-agent/dist/core/skills.js';
import {TARGET_SKILL_COLLECTIONS} from '/github/skills/scripts/skill-collection-registry.mjs';
const results=TARGET_SKILL_COLLECTIONS.map(c=>{
 const source='/github/skills/'+c.piPackageRoot+'/skills';
 const result=loadSkillsFromDir({dir:source,source:'explicit source path'});
 return {collection:c.id,source,expected:c.publicCommands,actual:result.skills.map(s=>s.name),matches:JSON.stringify([...c.publicCommands].sort())===JSON.stringify(result.skills.map(s=>s.name).sort()),result};
});
fs.writeFileSync(new URL('./pi-native-loader.json',import.meta.url),JSON.stringify({classification:'installed Pi SDK native loader; not a Pi CLI session or package installation',module:'/home/djn12313/.npm-global/lib/node_modules/@earendil-works/pi-coding-agent/dist/core/skills.js',modelRequests:0,results},null,2)+'\n');
console.log(JSON.stringify(results.map(r=>({collection:r.collection,count:r.actual.length,matches:r.matches,diagnostics:r.result.diagnostics.length}))));
