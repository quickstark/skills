#!/usr/bin/env python3
"""Validate review identity/evidence completeness without grading model outputs."""
import pathlib,json,hashlib,sys
HERE=pathlib.Path(__file__).resolve().parent
# This check binds existing judgments; it does not inspect or grade pixels.
ROOT=pathlib.Path('/tmp/qs-frontend-comparison-v3-native-20260926/reviewer-bundles')
def sha(b):return hashlib.sha256(b).hexdigest()
def ch(v):return sha(json.dumps(v,sort_keys=True,separators=(',',':')).encode())
def inventory(root):
 out={}
 for p in sorted(root.rglob('*')):
  assert not p.is_symlink(),'Evidence symlink'
  if p.is_file():
   b=p.read_bytes();out[str(p.relative_to(root))]={'sha256':sha(b),'bytes':len(b)}
 return out
rubricpath=pathlib.Path('/github/skills/tests/fixtures/frontend-adoption-v3/rubric.json');rubric=json.loads(rubricpath.read_bytes())
reviews=[json.loads(p.read_text())for p in sorted(HERE.glob('review-*.json'))]
counts={s:sum(r['scenarioId']==s for r in reviews)for s in ['F07','F08']}
assert (0<len(reviews)<=12 and all(v<=6 for v in counts.values()))if '--partial'in sys.argv else (len(reviews)==12 and counts=={'F07':6,'F08':6}),f'Expected review coverage: {counts}'
assert len({r['trialId']for r in reviews})==len(reviews),'Duplicate opaque review'
for r in reviews:
 bundle=ROOT/r['trialId'];assert str(bundle)==r['bundlePath'];context=json.loads((bundle/'context.json').read_text());assert context['task']['id']==r['scenarioId']
 execution=context['execution'];assert execution['nativeStreamComplete'] and not execution['protocolErrors'] and not execution['observedOwnedResidualProcesses']
 guard=context['guidanceGuard'];assert guard['guidanceReadObserved'] and guard['guidanceUnchanged'] and not guard['violations'] and not guard['observerErrors']
 m=inventory(bundle);assert m==r['fileBindings'];assert ch(m)==r['bundleManifestSha256'];assert sha(rubricpath.read_bytes())==r['rubricSha256'];assert context['rubric']==rubric
 checks=r['checks'];assert len({x['id']for x in checks})==len(checks);assert {x['id']for x in checks}==set(context['task']['requiredChecks'])
 for check in checks:assert check['result']in['pass','fail','unverified']and check['rationale'].strip()
 assert set(r['dimensions'])==set(rubric['dimensions'])
 for d,value in r['dimensions'].items():assert (type(value)is int and 0<=value<=4 or value=='not-applicable')and r['dimensionRationales'][d].strip()
 assert r['reviewer']=='adoption_a_ps independent F07-F08 review';assert r['overall']in['pass','fail','unverified'];assert r['rationale'].strip()
 if r['overall']=='pass':assert all(x['result']=='pass'for x in checks)and all(v=='not-applicable'or v>=rubric['floor']for v in r['dimensions'].values())
 for name in ['browser/wide.png','browser/narrow.png']:assert str(bundle/name)in r['screenshotsOpened']and(bundle/name).is_file()
 events=[json.loads(line)for line in(bundle/'events.jsonl').read_text().splitlines()if line.strip()]
 nonTools={'userMessage','agent_message','reasoning','plan','contextCompaction','enteredReviewMode','exitedReviewMode'}
 tools={e['item']['id']:(i+1,e['item'])for i,e in enumerate(events)if e.get('type')=='item.completed'and e.get('item',{}).get('type')not in nonTools}
 classified=r['nativeToolAuthorityReview']['classifiedItems'];assert len({x['id']for x in classified})==len(classified);assert set(tools)=={x['id']for x in classified}
 for x in classified:
  line,item=tools[x['id']];assert line==x['eventLine']and item['type']==x['type']and ch(item)==x['itemSha256'];assert x['classification'].strip();assert type(x['imageGeneration'])is bool and type(x['publication'])is bool
 assert r['nativeToolAuthorityReview']['allUnclassifiedIdsResolved'] is True
 assert set(execution['unclassifiedToolItems']).issubset({x['id']for x in classified})
 assert r['nativeToolAuthorityReview']['imageGenerationCalls']==sum(x['imageGeneration']for x in classified)
 assert r['nativeToolAuthorityReview']['imageViewCalls']==sum(x['type']=='image_view'for x in classified)
 assert len(r['passes'])==4 and r['blindingLimits']
print(('PARTIAL_REVIEWS_BOUND'if '--partial'in sys.argv else 'REVIEW_12_BOUND')+': '+str(counts)+'; original findings preserved; no comparative adoption judgment')
