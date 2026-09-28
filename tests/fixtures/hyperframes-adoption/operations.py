#!/usr/bin/env python3
"""Isolated actual CLI calls; documented homedir/transport/preview boundaries are instrumented."""
import argparse,hashlib,json,os,shutil,subprocess,time,re,wave
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--output',required=True);a=p.parse_args();root=Path(a.output).resolve();root.mkdir(parents=True,exist_ok=False);user=root/'synthetic-user';user.mkdir();netlog=root/'network-attempts.jsonl'
cli=Path(os.environ['HF_CLI']).resolve();preload=Path(__file__).with_name('isolated-runtime.mjs').resolve()
env={**os.environ,'HF_TEST_USER_DIRECTORY':str(user),'HF_TEST_NETWORK_LOG':str(netlog),'NODE_OPTIONS':'--import='+str(preload),'HYPERFRAMES_NO_TELEMETRY':'1','DO_NOT_TRACK':'1','HYPERFRAMES_SKIP_SKILLS':'1','HYPERFRAMES_BROWSER_PATH':os.environ['HF_BROWSER'],'HYPERFRAMES_FFMPEG_PATH':os.environ['HF_FFMPEG'],'HYPERFRAMES_FFPROBE_PATH':os.environ['HF_FFPROBE'],'PATH':str(Path(os.environ['HF_FFMPEG']).parent)+os.pathsep+os.environ['PATH']}
results=[]
def run(args,label,extra={},cwd=None):
 r=subprocess.run(['node','--import',str(preload),str(cli),*map(str,args)],cwd=cwd or root,env={**env,**extra},capture_output=True,timeout=30);(root/(label+'.stdout')).write_bytes(r.stdout);(root/(label+'.stderr')).write_bytes(r.stderr);results.append({'label':label,'args':list(map(str,args)),'exit':r.returncode});(root/'results.json').write_text(json.dumps(results,indent=2));return r
r=run(['init','fresh','--example','blank','--non-interactive'],'fresh',{'HF_TEST_STOP_BEFORE_PREVIEW':'1'});assert r.returncode==0 and b'FIXTURE_STOP_BEFORE_PREVIEW' not in r.stdout and b'Opening studio preview' not in r.stdout
fresh=root/'fresh';assert (fresh/'index.html').exists();assert '0.8.77' in (fresh/'package.json').read_text();assert not (user/'.agents').exists() and not (user/'.claude').exists()
# Existing brief and old project pin remain unchanged under a selected read-only command.
(fresh/'BRIEF.md').write_text('workflow: general-video\nflow: companion\nUser-approved exact brief.\n');pkg=(fresh/'package.json').read_text().replace('0.8.77','0.8.76');(fresh/'package.json').write_text(pkg);before={n:hashlib.sha256((fresh/n).read_bytes()).hexdigest() for n in ['BRIEF.md','package.json']};r=run(['timeline','--json'],'resume-timeline',cwd=fresh);assert r.returncode==0;assert before=={n:hashlib.sha256((fresh/n).read_bytes()).hexdigest() for n in before}
# Local file resolution must freeze identical bytes with attributable source data.
asset=root/'asset.wav'
with wave.open(str(asset),'wb') as w:w.setparams((1,2,48000,0,'NONE','not compressed'));w.writeframes(b'\0\0'*4800)
r=run(['media-use','resolve','--type','bgm','--intent','fixture icon','--from',asset,'--local-only','--project',fresh,'--json'],'local-resolve');assert r.returncode==0
records=[json.loads(l) for l in (fresh/'.media/manifest.jsonl').read_text().splitlines()];rec=next(x for x in records if x.get('source')=='ingested');assert (fresh/rec['path']).read_bytes()==asset.read_bytes();assert rec['provenance']['provider']=='local'
# A project-local zero-byte input must fail without an asset record.
empty=root/'empty.svg';empty.write_bytes(b'');old=(fresh/'.media/manifest.jsonl').read_bytes();r=run(['media-use','resolve','--type','image','--from',empty,'--local-only','--project',fresh],'empty-local');assert r.returncode!=0 and old==(fresh/'.media/manifest.jsonl').read_bytes()
# Seed a stale but valid, deliberately minimal catalog. No online request succeeds.
cache=user/'.hyperframes/cache';cache.mkdir(parents=True,exist_ok=True);base='https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry';slug=re.sub('[^a-zA-Z0-9]','_',base)
manifest={'name':'hyperframes','homepage':'https://example.invalid/fixture','items':[{'name':'fixture-counter','type':'hyperframes:component'}]};item={'name':'fixture-counter','type':'hyperframes:component','title':'Fixture Counter','description':'A number count animation','tags':['counter'],'files':[{'path':'fixture-counter.html','target':'compositions/components/fixture-counter.html','type':'hyperframes:snippet'}]}
for key,data in [('registry',manifest),('components__fixture-counter',item)]: (cache/(slug+'__'+key+'.json')).write_text(json.dumps({'fetchedAt':int((time.time()-172800)*1000),'data':data}))
r=run(['catalog','--query','counter','--json'],'offline-catalog');assert r.returncode==0 and b'fixture-counter' in r.stdout
r=run(['catalog','--query','数値カウンター','--json'],'nonenglish');out=json.loads(r.stdout);assert out['query']=='数値カウンター' and out['unsearchable_query'] is True and out['tier']=='words' and out['results']==[];assert not (fresh/'compositions/components/fixture-counter.html').exists()
r=run(['add','fixture-counter','--dir',fresh,'--no-clipboard'],'failed-install');assert r.returncode!=0 and not (fresh/'compositions/components/fixture-counter.html').exists()
# No intentional feedback or skill download was requested even when discovery/installation failed.
requests=[json.loads(l)['url'] for l in netlog.read_text().splitlines()] if netlog.exists() else []
assert not any('/skills/' in u or 'feedback' in u for u in requests),requests
(root/'assertions.json').write_text(json.dumps({'fresh_scaffold_without_refresh':True,'preview_excluded':True,'old_pin_and_brief_byte_preserved':True,'local_asset_exact':True,'zero_byte_rejected':True,'offline_stale_catalog_discovered':True,'failed_install_not_claimed':True,'network_requests_all_refused':requests},indent=2))
print('PASS isolated scaffold/resume/local asset/offline discovery/non-English diagnostics/failed install boundaries')
