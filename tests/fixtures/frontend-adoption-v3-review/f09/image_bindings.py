"""Read-only image provenance/metadata; no quality decisions or image transformations."""
import base64
from PIL import Image
from review_support import *
def bind_images(suffix):
 p=BUNDLES/('review-'+suffix)
 refs=json.loads((p/'tool-images.json').read_text())
 assert not refs['unresolved']
 events=[json.loads(s) for s in (p/'events.jsonl').read_text().splitlines()]
 result=[]
 for ref in refs['retained']:
  f=p/ref['target'];b=f.read_bytes();assert sha(b)==ref['sha256'] and len(b)==ref['bytes']
  item=events[ref['eventLine']-1]['item']
  assert item['type']=='imageGeneration' and item['savedPath']==ref['source'] and item['status']=='completed'
  assert sha(base64.b64decode(item['result']))==ref['sha256']
  with Image.open(f) as im:
   alpha=im.getchannel('A') if im.mode=='RGBA' else None
   result.append({**ref,'nativeItemId':item['id'],'nativeItemSha256':sha(canonical(item)),'rawBase64ResultMatchesFile':True,'width':im.width,'height':im.height,'mode':im.mode,'alphaRange':list(alpha.getextrema()) if alpha else None,'fullyTransparentPixels':alpha.histogram()[0] if alpha else 0,'nonOpaquePixels':sum(alpha.histogram()[:255]) if alpha else 0})
 return result
