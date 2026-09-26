"""Bind manual opaque mobile review, decode primary rasters; no automated grade."""
import pathlib,json,hashlib,base64
from PIL import Image
ROOT=pathlib.Path('/tmp/qs-frontend-mobile-native-qualification-20260926/reviewer-bundles');OUT=pathlib.Path(__file__).parent
sha=lambda b:hashlib.sha256(b).hexdigest()
canonical=lambda v:sha(json.dumps(v,sort_keys=True,separators=(',',':')).encode())
def bind(name,manual,classifications):
 p=ROOT/name;c=json.loads((p/'context.json').read_text());assert c['execution']['nativeStreamComplete'] and c['execution']['completedTurn']
 files={str(f.relative_to(p)):{'sha256':sha(f.read_bytes()),'bytes':f.stat().st_size} for f in sorted(p.rglob('*')) if f.is_file()}
 for prefix,key in [('input-project','inputManifest'),('actual-artifacts','actualArtifactManifest')]:
  for k,v in c[key].items():assert files[prefix+'/'+k]==v
 rows=[];non=[];events={}
 for n,line in enumerate((p/'events.jsonl').read_text().splitlines(),1):
  e=json.loads(line);i=e.get('item',{})
  if e.get('type')!='item.completed':continue
  events[n]=i;row={'id':i['id'],'type':i['type'],'eventLine':n,'itemSha256':canonical(i)}
  if i['type'] in ['agent_message','userMessage','reasoning']:non.append(row);continue
  assert n in classifications,(n,i['type']);row.update(classifications[n]);rows.append(row)
 assert set(classifications)=={r['eventLine'] for r in rows}
 assert set(c['execution']['unclassifiedToolItems'])<={r['id'] for r in rows}
 imeta=json.loads((p/'tool-images.json').read_text());assert not imeta['unresolved'];images=[]
 for r in imeta['retained']:
  assert files[r['target']]=={'sha256':r['sha256'],'bytes':r['bytes']}
  item=events[r['eventLine']];assert item['type']=='imageGeneration' and item['savedPath']==r['source']
  assert sha(base64.b64decode(item['result']))==r['sha256']
  im=Image.open(p/r['target']);im.load();alpha=im.convert('RGBA').getchannel('A');hist=alpha.histogram()
  images.append({**r,'width':im.width,'height':im.height,'mode':im.mode,'alphaExtrema':list(alpha.getextrema()),'nonOpaquePixels':sum(hist[:255]),'opaque':sum(hist[:255])==0,'nativeResultBytesMatch':True,'openedByReviewer':True})
 assert set(c['task']['requiredChecks'])=={r['id'] for r in manual['checks']}
 assert set(c['rubric']['dimensions'])==set(manual['dimensions'])==set(manual['dimensionRationales'])
 result={'schemaVersion':1,'trialId':name,'scenarioId':c['task']['id'],'reviewer':'/root/adoption_hf_probe independent artifact reviewer; prior capture-infrastructure contributor, not output author','bundlePath':str(p),'fileBindings':files,'bundleManifestSha256':canonical(files),'rubricSha256':sha((json.dumps(c['rubric'],ensure_ascii=False,indent=2)+'\n').encode()),'rubricCanonicalSha256':canonical(c['rubric']),'images':images,'nativeToolAuthorityReview':{'classifiedItems':rows,'nonToolItems':non,'allUnclassifiedIdsResolved':True,'actualGenerationCalls':sum(r.get('imageGeneration',False) for r in rows),'imageViewItems':sum(r['type']=='image_view' for r in rows),'note':'Native imageGeneration result embeds primary raster bytes; generation return can expose image to model without a separate image_view. Wrappers/read-only analysis do not count as extra generations; unknown tool semantics reviewed explicitly.'},'passes':['Coverage: all eight required checks and five dimensions against opaque task/common facts.','Domain: open both delivered primary images, decode actual pixels, review text/style/platform/flow.','Contradiction: classify every completed tool and transitive command; compare actual result with claimed size/scope/quality.','Polish: preserve failures and limits; bind every file/item/raster and exact rubric; no comparison/adoption decision.'],'blindingLimits':['No variant mapping, fixture source or raw trial lookup. Full exact guidance outputs withheld by export.','Response wording and partial guidance reads may disclose identity; reviewer prepared capture infrastructure previously.','Raster appearance cannot certify exact font binary/CSS radius or interactive behavior; unmistakable app-owned sans text is distinguishable from allowed iOS system status type.'],**manual}
 target=OUT/(name+'.json');assert not target.exists();target.write_text(json.dumps(result,indent=2)+'\n');print(name,manual['overall'],len(files),'files',len(rows),'tools',[(x['width'],x['height'],x['opaque']) for x in images])
