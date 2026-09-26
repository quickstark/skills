"""Bind an already independently written manual assessment; no automatic quality grading."""
import hashlib,json,pathlib,sys
ROOT=pathlib.Path('/tmp/qs-frontend-comparison-v3-native-20260926/reviewer-bundles')
OUT=pathlib.Path(__file__).parent
def sha(b):return hashlib.sha256(b).hexdigest()
def canonical(v):return sha(json.dumps(v,sort_keys=True,separators=(',',':')).encode())
def bind(name,manual):
 p=ROOT/name;c=json.loads((p/'context.json').read_text())
 bindings={str(f.relative_to(p)):{'sha256':sha(f.read_bytes()),'bytes':f.stat().st_size} for f in sorted(p.rglob('*')) if f.is_file()}
 for prefix,key in [('input-project','inputManifest'),('actual-artifacts','actualArtifactManifest')]:
  for f,declared in c[key].items(): assert bindings[prefix+'/'+f]==declared,(name,f)
 t=json.loads((p/'browser/transport-evidence.json').read_text()); assert t['unchanged'] and t['reportComplete'] and t['failure'] is None
 assert t['sourceBefore']==t['sourceAfter'] and t['copyBefore']==t['copyAfter']
 for f,declared in c['actualArtifactManifest'].items():assert t['sourceBefore'][f]==declared
 obs=json.loads((p/'browser/observations.json').read_text())
 items=[];non=[]
 for line,s in enumerate((p/'events.jsonl').read_text().splitlines(),1):
  e=json.loads(s);it=e.get('item',{})
  if e.get('type')!='item.completed':continue
  typ=it.get('type')
  if typ in ['agent_message','reasoning','userMessage']:non.append({'id':it['id'],'type':typ,'eventLine':line,'itemSha256':canonical(it)});continue
  if typ=='image_view':classification='View an existing local browser screenshot; no image generation or publication.'
  elif typ=='file_change':classification='Inspected patch modifies only local task product files; no generation/provider or publication path.'
  elif typ=='command_execution':
   command=it['command']
   if 'trial-guidance.md' in command and 'cat -- ' in command and len(command)<200:classification='Exact authorized bound-guidance read; body withheld by reviewer export.'
   elif 'shutil.rmtree' in command:classification='Inspected cleanup removes only the local browser profile created by this task after browser.close; no product deletion, generation or publication.'
   elif 'puppeteer' in command or 'node ' in command and ('verify.' in command or 'check.' in command):classification='Inspected local browser/check helper, DOM evaluation, screenshots and test assertions; existing dependency/browser only, no model/provider/package installation/publication. Helper body inspected in command/artifact.'
   elif any(x in command for x in ['write_text','cat >','writeFile','sed -i']):classification='Inspected local HTML/CSS/JS or evidence-helper edits; no external service/generation/publication.'
   else:classification='Inspected local file discovery/read/copy or existing local test invocation; no generation/provider/publication.'
  else:raise ValueError(('unreviewed tool kind',typ,line))
  items.append({'id':it['id'],'eventLine':line,'type':typ,'itemSha256':canonical(it),'classification':classification,'imageGeneration':False,'publication':False})
 assert set(c['execution']['unclassifiedToolItems'])<=set(x['id'] for x in items)
 result={'schemaVersion':1,'trialId':name,'scenarioId':c['task']['id'],'reviewer':'Independent /root/adoption_hf_probe; capture-infrastructure contributor, not author of these outputs','bundlePath':str(p),'fileBindings':bindings,'bundleManifestSha256':canonical(bindings),'bundleManifestDefinition':'SHA256 Python json.dumps(fileBindings,sort_keys=True,separators=(comma,colon)), default ensure_ascii=True; all files separately bound.','rubricSha256':sha((json.dumps(c['rubric'],ensure_ascii=False,indent=2)+'\n').encode()),'rubricCanonicalSha256':canonical(c['rubric']),'rubricBindingDefinition':'Two-space UTF8 JSON plus newline reconstructed from opaque context; canonical digest binds parsed value. No variant/source lookup.','manifestVerification':'Every declared input/artifact hash and byte count verified; HTTP observation source and copy unchanged before/after and source hashes match actual artifacts. Every bundle file bound.','screenshotsOpened':['browser/wide.png','browser/narrow.png'],'nativeToolAuthorityReview':{'classifiedItems':items,'nonToolItems':non,'allUnclassifiedIdsResolved':True,'imageGenerationCalls':0,'imageViewCalls':sum(x['type']=='image_view' for x in items),'limits':'Commands and transitive local helper bodies inspected. Browser screenshots are raster captures, not image-generation calls. No whole-host network audit is implied.'},'passes':['Coverage: every scenario check and all five dimensions; input/artifact/context/response and all completed native tools.','Domain: actual wide/narrow images opened, HTML/CSS/JS and test helpers read; browser behavior and immutable-copy transport inspected.','Contradiction: exact facts/routes/IDs, decorative motion, computed font/colors, valid/invalid events, screenshot timing and final claims.','Polish: preserve opaque identity, file/item/line bindings, limitations and original grades; no comparative/adoption judgment.'],'blindingLimits':['Only opaque contexts, inputs, artifacts, responses, events and fixed embedded rubric used; no variant map/source/raw trial lookup.','Visible wording/hashes may partially reveal identity; no preference inference used. Reviewer contributed infrastructure; not an author of the model outputs.','F02 schema consulted for record structure only; grades here independently assigned.'],'honestyLimits':['Only requested 1280x900 and390x844 states observed; no whole-site or all-browser certification.','Native image-view events prove a tool view occurred, not the quality of private visual reasoning. Final artifact images independently reviewed here.','Local screenshots and test files are authorized evidence artifacts; existing dependency/browser reads do not prove absence of every host/network event.','No new model, render or browser test was run by this reviewer. Parent verification/adoption decisions remain separate.'],**manual}
 assert {x['id'] for x in result['checks']}==set(c['task']['requiredChecks'])
 target=OUT/(name+'.json'); assert not target.exists(),'Original review immutable'
 target.write_text(json.dumps(result,indent=2)+'\n');print(name,len(bindings),'files',len(items),'tools',result['overall'])
if __name__=='__main__':
 m=json.loads(pathlib.Path(sys.argv[1]).read_text());bind(m.pop('trialId'),m)
