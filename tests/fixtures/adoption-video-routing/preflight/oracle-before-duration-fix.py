#!/usr/bin/env python3
"""Independent decoded-output oracle. No rendering, downloads or product writes."""
import sys,json,subprocess,os,struct,math,hashlib
from pathlib import Path
workspace=Path(sys.argv[1]); profile=json.loads((workspace/'tools/runtime-profile.json').read_text()); video=workspace/'output/render.mp4'
env={**os.environ,'LD_LIBRARY_PATH':profile['libraryPath']}; ff=profile['files']['ffmpeg']['path']; fp=profile['files']['ffprobe']['path']
def run(args): return subprocess.run(args,env=env,capture_output=True,check=True,timeout=30).stdout
meta=json.loads(run([fp,'-v','error','-show_streams','-show_format','-of','json',str(video)])); v=next(s for s in meta['streams'] if s['codec_type']=='video'); assert (v['width'],v['height'])==(320,180); assert v['r_frame_rate']=='12/1'; assert abs(float(meta['format']['duration'])-2)<.1; assert any(s['codec_type']=='audio' for s in meta['streams'])
samples=[]; tones=[]
for time in [.25,1,1.75]:
 rgb=run([ff,'-v','error','-ss',str(time),'-i',str(video),'-frames:v','1','-f','rawvideo','-pix_fmt','rgb24','pipe:1']); assert len(rgb)==320*180*3; k=(20*320+20)*3;samples.append(list(rgb[k:k+3]))
for time in [.2,.9,1.7]:
 pcm=run([ff,'-v','error','-ss',str(time),'-t','.2','-i',str(video),'-vn','-ac','1','-ar','48000','-f','s16le','pipe:1']); data=struct.unpack('<'+'h'*(len(pcm)//2),pcm); assert len(data)>8000
 tones.append([2*abs(sum(x*complex(math.cos(2*math.pi*f*i/48000),-math.sin(2*math.pi*f*i/48000)) for i,x in enumerate(data)))/len(data) for f in [220,440]])
def correct_colors(s): return s[0][0]>180 and max(s[0][1:])<50 and s[1][0]>80 and s[1][2]>80 and s[1][1]<40 and .75<s[1][0]/s[1][2]<1.25 and s[2][2]>180 and max(s[2][:2])<50
assert correct_colors(samples),samples
assert not correct_colors([samples[0]]*3),'constant-red negative control must fail'
assert tones[0][0]>2800 and tones[0][1]<30 and all(1200<x<1800 for x in tones[1]) and tones[2][0]<30 and tones[2][1]>2800,tones
assert not (tones[0][0]<30 and tones[0][1]>2800),'constant-first-tone negative control must fail'
print(json.dumps({'videoSHA256':hashlib.sha256(video.read_bytes()).hexdigest(),'size':[v['width'],v['height']],'fps':v['r_frame_rate'],'duration':meta['format']['duration'],'decodedRGB':samples,'toneMagnitudes220_440':tones,'negativeControls':['constant-red rejected','constant-first-tone rejected']},indent=2))
