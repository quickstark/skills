"""Read-only integrity and review coverage verification; assigns no quality grades."""
import pathlib,json,hashlib,re,collections
ROOT=pathlib.Path(__file__).parent
sha=lambda v:hashlib.sha256(v).hexdigest()
canonical=lambda v:sha(json.dumps(v,sort_keys=True,separators=(',',':')).encode())
counts=collections.Counter();reviews=[]
for file in sorted(ROOT.glob('review-*.json')):
 if not re.fullmatch(r'review-[0-9a-f]{16}\.json',file.name):continue
 j=json.loads(file.read_text());p=pathlib.Path(j['bundlePath']);c=json.loads((p/'context.json').read_text())
 files={str(f.relative_to(p)):{'sha256':sha(f.read_bytes()),'bytes':f.stat().st_size} for f in sorted(p.rglob('*')) if f.is_file()}
 assert files==j['fileBindings'] and canonical(files)==j['bundleManifestSha256']
 assert canonical(c['rubric'])==j['rubricCanonicalSha256']
 assert sha((json.dumps(c['rubric'],ensure_ascii=False,indent=2)+'\n').encode())==j['rubricSha256']
 assert set(c['rubric']['dimensions'])==set(j['dimensions'])==set(j['dimensionRationales'])
 assert set(c['task']['requiredChecks'])=={x['id'] for x in j['checks']}
 items={n:e['item'] for n,line in enumerate((p/'events.jsonl').read_text().splitlines(),1) if (e:=json.loads(line)).get('type')=='item.completed'}
 classified=j['nativeToolAuthorityReview']['classifiedItems'];other=j['nativeToolAuthorityReview']['nonToolItems']
 assert set(items)=={row['eventLine'] for row in classified+other}
 for row in classified+other:
  item=items[row['eventLine']];assert row['id']==item['id'] and row['type']==item['type'] and row['itemSha256']==canonical(item)
 assert set(c['execution']['unclassifiedToolItems'])<={row['id'] for row in classified}
 for prefix,key in [('input-project','inputManifest'),('actual-artifacts','actualArtifactManifest')]:
  for path,binding in c[key].items():assert files[prefix+'/'+path]==binding
 for image in j['screenshotsOpened']:assert image in files
 if j['scenarioId']=='F10':
  assert len(classified)==1 and classified[0]['type']=='command_execution'
  assert c['inputManifest']==c['actualArtifactManifest']
  assert j['dimensions']['visual-hierarchy-and-readability']=='not-applicable'
  assert j['dimensions']['interaction-or-screen-flow-clarity']=='not-applicable'
 else:
  assert len(j['screenshotsOpened'])==4 and c['inputManifest']['reference.png']==c['actualArtifactManifest']['reference.png']
  s=json.loads((ROOT/(j['trialId']+'-observer-supplement.json')).read_text());sp=pathlib.Path(s['supplementPath'])
  assert {str(f.relative_to(sp)):{'sha256':sha(f.read_bytes()),'bytes':f.stat().st_size} for f in sp.rglob('*') if f.is_file()}==s['fileBindings']
  assert s['gradeChange']==False and all(s['partialImagesIdenticalToOpenedAuthorImages'].values())
  counts['boundSupplementFiles']+=len(s['fileBindings'])
 counts[j['scenarioId']]+=1;counts['reviews']+=1;counts['boundBundleFiles']+=len(files);counts['classifiedTools']+=len(classified);counts['openedImages']+=len(j['screenshotsOpened']);counts['requiredChecks']+=len(j['checks'])
 reviews.append({'trialId':j['trialId'],'scenarioId':j['scenarioId'],'reviewSha256':sha(file.read_bytes()),'overall':j['overall'],'dimensions':j['dimensions']})
assert counts['F10']==counts['F11']==6
print(json.dumps({'status':'verified','counts':dict(counts),'reviews':reviews,'limits':'Integrity and coverage only; grades are independent manual observations, not assigned by this script.'},indent=2))
