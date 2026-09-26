"""Append binding of separately observed behavior; preserves original grades."""
import pathlib,json,hashlib
ROOT=pathlib.Path('/tmp/qs-frontend-f11-dialog-supplement-20260926');OUT=pathlib.Path(__file__).parent
sha=lambda b:hashlib.sha256(b).hexdigest()
binding=lambda f:{'sha256':sha(f.read_bytes()),'bytes':f.stat().st_size}
reviews=[]
for p in sorted(ROOT.glob('review-*')):
 old=OUT/(p.name+'.json');review=json.loads(old.read_text());o=json.loads((p/'browser/observations.json').read_text());t=json.loads((p/'transport-evidence.json').read_text())
 files={str(f.relative_to(p)):binding(f) for f in sorted(p.rglob('*')) if f.is_file()}
 assert t['sourceBefore']==t['sourceAfter'] and t['copyBefore']==t['copyAfter'] and t['unchanged'] and t['reportComplete'] and t['failure'] is None
 for k,v in review['fileBindings'].items():
  if k.startswith('actual-artifacts/'):
   relative=k[len('actual-artifacts/'):];assert files['artifact-copy/'+relative]==v and t['sourceBefore'][relative]==v and t['copyBefore'][relative]==v
 rows={}
 for name,i in o['interactions'].items():
  assert i['status']=='observed' and all(x['reached'] for x in i['steps'].values())
  assert o['views'][name]['scrollWidth']==o['views'][name]['viewport']['width']
  assert i['opened']['dialog']['open'] and i['opened']['dialog']['modal'] and i['opened']['focus']['onEmail']
  assert i['escapeClosed'] and i['escapeReturnedFocus'] and not i['invalidAfter']['email']['valid'] and i['invalidAfter']['message']==''
  assert i['invalidAfter']['events']==i['initial']['events']==i['validBefore']['events']
  assert i['validAfter']['events']==[{'name':'join_started','plan':'family'}] and i['validAfter']['message']=='Ready to continue with Family membership.'
  assert i['validAfter']['email']['valid'] and i['initial']['url']==i['validAfter']['url']
  assert not i['focusReachedOutsideControl']
  rows[name]={'viewport':o['views'][name]['viewport'],'scrollWidth':o['views'][name]['scrollWidth'],'allKeyboardTargetsReached':True,'modalOpenedEmailFocused':True,'escapeClosedReturnedFocus':True,'invalidEmailRejected':True,'invalidEventsActual':i['invalidAfter']['events'],'validEventsActual':i['validAfter']['events'],'validMessageActual':i['validAfter']['message'],'navigationOccurred':False,'focusStayedInDialogActual':i['focusStayedInDialog'],'focusReachedOutsideControlActual':i['focusReachedOutsideControl'],'focusLimit':i['focusObservationLimit']}
 # Base screenshots are checked against images opened for the original review;
 # this reviewer additionally opened each NEW narrow-result.png.
 priorPNG={v['sha256'] for k,v in review['fileBindings'].items() if k.endswith('.png')}
 imagesEqual={name:files['browser/'+name+'.png']['sha256'] in priorPNG for name in ['wide','narrow']};assert all(imagesEqual.values())
 archived=pathlib.Path('tests/fixtures/frontend-adoption-v3-f11-http/parent-observation')/p.name
 archiveMatched=archived.exists() and all((archived/k).is_file() and binding(archived/k)==v for k,v in files.items())
 reviews.append({'reviewId':p.name,'originalReviewSha256':binding(old)['sha256'],'sourcePath':str(p),'durableArchivePath':str(archived),'durableArchiveMatched':archiveMatched,'fileBindings':files,'observations':rows,'blockedRequests':o['blockedRequests'],'deniedProxyRequests':t['deniedProxyRequests'],'baseScreenshotsIdenticalToPreviouslyOpened':imagesEqual,'newScreenshotsOpened':['browser/narrow-result.png'],'visualFinding':'Narrow result screenshot shows readable labelled email, visible focused submit button and exact success status inside unclipped modal. Full-page capture backdrop covers viewport; beyond-viewport page in full-page raster is not evidence of active outside controls.','eventBufferLimit':'Source initializes __events only in successful submit; null before/after malformed input records absent buffer, not fabricated empty array. Exact single event appears after valid input.' if p.name=='review-51c66d979e683e0b' else 'Existing empty buffer remains [] after malformed input; exact single event appears after valid input.','reducedMotionMatches':o['reducedMotion']['matches'],'animatedElementCount':sum(x['animationName']!='none' for x in o['reducedMotion']['elements']),'originalGradeChange':False,'finding':'Separately observed loopback HTTP keyboard/form behavior supports original working-membership assessment at both widths; original shared-observer failure retained.'})
assert len(reviews)==6 and all(r['durableArchiveMatched'] for r in reviews)
source=pathlib.Path('tests/fixtures/frontend-adoption-v3-f11-http/membership-observe.mjs')
result={'schemaVersion':1,'reviewer':'/root/adoption_hf_probe','scope':'Append-only independent review of uniform six-product dialog-aware observation; no original trial/grade replacement, comparison, or adoption decision.','observerSource':{'path':str(source),**binding(source)},'observerInspection':'Read full observer: state evaluation is read-only; opener, typing, submit and Escape use keyboard events. Status observed alone is not behavioral pass: actual validity/events/message/focus/navigation fields checked.','counts':{'products':6,'viewportFlows':12,'newImagesOpened':6,'boundFiles':sum(len(r['fileBindings']) for r in reviews)},'reviews':reviews,'limits':['Sixteen Tab samples include BODY in every case: no outside control observed, but complete focus trap not certified.','Supplement demonstrates malformed-input flow; empty-required behavior remains in separately inspected original author evidence.','One exact browser build, supplied viewports/local flow; no all-browser/assistive-technology/exhaustive accessibility or pixel-parity guarantee.','No new model action or product correction; original native authority/generation review remains unchanged.','Minor brand/route limitations recorded in original grades are retained.'],'fourPasses':['Bind unchanged products and original grades.','Read actual interaction observations and inspect new six narrow result images.','Compare claimed outcomes with explicit values; retain absent buffer and BODY-focus uncertainty.','Verify all source/archive hashes and append-only separation.']}
p=OUT/'uniform-dialog-supplement-review.json';assert not p.exists();p.write_text(json.dumps(result,indent=2)+'\n');print(result['counts']);print('supplement sha256',binding(p)['sha256'])
