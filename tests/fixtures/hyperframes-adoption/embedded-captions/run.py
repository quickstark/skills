#!/usr/bin/env python3
"""Run actual installed embedded-caption pipeline. Existing resources only.
QS_VIDEO_CLI, HYPERFRAMES_BROWSER_PATH, HF_TEST_USER_DIRECTORY, PATH and
LD_LIBRARY_PATH select explicitly provisioned resources; cache must be in /tmp.
No downloads or dependency setup happen inside this runner.
"""
import argparse, hashlib, json, os, shutil, subprocess
from pathlib import Path

parser=argparse.ArgumentParser()
parser.add_argument('--output',required=True)
parser.add_argument('--stage',choices=['prepare','finish'],default='prepare')
a=parser.parse_args()
out=Path(a.output).resolve()
fixture=Path(__file__).resolve().parent
repo=fixture.parents[3]
assert str(out).startswith('/tmp/')
user=Path(os.environ['HF_TEST_USER_DIRECTORY']).resolve()
assert str(user).startswith('/tmp/')
env={**os.environ,'NODE_OPTIONS':'--import='+str(fixture.parent/'isolated-runtime.mjs'),
     'HF_TEST_NETWORK_LOG':str(out/'network.jsonl'),'HYPERFRAMES_SKIP_SKILLS':'1',
     'HYPERFRAMES_NO_TELEMETRY':'1','DO_NOT_TRACK':'1'}
logs=[]
def run(argv,label,cwd=None,extra=None,success=True,timeout=600):
    result=subprocess.run([str(x) for x in argv],cwd=cwd or out,env={**env,**(extra or {})},capture_output=True,timeout=timeout)
    (out/(label+'.stdout')).write_bytes(result.stdout)
    (out/(label+'.stderr')).write_bytes(result.stderr)
    logs.append({'label':label,'argv':list(map(str,argv)),'exit':result.returncode})
    (out/(a.stage+'-commands.json')).write_text(json.dumps(logs,indent=2)+'\n')
    if success and result.returncode:raise RuntimeError(f'{label} failed ({result.returncode}); retained stderr')
    return result

project=out/'project';installed=out/'relocated-skill'
scripts=installed/'modules/embedded-captions/scripts'
if a.stage=='prepare':
    out.mkdir(parents=True,exist_ok=False)
    # A relocated complete package exercises source-relative helper imports.
    shutil.copytree(repo/'skills/video/qs-video',out/'original-install')
    (out/'original-install').rename(installed)
    project.mkdir()
    shutil.copyfile(fixture/'source.mp4',project/'source.mp4')
    shutil.copyfile(fixture/'transcript.json',project/'transcript.json')
    shutil.copyfile(fixture/'plan.json',project/'plan.json')
    (project/'package.json').write_text('{"devDependencies":{"hyperframes":"0.8.77"}}\n')
    run(['node',installed/'scripts/verify-closure.mjs',installed],'relocated-closure')
    # Missing cache tests use the real installed CLI, with transport denied.
    for kind in ['missing-model','missing-optional']:
        fake=out/kind;fake.mkdir();cache=fake/'.cache/hyperframes'
        if kind=='missing-optional':
            model=cache/'background-removal/models/u2net_human_seg.onnx'
            model.parent.mkdir(parents=True)
            model.symlink_to(user/'.cache/hyperframes/background-removal/models/u2net_human_seg.onnx')
        negative=out/(kind+'-project');negative.mkdir()
        shutil.copyfile(fixture/'source.mp4',negative/'input.mp4')
        before=sorted(x.name for x in negative.iterdir())
        result=run(['node',scripts/'matte.cjs',negative],kind,extra={'HF_TEST_USER_DIRECTORY':str(fake)},success=False)
        assert result.returncode!=0 and before==sorted(x.name for x in negative.iterdir())
        assert b'Cached' in result.stderr
        assert not (out/'network.jsonl').exists()
    run(['node',installed/'scripts/caption-runtime.cjs','preflight-matte',project],'real-preflight')
    run(['bash',scripts/'prepare.sh',project],'prepare')
    assert json.loads((project/'transcript.json').read_text())==json.loads((fixture/'transcript.json').read_text())
    fg=list((project/'frames_fg').glob('*.png'));bg=list((project/'frames_bg').glob('*.png'))
    assert len(fg)==len(bg)==24
    print(json.dumps({'stage':'prepare','frames':len(fg),'suppliedTranscriptUnchanged':True,'negativePreflights':'rejected before mutations/downloads'}))
