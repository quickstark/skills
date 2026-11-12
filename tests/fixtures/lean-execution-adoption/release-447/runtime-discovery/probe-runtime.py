from pathlib import Path
import json, subprocess, os, hashlib, shutil
OUT=Path(__file__).resolve().parent
repo=Path('/github/skills'); acquired=json.loads((OUT/'runtime-acquisition.json').read_text()); files=acquired['files']
user=Path('/tmp/qs-lex12-runtime/user');user.mkdir(exist_ok=True)
env={**os.environ,'LD_LIBRARY_PATH':acquired['libraryPath'],'HF_TEST_USER_DIRECTORY':str(user),'HF_TEST_NETWORK_LOG':str(OUT/'runtime-network.jsonl'),'NODE_OPTIONS':'--import='+str(repo/'tests/helpers/isolated-video-runtime.mjs'),'QS_VIDEO_CLI':files['cli']['path'],'HYPERFRAMES_BROWSER_PATH':files['browser']['path'],'HYPERFRAMES_FFMPEG_PATH':files['ffmpeg']['path'],'HYPERFRAMES_FFPROBE_PATH':files['ffprobe']['path'],'HYPERFRAMES_SKIP_SKILLS':'1','HYPERFRAMES_NO_TELEMETRY':'1','DO_NOT_TRACK':'1'}
results=[]
def run(label,argv,timeout=60):
 try:
  r=subprocess.run(argv,env=env,cwd=repo,text=True,capture_output=True,timeout=timeout); rec={'label':label,'argv':argv,'exitCode':r.returncode,'stdout':r.stdout,'stderr':r.stderr}
 except subprocess.TimeoutExpired as e:rec={'label':label,'argv':argv,'exitCode':None,'timeout':timeout,'stdout':str(e.stdout),'stderr':str(e.stderr)}
 results.append(rec);(OUT/'runtime-results.json').write_text(json.dumps({'environmentOverrides':{k:v for k,v in env.items() if os.environ.get(k)!=v},'results':results},indent=2)+'\n');print(label,rec['exitCode'],flush=True);return rec
for name,args in [('node',['node','--version']),('ffmpeg',[files['ffmpeg']['path'],'-version']),('ffprobe',[files['ffprobe']['path'],'-version']),('browser',[files['browser']['path'],'--version']),('hyperframes',['node',files['cli']['path'],'--version'])]:run(name,args)
fixture=repo/'tests/fixtures/lean-execution-adoption/qualification-local-runtime/video-project'
run('adapter-preflight',['node',str(repo/'skills/video/qs-video/scripts/caption-runtime.cjs'),'preflight-render',str(fixture)])
env.update({'HF_CLI':files['cli']['path'],'HF_FFMPEG':files['ffmpeg']['path'],'HF_FFPROBE':files['ffprobe']['path'],'HF_BROWSER':files['browser']['path'],'HF_GSAP':str(fixture/'gsap.min.js'),'HF_FONT':str(fixture/'font.ttf'),'HF_CARVE':str(repo/'skills/video/qs-video/modules/hyperframes-audio/scripts/carve.mjs'),'HF_CORE_ROOT':'/tmp/qs-lex12-runtime/node_modules/@hyperframes/core'})
run('actual-render-audio-seek-matrix',['python3',str(repo/'tests/fixtures/hyperframes-adoption/run.py'),'--output',str(OUT/'video-fresh-run')],timeout=480)
