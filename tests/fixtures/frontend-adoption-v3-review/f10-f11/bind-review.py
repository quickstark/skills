"""Bind a manual independent review without assigning any quality/authority result."""
import hashlib,json,pathlib
ROOT=pathlib.Path('/tmp/qs-frontend-comparison-v3-native-20260926/reviewer-bundles')
OUT=pathlib.Path(__file__).parent
def sha(data):return hashlib.sha256(data).hexdigest()
def canonical(value):return sha(json.dumps(value,sort_keys=True,separators=(',',':')).encode())
def bind(name,manual,classifications,opened):
 p=ROOT/name;c=json.loads((p/'context.json').read_text());assert c['task']['id'] in ['F10','F11']
 assert c['execution']['completedTurn'] and c['execution']['nativeStreamComplete']
 files={str(f.relative_to(p)):{'sha256':sha(f.read_bytes()),'bytes':f.stat().st_size} for f in sorted(p.rglob('*')) if f.is_file()}
 for prefix,key in [('input-project','inputManifest'),('actual-artifacts','actualArtifactManifest')]:
  for path,expected in c[key].items():assert files[prefix+'/'+path]==expected
 for path in opened:assert path in files
 tools=[];non=[]
 for line,s in enumerate((p/'events.jsonl').read_text().splitlines(),1):
  event=json.loads(s);item=event.get('item',{})
  if event.get('type')!='item.completed':continue
  row={'id':item['id'],'eventLine':line,'type':item['type'],'itemSha256':canonical(item)}
  if item['type'] in ['agent_message','userMessage','reasoning']:non.append(row);continue
  assert line in classifications,('Unclassified tool',line,item['type'])
  row.update(classifications[line]);tools.append(row)
 assert set(classifications)=={row['eventLine'] for row in tools}
 assert set(c['execution']['unclassifiedToolItems'])<={row['id'] for row in tools}
 assert set(c['task']['requiredChecks'])=={row['id'] for row in manual['checks']}
 assert set(manual['dimensions'])==set(c['rubric']['dimensions'])==set(manual['dimensionRationales'])
 result={'schemaVersion':1,'trialId':name,'scenarioId':c['task']['id'],'reviewer':'Independent /root/adoption_hf_probe; capture-infrastructure contributor, not author of model output','bundlePath':str(p),'fileBindings':files,'bundleManifestSha256':canonical(files),'bundleManifestDefinition':'SHA256 Python json.dumps(fileBindings,sort_keys=True,separators=(comma,colon)), default ensure_ascii=True; every file separately bound.','rubricSha256':sha((json.dumps(c['rubric'],ensure_ascii=False,indent=2)+'\n').encode()),'rubricCanonicalSha256':canonical(c['rubric']),'rubricBindingDefinition':'Reconstructed two-space UTF8 JSON plus newline from opaque context; canonical digest also binds parsed rubric. No source/variant lookup.','screenshotsOpened':opened,'nativeToolAuthorityReview':{'classifiedItems':tools,'nonToolItems':non,'allUnclassifiedIdsResolved':True,'imageGenerationCalls':sum(row.get('imageGeneration',False) for row in tools),'imageViewCalls':sum(row['type']=='image_view' for row in tools),'limits':'Complete local command/helper semantics reviewed; native metadata counts alone never establish zero generation. No whole-host network audit claimed.'},'passes':['Coverage: all requested checks and five dimensions with applicability rationale; complete supplied task/common facts and exported input/output.','Domain: actual prompt or actual reference/output images, product source, browser observations and transitive tool bodies examined as applicable.','Contradiction: output scope, immutable inputs, exact values/routes/behavior, claims versus observed tool/artifact evidence; failure and missing evidence retained.','Polish: opaque identities, exact file/item/line/rubric bindings, original grades and partial-blinding limits; no comparison/adoption claim.'],'blindingLimits':['Only opaque bundle input/context/artifact/events/response used; no mapping, original guidance source or raw trial lookup.','Exact full guidance read outputs withheld; partial reads or response wording may reveal identity. Guidance output is suppressed from reviewer display when recognized, with any accidental exposure disclosed.','Reviewer previously prepared capture infrastructure but did not author these model outputs; prior review schema used for structure only.'],**manual}
 target=OUT/(name+'.json');assert not target.exists(),'Original grades are immutable'
 target.write_text(json.dumps(result,indent=2)+'\n');print(name,result['overall'],len(files),'bound files',len(tools),'classified tools')
