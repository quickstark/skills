"""Read-only complete binding/coverage verification; no visual self-grading."""
import pathlib,json,hashlib,base64,collections,re
from PIL import Image
ROOT=pathlib.Path(__file__).parent
sha=lambda b:hashlib.sha256(b).hexdigest()
canonical=lambda v:sha(json.dumps(v,sort_keys=True,separators=(',',':')).encode())
counts=collections.Counter();reviews=[];task=None;rubric=None
for f in sorted(ROOT.glob('review-*.json')):
 if not re.fullmatch(r'review-[0-9a-f]{16}\.json',f.name):continue
 j=json.loads(f.read_text());p=pathlib.Path(j['bundlePath']);c=json.loads((p/'context.json').read_text())
 if task is None:task=c['task'];rubric=c['rubric']
 assert c['task']==task and c['rubric']==rubric
 assert c['inputManifest']==c['actualArtifactManifest']
 files={str(x.relative_to(p)):{'sha256':sha(x.read_bytes()),'bytes':x.stat().st_size} for x in sorted(p.rglob('*')) if x.is_file()}
 assert files==j['fileBindings'] and canonical(files)==j['bundleManifestSha256']
 assert sha((json.dumps(rubric,ensure_ascii=False,indent=2)+'\n').encode())==j['rubricSha256'] and canonical(rubric)==j['rubricCanonicalSha256']
 assert set(task['requiredChecks'])=={x['id'] for x in j['checks']} and set(rubric['dimensions'])==set(j['dimensions'])==set(j['dimensionRationales'])
 es=[json.loads(line) for line in (p/'events.jsonl').read_text().splitlines()]
 items={n:e['item'] for n,e in enumerate(es,1) if e.get('type')=='item.completed'}
 authority=j['nativeToolAuthorityReview'];rows=authority['classifiedItems']+authority['nonToolItems']
 assert {r['eventLine'] for r in rows}==set(items)
 for r in rows:
  i=items[r['eventLine']];assert r['id']==i['id'] and r['type']==i['type'] and r['itemSha256']==canonical(i)
 assert set(c['execution']['unclassifiedToolItems'])<={r['id'] for r in authority['classifiedItems']}
 imageIDs={e['item']['id'] for e in es if e.get('item',{}).get('type')=='imageGeneration'}
 assert len(imageIDs)==2==authority['actualGenerationCalls']==len(j['images'])
 for imeta in j['images']:
  b=(p/imeta['target']).read_bytes();assert sha(b)==imeta['sha256'] and len(b)==imeta['bytes']
  i=items[imeta['eventLine']];assert i['id'] in imageIDs and i['savedPath']==imeta['source'] and sha(base64.b64decode(i['result']))==sha(b)
  im=Image.open(p/imeta['target']);im.load();alpha=im.convert('RGBA').getchannel('A');hist=alpha.histogram()
  assert im.size==(imeta['width'],imeta['height']) and im.mode==imeta['mode'] and list(alpha.getextrema())==imeta['alphaExtrema'] and sum(hist[:255])==imeta['nonOpaquePixels']
  counts['images']+=1;counts['nonOpaqueImages']+=int(not imeta['opaque'])
 if any(x['result']!='pass' for x in j['checks']):assert j['overall']!='pass'
 counts['reviews']+=1;counts['files']+=len(files);counts['tools']+=len(authority['classifiedItems']);counts['checks']+=len(j['checks']);counts[j['overall']]+=1
 reviews.append({'trialId':j['trialId'],'reviewSha256':sha(f.read_bytes()),'overall':j['overall'],'failedChecks':[x['id'] for x in j['checks'] if x['result']=='fail'],'dimensions':j['dimensions']})
assert counts['reviews']==6 and counts['images']==12 and counts['checks']==48
print(json.dumps({'status':'verified','counts':dict(counts),'reviews':reviews,'limits':'Integrity/coverage verification only. Visual grades remain manual independent assessments; no comparison/adoption or modified acceptance.'},indent=2))