else:
    assert project.is_dir() and installed.is_dir()
    run(['node',scripts/'make-composition.cjs',project],'compile')
    run(['node',scripts/'inject-fonts.cjs',project],'fonts')
    run(['node',scripts/'preview-frames.cjs',project,'0.25','1.8','3.5'],'preview')
    run(['node',scripts/'measure-layout.cjs',project],'layout')
    run(['node',scripts/'check-timing.cjs',project,'--strict'],'timing')
    run(['node',scripts/'check-occlusion.cjs',project,'--strict'],'occlusion')
    run(['node',scripts/'check-overflow.cjs',project],'overflow')
    run(['bash',scripts/'render-and-composite.sh',project],'render-composite',timeout=600)
    probe=run(['ffprobe','-v','error','-show_streams','-show_format','-of','json',project/'final.mp4'],'final-probe')
    meta=json.loads(probe.stdout)
    video=next(x for x in meta['streams'] if x['codec_type']=='video')
    assert (video['width'],video['height'])==(640,360)
    assert abs(float(meta['format']['duration'])-4)<0.15
    assert any(x['codec_type']=='audio' for x in meta['streams'])
    run(['ffmpeg','-y','-v','error','-ss','1.8','-i',project/'final.mp4','-frames:v','1',out/'final-frame.png'],'final-frame')
    run(['node',fixture/'verify-output.cjs',project],'decoded-output-oracles')
    # Actual negative controls re-use the same compiled identity and real matte.
    # Thresholds remain fixed; bad layouts are not accepted as new baselines.
    negatives={}
    for kind in ['bad-timing','occluded-text','overflow','missing-matte','missing-caption']:
        target=out/('negative-'+kind)
        shutil.copytree(project,target)
        plan=json.loads((target/'plan.json').read_text())
        if kind=='bad-timing':
            plan['groups'][0]['words'][0]['start']+=1
        elif kind=='occluded-text':
            plan['planes']['narr']='top: 35%; left: 25%; width: 30%; height: 44%;'
        elif kind=='overflow':
            plan['planes']['narr']='top: 3.7%; left: 95%; width: 30%; height: 44%;'
        elif kind=='missing-caption':
            plan['groups'][0]['css']+=' visibility:hidden!important;'
        if kind=='missing-matte':
            layout=json.loads((target/'_layout.json').read_text())
            (target/'frames_fg'/f'f_{layout["samples"][0]["frame_idx"]:04d}.png').unlink()
        else:
            (target/'plan.json').write_text(json.dumps(plan,indent=2)+'\n')
            run(['node',scripts/'make-composition.cjs',target],kind+'-compile')
        check='check-timing.cjs' if kind=='bad-timing' else 'check-occlusion.cjs'
        result=run(['node',scripts/check,target,'--strict'],kind+'-gate',success=False)
        assert result.returncode!=0,kind+' negative control incorrectly passed'
        negatives[kind]=result.returncode
    result={'stage':'finish','render':'passed','duration':meta['format']['duration'],'dimensions':[640,360],
            'finalSha256':hashlib.sha256((project/'final.mp4').read_bytes()).hexdigest(),
            'negativeControls':negatives,
            'scope':'Supplied editorial captions; no speech recognition or all-provider claim.'}
    (out/'result.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result))
