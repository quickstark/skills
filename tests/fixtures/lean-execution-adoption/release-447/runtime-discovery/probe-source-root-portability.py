from pathlib import Path
import json,hashlib,tempfile,subprocess,shutil
out=Path(__file__).resolve().parent
repo=next(p for p in out.parents if (p/'package.json').is_file() and (p/'scripts/skill-collection-registry.mjs').is_file())
base=Path(tempfile.mkdtemp(prefix='qs-lex12-portability-'))/'checkout with spaces # source'
(base/'scripts').mkdir(parents=True)
staged=base/'.unlazy/release-447/runtime-discovery';staged.mkdir(parents=True)
for src,dest in [(repo/'package.json',base/'package.json'),(repo/'scripts/skill-collection-registry.mjs',base/'scripts/skill-collection-registry.mjs'),(out/'verify.mjs',staged/'verify.mjs')]:shutil.copyfile(src,dest)
records=[]
def run(label,expected):
 argv=['node',str(staged/'verify.mjs'),'--resolve-source-root']
 r=subprocess.run(argv,cwd='/tmp',capture_output=True,text=True,timeout=15)
 records.append({'label':label,'argv':argv,'cwd':'/tmp','expectedExit':expected,'exitCode':r.returncode,'stdout':r.stdout,'stderr':r.stderr})
 assert r.returncode==expected,(label,r.returncode,r.stderr)
 if expected==0:
  assert r.stdout.startswith('SOURCE_ROOT_RESOLUTION_OK ')
  data=json.loads(r.stdout.split(' ',1)[1]);assert data['repo']==str(base);assert data['sourceExample']==str(base/'skills/video/qs-video/SKILL.md');assert data['registryModule']==str(base/'scripts/skill-collection-registry.mjs')
 return r
run('copied-path-positive',0)
registry=base/'scripts/skill-collection-registry.mjs';saved=registry.read_bytes();registry.unlink()
run('missing-registry-negative',1);registry.write_bytes(saved)
package=base/'package.json';saved=package.read_bytes();x=json.loads(saved);x['name']='unrelated-project';package.write_text(json.dumps(x))
run('unrelated-package-negative',1);package.write_bytes(saved)
run('restored-positive',0)
(out/'source-root-portability.json').write_text(json.dumps({'scope':'Root and historical-source-path resolution only; not a fresh copy of full package/runtime qualification. The copied path includes spaces and a URL-significant character; CWD is outside the fixture.','sourceVerifierSHA256':hashlib.sha256((out/'verify.mjs').read_bytes()).hexdigest(),'originalVerifierSHA256':hashlib.sha256((out/'verify-original.mjs').read_bytes()).hexdigest(),'records':records,'allExpected':True,'limits':'Full projected captureMigrationPath bindings still include exact historical directory modes. Different metadata is reported as a binding mismatch, not silently normalized.'},indent=2)+'\n')
print('SOURCE_ROOT_PORTABILITY_PASS')
