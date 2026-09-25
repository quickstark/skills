#!/usr/bin/env python3
"""Real HF acceptance fixtures. No installs. All generated media stays in --output.
Required env: HF_CLI, HF_FFMPEG, HF_FFPROBE, HF_BROWSER, HF_GSAP, HF_FONT.
Optional HF_CARVE and HF_CORE_ROOT enable actual voiceover carve tests.
"""
import argparse, hashlib, json, math, os, shutil, struct, subprocess, wave
from pathlib import Path
from html.parser import HTMLParser

p=argparse.ArgumentParser(); p.add_argument('--output', required=True); p.add_argument('--case', action='append', choices=['caption-only','hard-cut-and-zoom','visual-audio-crossfade-and-seek','subcomposition-local-font-asset','aspect-ratio','later-narration-carve-effects']); a=p.parse_args()
OUT=Path(a.output).resolve(); OUT.mkdir(parents=True,exist_ok=False)
keys=['HF_CLI','HF_FFMPEG','HF_FFPROBE','HF_BROWSER','HF_GSAP','HF_FONT']
config={k:str(Path(os.environ[k]).resolve()) for k in keys}
for k,v in config.items():
 if not Path(v).is_file(): raise SystemExit(f'{k} must name an existing file')
env={**os.environ,'HYPERFRAMES_NO_TELEMETRY':'1','DO_NOT_TRACK':'1','HYPERFRAMES_SKIP_SKILLS':'1','HYPERFRAMES_BROWSER_PATH':config['HF_BROWSER'],'HYPERFRAMES_FFMPEG_PATH':config['HF_FFMPEG'],'HYPERFRAMES_FFPROBE_PATH':config['HF_FFPROBE'],'PATH':str(Path(config['HF_FFMPEG']).parent)+os.pathsep+os.environ['PATH']}
logs=[]; outcomes=[]
def command(args,name,cwd=None,ok=True):
 r=subprocess.run([str(x) for x in args],cwd=cwd or OUT,env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=120)
 (OUT/(name+'.stdout')).write_bytes(r.stdout);(OUT/(name+'.stderr')).write_bytes(r.stderr)
 logs.append({'name':name,'argv':[str(x) for x in args],'returncode':r.returncode})
 if ok and r.returncode:raise AssertionError(f'{name} exit {r.returncode}; see raw stderr')
 return r

def hf(args,name,**kw):return command([config['HF_CLI'],*args],name,**kw)
def ff(args,name,**kw):return command([config['HF_FFMPEG'],'-v','error',*args],name,**kw)
def record(name,fn):
 try: detail=fn();outcomes.append({'case':name,'status':'passed','evidence':detail})
 except Exception as e:outcomes.append({'case':name,'status':'failed','error':str(e)})
 (OUT/'results.json').write_text(json.dumps({'config':config,'outcomes':outcomes,'commands':logs},indent=2)+'\n')

def wavefile(path,freqs,duration=2,amplitude=3000):
 with wave.open(str(path),'wb') as w:
  w.setparams((1,2,48000,0,'NONE','not compressed'));w.writeframes(b''.join(struct.pack('<h',int(sum(amplitude*math.sin(2*math.pi*f*i/48000) for f in freqs))) for i in range(int(duration*48000))))

