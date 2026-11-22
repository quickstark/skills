#!/usr/bin/env node
import { lstatSync, existsSync, readdirSync, writeFileSync, mkdtempSync, mkdirSync, copyFileSync, rmSync, constants } from 'node:fs';
import { resolve, dirname, basename, join, isAbsolute } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const stat = path => { try { return lstatSync(path); } catch(error) { if(error.code==='ENOENT') return null; throw error; } };

export const PROJECT_GUIDANCE = `# QS video project\n\nUse the installed $qs-video:qs-video root and its private dependency index for selected video work. Preserve the project's runtime pin, BRIEF, supplied assets and requested outcome. Never install or refresh upstream skills to resolve a missing private module. Prompt-only/storyboard-only work stops at the requested artifact. Existing-project operations do not reopen intake. Provider/model installation, authentication, paid generation, cloud rendering, publication and external feedback need their actual user authorization. Run timeline inspection from this project's directory. Verify actual frames/audio for the selected change; command success alone is insufficient.\n`;

export function scaffold({cli, args, cwd=process.cwd()}) {
  if (!isAbsolute(cli) || !existsSync(cli) || !lstatSync(cli).isFile()) throw new Error('Provide an absolute, existing CLI executable file (resolve symlinks first).');
  if (!args.length || args[0].startsWith('-')) throw new Error('Name the new target directory before init options.');
  const target=resolve(cwd,args[0]);
  const parent=dirname(target), initialTarget=stat(target), initialParent=stat(parent);
  if(!initialParent?.isDirectory()) throw new Error('Scaffold requires an existing parent directory.');
  for(let path=target;;path=dirname(path)) {
    if(stat(path)?.isSymbolicLink()) throw new Error('Scaffold target and ancestors must not be symbolic links.');
    if(dirname(path)===path) break;
  }
  if(existsSync(target) && (!lstatSync(target).isDirectory() || readdirSync(target).length)) throw new Error('Scaffold refuses an existing nonempty target.');
  const allowed=new Set(['--non-interactive','--skip-skills','--skip-transcribe','--example','--skill','--resolution','--video','--audio']);
  for(let i=1;i<args.length;i++) {
    const [flag,inline]=args[i].split('=',2);
    if(!allowed.has(flag)) throw new Error(`Unsupported scaffold option: ${flag}`);
    if(['--non-interactive','--skip-skills','--skip-transcribe'].includes(flag)) { if(inline !== undefined) throw new Error('Boolean scaffold options do not accept inline values.'); continue; }
    const value=inline ?? args[++i];
    if(!value || value.startsWith('-')) throw new Error(`${flag} requires a value`);
    if(flag==='--example' && value!=='blank') throw new Error('This scaffold helper supports the bundled blank example only; selected external templates need a separate authorized operation.');
  }
  const version=spawnSync(cli,['--version'],{cwd,encoding:'utf8',timeout:15000});
  if(version.status!==0 || version.stdout.trim()!=='0.8.77') throw new Error('Fresh scaffold requires the tested CLI0.8.77; existing projects are not upgraded.');
  const stage=mkdtempSync(join(parent,'.qs-video-scaffold-'));
  const payload=join(stage,basename(target));
  const sameIdentity=(before,after)=>Boolean(before && after && before.dev===after.dev && before.ino===after.ino && before.isDirectory() && after.isDirectory() && !after.isSymbolicLink());
  const unchanged=(before,after)=>sameIdentity(before,after) && before.mtimeMs===after.mtimeMs && before.ctimeMs===after.ctimeMs;
  const normalized=[payload,...args.slice(1)];
  if(!normalized.includes('--non-interactive')) normalized.push('--non-interactive');
  if(!normalized.includes('--skip-transcribe')) normalized.push('--skip-transcribe');
  if(!normalized.some(x=>x==='--example'||x.startsWith('--example='))) normalized.push('--example','blank');
  let publicationStarted=false;
  try {
    const run=spawnSync(cli,['init',...normalized],{cwd,encoding:'utf8',timeout:120000,env:{...process.env,HYPERFRAMES_SKIP_SKILLS:'1',HYPERFRAMES_NO_TELEMETRY:'1',DO_NOT_TRACK:'1'}});
    writeFileSync(join(stage,'init.stdout'),run.stdout ?? '');
    writeFileSync(join(stage,'init.stderr'),run.stderr ?? '');
    if(run.status!==0) throw new Error(`Scaffold CLI failed (${run.status ?? run.error?.code ?? 'unknown'})`);
    // Only staged output is inspected or rewritten. The external CLI never sees
    // the destination path as its target and cannot mistake concurrent guidance
    // there for its own generated files.
    const validateTree=directory=>{
      if(!stat(directory)?.isDirectory() || stat(directory).isSymbolicLink()) throw new Error('Nonregular staged directory');
      for(const name of readdirSync(directory)) {
        const path=join(directory,name), entry=stat(path);
        if(entry.isDirectory() && !entry.isSymbolicLink()) validateTree(path);
        else if(!entry.isFile() || entry.isSymbolicLink() || entry.nlink!==1) throw new Error(`Nonregular staged resource: ${name}`);
      }
    };
    validateTree(payload);
    for(const name of ['package.json','index.html']) {
      if(!stat(join(payload,name))?.isFile()) throw new Error(`CLI returned success without required ${name}`);
    }
    for(const name of ['AGENTS.md','CLAUDE.md']) writeFileSync(join(payload,name),PROJECT_GUIDANCE);
    if(!sameIdentity(initialParent,stat(parent))) throw new Error('Scaffold parent changed during initialization');
    const current=stat(target);
    if(initialTarget ? !unchanged(initialTarget,current) || readdirSync(target).length : current!==null) throw new Error('Scaffold target was created or changed during initialization');
    // Claim an absent destination atomically. An existing empty destination must
    // still have its initial identity/state. Never rename over either directory:
    // every published file is created exclusively, so a late competing file is
    // preserved and causes failure. Partial output is not destructively undone.
    if(!initialTarget) mkdirSync(target);
    const ownedTarget=stat(target);
    publicationStarted=true;
    const publish=(source,destination)=>{
      const ownedDirectory=stat(destination);
      for(const name of readdirSync(source)) {
        if(!sameIdentity(ownedTarget,stat(target)) || !sameIdentity(ownedDirectory,stat(destination))) throw new Error('Scaffold destination changed during publication');
        const input=join(source,name), output=join(destination,name);
        if(stat(input).isDirectory()) {mkdirSync(output);publish(input,output);}
        else copyFileSync(input,output,constants.COPYFILE_EXCL);
      }
    };
    publish(payload,target);
    rmSync(stage,{recursive:true});
  } catch(error) {
    throw new Error(`${error.message}. Staged output retained at ${stage}.${publicationStarted ? ' Publication started; inspect partial destination files before retrying. Existing files were not overwritten.' : ' Destination publication did not start.'}`,{cause:error});
  }
  return {target,version:'0.8.77',generatedInstructions:['AGENTS.md','CLAUDE.md'],skillsRefreshed:false};
}

if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const args=process.argv.slice(2), separator=args.indexOf('--');
    if(args[0]!=='--cli' || separator!==2) throw new Error('Usage: scaffold.mjs --cli /absolute/cli -- new-directory [supported init options]');
    console.log(JSON.stringify(scaffold({cli:args[1],args:args.slice(3)})));
  } catch(error) {console.error(error.message);process.exitCode=1;}
}
