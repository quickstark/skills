from pathlib import Path
import hashlib,json,zlib,struct,wave,math
out=Path('/tmp/qs-lex-runtime-st2tih6o'); repo=Path('/github/skills')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
base=repo/'tests/fixtures/adoption-video-native-results'
paths=['independent-oracle.json','assessment.json','parent-review.json','capture/after/output/render.mp4','capture/after/output/metadata.stdout','capture/after/output/network.jsonl','capture/after/output/frame-0.25.png','capture/after/output/frame-1.png','capture/after/output/frame-1.75.png','capture/after/composition/a.wav','capture/after/composition/b.wav','capture/after/composition/index.html']
files=[{'path':str(base/p),'sha256':sha(base/p),'size':(base/p).stat().st_size} for p in paths]
old=json.loads((base/'independent-oracle.json').read_text())
assert sha(base/'capture/after/output/render.mp4')==old['videoSHA256']
meta=json.loads((base/'capture/after/output/metadata.stdout').read_text());v=next(x for x in meta['streams'] if x['codec_type']=='video')
assert [v['width'],v['height']]==[320,180] and v['r_frame_rate']=='12/1' and float(meta['format']['duration'])==2

def pngpixel(p):
 data=p.read_bytes();assert data[:8]==b'\x89PNG\r\n\x1a\n';i=8;chunks=[]
 while i<len(data):
  n=struct.unpack('>I',data[i:i+4])[0];k=data[i+4:i+8];b=data[i+8:i+8+n];i+=n+12
  if k==b'IHDR':w,h,depth,color,compression,filt,interlace=struct.unpack('>IIBBBBB',b)
  if k==b'IDAT':chunks.append(b)
 assert depth==8 and color in [2,6] and interlace==0
 bpp=3 if color==2 else 4;stride=w*bpp;raw=zlib.decompress(b''.join(chunks));prior=bytearray(stride);offset=0;pixel=None
 for y in range(h):
  f=raw[offset];offset+=1;row=bytearray(raw[offset:offset+stride]);offset+=stride
  for x in range(stride):
   a=row[x-bpp] if x>=bpp else 0;b=prior[x];c=prior[x-bpp] if x>=bpp else 0
   if f==1:pred=a
   elif f==2:pred=b
   elif f==3:pred=(a+b)//2
   elif f==4:
    q=a+b-c;dist=[abs(q-a),abs(q-b),abs(q-c)];pred=[a,b,c][dist.index(min(dist))]
   elif f==0:pred=0
   else:raise AssertionError('unknown filter')
   row[x]=(row[x]+pred)&255
  if y==h//2:pixel=list(row[(w//2)*bpp:(w//2)*bpp+3])
  prior=row
 return {'dimensions':[w,h],'centerRGB':pixel}
frames=[pngpixel(base/('capture/after/output/frame-'+t+'.png')) for t in ['0.25','1','1.75']]
assert all(f['dimensions']==[320,180] for f in frames)
assert frames[0]['centerRGB'][0]>240 and frames[0]['centerRGB'][2]<25
assert frames[2]['centerRGB'][2]>240 and frames[2]['centerRGB'][0]<25
assert all(100<x<170 for x in [frames[1]['centerRGB'][0],frames[1]['centerRGB'][2]])
tones=[]
for name,want,other in [('a',220,440),('b',440,220)]:
 with wave.open(str(base/('capture/after/composition/'+name+'.wav')),'rb') as w:
  assert w.getsampwidth()==2;rate=w.getframerate();channels=w.getnchannels();n=w.getnframes();b=w.readframes(n)
 values=struct.unpack('<'+'h'*(len(b)//2),b)[::channels]
 def mag(freq):return abs(sum(x*complex(math.cos(-2*math.pi*freq*j/rate),math.sin(-2*math.pi*freq*j/rate)) for j,x in enumerate(values[:rate])))
 expected=mag(want);off=mag(other);assert expected>1000*max(off,1)
 tones.append({'fixture':name,'sampleRate':rate,'channels':channels,'seconds':n/rate,'expectedHz':want,'expectedProjection':expected,'otherProjection':off})
embedded=repo/'tests/fixtures/hyperframes-adoption/embedded-captions'; manifest=json.loads((embedded/'evidence/manifest.json').read_text());verified=[]
for rel,expected in manifest.items():
 p=embedded/rel;actual=sha(p);assert actual==expected,rel;verified.append({'relativePath':rel,'sha256':actual})
result={'scope':'Fresh independent inspection and hash verification of unchanged historical artifacts; NOT a new HyperFrames render, speech, matting or browser pass. Metadata is retained ffprobe output; PNG pixels freshly decoded with Python stdlib; WAV measurements are input fixtures, not freshly decoded rendered audio.','nativeRetainedFiles':files,'nativeVideoHashMatchesHistoricalOracle':True,'nativeRetainedMetadata':{'size':[v['width'],v['height']],'fps':v['r_frame_rate'],'duration':meta['format']['duration']},'freshPNGChecks':frames,'freshInputToneChecks':tones,'embeddedManifestSHA256':sha(embedded/'evidence/manifest.json'),'embeddedManifestEntriesVerified':len(verified),'embeddedRetainedFiles':verified,'networkScope':'No network attempted by this stdlib verifier; retained network files describe prior runs only.'}
(out/'retained-verification.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k not in ['nativeRetainedFiles','embeddedRetainedFiles']},indent=2))
