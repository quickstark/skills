#!/usr/bin/env python3
"""Recheck original image bytes and pinned evidence; no model or image write."""
import base64,hashlib,io,json,pathlib,struct
from PIL import Image
HERE=pathlib.Path(__file__).resolve().parent
sha=lambda b:hashlib.sha256(b).hexdigest()
p=json.loads((HERE/'source-provenance.json').read_text())
for item in p['sources']+p['localCaptureFiles']:
 assert sha(pathlib.Path(item['path']).read_bytes())==item['sha256'],item['path']
assert sha(pathlib.Path(p['installed']['path']).read_bytes())==p['installed']['sha256']
data=json.loads((HERE/'observed-images.json').read_text());assert len(data['trials'])==6
seen=set();sizes={};count=0
for trial in data['trials']:
 assert trial['trialId']not in seen;seen.add(trial['trialId']);path=pathlib.Path(trial['rawProtocolPath']);raw=path.read_bytes();assert sha(raw)==trial['rawProtocolSHA256'];events=[json.loads(l)for l in raw.splitlines()]
 items={n+1:e['message']['params']['item']for n,e in enumerate(events)if e.get('message',{}).get('method')=='item/completed'and e['message'].get('params',{}).get('item',{}).get('type')=='imageGeneration'}
 assert len(items)==len(trial['images'])==2
 assert set(items)=={i['rawProtocolLine']for i in trial['images']}
 for i in trial['images']:
  native=items[i['rawProtocolLine']];assert native['id']==i['itemId']and native['status']==i['status']=='completed';assert native['revisedPrompt']==i['revisedPrompt'];assert '1179'in native['revisedPrompt']and'2556'in native['revisedPrompt']and i['targetMentioned']
  b=base64.b64decode(native['result'],validate=True);assert len(b)==i['nativeBytes']and sha(b)==i['nativeSHA256'];assert b[:8]==b'\x89PNG\r\n\x1a\n'
  dimensions=struct.unpack('>II',b[16:24]);assert list(dimensions)==i['pngDimensions'];assert i['targetDimensions']==[1179,2556]and i['targetMet']==(dimensions==(1179,2556))==False
  with Image.open(io.BytesIO(b))as im:im.load();assert im.format=='PNG'and im.size==dimensions
  assert native['savedPath']==i['savedPath']
  for key in ['savedPath','captureArchive','reviewerImagePath']:
   f=pathlib.Path(i[key]);assert f.is_file()and not f.is_symlink();assert f.read_bytes()==b,(i['itemId'],key)
  assert i['savedMatchesNative']and i['archiveMatchesNative']and i['reviewerImageMatchesNative'];sizes[dimensions]=sizes.get(dimensions,0)+1;count+=1
assert count==12
print('F09_RESOLUTION_EVIDENCE_BOUND: 6 trials,12 native PNGs; raw result=saved=archive=reviewer bytes;12 target misses preserved; dimensions='+str(sizes))