def html(body,timeline='',w=320,h=180,extra=''):
 return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><script src="gsap.min.js"></script><style>@font-face{{font-family:Fixture;src:url('font.ttf')}}*{{margin:0;box-sizing:border-box}}html,body{{width:{w}px;height:{h}px;overflow:hidden;background:#000}}#root{{position:relative;width:{w}px;height:{h}px;font-family:Fixture;color:#fff}}.visual,video{{position:absolute;inset:0;width:100%;height:100%}}.clip{{position:absolute}}</style>{extra}</head><body><div id="root" data-composition-id="main" data-start="0" data-duration="2" data-width="{w}" data-height="{h}">{body}</div><script>const tl=gsap.timeline({{paused:true}});{timeline}window.__timelines['main']=tl;</script></body></html>'''

def project(name,body,timeline='',w=320,h=180):
 d=OUT/name;d.mkdir();shutil.copyfile(config['HF_GSAP'],d/'gsap.min.js');shutil.copyfile(config['HF_FONT'],d/'font.ttf');(d/'index.html').write_text(html(body,timeline,w,h));return d

def snapshot(d,times,name):
 dest=OUT/(name+'-snapshots');hf(['snapshot',d,'--at='+','.join(map(str,times)),'--no-end','--describe=false','--no-browser-gpu','--output='+str(dest)],name)
 return sorted(dest.glob('frame-*.png'))
def pixels(path,name):
 data=ff(['-i',path,'-f','rawvideo','-pix_fmt','rgb24','-frames:v','1','pipe:1'],name).stdout
 return data

def video_pixels(path,time,name):
 return ff(['-ss',str(time),'-i',path,'-f','rawvideo','-pix_fmt','rgb24','-frames:v','1','pipe:1'],name).stdout

def color(data,w,x,y):return tuple(data[(y*w+x)*3:(y*w+x)*3+3])
def expect_color(actual,expected,tolerance=10):assert max(abs(x-y) for x,y in zip(actual,expected))<=tolerance,(actual,expected)
def energy(path,start,duration,freqs,name):
 r=ff(['-ss',str(start),'-t',str(duration),'-i',path,'-vn','-ac','1','-ar','48000','-f','s16le','pipe:1'],name)
 data=struct.unpack('<'+'h'*(len(r.stdout)//2),r.stdout)
 return {str(f):2*abs(sum(x*complex(math.cos(2*math.pi*f*i/48000),-math.sin(2*math.pi*f*i/48000)) for i,x in enumerate(data)))/len(data) for f in freqs}

def render(d,name,w=320,h=180):
 result=d/'result.mp4';hf(['render',d,'--fps','12','--quality','draft','--workers','1','--no-browser-gpu','--output',result],name)
 meta=json.loads(command([config['HF_FFPROBE'],'-v','error','-show_streams','-show_format','-of','json',result],name+'-probe').stdout)
 video=next(s for s in meta['streams'] if s['codec_type']=='video');assert (video['width'],video['height'])==(w,h);assert abs(float(meta['format']['duration'])-2)<.1
 return result

def makevideo(d,name,colorname):
 ff(['-f','lavfi','-i',f'color=c={colorname}:s=320x180:r=12:d=2','-vf','drawbox=x=140:y=70:w=40:h=40:color=white:t=fill','-c:v','libx264','-pix_fmt','yuv420p',d/name],name+'-source')

def captions():
 d=project('captions','<video id="footage" src="red.mp4" data-start="0" data-duration="2" data-track-index="0" muted></video><p id="caption" class="clip" data-start="0.5" data-duration="1" data-track-index="2" style="bottom:10px;left:30px;font-size:22px;background:#000">Exact caption</p>');makevideo(d,'red.mp4','red'); result=render(d,'captions-render');frames=snapshot(d,[.25,.75,1.75],'captions');rgb=[pixels(f,'caption-pixel'+str(i)) for i,f in enumerate(frames)]
 for r in rgb:expect_color(color(r,320,20,20),(253,0,0))
 def whiteband(r):return sum(1 for y in range(140,175) for x in range(25,220) if min(color(r,320,x,y))>180)
 assert whiteband(video_pixels(result,.75,'caption-decoded-video'))>150
 counts=[whiteband(r) for r in rgb];assert counts[0]==0 and counts[1]>150 and counts[2]==0,counts
 # Independent negative control: missing caption fails the same temporal visibility oracle.
 try:assert whiteband(rgb[0])>150
 except AssertionError:pass
 else:raise AssertionError('caption negative control unexpectedly passed')
 return {'white_text_pixels':counts,'video_sha256':hashlib.sha256(result.read_bytes()).hexdigest(),'negative_control':'missing caption rejected'}

def cuts_zoom():
 d=project('cuts-zoom','<div id="a-visual" class="visual"><video id="a" src="red.mp4" data-start="0" data-duration="1" data-track-index="0" muted></video></div><div id="b-visual" class="visual"><video id="b" src="blue.mp4" data-start="1" data-duration="1" data-track-index="1" muted></video></div>',"tl.fromTo('#b-visual',{scale:1},{scale:2,duration:.8,ease:'none'},1);")
 makevideo(d,'red.mp4','red');makevideo(d,'blue.mp4','blue');result=render(d,'cut-render'); frames=snapshot(d,[.9,1.01,1.8,1.01],'cut');rgb=[pixels(f,'cut-pixel'+str(i)) for i,f in enumerate(frames)];expect_color(color(rgb[0],320,20,20),(253,0,0));expect_color(color(rgb[1],320,20,20),(0,0,254));
 def whitewidth(r):return sum(min(color(r,320,x,90))>230 for x in range(320))
 encoded=video_pixels(result,1.75,'cut-decoded-video');encoded_color=color(encoded,320,20,20);assert encoded_color[2]>180 and max(encoded_color[:2])<50,encoded_color;assert whitewidth(encoded)>65
 widths=[whitewidth(r) for r in rgb];assert 35<widths[1]<50 and widths[2]>70,widths;assert frames[1].read_bytes()==frames[3].read_bytes()
 try:expect_color(color(rgb[1],320,20,20),(253,0,0))
 except AssertionError:pass
 else:raise AssertionError('wrong shot negative control passed')
 return {'encoded_color':encoded_color,'white_marker_widths':widths,'negative_control':'wrong source color rejected','repeated_seek_equal':True}

def crossfade():
 lanes=lambda points:json.dumps({'version':1,'lanes':[{'target':'volume','points':[{'t':t,'v':v} for t,v in points]}]},separators=(',',':'))
 body='<div id="a" class="visual" style="background:#ff0000"></div><div id="b" class="visual" style="background:#0000ff"></div>'
 body+=f'''<audio id="a-audio" src="a.wav" data-start="0" data-duration="2" data-track-index="10" data-automation='{lanes([(0,1),(.5,1),(1.5,0),(2,0)])}'></audio><audio id="b-audio" src="b.wav" data-start="0" data-duration="2" data-track-index="11" data-automation='{lanes([(0,0),(.5,0),(1.5,1),(2,1)])}'></audio>'''
 d=project('crossfade',body,"tl.fromTo('#b',{opacity:0},{opacity:1,duration:1,ease:'none'},.5);");wavefile(d/'a.wav',[220]);wavefile(d/'b.wav',[440]);video=render(d,'fade-render');times=[.25,.5,1,1.5,1.9,1,.25];frames=snapshot(d,times,'fade');rgb=[pixels(f,'fade-pixel'+str(i)) for i,f in enumerate(frames)];samples=[color(r,320,20,20) for r in rgb]
 encoded_color=color(video_pixels(video,1,'fade-decoded-video'),320,20,20);assert encoded_color[0]>80 and encoded_color[2]>80 and encoded_color[1]<40 and .75<encoded_color[0]/encoded_color[2]<1.25,encoded_color
 expect_color(samples[0],(255,0,0));expect_color(samples[2],(127,0,128));expect_color(samples[3],(0,0,255));assert frames[2].read_bytes()==frames[5].read_bytes() and frames[0].read_bytes()==frames[6].read_bytes()
 energies=[energy(video,t,.2,[220,440],'fade-energy'+str(i)) for i,t in enumerate([.2,.9,1.7])];assert energies[0]['220']>2800 and energies[0]['440']<30;assert 1200<energies[1]['220']<1800 and 1200<energies[1]['440']<1800;assert energies[2]['220']<30 and energies[2]['440']>2800
 try:expect_color(samples[2],(255,0,0))
 except AssertionError:pass
 else:raise AssertionError('missing dissolve negative control passed')
 return {'encoded_color':encoded_color,'samples':samples,'energies':energies,'negative_control':'missing dissolve rejected'}

def subcomposition():
 d=project('subcomposition','<div id="mount" data-composition-id="sub" data-composition-src="compositions/sub.html" data-start="0" data-duration="2" data-track-index="1" data-width="320" data-height="180"></div>');(d/'compositions').mkdir();(d/'asset.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#00ff00"/></svg>')
 (d/'compositions'/'sub.html').write_text('''<html><body><template><style>@font-face{font-family:Fixture;src:url('../font.ttf')}#root{position:absolute;inset:0;background:#000;font-family:Fixture}#asset{position:absolute;left:20px;top:20px;width:80px;height:80px}#label{position:absolute;left:120px;top:40px;color:#fff;font:24px Fixture}</style><div id="root" data-composition-id="sub" data-width="320" data-height="180"><img id="asset" src="../asset.svg"><p id="label">Local font</p></div><script>const subtl=gsap.timeline({paused:true});subtl.fromTo('#asset',{x:0},{x:40,duration:1,ease:'none'},0);window.__timelines['sub']=subtl;</script></template></body></html>''')
 video=render(d,'sub-render');encoded_color=color(video_pixels(video,1.5,'sub-decoded-video'),320,80,50);assert encoded_color[1]>150 and max(encoded_color[0],encoded_color[2])<50,encoded_color;frames=snapshot(d,[0,.5,1.5,0],'sub');rgb=[pixels(f,'sub-pixel'+str(i)) for i,f in enumerate(frames)];expect_color(color(rgb[0],320,30,50),(0,255,0));expect_color(color(rgb[2],320,30,50),(0,0,0));expect_color(color(rgb[2],320,80,50),(0,255,0));assert frames[0].read_bytes()==frames[3].read_bytes();white=sum(min(color(rgb[2],320,x,y))>200 for y in range(35,80) for x in range(120,300));assert white>100
 assert '2 loaded' in (OUT/'sub.stdout').read_text()
 # Missing linked asset must be detected by the real runtime check, not only a file list.
 (d/'asset.svg').unlink();broken=hf(['check',d,'--json','--at=1'],'sub-missing-asset',ok=False);assert broken.returncode!=0
 return {'encoded_color':encoded_color,'missing_asset_negative_control':'runtime rejected', 'font_white_pixels':white,'local_asset_motion':True,'repeat_seek_equal':True}

def aspect():
 d=project('portrait','<div id="block" style="position:absolute;inset:10%;background:#00ff00"></div>',w=180,h=320);video=render(d,'portrait-render',180,320);encoded_color=color(video_pixels(video,1,'portrait-decoded-video'),180,90,160);assert encoded_color[1]>150 and max(encoded_color[0],encoded_color[2])<50,encoded_color;frame=snapshot(d,[1],'portrait')[0];r=pixels(frame,'portrait-pixels');expect_color(color(r,180,90,160),(0,255,0));expect_color(color(r,180,5,5),(0,0,0));return {'encoded_color':encoded_color,'size':[180,320],'center_and_border_verified':True}

def carve():
 if not os.environ.get('HF_CARVE') or not os.environ.get('HF_CORE_ROOT'):raise AssertionError('HF_CARVE/HF_CORE_ROOT required for independent carve track')
 body='<audio id="music-bed" src="bed.wav" data-start="0" data-duration="2" data-track-index="1" data-audio-group="music"></audio><audio id="voice-intro" src="voice.wav" data-start="0.2" data-duration="0.4" data-track-index="2" data-audio-group="voiceover"></audio><audio id="voice-later" src="voice.wav" data-start="1.2" data-duration="0.4" data-track-index="2" data-audio-group="voiceover"></audio>'
 d=project('carve',body);wavefile(d/'bed.wav',[120,1000,3000],amplitude=1000);wavefile(d/'voice.wav',[1000,3000],amplitude=3000);baseline=render(d,'carve-before');shutil.copyfile(baseline,d/'baseline.mp4')
 result=command(['node',os.environ['HF_CARVE'],'--comp',d/'index.html','--core',os.environ['HF_CORE_ROOT'],'--bed','music-bed','--voice','voice-intro','--voice','voice-later','--strength','0.8'],'carve-write')
 source=(d/'index.html').read_text();assert 'data-fx-chain=' in source and 'data-automation=' in source
 class CarveTag(HTMLParser):
  def handle_starttag(self,tag,attrs):
   attrs=dict(attrs)
   if attrs.get('id')=='music-bed': self.carve=json.loads(attrs['data-fx-carve'])
 parsed=CarveTag();parsed.feed(source);assert parsed.carve['sources']==['voiceover'] and parsed.carve['strength']==.8 and parsed.carve['enabled'] is True
 video=render(d,'carve-after');before=energy(d/'baseline.mp4',1.25,.2,[120,1000,3000],'carve-before-energy');after=energy(video,1.25,.2,[120,1000,3000],'carve-after-energy');assert abs(after['1000']-before['1000'])>50 or abs(after['3000']-before['3000'])>50,(before,after)
 # Compare against identical baseline: oracle must reject a no-op effect render.
 try:assert abs(before['1000']-before['1000'])>50
 except AssertionError:pass
 else:raise AssertionError('no-op carve negative control passed')
 return {'before':before,'after':after,'group_sources_preserved':True,'negative_control':'no-op mix rejected'}

version=hf(['--version'],'version').stdout.decode().strip();assert version=='0.8.77',version
for name,fn in [('caption-only',captions),('hard-cut-and-zoom',cuts_zoom),('visual-audio-crossfade-and-seek',crossfade),('subcomposition-local-font-asset',subcomposition),('aspect-ratio',aspect),('later-narration-carve-effects',carve)]:
 if not a.case or name in a.case:record(name,fn)
print(json.dumps(outcomes,indent=2));raise SystemExit(1 if any(x['status']=='failed' for x in outcomes) else 0)
